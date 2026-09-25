-- Güvenli yazıyor durumu, gerçek okundu bilgisi ve yönetici duyuru dağıtımı.

CREATE TABLE IF NOT EXISTS public.conversation_typing_states (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_typing_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_typing_states REPLICA IDENTITY FULL;
REVOKE ALL ON TABLE public.conversation_typing_states FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.conversation_typing_states FROM authenticated;
GRANT SELECT ON TABLE public.conversation_typing_states TO authenticated, service_role;

DROP POLICY IF EXISTS "typing_states_select_authorized" ON public.conversation_typing_states;
CREATE POLICY "typing_states_select_authorized"
ON public.conversation_typing_states FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations AS conversation
    WHERE conversation.id = conversation_typing_states.conversation_id
      AND (
        auth.uid() IN (conversation.buyer_id, conversation.seller_id)
        OR (conversation.listing_id IS NULL AND public.has_admin_permission('community'))
      )
  )
);

CREATE OR REPLACE FUNCTION public.set_conversation_typing(
  p_conversation_id UUID,
  p_is_typing BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation public.conversations%ROWTYPE;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Yazıyor durumu için oturum açmalısınız.';
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  v_is_authorized := v_user_id IN (v_conversation.buyer_id, v_conversation.seller_id)
    OR (v_conversation.listing_id IS NULL AND public.has_admin_permission('community'));

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu görüşmenin yazıyor durumunu değiştiremezsiniz.';
  END IF;
  IF v_conversation.closed_at IS NOT NULL THEN
    DELETE FROM public.conversation_typing_states
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
    RETURN jsonb_build_object('success', TRUE, 'is_typing', FALSE);
  END IF;

  IF COALESCE(p_is_typing, FALSE) THEN
    INSERT INTO public.conversation_typing_states (conversation_id, user_id, expires_at)
    VALUES (p_conversation_id, v_user_id, clock_timestamp() + INTERVAL '6 seconds')
    ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at,
        updated_at = clock_timestamp();
  ELSE
    DELETE FROM public.conversation_typing_states
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'is_typing', COALESCE(p_is_typing, FALSE));
END;
$$;

CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 5 AND 240),
  action_label TEXT NOT NULL CHECK (char_length(action_label) BETWEEN 2 AND 32),
  action_path TEXT NOT NULL,
  template_key TEXT NOT NULL CHECK (template_key IN ('new_projects', 'popular_projects', 'discover', 'custom')),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 80),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (created_by, idempotency_key)
);

ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_announcements FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.admin_announcements TO authenticated, service_role;

DROP POLICY IF EXISTS "admin_announcements_select_authorized" ON public.admin_announcements;
CREATE POLICY "admin_announcements_select_authorized"
ON public.admin_announcements FOR SELECT TO authenticated
USING (public.has_admin_permission('community'));

CREATE OR REPLACE FUNCTION public.admin_send_announcement(
  p_title TEXT,
  p_body TEXT,
  p_action_label TEXT,
  p_action_path TEXT,
  p_template_key TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_announcement_id UUID;
  v_recipient_count INTEGER := 0;
  v_existing public.admin_announcements%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Duyuru göndermek için topluluk yönetimi yetkisi gerekli.';
  END IF;

  -- Aynı yöneticinin eşzamanlı isteklerini sırala; saatlik kota yarış koşuluyla aşılamaz.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_admin_id::TEXT, 0)
  );

  SELECT announcement.* INTO v_existing
  FROM public.admin_announcements AS announcement
  WHERE announcement.created_by = v_admin_id
    AND announcement.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'announcement_id', v_existing.id,
      'recipient_count', v_existing.recipient_count,
      'already_sent', TRUE
    );
  END IF;

  IF btrim(COALESCE(p_title, '')) = '' OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 80 THEN
    RAISE EXCEPTION 'INVALID_TITLE: Duyuru başlığı 3-80 karakter olmalıdır.';
  END IF;
  IF btrim(COALESCE(p_body, '')) = '' OR char_length(btrim(p_body)) NOT BETWEEN 5 AND 240 THEN
    RAISE EXCEPTION 'INVALID_BODY: Duyuru metni 5-240 karakter olmalıdır.';
  END IF;
  IF btrim(COALESCE(p_action_label, '')) = '' OR char_length(btrim(p_action_label)) NOT BETWEEN 2 AND 32 THEN
    RAISE EXCEPTION 'INVALID_ACTION_LABEL: Aksiyon metni 2-32 karakter olmalıdır.';
  END IF;
  IF p_action_path NOT IN ('/', '/browse', '/new', '/popular', '/blog') THEN
    RAISE EXCEPTION 'INVALID_ACTION_PATH: Yalnızca izinli Kıstas rotaları kullanılabilir.';
  END IF;
  IF p_template_key NOT IN ('new_projects', 'popular_projects', 'discover', 'custom') THEN
    RAISE EXCEPTION 'INVALID_TEMPLATE: Geçersiz duyuru şablonu.';
  END IF;
  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 16 AND 80 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: Geçerli bir işlem anahtarı gereklidir.';
  END IF;
  IF (
    SELECT count(*)
    FROM public.admin_announcements AS announcement
    WHERE announcement.created_by = v_admin_id
      AND announcement.created_at > clock_timestamp() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED: Bir saat içinde en fazla 5 duyuru gönderilebilir.';
  END IF;

  INSERT INTO public.admin_announcements (
    created_by, title, body, action_label, action_path, template_key, idempotency_key
  ) VALUES (
    v_admin_id,
    btrim(p_title),
    btrim(p_body),
    btrim(p_action_label),
    p_action_path,
    p_template_key,
    p_idempotency_key
  )
  ON CONFLICT (created_by, idempotency_key) DO NOTHING
  RETURNING id INTO v_announcement_id;

  IF v_announcement_id IS NULL THEN
    SELECT announcement.* INTO v_existing
    FROM public.admin_announcements AS announcement
    WHERE announcement.created_by = v_admin_id
      AND announcement.idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object(
      'success', TRUE,
      'announcement_id', v_existing.id,
      'recipient_count', v_existing.recipient_count,
      'already_sent', TRUE
    );
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  SELECT
    profile.id,
    v_admin_id,
    'admin_announcement',
    btrim(p_title),
    btrim(p_body),
    jsonb_build_object(
      'announcement_id', v_announcement_id,
      'action_label', btrim(p_action_label),
      'action_path', p_action_path,
      'template_key', p_template_key
    )
  FROM public.profiles AS profile;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;

  UPDATE public.admin_announcements
  SET recipient_count = v_recipient_count
  WHERE id = v_announcement_id;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    v_admin_id,
    'admin_announcement_sent',
    'admin_announcement',
    v_announcement_id,
    jsonb_build_object(
      'template_key', p_template_key,
      'action_path', p_action_path,
      'recipient_count', v_recipient_count
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'announcement_id', v_announcement_id,
    'recipient_count', v_recipient_count,
    'already_sent', FALSE
  );
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_typing_states'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_typing_states;
  END IF;
END $$;

COMMENT ON PUBLICATION supabase_realtime IS
'KISTAS RLS korumalı Realtime yayını: messages, conversations, project_comments, notifications ve conversation_typing_states; hassas finans/PII tabloları hariçtir.';

REVOKE ALL ON FUNCTION public.set_conversation_typing(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_send_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_conversation_typing(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.set_conversation_typing(UUID, BOOLEAN) IS
'Yalnız görüşme katılımcısı veya topluluk destek yetkilisi için altı saniyelik yazıyor durumu üretir.';
COMMENT ON FUNCTION public.admin_send_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
'Yetkili yöneticinin izinli Kıstas rotasına yönlenen, hız sınırlı ve idempotent toplu duyuru göndermesini sağlar.';
