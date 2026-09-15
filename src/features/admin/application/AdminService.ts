import { supabase } from '../../../core/supabase/supabaseClient';
import { ProjectStatus } from '../../listings/domain/Listing';
import { AdminAccess, AdminListingItem, AdminPermission, AdminUserSummary, PlatformStats } from '../domain/AdminModels';

const ADMIN_LISTING_SELECT = `
  id,
  seller_id,
  category_id,
  title,
  tagline,
  description,
  developer_name,
  is_editorial,
  logo_url,
  app_store_url,
  play_store_url,
  web_url,
  platforms,
  promo_code,
  pricing_model,
  upvotes_count,
  view_count,
  price,
  status,
  review_feedback,
  review_requested_at,
  boosted_until,
  created_at,
  updated_at,
  listing_images (id, image_url, is_cover, display_order),
  profiles:seller_id (id, full_name, avatar_url, rating_average, rating_count, is_verified)
`;

interface AdminUserRow {
  user_id: string;
  full_name: string;
  email?: string;
  user_role: 'admin' | 'staff' | 'user';
  boost_credits: number | string;
  available_balance: number | string;
  is_verified: boolean;
  projects_count: number | string;
  comment_muted_until?: string | null;
  admin_permissions?: AdminPermission[] | null;
  is_admin_owner?: boolean;
  created_at: string;
}

interface AdminStatsRow {
  total_projects?: number;
  active_projects?: number;
  sponsored_projects?: number;
  pending_projects?: number;
  total_upvotes?: number;
  total_users?: number;
  circulating_credits?: number;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return fallback;
};

const mapListing = (row: any): AdminListingItem => {
  const coverImageUrl = row.listing_images?.find((image: any) => image.is_cover)?.image_url
    || row.listing_images?.[0]?.image_url
    || undefined;
  const sellerProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const boostExpiry = row.boosted_until ? Date.parse(row.boosted_until) : Number.NaN;
  const isSponsored = Number.isFinite(boostExpiry) && boostExpiry > Date.now();

  return {
    id: row.id,
    sellerId: row.seller_id,
    categoryId: row.category_id,
    title: row.title,
    tagline: row.tagline || 'Yenilikçi dijital proje',
    description: row.description,
    developerName: row.developer_name || null,
    isEditorial: row.is_editorial === true,
    logoUrl: row.logo_url,
    appStoreUrl: row.app_store_url,
    playStoreUrl: row.play_store_url,
    webUrl: row.web_url,
    platforms: row.platforms || ['iOS'],
    promoCode: row.promo_code,
    pricingModel: row.pricing_model || 'freemium',
    upvotesCount: Number(row.upvotes_count || 0),
    price: Number(row.price || 0),
    status: row.status,
    reviewFeedback: row.review_feedback || null,
    reviewRequestedAt: row.review_requested_at || null,
    isBoosted: isSponsored,
    isSupportEnabled: !isSponsored,
    boostedUntil: row.boosted_until,
    coverImageUrl,
    images: (row.listing_images || []).map((image: any) => ({
      id: image.id,
      imageUrl: image.image_url,
      isCover: !!image.is_cover,
      displayOrder: Number(image.display_order || 0),
    })),
    seller: sellerProfile
      ? {
          id: sellerProfile.id,
          fullName: sellerProfile.full_name,
          avatarUrl: sellerProfile.avatar_url,
          ratingAverage: Number(sellerProfile.rating_average || 5),
          ratingCount: Number(sellerProfile.rating_count || 0),
          isVerified: !!sellerProfile.is_verified || row.status === 'active',
        }
      : undefined,
    viewCount: Number(row.view_count || 0),
    likesCount: Number(row.upvotes_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export class AdminService {
  public static async getCurrentAccess(): Promise<AdminAccess> {
    const { data, error } = await supabase.rpc('get_current_admin_access');
    if (error || !data) return { isAdmin: false, isOwner: false, permissions: [] };
    const row = data as { is_admin?: boolean; is_owner?: boolean; permissions?: AdminPermission[] };
    return {
      isAdmin: row.is_admin === true,
      isOwner: row.is_owner === true,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    };
  }

  public static async getAllListings(): Promise<AdminListingItem[]> {
    const { data, error } = await supabase
      .from('listings')
      .select(ADMIN_LISTING_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapListing);
  }

  public static async updateListingStatus(
    listingId: string,
    status: ProjectStatus
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_listing_status', {
        p_listing_id: listingId,
        p_status: status,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Proje durumu güncellenemedi.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Proje durumu güncellenemedi.') };
    }
  }

  public static async requestListingRevision(
    listingId: string,
    feedback: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_request_listing_revision', {
        p_listing_id: listingId,
        p_feedback: feedback.trim(),
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Düzeltme talebi gönderilemedi.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Düzeltme talebi gönderilemedi.') };
    }
  }

  public static async updateListingCategory(
    listingId: string,
    categoryId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Try secure Admin RPC with audit logging
      const { data, error } = await supabase.rpc('admin_update_listing_category', {
        p_listing_id: listingId,
        p_category_id: categoryId,
      });

      if (!error && data?.success) {
        return { success: true };
      }

      if (error && error.code !== 'PGRST202') {
        return { success: false, error: error.message || 'Kategori güncellenemedi.' };
      }

      // 2. Direct table update fallback (if RPC is not yet discovered in schema cache)
      const { error: directError } = await supabase
        .from('listings')
        .update({ category_id: categoryId, updated_at: new Date().toISOString() })
        .eq('id', listingId);

      if (directError) {
        return { success: false, error: directError.message || error?.message || 'Kategori güncellenemedi.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Kategori güncellenemedi.') };
    }
  }

  public static async grantProjectSupport(
    listingId: string,
    amount: number
  ): Promise<{ success: boolean; newUpvotesCount?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_grant_project_support', {
        p_listing_id: listingId,
        p_amount: amount,
      });

      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Yönetim desteği tanımlanamadı.' };
      }

      return {
        success: true,
        newUpvotesCount: Number(data.new_upvotes_count ?? 0),
      };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Yönetim desteği tanımlanamadı.') };
    }
  }

  public static async setProjectSponsorship(
    listingId: string,
    durationHours: 0 | 24 | 72 | 168
  ): Promise<{ success: boolean; boostedUntil?: string | null; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_set_listing_sponsorship', {
        p_listing_id: listingId,
        p_duration_hours: durationHours,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Sponsor süresi güncellenemedi.' };
      }
      return { success: true, boostedUntil: data.boosted_until };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Sponsor süresi güncellenemedi.') };
    }
  }

  public static async deleteListing(
    listingId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_delete_listing', {
        p_listing_id: listingId,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Proje silinemedi.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Proje silinemedi.') };
    }
  }

  public static async getAllUsers(): Promise<AdminUserSummary[]> {
    const { data, error } = await supabase.rpc('get_admin_users');
    if (error) throw new Error(error.message);

    return ((data || []) as AdminUserRow[]).map((row) => ({
      id: row.user_id,
      fullName: row.full_name,
      email: row.email,
      role: row.user_role,
      adminPermissions: row.admin_permissions || [],
      isAdminOwner: row.is_admin_owner === true,
      boostCredits: Number(row.boost_credits || 0),
      balance: Number(row.available_balance || 0),
      isVerified: !!row.is_verified,
      projectsCount: Number(row.projects_count || 0),
      commentMutedUntil: row.comment_muted_until || null,
      createdAt: row.created_at,
    }));
  }

  public static async setTeamMemberPermissions(
    userId: string,
    permissions: AdminPermission[]
  ): Promise<{ success: boolean; permissions?: AdminPermission[]; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_set_team_member', {
        p_user_id: userId,
        p_permissions: permissions,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Ekip yetkileri güncellenemedi.' };
      }
      return { success: true, permissions: data.permissions || [] };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Ekip yetkileri güncellenemedi.') };
    }
  }

  public static async grantUserCredits(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; newCredits?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_grant_credits', {
        p_user_id: userId,
        p_amount: amount,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Kredi tanımlanamadı.' };
      }
      return { success: true, newCredits: Number(data.new_credits) };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Kredi tanımlanamadı.') };
    }
  }

  public static async setUserCommentMute(
    userId: string,
    muted: boolean
  ): Promise<{ success: boolean; mutedUntil?: string | null; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_set_comment_mute', {
        p_user_id: userId,
        p_muted: muted,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || 'Yorum yetkisi güncellenemedi.' };
      }
      return { success: true, mutedUntil: data.muted_until || null };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Yorum yetkisi güncellenemedi.') };
    }
  }

  public static async getPlatformStats(): Promise<PlatformStats> {
    const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
    if (error) throw new Error(error.message);

    const stats = (data || {}) as AdminStatsRow;
    return {
      totalProjects: Number(stats.total_projects || 0),
      activeProjects: Number(stats.active_projects || 0),
      sponsoredProjects: Number(stats.sponsored_projects || 0),
      pendingProjects: Number(stats.pending_projects || 0),
      totalUpvotes: Number(stats.total_upvotes || 0),
      totalUsers: Number(stats.total_users || 0),
      circulatingCredits: Number(stats.circulating_credits || 0),
    };
  }
}
