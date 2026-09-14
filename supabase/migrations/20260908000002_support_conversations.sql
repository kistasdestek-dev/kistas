-- Creates one private, listing-independent support conversation per user/admin pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_support_pair
ON public.conversations (buyer_id, seller_id)
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
    LIMIT 1;
  END;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_support_conversation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_support_conversation() TO authenticated;

COMMENT ON FUNCTION public.get_or_create_support_conversation() IS
'Oturumdaki kullanıcı için platform yöneticisiyle tekil ve özel destek konuşması oluşturur veya mevcut konuşmayı döndürür.';
