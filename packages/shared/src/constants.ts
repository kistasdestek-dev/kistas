export const APP_CONFIG = {
  name: 'Kıstas',
  tagline: 'Dijital Proje & Mikro Servis Ekosistemi',
  url: 'https://www.kistas.com.tr',
  supportEmail: 'kistasdestek@gmail.com',
  maxUploadSizeBytes: 5 * 1024 * 1024, // 5 MB bank-grade limit
  allowedImageMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  defaultCurrency: 'TRY',
};

export const ROUTES = {
  home: '/',
  listings: '/listings',
  blog: '/blog',
  categories: '/categories',
  dashboard: '/dashboard',
  profile: '/profile',
  myListings: '/my-listings',
  messages: '/messages',
  admin: '/admin',
  login: '/login',
  signup: '/signup',
};

/** Kıstas'ta izin verilen tek proje kategorileri: 15 oyun + 23 uygulama. */
export const APP_STORE_CATEGORY_SLUGS = [
  'game-family', 'game-action', 'game-casual', 'game-puzzle', 'game-card',
  'game-word', 'game-adventure', 'game-board', 'game-music', 'game-rpg',
  'game-simulation', 'game-trivia', 'game-sports', 'game-strategy', 'game-racing',
  'app-shopping', 'app-magazines', 'app-education', 'app-entertainment', 'app-finance',
  'app-photo-video', 'app-devtools', 'app-design', 'app-news', 'app-weather',
  'app-business', 'app-books', 'app-music', 'app-navigation', 'app-reference',
  'app-health-fitness', 'app-travel', 'app-social', 'app-sports', 'app-utilities',
  'app-lifestyle', 'app-food-drink', 'app-productivity',
] as const;

/**
 * Kıstas marka adı ve varyasyonlarının (leetspeak, noktalama, Türkçe karakter vb.)
 * yetkisiz kullanıcılar tarafından profil ismi olarak kullanılmasını engeller.
 */
export function isReservedBrandName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const raw = name.trim();
  if (!raw) return false;

  const normalized = raw
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİiîíïì]/g, 'i')
    .replace(/[@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[^a-z0-9]/g, '');

  if (normalized.includes('kistas')) {
    return true;
  }

  const spacedRegex = /k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]/i;
  return spacedRegex.test(raw);
}

/**
 * Kıstas Deterministik Saatlik Adil Rotasyon Motoru
 *
 * Aktif sponsorlu projeleri veya vitrin liderlerini saatlik deterministik ve eşit rotasyonla döndürür.
 * Her saat başı sıralama tam 1 pozisyon kaydırılır.
 * Böylece hiçbir proje vitrinde tekelleşemez; tüm sponsorlar günün 24 saatinde eşit görünürlük alır.
 *
 * @param items Döndürülecek öğeler dizisi
 * @param referenceTime İsteğe bağlı referans zamanı (varsayılan: Date.now())
 */
export function rotateListingsByHour<T>(items: T[], referenceTime: number | Date = Date.now()): T[] {
  if (!items || items.length <= 1) return items || [];

  const timeMs = typeof referenceTime === 'number' ? referenceTime : referenceTime.getTime();
  // 1 saat = 3,600,000 milisaniye
  const hourEpoch = Math.floor(timeMs / (1000 * 60 * 60));
  const count = items.length;
  const shift = ((hourEpoch % count) + count) % count;

  if (shift === 0) return [...items];
  return [...items.slice(shift), ...items.slice(0, shift)];
}
