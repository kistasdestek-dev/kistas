import { supabase } from '../../../core/supabase/supabaseClient';
import { Category } from '../domain/Category';

export type { Category };

export const APP_STORE_CATEGORY_SLUGS = [
  // Oyunlar (15)
  'game-family',
  'game-action',
  'game-casual',
  'game-puzzle',
  'game-card',
  'game-word',
  'game-adventure',
  'game-board',
  'game-music',
  'game-rpg',
  'game-simulation',
  'game-trivia',
  'game-sports',
  'game-strategy',
  'game-racing',
  // Uygulamalar (23)
  'app-shopping',
  'app-magazines',
  'app-education',
  'app-entertainment',
  'app-finance',
  'app-photo-video',
  'app-devtools',
  'app-design',
  'app-news',
  'app-weather',
  'app-business',
  'app-books',
  'app-music',
  'app-navigation',
  'app-reference',
  'app-health-fitness',
  'app-travel',
  'app-social',
  'app-sports',
  'app-utilities',
  'app-lifestyle',
  'app-food-drink',
  'app-productivity',
] as const;

const mapCategoryRow = (row: any): Category => ({
  id: row.id,
  parentId: row.parent_id ?? null,
  name: row.name,
  slug: row.slug,
  iconUrl: row.icon_url,
  commissionRate: Number(row.commission_rate || 0),
  orderIndex: row.order_index,
});

export class CategoryService {
  /**
   * Proje yayınlama formunun ve filtrelerin kullanacağı, veritabanında var olan
   * veya fallback olarak sunulan tüm dijital proje kategorileri.
   */
  public static async getProjectCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('slug', [...APP_STORE_CATEGORY_SLUGS])
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error || !data || data.length === 0) {
        return this.getDefaultCategories();
      }

      const dbCategories = (data || []).map(mapCategoryRow);
      const existingSlugs = new Set(dbCategories.map((c) => c.slug));
      const missingDefaults = this.getDefaultCategories().filter((c) => !existingSlugs.has(c.slug));
      return [...dbCategories, ...missingDefaults];
    } catch {
      return this.getDefaultCategories();
    }
  }

  /**
   * Tüm Ana ve Alt Kategorileri Hiyerarşik Olarak Getirme
   */
  public static async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('slug', [...APP_STORE_CATEGORY_SLUGS])
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error || !data) {
        return this.getDefaultCategories();
      }

      const parentCategories = data.filter((c) => !c.parent_id);
      return parentCategories.map((parent) => ({
        ...mapCategoryRow(parent),
        subcategories: data
          .filter((c) => c.parent_id === parent.id)
          .map(mapCategoryRow),
      }));
    } catch {
      return this.getDefaultCategories();
    }
  }

  public static getDefaultCategories(): Category[] {
    return [
      // OYUNLAR (15)
      { id: 'game-family', name: 'Aile', slug: 'game-family', iconUrl: 'people-outline', commissionRate: 0, orderIndex: 101 },
      { id: 'game-action', name: 'Aksiyon', slug: 'game-action', iconUrl: 'flash-outline', commissionRate: 0, orderIndex: 102 },
      { id: 'game-casual', name: 'Basit Eğlence', slug: 'game-casual', iconUrl: 'happy-outline', commissionRate: 0, orderIndex: 103 },
      { id: 'game-puzzle', name: 'Bulmaca', slug: 'game-puzzle', iconUrl: 'extension-puzzle-outline', commissionRate: 0, orderIndex: 104 },
      { id: 'game-card', name: 'Kart', slug: 'game-card', iconUrl: 'albums-outline', commissionRate: 0, orderIndex: 105 },
      { id: 'game-word', name: 'Kelime', slug: 'game-word', iconUrl: 'text-outline', commissionRate: 0, orderIndex: 106 },
      { id: 'game-adventure', name: 'Macera', slug: 'game-adventure', iconUrl: 'compass-outline', commissionRate: 0, orderIndex: 107 },
      { id: 'game-board', name: 'Masa', slug: 'game-board', iconUrl: 'grid-outline', commissionRate: 0, orderIndex: 108 },
      { id: 'game-music', name: 'Müzik', slug: 'game-music', iconUrl: 'musical-notes-outline', commissionRate: 0, orderIndex: 109 },
      { id: 'game-rpg', name: 'RYO', slug: 'game-rpg', iconUrl: 'shield-outline', commissionRate: 0, orderIndex: 110 },
      { id: 'game-simulation', name: 'Simülasyon', slug: 'game-simulation', iconUrl: 'planet-outline', commissionRate: 0, orderIndex: 111 },
      { id: 'game-trivia', name: 'Soru Cevap', slug: 'game-trivia', iconUrl: 'help-circle-outline', commissionRate: 0, orderIndex: 112 },
      { id: 'game-sports', name: 'Spor', slug: 'game-sports', iconUrl: 'football-outline', commissionRate: 0, orderIndex: 113 },
      { id: 'game-strategy', name: 'Strateji', slug: 'game-strategy', iconUrl: 'cube-outline', commissionRate: 0, orderIndex: 114 },
      { id: 'game-racing', name: 'Yarış', slug: 'game-racing', iconUrl: 'speedometer-outline', commissionRate: 0, orderIndex: 115 },

      // UYGULAMALAR (23)
      { id: 'app-shopping', name: 'Alışveriş', slug: 'app-shopping', iconUrl: 'bag-handle-outline', commissionRate: 0, orderIndex: 201 },
      { id: 'app-magazines', name: 'Dergi ve Gazete', slug: 'app-magazines', iconUrl: 'newspaper-outline', commissionRate: 0, orderIndex: 202 },
      { id: 'app-education', name: 'Eğitim', slug: 'app-education', iconUrl: 'school-outline', commissionRate: 0, orderIndex: 203 },
      { id: 'app-entertainment', name: 'Eğlence', slug: 'app-entertainment', iconUrl: 'film-outline', commissionRate: 0, orderIndex: 204 },
      { id: 'app-finance', name: 'Finans', slug: 'app-finance', iconUrl: 'wallet-outline', commissionRate: 0, orderIndex: 205 },
      { id: 'app-photo-video', name: 'Fotoğraf ve Video', slug: 'app-photo-video', iconUrl: 'camera-outline', commissionRate: 0, orderIndex: 206 },
      { id: 'app-devtools', name: 'Geliştirici Araçları', slug: 'app-devtools', iconUrl: 'code-slash-outline', commissionRate: 0, orderIndex: 207 },
      { id: 'app-design', name: 'Grafik ve Tasarım', slug: 'app-design', iconUrl: 'color-palette-outline', commissionRate: 0, orderIndex: 208 },
      { id: 'app-news', name: 'Haberler', slug: 'app-news', iconUrl: 'megaphone-outline', commissionRate: 0, orderIndex: 209 },
      { id: 'app-weather', name: 'Hava Durumu', slug: 'app-weather', iconUrl: 'partly-sunny-outline', commissionRate: 0, orderIndex: 210 },
      { id: 'app-business', name: 'İş', slug: 'app-business', iconUrl: 'briefcase-outline', commissionRate: 0, orderIndex: 211 },
      { id: 'app-books', name: 'Kitaplar', slug: 'app-books', iconUrl: 'book-outline', commissionRate: 0, orderIndex: 212 },
      { id: 'app-music', name: 'Müzik', slug: 'app-music', iconUrl: 'headset-outline', commissionRate: 0, orderIndex: 213 },
      { id: 'app-navigation', name: 'Navigasyon', slug: 'app-navigation', iconUrl: 'navigate-outline', commissionRate: 0, orderIndex: 214 },
      { id: 'app-reference', name: 'Referans', slug: 'app-reference', iconUrl: 'library-outline', commissionRate: 0, orderIndex: 215 },
      { id: 'app-health-fitness', name: 'Sağlık ve Fitness', slug: 'app-health-fitness', iconUrl: 'heart-outline', commissionRate: 0, orderIndex: 216 },
      { id: 'app-travel', name: 'Seyahat', slug: 'app-travel', iconUrl: 'airplane-outline', commissionRate: 0, orderIndex: 217 },
      { id: 'app-social', name: 'Sosyal Ağ', slug: 'app-social', iconUrl: 'chatbubbles-outline', commissionRate: 0, orderIndex: 218 },
      { id: 'app-sports', name: 'Spor', slug: 'app-sports', iconUrl: 'trophy-outline', commissionRate: 0, orderIndex: 219 },
      { id: 'app-utilities', name: 'Yardımcılar', slug: 'app-utilities', iconUrl: 'build-outline', commissionRate: 0, orderIndex: 220 },
      { id: 'app-lifestyle', name: 'Yaşam Tarzı', slug: 'app-lifestyle', iconUrl: 'sparkles-outline', commissionRate: 0, orderIndex: 221 },
      { id: 'app-food-drink', name: 'Yiyecek ve İçecek', slug: 'app-food-drink', iconUrl: 'restaurant-outline', commissionRate: 0, orderIndex: 222 },
      { id: 'app-productivity', name: 'Üretkenlik', slug: 'app-productivity', iconUrl: 'checkbox-outline', commissionRate: 0, orderIndex: 223 },
    ];
  }
}
