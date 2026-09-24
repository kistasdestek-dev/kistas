export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon3d: string;
  tintKey: string;
}

export const CATEGORY_CARD_TINTS: Record<string, [string, string, string]> = {
  '#116871': ['#9AF28E', '#54D66B', '#2CB956'],
  '#9B503F': ['#FFD08A', '#FFA149', '#FF7B27'],
  '#514194': ['#CCB9FF', '#9878FF', '#7250F2'],
  '#235D89': ['#82E8F5', '#48CBE3', '#20ADD0'],
  '#933D69': ['#FFB8D3', '#F47CB2', '#DA4F92'],
  '#396850': ['#AAE8C0', '#62CF91', '#35B976'],
  '#713E85': ['#D8B2FF', '#A870F3', '#844ED3'],
  '#3D5092': ['#B4DAFF', '#73B6F2', '#478EDB'],
  fallback: ['#9FDDFC', '#5BAFEF', '#347FD2'],
};

export const GAMES_CATEGORIES: CategoryItem[] = [
  { id: 'game-family', name: 'Aile', slug: 'game-family', icon3d: '/categories/icons/optimized/game-family-v2.png', tintKey: '#116871' },
  { id: 'game-action', name: 'Aksiyon', slug: 'game-action', icon3d: '/categories/icons/optimized/game-action-v2.png', tintKey: '#9B503F' },
  { id: 'game-casual', name: 'Basit Eğlence', slug: 'game-casual', icon3d: '/categories/icons/optimized/game-casual-v2.png', tintKey: '#514194' },
  { id: 'game-puzzle', name: 'Bulmaca', slug: 'game-puzzle', icon3d: '/categories/icons/optimized/game-puzzle-v2.png', tintKey: '#235D89' },
  { id: 'game-card', name: 'Kart', slug: 'game-card', icon3d: '/categories/icons/optimized/game-card-v2.png', tintKey: '#933D69' },
  { id: 'game-word', name: 'Kelime', slug: 'game-word', icon3d: '/categories/icons/optimized/game-word-v2.png', tintKey: '#116871' },
  { id: 'game-adventure', name: 'Macera', slug: 'game-adventure', icon3d: '/categories/icons/optimized/game-adventure-v2.png', tintKey: '#713E85' },
  { id: 'game-board', name: 'Masa', slug: 'game-board', icon3d: '/categories/icons/optimized/game-board-v2.png', tintKey: '#235D89' },
  { id: 'game-music', name: 'Müzik', slug: 'game-music', icon3d: '/categories/icons/optimized/game-music-v2.png', tintKey: '#9B503F' },
  { id: 'game-rpg', name: 'RYO', slug: 'game-rpg', icon3d: '/categories/icons/optimized/game-rpg-v2.png', tintKey: '#396850' },
  { id: 'game-simulation', name: 'Simülasyon', slug: 'game-simulation', icon3d: '/categories/icons/optimized/game-simulation-v2.png', tintKey: '#933D69' },
  { id: 'game-trivia', name: 'Soru Cevap', slug: 'game-trivia', icon3d: '/categories/icons/optimized/game-trivia-v2.png', tintKey: '#3D5092' },
  { id: 'game-sports', name: 'Spor', slug: 'game-sports', icon3d: '/categories/icons/optimized/game-sports-v2.png', tintKey: '#514194' },
  { id: 'game-strategy', name: 'Strateji', slug: 'game-strategy', icon3d: '/categories/icons/optimized/game-strategy-v2.png', tintKey: '#9B503F' },
  { id: 'game-racing', name: 'Yarış', slug: 'game-racing', icon3d: '/categories/icons/optimized/game-racing-v2.png', tintKey: '#116871' },
];

export const APPS_CATEGORIES: CategoryItem[] = [
  { id: 'app-shopping', name: 'Alışveriş', slug: 'app-shopping', icon3d: '/categories/icons/optimized/app-shopping-v2.png', tintKey: '#514194' },
  { id: 'app-magazines', name: 'Dergi ve Gazete', slug: 'app-magazines', icon3d: '/categories/icons/optimized/app-magazines-v2.png', tintKey: '#116871' },
  { id: 'app-education', name: 'Eğitim', slug: 'app-education', icon3d: '/categories/icons/optimized/app-education-v2.png', tintKey: '#933D69' },
  { id: 'app-entertainment', name: 'Eğlence', slug: 'app-entertainment', icon3d: '/categories/icons/optimized/app-entertainment-v2.png', tintKey: '#235D89' },
  { id: 'app-finance', name: 'Finans', slug: 'app-finance', icon3d: '/categories/icons/optimized/app-finance-v2.png', tintKey: '#9B503F' },
  { id: 'app-photo-video', name: 'Fotoğraf ve Video', slug: 'app-photo-video', icon3d: '/categories/icons/optimized/app-photo-video-v2.png', tintKey: '#396850' },
  { id: 'app-devtools', name: 'Geliştirici Araçları', slug: 'app-devtools', icon3d: '/categories/icons/optimized/app-developer-tools-v2.png', tintKey: '#713E85' },
  { id: 'app-design', name: 'Grafik ve Tasarım', slug: 'app-design', icon3d: '/categories/icons/optimized/app-design-v2.png', tintKey: '#235D89' },
  { id: 'app-news', name: 'Haberler', slug: 'app-news', icon3d: '/categories/icons/optimized/app-news-v2.png', tintKey: '#933D69' },
  { id: 'app-weather', name: 'Hava Durumu', slug: 'app-weather', icon3d: '/categories/icons/optimized/app-weather-v2.png', tintKey: '#514194' },
  { id: 'app-business', name: 'İş', slug: 'app-business', icon3d: '/categories/icons/optimized/app-business-v2.png', tintKey: '#9B503F' },
  { id: 'app-books', name: 'Kitaplar', slug: 'app-books', icon3d: '/categories/icons/optimized/app-books-v2.png', tintKey: '#116871' },
  { id: 'app-music', name: 'Müzik', slug: 'app-music', icon3d: '/categories/icons/optimized/app-music-v2.png', tintKey: '#713E85' },
  { id: 'app-navigation', name: 'Navigasyon', slug: 'app-navigation', icon3d: '/categories/icons/optimized/app-navigation-v2.png', tintKey: '#933D69' },
  { id: 'app-reference', name: 'Referans', slug: 'app-reference', icon3d: '/categories/icons/optimized/app-reference-v2.png', tintKey: '#396850' },
  { id: 'app-health-fitness', name: 'Sağlık ve Fitness', slug: 'app-health-fitness', icon3d: '/categories/icons/optimized/app-health-fitness-v2.png', tintKey: '#3D5092' },
  { id: 'app-travel', name: 'Seyahat', slug: 'app-travel', icon3d: '/categories/icons/optimized/app-travel-v2.png', tintKey: '#9B503F' },
  { id: 'app-social', name: 'Sosyal Ağ', slug: 'app-social', icon3d: '/categories/icons/optimized/app-social-v2.png', tintKey: '#713E85' },
  { id: 'app-sports', name: 'Spor', slug: 'app-sports', icon3d: '/categories/icons/optimized/app-sports-v2.png', tintKey: '#933D69' },
  { id: 'app-utilities', name: 'Yardımcılar', slug: 'app-utilities', icon3d: '/categories/icons/optimized/app-utilities-v2.png', tintKey: '#116871' },
  { id: 'app-lifestyle', name: 'Yaşam Tarzı', slug: 'app-lifestyle', icon3d: '/categories/icons/optimized/app-lifestyle-v2.png', tintKey: '#235D89' },
  { id: 'app-food-drink', name: 'Yiyecek ve İçecek', slug: 'app-food-drink', icon3d: '/categories/icons/optimized/app-food-drink-v2.png', tintKey: '#514194' },
  { id: 'app-productivity', name: 'Üretkenlik', slug: 'app-productivity', icon3d: '/categories/icons/optimized/app-productivity-v2.png', tintKey: '#9B503F' },
];

export const BROWSE_CATEGORY_SLUGS = [...APP_STORE_CATEGORY_SLUGS];

export const resolveCategoryIconPath = (iconPath: string) =>
  iconPath.replace(/\.png$/i, '.webp');
import { APP_STORE_CATEGORY_SLUGS } from '@kistas/shared';
