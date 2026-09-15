import { supabase } from '../../../core/supabase/supabaseClient';

export type BoostScope = 'global' | 'category';

export interface BoostPackage {
  id: string;
  scope: BoostScope;
  title: string;
  durationHours: number;
  creditCost: number;
  priceTRY: number;
  badge: string;
  description?: string;
}

const toBoostErrorMessage = (message?: string): string => {
  const normalized = (message || '').toLowerCase();
  if (normalized.includes('insufficient_credits')) return 'Bu işlem için yeterli Vitrin Krediniz bulunmuyor.';
  if (normalized.includes('forbidden')) return 'Yalnızca kendi projenizi Vitrin Desteğine alabilirsiniz.';
  if (normalized.includes('listing_not_found')) return 'Aktif proje bulunamadı.';
  if (normalized.includes('invalid_boost_package')) return 'Seçilen Vitrin Desteği paketi geçerli değil.';
  return 'Vitrin Desteği şu anda tamamlanamadı. Lütfen yeniden deneyin.';
};

export class CreditService {
  public static async getVisibilityCreditsSpent(): Promise<number> {
    const { data, error } = await supabase.rpc('get_my_visibility_credits_spent');

    if (error) throw error;
    return Math.max(0, Number(data) || 0);
  }

  /**
   * Genel Keşfet Vitrini Paketleri (Amiral Gemisi - En Yüksek Görünürlük)
   */
  public static getGlobalBoostPackages(): BoostPackage[] {
    return [
      {
        id: 'pkg-global-24h',
        scope: 'global',
        title: '24 Saat Keşfet Vitrini',
        durationHours: 24,
        creditCost: 200,
        priceTRY: 149,
        badge: '⚡ 24 Saat Görünürlük',
        description: 'Tüm platformun ana sayfası olan Keşfet vitrininde saatlik rotasyona girin.',
      },
      {
        id: 'pkg-global-3d',
        scope: 'global',
        title: '3 Gün Keşfet Vitrini',
        durationHours: 72,
        creditCost: 450,
        priceTRY: 299,
        badge: '🔥 3 Gün Görünürlük',
        description: '3 gün boyunca amiral gemisi Keşfet ana sayfasında maksimum kitleye ulaşın.',
      },
      {
        id: 'pkg-global-7d',
        scope: 'global',
        title: '7 Gün Keşfet Vitrini (Amiral Gemisi)',
        durationHours: 168,
        creditCost: 900,
        priceTRY: 549,
        badge: '👑 7 Gün Prestij',
        description: 'Hafta boyunca Keşfet tepe vitrininde yer alarak kalıcı organik kitle kazanın.',
      },
    ];
  }

  /**
   * Kategoriye Özel Bağımsız Vitrin Paketleri (Hedef Kitleye Odaklı)
   */
  public static getCategoryBoostPackages(): BoostPackage[] {
    return [
      {
        id: 'pkg-cat-24h',
        scope: 'category',
        title: '24 Saat Kategori Vitrini',
        durationHours: 24,
        creditCost: 50,
        priceTRY: 39,
        badge: '⚡ 1 Gün Kategori',
        description: 'Sadece projenizin ait olduğu kategorinin bağımsız vitrininde öne çıkın.',
      },
      {
        id: 'pkg-cat-3d',
        scope: 'category',
        title: '3 Gün Kategori Vitrini',
        durationHours: 72,
        creditCost: 120,
        priceTRY: 79,
        badge: '🎯 3 Gün Kategori',
        description: 'Doğrudan kategori arayan hedef kullanıcıların dikkatini çekin.',
      },
      {
        id: 'pkg-cat-7d',
        scope: 'category',
        title: '7 Gün Kategori Vitrini',
        durationHours: 168,
        creditCost: 250,
        priceTRY: 139,
        badge: '◈ 7 Gün Kategori',
        description: 'Kategorinizde bir hafta boyunca tepe vitrinde yerinizi koruyun.',
      },
    ];
  }

  public static getBoostPackages(scope: BoostScope = 'global'): BoostPackage[] {
    return scope === 'global' ? this.getGlobalBoostPackages() : this.getCategoryBoostPackages();
  }

  /**
   * Kullanıcının Kredi Bakiyesini Öğrenme
   */
  public static async getMyCreditBalance(): Promise<number> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) return 0;

    const { data, error } = await supabase
      .from('profiles')
      .select('boost_credits')
      .eq('id', authData.user.id)
      .single();

    if (error) throw error;
    return data?.boost_credits || 0;
  }

  /**
   * Kapsamlı (Global / Kategori) Kredi ile İlanı Öne Çıkarma (RPC Çağrısı)
   */
  public static async boostListingScoped(
    listingId: string,
    scope: BoostScope,
    durationHours: number,
    creditCost: number
  ): Promise<{ success: boolean; newCredits?: number; scope?: BoostScope; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('boost_listing_scoped', {
        p_listing_id: listingId,
        p_scope: scope,
        p_duration_hours: durationHours,
        p_credit_cost: creditCost,
      });

      if (error || !data?.success) {
        return { success: false, error: toBoostErrorMessage(error?.message) };
      }

      return {
        success: true,
        newCredits: data.new_credits,
        scope: data.scope,
      };
    } catch {
      return { success: false, error: 'Vitrin Desteği bağlantısı kurulamadı. Lütfen yeniden deneyin.' };
    }
  }

  /**
   * Geriye dönük uyumluluk: varsayılan olarak genel Keşfet vitrinini hedefler
   */
  public static async boostListing(
    listingId: string,
    durationHours: number,
    creditCost: number
  ): Promise<{ success: boolean; newCredits?: number; error?: string }> {
    return this.boostListingScoped(listingId, 'global', durationHours, creditCost);
  }
}
