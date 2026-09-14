-- Canlı destek görüşmelerinin sonlandırılması ve güvenli arşiv temizliği.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.idx_conversations_unique_support_pair;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_open_support_pair
  ON public.conversations (buyer_id, seller_id)
  WHERE listing_id IS NULL AND closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_support_status
  ON public.conversations (closed_at, last_message_at DESC)
  WHERE listing_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_or_create_support_conversation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_admin_id UUID;
  v_conversation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Destek için oturum açmalısınız.';
  END IF;

  SELECT auth_user.id
  INTO v_admin_id
  FROM auth.users AS auth_user
  INNER JOIN private.platform_admins AS platform_admin
    ON platform_admin.email = LOWER(auth_user.email)
  WHERE auth_user.email_confirmed_at IS NOT NULL
    AND auth_user.id <> v_user_id
  ORDER BY auth_user.created_at ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'SUPPORT_UNAVAILABLE: Aktif destek yöneticisi bulunamadı.';
  END IF;

  SELECT conversation.id
  INTO v_conversation_id
  FROM public.conversations AS conversation
  WHERE conversation.listing_id IS NULL
    AND conversation.buyer_id = v_user_id
    AND conversation.seller_id = v_admin_id
    AND conversation.closed_at IS NULL
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  BEGIN
    INSERT INTO public.conversations (listing_id, buyer_id, seller_id)
    VALUES (NULL, v_user_id, v_admin_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.messages (conversation_id, sender_id, content, type)
    VALUES (v_conversation_id, v_user_id, 'Destek talebi oluşturuldu.', 'system');
  EXCEPTION WHEN unique_violation THEN
    SELECT conversation.id
    INTO v_conversation_id
    FROM public.conversations AS conversation
    WHERE conversation.listing_id IS NULL
      AND conversation.buyer_id = v_user_id
      AND conversation.seller_id = v_admin_id
      AND conversation.closed_at IS NULL
    LIMIT 1;
  END;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type public.message_type DEFAULT 'text',
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation public.conversations%ROWTYPE;
  v_message public.messages%ROWTYPE;
  v_is_support_admin BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Mesaj göndermek için oturum açmalısınız.';
  END IF;
  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE: Mesaj boş olamaz.';
  END IF;
  IF char_length(btrim(p_content)) > 2000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG: Mesaj 2000 karakteri aşamaz.';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  v_is_support_admin := v_conversation.listing_id IS NULL AND public.is_platform_admin();
  IF v_user_id <> v_conversation.buyer_id
     AND v_user_id <> v_conversation.seller_id
     AND NOT v_is_support_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu görüşmeye mesaj gönderemezsiniz.';
  END IF;
  IF v_conversation.listing_id IS NULL AND v_conversation.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CONVERSATION_CLOSED: Bu destek görüşmesi sonlandırıldı.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users AS blocked
    WHERE (blocked.blocker_id = v_conversation.buyer_id AND blocked.blocked_id = v_conversation.seller_id)
       OR (blocked.blocker_id = v_conversation.seller_id AND blocked.blocked_id = v_conversation.buyer_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED_CONVERSATION: Bu görüşmede mesaj gönderilemez.';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type, metadata)
  VALUES (p_conversation_id, v_user_id, btrim(p_content), p_type, p_metadata)
  RETURNING * INTO v_message;
  RETURN to_jsonb(v_message);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_support_conversation(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.';
  END IF;
  IF v_conversation.closed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'already_closed', TRUE, 'closed_at', v_conversation.closed_at);
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type)
  VALUES (p_conversation_id, auth.uid(), 'Görüşme Kıstas Destek tarafından sonlandırıldı.', 'system');

  UPDATE public.conversations
  SET closed_at = clock_timestamp(),
      closed_by = auth.uid(),
      last_message = 'Görüşme sonlandırıldı.',
      last_message_at = clock_timestamp()
  WHERE id = p_conversation_id
  RETURNING closed_at INTO v_conversation.closed_at;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'support_conversation_closed', 'conversation', p_conversation_id,
    jsonb_build_object('buyer_id', v_conversation.buyer_id, 'seller_id', v_conversation.seller_id));

  RETURN jsonb_build_object('success', TRUE, 'closed_at', v_conversation.closed_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_support_messages(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.';
  END IF;
  IF v_conversation.closed_at IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_OPEN: Mesaj geçmişi yalnızca sonlandırılmış görüşmelerde silinebilir.';
  END IF;

  DELETE FROM public.messages WHERE conversation_id = p_conversation_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  UPDATE public.conversations
  SET last_message = 'Mesaj geçmişi temizlendi.',
      buyer_unread_count = 0,
      seller_unread_count = 0
  WHERE id = p_conversation_id;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'support_messages_cleared', 'conversation', p_conversation_id,
    jsonb_build_object('deleted_count', v_deleted_count, 'buyer_id', v_conversation.buyer_id));

  RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_deleted_count);
END;
$$;

DROP POLICY IF EXISTS "Messages insertable by participants" ON public.messages;
CREATE POLICY "Messages insertable by participants"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations AS conversation
    WHERE conversation.id = messages.conversation_id
      AND (conversation.buyer_id = auth.uid() OR conversation.seller_id = auth.uid())
      AND (conversation.listing_id IS NOT NULL OR conversation.closed_at IS NULL)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.conversations AS conversation
    JOIN public.blocked_users AS blocked
      ON (blocked.blocker_id = conversation.buyer_id AND blocked.blocked_id = conversation.seller_id)
      OR (blocked.blocker_id = conversation.seller_id AND blocked.blocked_id = conversation.buyer_id)
    WHERE conversation.id = messages.conversation_id
  )
);

DROP POLICY IF EXISTS "Platform admins reply to support messages" ON public.messages;
CREATE POLICY "Platform admins reply to support messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_platform_admin()
  AND EXISTS (
    SELECT 1 FROM public.conversations AS conversation
    WHERE conversation.id = messages.conversation_id
      AND conversation.listing_id IS NULL
      AND conversation.closed_at IS NULL
  )
);

REVOKE ALL ON FUNCTION public.get_or_create_support_conversation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_close_support_conversation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clear_support_messages(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_support_conversation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_support_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_support_messages(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_close_support_conversation(UUID) IS
'Açık destek görüşmesini sonlandırır, kullanıcıya sistem mesajı bırakır ve işlemi denetim kaydına yazar.';
COMMENT ON FUNCTION public.admin_clear_support_messages(UUID) IS
'Yalnızca sonlandırılmış destek görüşmesinin mesaj geçmişini yönetici yetkisiyle temizler.';
