CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
  END IF;

  SELECT conversation.buyer_id, conversation.seller_id
  INTO v_buyer_id, v_seller_id
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id;

  IF v_user_id <> v_buyer_id AND v_user_id <> v_seller_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu konuşmaya erişemezsiniz.';
  END IF;

  UPDATE public.conversations
  SET buyer_unread_count = CASE WHEN v_user_id = v_buyer_id THEN 0 ELSE buyer_unread_count END,
      seller_unread_count = CASE WHEN v_user_id = v_seller_id THEN 0 ELSE seller_unread_count END
  WHERE id = p_conversation_id;

  UPDATE public.messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id <> v_user_id
    AND is_read = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
