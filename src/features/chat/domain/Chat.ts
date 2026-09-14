/**
 * Chat & Offers Domain Models
 */

export type MessageType = 'text' | 'image' | 'location' | 'offer' | 'system';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'cancelled';

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  offeredPrice: number;
  counterPrice?: number | null;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    coverImageUrl?: string;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  metadata?: {
    offerId?: string;
    offeredPrice?: number;
    offerStatus?: OfferStatus;
    imageUrl?: string;
  } | null;
  isFlagged: boolean;
  flagReason?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId?: string | null;
  buyerId: string;
  sellerId: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  unreadCount: number;
  closedAt?: string | null;
  closedBy?: string | null;
  listing?: {
    id: string;
    title: string;
    price: number;
    coverImageUrl?: string;
  };
  otherParty?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}
