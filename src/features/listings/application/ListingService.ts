import { supabase } from '../../../core/supabase/supabaseClient';
import {
  Listing,
  CreateListingDTO,
} from '../domain/Listing';
import { toSafeHttpsUrl } from '../../../core/security/ExternalUrl';

const normalizeOptionalProjectUrl = (value?: string): string | null => {
  if (!value?.trim()) return null;
  return toSafeHttpsUrl(value);
};

const validateProjectUrls = (dto: CreateListingDTO): string | null => {
  const urls = [dto.logoUrl, dto.appStoreUrl, dto.playStoreUrl, dto.webUrl, ...(dto.imageUrls || [])];
  return urls.some((url) => url?.trim() && !toSafeHttpsUrl(url))
    ? 'Logo, görsel ve proje bağlantıları geçerli bir HTTPS adresi olmalıdır.'
    : null;
};

const validateDescription = (description: string): string | null => {
  if (!description.trim()) return 'Lütfen proje açıklamasını girin.';
  return description.length > 6000 ? 'Açıklama en fazla 6000 karakter olabilir.' : null;
};

const LISTING_SELECT = `
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
  price,
  status,
  review_feedback,
  review_requested_at,
  boosted_until,
  category_boosted_until,
  created_at,
  updated_at,
  listing_images (id, image_url, is_cover, display_order),
  profiles:seller_id (id, full_name, avatar_url, rating_average, rating_count, is_verified)
`;

interface RankedListingRow {
  project_id: string;
  weekly_support_count: number | string;
  lifetime_support_count: number;
  organic_rank: number | string;
}

interface WeeklyShowcaseRow {
  project_id: string;
  category_id: string;
  support_score: number;
  category_rank: number;
  starts_at: string;
  ends_at: string;
}

interface SponsoredListingRow {
  project_id: string;
  sponsor_position: number | string;
  active_sponsor_count: number | string;
  boosted_until: string;
}

const mapListingRow = (row: any): Listing => {
  const coverImg = row.listing_images?.find((img: any) => img.is_cover)?.image_url
    || row.listing_images?.[0]?.image_url
    || undefined;
  const sellerProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const boostExpiresAt = row.boosted_until ? Date.parse(row.boosted_until) : Number.NaN;
  const isBoosted = Number.isFinite(boostExpiresAt) && boostExpiresAt > Date.now();

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
    upvotesCount: row.upvotes_count || 0,
    price: Number(row.price || 0),
    status: row.status,
    reviewFeedback: row.review_feedback || null,
    reviewRequestedAt: row.review_requested_at || null,
    isBoosted,
    isSupportEnabled: !isBoosted,
    boostedUntil: row.boosted_until,
    categoryBoostedUntil: row.category_boosted_until || null,
    coverImageUrl: coverImg,
    images: (row.listing_images || []).map((image: any) => ({
      id: image.id,
      imageUrl: image.image_url,
      isCover: !!image.is_cover,
      displayOrder: image.display_order || 0,
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
    viewCount: 0,
    likesCount: row.upvotes_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export class ListingService {
  /**
   * Yeni Proje / Mobil Uygulama Yayınlama (Lansman)
   */
  public static async createListing(
    dto: CreateListingDTO
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        return { success: false, error: 'Proje yayınlamak için giriş yapmalısınız.' };
      }

      if (!dto.title.trim()) {
        return { success: false, error: 'Lütfen proje / uygulama adını girin.' };
      }
      if (!dto.tagline.trim()) {
        return { success: false, error: 'Lütfen kısa ve vurucu bir slogan (tagline) girin.' };
      }
      const descriptionError = validateDescription(dto.description);
      if (descriptionError) return { success: false, error: descriptionError };
      const urlError = validateProjectUrls(dto);
      if (urlError) return { success: false, error: urlError };

      // Duplicate submission guard (üst üste tıklama ve çift kayıt engeli)
      const { data: existingRecent } = await supabase
        .from('listings')
        .select('id, created_at')
        .eq('seller_id', authData.user.id)
        .eq('title', dto.title.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingRecent && existingRecent.length > 0) {
        const lastCreated = new Date(existingRecent[0].created_at).getTime();
        if (Date.now() - lastCreated < 20000) {
          // Son 20 saniye içinde aynı kullanıcı aynı başlıkla proje göndermişse mükerrer oluşturma
          return { success: true, listingId: existingRecent[0].id };
        }
      }

      // 1. Projeyi Veritabanına Ekle
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .insert({
          seller_id: authData.user.id,
          category_id: dto.categoryId || null,
          title: dto.title.trim(),
          tagline: dto.tagline.trim(),
          description: dto.description.trim(),
          logo_url: normalizeOptionalProjectUrl(dto.logoUrl),
          app_store_url: normalizeOptionalProjectUrl(dto.appStoreUrl),
          play_store_url: normalizeOptionalProjectUrl(dto.playStoreUrl),
          web_url: normalizeOptionalProjectUrl(dto.webUrl),
          platforms: dto.platforms && dto.platforms.length > 0 ? dto.platforms : ['iOS'],
          promo_code: dto.promoCode || null,
          pricing_model: dto.pricingModel || 'freemium',
          price: dto.price || 0,
          status: 'draft',
          city: 'Global',
          district: 'Online',
        })
        .select('id')
        .single();

      if (listingError || !listingData) {
        return { success: false, error: listingError?.message || 'Proje kaydedilemedi.' };
      }

      const listingId = listingData.id;

      // 2. Ekran Görüntülerini Ekle (Varsa)
      if (dto.imageUrls && dto.imageUrls.length > 0) {
        const imageInserts = dto.imageUrls.map((url, idx) => ({
          listing_id: listingId,
          image_url: url,
          display_order: idx,
          is_cover: idx === 0,
        }));

        await supabase.from('listing_images').insert(imageInserts);
      }

      return { success: true, listingId };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Beklenmeyen hata.' };
    }
  }

  /**
   * Kullanıcının kendi eklediği tüm lansman ve projeleri getirir (İncelemede, Yayında, Askıda).
   */
  public static async getUserListings(userId: string): Promise<Listing[]> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getUserListings error:', error);
        return [];
      }

      return (data || []).map(mapListingRow);
    } catch (err) {
      console.error('getUserListings exception:', err);
      return [];
    }
  }

  /**
   * Kullanıcının desteklediği (upvote verdiği) proje sayısını getirir.
   */
  public static async getUserSupportedCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('project_upvotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('getUserSupportedCount error:', error);
        return 0;
      }
      return count || 0;
    } catch (err) {
      console.error('getUserSupportedCount exception:', err);
      return 0;
    }
  }

  /**
   * Oturum sahibinin projesini günceller ve içerik değişikliklerini yeniden incelemeye gönderir.
   */
  public static async updateUserListing(
    listingId: string,
    dto: CreateListingDTO
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { success: false, error: 'Oturum açmalısınız.' };
      const descriptionError = validateDescription(dto.description);
      if (descriptionError) return { success: false, error: descriptionError };
      const urlError = validateProjectUrls(dto);
      if (urlError) return { success: false, error: urlError };

      const { data: currentListing, error: currentListingError } = await supabase
        .from('listings')
        .select('status')
        .eq('id', listingId)
        .eq('seller_id', authData.user.id)
        .maybeSingle();

      if (currentListingError || !currentListing) {
        return { success: false, error: currentListingError?.message || 'Proje bulunamadı veya güncelleme yetkiniz yok.' };
      }

      const isRevisionResubmission = currentListing.status === 'inactive';
      const listingUpdate: Record<string, unknown> = {
        category_id: dto.categoryId || null,
        title: dto.title.trim(),
        tagline: dto.tagline.trim(),
        description: dto.description.trim(),
        logo_url: normalizeOptionalProjectUrl(dto.logoUrl),
        app_store_url: normalizeOptionalProjectUrl(dto.appStoreUrl),
        play_store_url: normalizeOptionalProjectUrl(dto.playStoreUrl),
        web_url: normalizeOptionalProjectUrl(dto.webUrl),
        platforms: dto.platforms.length > 0 ? dto.platforms : ['iOS'],
        promo_code: dto.promoCode || null,
        pricing_model: dto.pricingModel || 'freemium',
        price: dto.price || 0,
      };

      if (!isRevisionResubmission) listingUpdate.status = 'draft';

      const { data: updatedListing, error: listingError } = await supabase
        .from('listings')
        .update(listingUpdate)
        .eq('id', listingId)
        .eq('seller_id', authData.user.id)
        .select('id')
        .maybeSingle();

      if (listingError || !updatedListing) {
        return { success: false, error: listingError?.message || 'Proje bulunamadı veya güncelleme yetkiniz yok.' };
      }

      const { error: deleteImagesError } = await supabase
        .from('listing_images')
        .delete()
        .eq('listing_id', listingId);
      if (deleteImagesError) return { success: false, error: deleteImagesError.message };

      if (dto.imageUrls?.length) {
        const { error: imageError } = await supabase.from('listing_images').insert(
          dto.imageUrls.map((url, index) => ({
            listing_id: listingId,
            image_url: url,
            display_order: index,
            is_cover: index === 0,
          }))
        );
        if (imageError) return { success: false, error: imageError.message };
      }

      if (isRevisionResubmission) {
        const { data: resubmission, error: resubmissionError } = await supabase.rpc('resubmit_listing_for_review', {
          p_listing_id: listingId,
        });
        if (resubmissionError || !resubmission?.success) {
          return { success: false, error: resubmissionError?.message || 'Düzeltmeler yeniden incelemeye gönderilemedi.' };
        }
      }

      return { success: true, listingId };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Proje güncellenemedi.' };
    }
  }

  /**
   * Kullanıcının kendi projesini silmesi / geri çekmesi.
   */
  public static async deleteUserListing(listingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { success: false, error: 'Oturum açmalısınız.' };

      const { data, error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('seller_id', authData.user.id)
        .select('id')
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: 'Proje bulunamadı veya silme yetkiniz yok.' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Proje silinemedi.' };
    }
  }

  /**
   * Kredi tutarından bağımsız, saatlik eşit rotasyonlu aktif Sponsorlu Vitrin.
   */
  public static async getSponsoredListings(
    categoryId?: string | null,
    limit = 30
  ): Promise<Listing[]> {
    try {
      const { data, error } = await supabase.rpc('get_sponsored_listings', {
        p_category_id: categoryId || null,
        p_limit: limit,
      });
      if (error || !data || data.length === 0) return [];

      const sponsorRows = data as SponsoredListingRow[];
      const listingsById = await this.getListingsByIds(
        sponsorRows.map((row) => row.project_id)
      );

      return sponsorRows.flatMap((sponsor) => {
        const listing = listingsById.get(sponsor.project_id);
        if (!listing) return [];
        return [{
          ...listing,
          isBoosted: true,
          isSupportEnabled: false,
          boostedUntil: sponsor.boosted_until,
          sponsorPosition: Number(sponsor.sponsor_position),
          activeSponsorCount: Number(sponsor.active_sponsor_count),
        }];
      });
    } catch {
      return [];
    }
  }

  /**
   * Kalıcı destek toplamına göre organik Popüler sıralaması.
   * Aktif sponsorlu projeler sunucu tarafında bu sonuçtan çıkarılır.
   */
  public static async getPopularListings(
    limit = 50,
    categoryId?: string | null
  ): Promise<Listing[]> {
    return this.getRankedListings('get_popular_listings', {
      p_limit: limit,
      p_category_id: categoryId || null,
    });
  }

  /**
   * İlk 30 günü içindeki, aktif ve sponsorlu olmayan yeni projeler.
   */
  public static async getNewListings(
    categoryId?: string | null,
    limit = 50
  ): Promise<Listing[]> {
    return this.getRankedListings('get_new_listings', {
      p_category_id: categoryId || null,
      p_limit: limit,
    });
  }

  /**
   * Pazartesi seçilip 7 gün boyunca sabit kalan organik kategori liderleri
   * ve kendi kategorisinde 1. sıraya yükselen şampiyonlar.
   */
  public static async getWeeklyShowcaseListings(
    categoryId?: string | null,
    throwOnError = false,
  ): Promise<Listing[]> {
    try {
      const { data, error } = await supabase.rpc('get_weekly_showcase_winners', {
        p_category_id: categoryId || null,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const winnerRows = data as WeeklyShowcaseRow[];
        const listingsById = await this.getListingsByIds(
          winnerRows.map((winner) => winner.project_id)
        );

        const winners = winnerRows.flatMap((winner, index) => {
          const listing = listingsById.get(winner.project_id);
          if (!listing) return [];
          const supportScore = Number(winner.support_score || 0);
          // Kural: Henüz hiç destek almamış proje vitrin lideri olamaz
          if (supportScore <= 0 && (listing.upvotesCount || 0) <= 0) return [];
          return [{
            ...listing,
            weeklySupportCount: supportScore,
            isWeeklyWinner: true,
            showcaseCategoryId: winner.category_id,
            showcaseStartsAt: winner.starts_at,
            showcaseEndsAt: winner.ends_at,
            showcaseGlobalRank: index + 1,
            organicRank: Number(winner.category_rank),
            categoryRank: Number(winner.category_rank),
          }];
        });
        return winners;
      }
      return [];
    } catch (error) {
      if (throwOnError) throw error;
      return [];
    }
  }

  private static async getRankedListings(
    rpcName: 'get_popular_listings' | 'get_new_listings',
    params: { p_limit: number; p_category_id: string | null }
  ): Promise<Listing[]> {
    try {
      const rankingRequest = rpcName === 'get_popular_listings'
        ? supabase.rpc('get_popular_listings', params)
        : supabase.rpc('get_new_listings', params);
      const { data: rankingData, error: rankingError } = await rankingRequest;
      if (rankingError || !rankingData || rankingData.length === 0) return [];

      const rankingRows = rankingData as RankedListingRow[];
      const listingsById = await this.getListingsByIds(
        rankingRows.map((row) => row.project_id)
      );

      return rankingRows.flatMap((ranking) => {
        const listing = listingsById.get(ranking.project_id);
        if (!listing) return [];
        return [{
          ...listing,
          upvotesCount: Number(ranking.lifetime_support_count || 0),
          likesCount: Number(ranking.lifetime_support_count || 0),
          weeklySupportCount: Number(ranking.weekly_support_count || 0),
          organicRank: Number(ranking.organic_rank),
        }];
      });
    } catch {
      return [];
    }
  }

  private static async getListingsByIds(projectIds: string[]): Promise<Map<string, Listing>> {
    if (projectIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .in('id', projectIds);

    if (error || !data) return new Map();
    return new Map(data.map((row: any) => [row.id, mapListingRow(row)] as const));
  }

  /**
   * Topluluk Upvote (Destek Oyu) Verme / Geri Alma
   */
  public static async toggleUpvote(
    projectId: string
  ): Promise<{ success: boolean; action?: 'upvoted' | 'unvoted' | 'already_upvoted'; upvotes_count?: number; error?: string; code?: string }> {
    try {
      const { data, error } = await supabase.rpc('toggle_project_upvote', {
        p_project_id: projectId,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Destek işlemi gerçekleştirilemedi.' };
    }
  }

  /**
   * Giriş yapmış kullanıcının belirtilen projeyi destekleyip desteklemediğini kontrol eder.
   */
  public static async hasUserUpvoted(projectId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return false;

      const { data, error } = await supabase
        .from('project_upvotes')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', authData.user.id)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Giriş yapmış kullanıcının desteklediği tüm proje ID'lerinin kümesini döner.
   */
  public static async getUserUpvotedProjectIds(): Promise<Set<string>> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return new Set();

      const { data, error } = await supabase
        .from('project_upvotes')
        .select('project_id')
        .eq('user_id', authData.user.id);

      if (error || !data) return new Set();
      return new Set(data.map((row: any) => String(row.project_id)));
    } catch {
      return new Set();
    }
  }

  public static async getListingById(id: string): Promise<Listing | null> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return mapListingRow(data);
    } catch {
      return null;
    }
  }

  /**
   * Kategoriye Özel Bağımsız Sponsorlu Vitrin Projeleri
   * Sadece bu kategoriye sponsor olmuş aktif projeleri getirir.
   */
  public static async getCategorySponsoredListings(
    categoryId: string,
    limit = 8
  ): Promise<Listing[]> {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'active')
        .eq('category_id', categoryId)
        .gt('category_boosted_until', nowIso)
        .order('category_boosted_until', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row: any) => ({
        ...mapListingRow(row),
        isBoosted: true,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Kategoriye Özel Projeler (Keşfet mantığında izole Popüler, En Çok Desteklenen ve Yeni)
   * Bu sıralama sadece kategori içine özel kalır, genel Keşfet'e taşmaz.
   */
  public static async getCategoryListings(
    categoryId: string,
    sort: 'popular' | 'top_voted' | 'newest' = 'popular',
    platform?: any,
    limit = 40
  ): Promise<Listing[]> {
    try {
      if (sort === 'popular') {
        const ranked = await this.getRankedListings('get_popular_listings', {
          p_limit: limit,
          p_category_id: categoryId,
        });

        if (ranked.length > 0) {
          const filtered = platform && platform !== 'all'
            ? ranked.filter((p) => p.platforms?.includes(platform))
            : ranked;
          return filtered.map((item, idx) => ({
            ...item,
            categoryRank: idx + 1,
          }));
        }
      }

      if (sort === 'newest') {
        const ranked = await this.getRankedListings('get_new_listings', {
          p_limit: limit,
          p_category_id: categoryId,
        });
        const filtered = platform && platform !== 'all'
          ? ranked.filter((p) => p.platforms?.includes(platform))
          : ranked;
        return filtered.map((item, idx) => ({
          ...item,
          categoryRank: idx + 1,
        }));
      }

      // Popüler RPC fallback'i veya 'top_voted' doğrudan sorgusu.
      let query = supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'active')
        .eq('category_id', categoryId);

      if (platform && platform !== 'all') {
        query = query.contains('platforms', [platform]);
      }

      query = query.order('upvotes_count', { ascending: false }).order('created_at', { ascending: false });

      const { data, error } = await query.limit(limit);
      if (error || !data) return [];

      return data.map((row: any, idx: number) => ({
        ...mapListingRow(row),
        categoryRank: idx + 1,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Kategorinin 1. sırasındaki lider projeyi getirir.
   */
  public static async getCategoryLeader(categoryId: string): Promise<Listing | null> {
    const list = await this.getCategoryListings(categoryId, 'popular', 'all', 1);
    return list.length > 0 ? list[0] : null;
  }

}
