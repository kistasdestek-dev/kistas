import type { Conversation } from '@/lib/services/chat';

/** A support request shows the member to staff, and the official channel to the member. */
export const getConversationIdentity = (conversation: Conversation, currentUserId: string) => {
  const isSupport = !conversation.listingId;
  const isOfficialSupport = isSupport && conversation.buyerId === currentUserId;
  const otherParty = conversation.otherParty;

  return {
    isSupport,
    isOfficialSupport,
    name: isOfficialSupport ? 'Kıstas Destek' : otherParty?.fullName?.trim() || 'Kıstas Üyesi',
    avatarUrl: isOfficialSupport ? null : otherParty?.avatarUrl || null,
    isVerified: !isOfficialSupport && Boolean(otherParty?.isVerified),
  };
};
