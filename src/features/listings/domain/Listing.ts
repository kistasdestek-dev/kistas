/**
 * Kıstas Digital Project & App Showcase Domain Models
 * Product Hunt + App Store + organik keşif ve adil sponsor vitrini hibriti
 */

export type PlatformType = 'iOS' | 'Android' | 'Web' | 'macOS' | 'SaaS';
export type PricingModel = 'free' | 'freemium' | 'paid' | 'subscription';
export type ProjectStatus = 'draft' | 'active' | 'featured' | 'inactive' | 'banned';

export interface ProjectScreenshot {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isCover: boolean;
}

export interface Listing {
  id: string;
  sellerId: string; // Maker / Developer User ID
  categoryId?: string | null;
  title: string;
  tagline?: string;
  description: string;
  developerName?: string | null;
  isEditorial?: boolean;
  logoUrl?: string;
  coverImageUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  webUrl?: string;
  platforms?: PlatformType[];
  promoCode?: string;
  pricingModel?: PricingModel;
  upvotesCount: number;
  weeklySupportCount?: number;
  showcaseSupportCount?: number;
  organicRank?: number;
  isDailyShowcaseWinner?: boolean;
  showcaseCategoryId?: string;
  showcaseCategoryName?: string;
  showcaseStartsAt?: string;
  showcaseEndsAt?: string;
  showcaseGlobalRank?: number;
  rotationRank?: number;
  hasUpvoted?: boolean;
  price?: number; // Opsiyonel (Örn: Uygulama İçi Satın Alma / Başlangıç Fiyatı)
  status: ProjectStatus;
  reviewFeedback?: string | null;
  reviewRequestedAt?: string | null;
  isBoosted?: boolean;
  isSupportEnabled?: boolean;
  boostedUntil?: string | null;
  categoryBoostedUntil?: string | null;
  categoryRank?: number;
  sponsorPosition?: number;
  activeSponsorCount?: number;
  images?: ProjectScreenshot[];
  seller?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    ratingAverage: number;
    ratingCount: number;
    isVerified: boolean;
  };
  city?: string;
  district?: string;
  deliveryType?: any;
  cargoSize?: any;
  viewCount: number;
  likesCount: number;
  isNegotiable?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Genel Keşfet sponsorluğunu boostedUntil alanından çözümler.
 */
export const isListingSponsored = (
  listing: Pick<Listing, 'boostedUntil'>,
  referenceTime = Date.now()
): boolean => {
  if (!listing.boostedUntil) return false;
  const expiresAt = Date.parse(listing.boostedUntil);
  return Number.isFinite(expiresAt) && expiresAt > referenceTime;
};

export const isListingGlobalSponsored = isListingSponsored;

/**
 * Kategoriye özel bağımsız sponsorluğu categoryBoostedUntil alanından çözümler.
 */
export const isListingCategorySponsored = (
  listing: Pick<Listing, 'categoryBoostedUntil'>,
  referenceTime = Date.now()
): boolean => {
  if (!listing.categoryBoostedUntil) return false;
  const expiresAt = Date.parse(listing.categoryBoostedUntil);
  return Number.isFinite(expiresAt) && expiresAt > referenceTime;
};

export interface CreateListingDTO {
  title: string;
  tagline: string;
  description: string;
  categoryId: string;
  logoUrl?: string;
  coverImageUrl?: string;
  platforms: PlatformType[];
  appStoreUrl?: string;
  playStoreUrl?: string;
  webUrl?: string;
  promoCode?: string;
  pricingModel: PricingModel;
  price?: number;
  imageUrls?: string[];
}
