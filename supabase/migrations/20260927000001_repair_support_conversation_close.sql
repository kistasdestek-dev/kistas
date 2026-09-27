-- Faz 3: Destek görüşmesi kapanış yaşam döngüsünü Faz 18 regresyonundan onarır.
-- Var olmayan conversations.is_archived alanını kullanmaz; görev bazlı yetki,
-- destek kapsamı, idempotency, sistem mesajı ve denetim izini geri getirir.

CREATE OR REPLACE FUNCTION public.admin_close_support_conversation(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Destek yönetimi yetkisi gerekli.' USING ERRCODE = '42501';
  END IF;

  IF p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Görüşme kimliği gerekli.' USING ERRCODE = '22023';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.' USING ERRCODE = 'P0001';
  END IF;

  IF v_conversation.closed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_closed', TRUE,
      'closed_at', v_conversation.closed_at
    );
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type)
  VALUES (
    p_conversation_id,
    auth.uid(),
    'Görüşme Kıstas Destek tarafından sonlandırıldı.',
    'system'
  );

  UPDATE public.conversations
  SET closed_at = clock_timestamp(),
      closed_by = auth.uid(),
      last_message = 'Görüşme sonlandırıldı.',
      last_message_at = clock_timestamp()
  WHERE id = p_conversation_id
  RETURNING * INTO v_conversation;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'support_conversation_closed',
    'conversation',
    p_conversation_id,
    jsonb_build_object(
      'buyer_id', v_conversation.buyer_id,
      'seller_id', v_conversation.seller_id
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'already_closed', FALSE,
    'closed_at', v_conversation.closed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_close_support_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_close_support_conversation(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_close_support_conversation(UUID) IS
'Yalnız community yetkili yöneticinin açık destek görüşmesini atomik ve denetlenebilir biçimde sonlandırmasını sağlar.';
