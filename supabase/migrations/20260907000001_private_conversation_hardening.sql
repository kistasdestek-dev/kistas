-- A listing conversation may only be created by the signed-in user with the
-- actual owner of that listing. Reading and messaging remain participant-only.
DROP POLICY IF EXISTS "Users can create conversation" ON public.conversations;
CREATE POLICY "Users can create listing conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND buyer_id <> seller_id
  AND listing_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = conversations.listing_id
      AND listing.seller_id = conversations.seller_id
      AND listing.status = 'active'
  )
);

DROP POLICY IF EXISTS "Conversations viewable by participants" ON public.conversations;
CREATE POLICY "Conversations viewable by participants"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Messages viewable by participants" ON public.messages;
DROP POLICY IF EXISTS "Messages viewable by conversation participants" ON public.messages;
CREATE POLICY "Messages viewable by participants"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations conversation
    WHERE conversation.id = messages.conversation_id
      AND (conversation.buyer_id = auth.uid() OR conversation.seller_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Messages insertable by participants" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Messages insertable by participants"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations conversation
    WHERE conversation.id = messages.conversation_id
      AND (conversation.buyer_id = auth.uid() OR conversation.seller_id = auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.conversations conversation
    JOIN public.blocked_users blocked
      ON (blocked.blocker_id = conversation.buyer_id AND blocked.blocked_id = conversation.seller_id)
      OR (blocked.blocker_id = conversation.seller_id AND blocked.blocked_id = conversation.buyer_id)
    WHERE conversation.id = messages.conversation_id
  )
);
