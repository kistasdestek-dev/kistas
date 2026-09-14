-- Message delivery goes through one audited authorization boundary. This also
-- lets any platform admin answer support requests without becoming the
-- conversation's assigned seller.
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

  IF p_content IS NULL OR BTRIM(p_content) = '' THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE: Mesaj boş olamaz.';
  END IF;

  IF CHAR_LENGTH(p_content) > 2000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG: Mesaj 2000 karakteri aşamaz.';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  v_is_support_admin := v_conversation.listing_id IS NULL AND public.is_platform_admin();

  IF v_user_id <> v_conversation.buyer_id
     AND v_user_id <> v_conversation.seller_id
     AND NOT v_is_support_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu görüşmeye mesaj gönderemezsiniz.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocked_users AS blocked
    WHERE (blocked.blocker_id = v_conversation.buyer_id AND blocked.blocked_id = v_conversation.seller_id)
       OR (blocked.blocker_id = v_conversation.seller_id AND blocked.blocked_id = v_conversation.buyer_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED_CONVERSATION: Bu görüşmede mesaj gönderilemez.';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type, metadata)
  VALUES (p_conversation_id, v_user_id, BTRIM(p_content), p_type, p_metadata)
  RETURNING * INTO v_message;

  RETURN jsonb_build_object(
    'id', v_message.id,
    'conversation_id', v_message.conversation_id,
    'sender_id', v_message.sender_id,
    'content', v_message.content,
    'type', v_message.type,
    'metadata', v_message.metadata,
    'is_flagged', v_message.is_flagged,
    'flag_reason', v_message.flag_reason,
    'created_at', v_message.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;
