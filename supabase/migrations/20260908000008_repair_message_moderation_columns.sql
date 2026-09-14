-- The initial schema can create messages before the production security
-- migration runs. CREATE TABLE IF NOT EXISTS does not add later columns, so
-- repair existing databases explicitly.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Recreate the delivery function after the table row type has been repaired.
-- Returning the row as JSON also keeps the response aligned with the table.
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

  IF CHAR_LENGTH(BTRIM(p_content)) > 2000 THEN
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

  RETURN to_jsonb(v_message);
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;

COMMENT ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) IS
  'Validates conversation access and atomically persists a chat message.';
