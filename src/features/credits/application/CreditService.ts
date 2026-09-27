import { supabase } from '../../../core/supabase/supabaseClient';

export type BoostScope = 'global' | 'category';
export type CreditTransactionType = 'purchase' | 'spend_boost' | 'reward' | 'refund';

export interface CreditTransactionMetadata {
  provider?: string;
  productId?: string;
  amountMinor?: number;
  currency?: string;
  listingId?: string;
  listingTitle?: string;
  scope?: BoostScope;
  durationHours?: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: CreditTransactionType;
  description: string;
  createdAt: string;
  metadata: CreditTransactionMetadata;
}

interface CreditTransactionRow {
  id: string;
  amount: number;
  balance_after: number;
  type: CreditTransactionType;
  description: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const parseTransactionMetadata = (raw: Record<string, unknown> | null): CreditTransactionMetadata => ({
  provider: stringValue(raw?.provider),
  productId: stringValue(raw?.product_id),
  amountMinor: numberValue(raw?.amount_minor),
  currency: stringValue(raw?.currency),
  listingId: stringValue(raw?.listing_id),
  listingTitle: stringValue(raw?.listing_title),
  scope: raw?.scope === 'global' || raw?.scope === 'category' ? raw.scope : undefined,
  durationHours: numberValue(raw?.duration_hours),
});

export interface BoostPackage {
  id: string;
  scope: BoostScope;
  title: string;
  durationHours: number;
  creditCost: number;
  badge: string;
  description?: string;
}

const toBoostErrorMessage = (message?: string): string => {
  const normalized = (message || '').toLowerCase();
  if (normalized.includes('insufficient_credits')) return 'Bu işlem için yeterli Vitrin Krediniz bulunmuyor.';
  if (normalized.includes('forbidden')) return 'Yalnızca kendi projenizi Vitrin Desteğine alabilirsiniz.';
  if (normalized.includes('listing_not_found')) return 'Aktif proje bulunamadı.';
  if (normalized.includes('invalid_boost_package')) return 'Seçilen Vitrin Desteği paketi geçerli değil.';
  if (normalized.includes('unauthorized')) return 'Bu işlem için oturum açmalısınız.';
  if (message) return `Vitrin Desteği tamamlanamadı (${message}).`;
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
        badge: '⚡ 24 Saat Görünürlük',
        description: 'Tüm platformun ana sayfası olan Keşfet vitrininde saatlik rotasyona girin.',
      },
      {
        id: 'pkg-global-3d',
        scope: 'global',
        title: '3 Gün Keşfet Vitrini',
        durationHours: 72,
        creditCost: 450,
        badge: '🔥 3 Gün Görünürlük',
        description: '3 gün boyunca amiral gemisi Keşfet ana sayfasında maksimum kitleye ulaşın.',
      },
      {
        id: 'pkg-global-7d',
        scope: 'global',
        title: '7 Gün Keşfet Vitrini (Amiral Gemisi)',
        durationHours: 168,
        creditCost: 900,
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
        badge: '⚡ 1 Gün Kategori',
        description: 'Sadece projenizin ait olduğu kategorinin bağımsız vitrininde öne çıkın.',
      },
      {
        id: 'pkg-cat-3d',
        scope: 'category',
        title: '3 Gün Kategori Vitrini',
        durationHours: 72,
        creditCost: 120,
        badge: '🎯 3 Gün Kategori',
        description: 'Doğrudan kategori arayan hedef kullanıcıların dikkatini çekin.',
      },
      {
        id: 'pkg-cat-7d',
        scope: 'category',
        title: '7 Gün Kategori Vitrini',
        durationHours: 168,
        creditCost: 250,
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
   * Oturum sahibinin kredi yükleme, ödül, iade ve harcama hareketlerini getirir.
   * Sunucudaki RLS politikası yalnızca kullanıcının kendi satırlarını döndürür.
   */
  public static async getMyCreditTransactions(limit = 100): Promise<CreditTransaction[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) return [];

    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('id, amount, balance_after, type, description, created_at, metadata')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    return ((data ?? []) as CreditTransactionRow[]).map((row) => ({
      id: row.id,
      amount: Number(row.amount) || 0,
      balanceAfter: Number(row.balance_after) || 0,
      type: row.type,
      description: row.description,
      createdAt: row.created_at,
      metadata: parseTransactionMetadata(row.metadata),
    }));
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
        console.error('[CreditService.boostListingScoped] RPC error:', error || data);
        return { success: false, error: toBoostErrorMessage(error?.message) };
      }

      return {
        success: true,
        newCredits: data.new_credits,
        scope: data.scope,
      };
    } catch (err) {
      console.error('[CreditService.boostListingScoped] Unexpected exception:', err);
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
