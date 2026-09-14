-- Every verified platform admin can operate the shared support inbox.
CREATE POLICY "Platform admins view support conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (listing_id IS NULL AND public.is_platform_admin());

CREATE POLICY "Platform admins view support messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin()
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS conversation
    WHERE conversation.id = messages.conversation_id
      AND conversation.listing_id IS NULL
  )
);

CREATE POLICY "Platform admins reply to support messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_platform_admin()
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS conversation
    WHERE conversation.id = messages.conversation_id
      AND conversation.listing_id IS NULL
  )
);

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = NEW.content,
      last_message_at = NEW.created_at,
      buyer_unread_count = CASE WHEN NEW.sender_id <> buyer_id THEN buyer_unread_count + 1 ELSE buyer_unread_count END,
      seller_unread_count = CASE WHEN NEW.sender_id = buyer_id THEN seller_unread_count + 1 ELSE seller_unread_count END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_listing_id UUID;
  v_is_support_admin BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
  END IF;

  SELECT conversation.buyer_id, conversation.seller_id, conversation.listing_id
  INTO v_buyer_id, v_seller_id, v_listing_id
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id;

  v_is_support_admin := v_listing_id IS NULL AND public.is_platform_admin();

  IF v_user_id <> v_buyer_id AND v_user_id <> v_seller_id AND NOT v_is_support_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu konuşmaya erişemezsiniz.';
  END IF;

  UPDATE public.conversations
  SET buyer_unread_count = CASE WHEN v_user_id = v_buyer_id THEN 0 ELSE buyer_unread_count END,
      seller_unread_count = CASE WHEN v_user_id = v_seller_id OR v_is_support_admin THEN 0 ELSE seller_unread_count END
  WHERE id = p_conversation_id;

  UPDATE public.messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id <> v_user_id
    AND is_read = FALSE;
END;
$$;
