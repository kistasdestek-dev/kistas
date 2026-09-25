/**
 * Kıstas Çekirdek Domain & İş Mantığı Fonksiyonları
 * 
 * Bu modül; sponsorluk, metrikler, arındırma (sanitization) ve saklama (retention)
 * kurallarını tek bir kesin kaynak (single source of truth) olarak sunar.
 */

export interface SponsorableItem {
  boosted_until?: string | null;
  boostedUntil?: string | null;
  category_boosted_until?: string | null;
  categoryBoostedUntil?: string | null;
}

/**
 * Genel Keşfet sponsorluğunu boosted_until / boostedUntil alanından çözümler.
 */
export function isListingSponsored(
  listing?: SponsorableItem | null,
  referenceTime: number | Date = Date.now()
): boolean {
  if (!listing) return false;
  const rawDate = listing.boosted_until ?? listing.boostedUntil;
  if (!rawDate || typeof rawDate !== 'string') return false;

  const expiresAt = Date.parse(rawDate);
  const nowMs = typeof referenceTime === 'number' ? referenceTime : referenceTime.getTime();
  return Number.isFinite(expiresAt) && expiresAt > nowMs;
}

export const isListingGlobalSponsored = isListingSponsored;

/**
 * Kategoriye özel bağımsız sponsorluğu category_boosted_until / categoryBoostedUntil alanından çözümler.
 */
export function isListingCategorySponsored(
  listing?: SponsorableItem | null,
  referenceTime: number | Date = Date.now()
): boolean {
  if (!listing) return false;
  const rawDate = listing.category_boosted_until ?? listing.categoryBoostedUntil;
  if (!rawDate || typeof rawDate !== 'string') return false;

  const expiresAt = Date.parse(rawDate);
  const nowMs = typeof referenceTime === 'number' ? referenceTime : referenceTime.getTime();
  return Number.isFinite(expiresAt) && expiresAt > nowMs;
}

/**
 * İlan oylama ve puan değişmezlerini (invariants) doğrular.
 * Negatif oy, 0-5 aralığı dışındaki puanlar kural ihlalidir.
 */
export function validateListingMetrics(listing: {
  upvotesCount?: number;
  upvote_count?: number;
  seller?: { ratingAverage?: number; rating_average?: number } | null;
  rating_average?: number;
  ratingAverage?: number;
}): boolean {
  if (!listing) throw new Error('İlan verisi bulunamadı');

  const upvotes = listing.upvotesCount ?? listing.upvote_count;
  if (upvotes !== undefined) {
    if (typeof upvotes !== 'number' || isNaN(upvotes) || upvotes < 0) {
      throw new Error('Oy sayısı negatif veya geçersiz olamaz');
    }
  }

  const rating =
    listing.ratingAverage ??
    listing.rating_average ??
    listing.seller?.ratingAverage ??
    listing.seller?.rating_average;

  if (rating !== undefined && rating !== null) {
    if (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 5) {
      throw new Error('Puan ortalaması 0 ile 5 arasında olmalıdır');
    }
  }

  return true;
}

/**
 * Güvenlik & XSS Kalkanı:
 * Kullanıcı girdilerini zararlı script ve inline event handler'lardan arındırır.
 */
export function sanitizeUserInput(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:[^\s"'>]*/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .trim();
}

/**
 * Bildirim ve veri saklama (Retention) kuralları.
 * Varsayılan: 72 saat (3 gün = 259,200,000 ms).
 */
export const DEFAULT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export function isNotificationExpired(
  createdAtIso: string,
  nowMs: number = Date.now(),
  retentionMs: number = DEFAULT_RETENTION_MS
): boolean {
  if (!createdAtIso || typeof createdAtIso !== 'string') return true;
  const createdMs = new Date(createdAtIso).getTime();
  if (isNaN(createdMs)) return true;
  return nowMs - createdMs > retentionMs;
}
