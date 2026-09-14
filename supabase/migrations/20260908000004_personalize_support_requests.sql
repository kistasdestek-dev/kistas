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
  v_requester_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Destek için oturum açmalısınız.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0));

  SELECT profile.full_name
  INTO v_requester_name
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

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

  INSERT INTO public.conversations (listing_id, buyer_id, seller_id)
  VALUES (NULL, v_user_id, v_admin_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.messages (conversation_id, sender_id, content, type)
  VALUES (
    v_conversation_id,
    v_user_id,
    COALESCE(NULLIF(BTRIM(v_requester_name), ''), 'Kıstas üyesi') || ' destek talebi oluşturdu.',
    'system'
  );

  RETURN v_conversation_id;
END;
$$;

UPDATE public.messages AS message
SET content = COALESCE(NULLIF(BTRIM(profile.full_name), ''), 'Kıstas üyesi') || ' destek talebi oluşturdu.'
FROM public.conversations AS conversation
INNER JOIN public.profiles AS profile ON profile.id = conversation.buyer_id
WHERE message.conversation_id = conversation.id
  AND conversation.listing_id IS NULL
  AND message.sender_id = conversation.buyer_id
  AND message.type = 'system'
  AND message.content = 'Destek talebi oluşturuldu.';
