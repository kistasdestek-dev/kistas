export type ListingStatus =
  | 'draft'
  | 'active'
  | 'reserved'
  | 'sold'
  | 'inactive'
  | 'banned'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'disputed' | 'resolved';

export type TransactionType = 'credit' | 'debit' | 'escrow_hold' | 'escrow_release' | 'boost_spend' | 'refund' | 'admin_adjustment';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  iban?: string | null;
  identity_number?: string | null;
  available_balance: number;
  pending_balance: number;
  boost_credits: number;
  is_verified: boolean;
  rating_average: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

/** PII-free public profile view */
export interface ProfilePublic {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  district?: string | null;
  is_verified: boolean;
  rating_average: number;
  rating_count: number;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  tagline?: string | null;
  description: string;
  price: number;
  status: ListingStatus;
  is_boosted: boolean;
  boosted_until?: string | null;
  category_boosted_until?: string | null;
  upvote_count: number;
  rating_average: number;
  rating_count: number;
  platforms?: string[] | null;
  website_url?: string | null;
  app_store_url?: string | null;
  play_store_url?: string | null;
  logo_url?: string | null;
  pricing_model?: 'free' | 'freemium' | 'subscription' | 'paid' | string | null;
  view_count?: number;
  promo_code?: string | null;
  developer_name?: string | null;
  created_at: string;
  updated_at: string;
  seller?: ProfilePublic;
  images?: ListingImage[];
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order?: number;
  display_order?: number;
  is_cover?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  icon_name?: string | null;
  color_code?: string | null;
  sort_order: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  amount: number;
  status: OrderStatus;
  request_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  related_order_id?: string | null;
  related_listing_id?: string | null;
  request_id: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  evidence_urls?: string[] | null;
  status: 'opened' | 'in_review' | 'resolved' | 'dismissed';
  winner?: 'buyer' | 'seller' | null;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

/** Yorum tepkisi: 1 = beğeni, -1 = beğenmeme */
export type CommentReaction = 1 | -1;

export interface ProjectComment {
  id: string;
  listing_id: string;
  user_id: string;
  author_id?: string;
  content: string;
  body?: string;
  parent_id?: string | null;
  created_at: string;
  user?: ProfilePublic;
  /** Toplam beğeni sayısı (project_comments.likes_count) */
  likes_count: number;
  /** Toplam beğenmeme sayısı (project_comments.dislikes_count) */
  dislikes_count: number;
  /** Görüntüleyen üyenin kendi tepkisi (yoksa null) */
  my_reaction?: CommentReaction | null;
}

export interface ProjectUpvote {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
