/**
 * KISTAS - 3D Rendered Category Icons Mapping
 * Apple App Store / VisionOS caliber high-depth tactile 3D icons.
 */

export const CATEGORY_3D_ICONS: Record<string, any> = {
  // --- OYUNLAR (15 Kategori) ---
  'game-family': require('../../../../assets/categories/icons/optimized/game-family-v2.png'),
  'game-action': require('../../../../assets/categories/icons/optimized/game-action-v2.png'),
  'game-casual': require('../../../../assets/categories/icons/optimized/game-casual-v2.png'),
  'game-puzzle': require('../../../../assets/categories/icons/optimized/game-puzzle-v2.png'),
  'game-card': require('../../../../assets/categories/icons/optimized/game-card-v2.png'),
  'game-word': require('../../../../assets/categories/icons/optimized/game-word-v2.png'),
  'game-adventure': require('../../../../assets/categories/icons/optimized/game-adventure-v2.png'),
  'game-board': require('../../../../assets/categories/icons/optimized/game-board-v2.png'),
  'game-music': require('../../../../assets/categories/icons/optimized/game-music-v2.png'),
  'game-rpg': require('../../../../assets/categories/icons/optimized/game-rpg-v2.png'),
  'game-simulation': require('../../../../assets/categories/icons/optimized/game-simulation-v2.png'),
  'game-trivia': require('../../../../assets/categories/icons/optimized/game-trivia-v2.png'),
  'game-sports': require('../../../../assets/categories/icons/optimized/game-sports-v2.png'),
  'game-strategy': require('../../../../assets/categories/icons/optimized/game-strategy-v2.png'),
  'game-racing': require('../../../../assets/categories/icons/optimized/game-racing-v2.png'),

  // --- UYGULAMALAR (23 Kategori) ---
  'app-shopping': require('../../../../assets/categories/icons/optimized/app-shopping-v2.png'),
  'app-magazines': require('../../../../assets/categories/icons/optimized/app-magazines-v2.png'),
  'app-education': require('../../../../assets/categories/icons/optimized/app-education-v2.png'),
  'app-entertainment': require('../../../../assets/categories/icons/optimized/app-entertainment-v2.png'),
  'app-finance': require('../../../../assets/categories/icons/optimized/app-finance-v2.png'),
  'app-photo-video': require('../../../../assets/categories/icons/optimized/app-photo-video-v2.png'),
  'app-developer-tools': require('../../../../assets/categories/icons/optimized/app-developer-tools-v2.png'),
  'app-design': require('../../../../assets/categories/icons/optimized/app-design-v2.png'),
  'app-news': require('../../../../assets/categories/icons/optimized/app-news-v2.png'),
  'app-weather': require('../../../../assets/categories/icons/optimized/app-weather-v2.png'),
  'app-business': require('../../../../assets/categories/icons/optimized/app-business-v2.png'),
  'app-books': require('../../../../assets/categories/icons/optimized/app-books-v2.png'),
  'app-music': require('../../../../assets/categories/icons/optimized/app-music-v2.png'),
  'app-navigation': require('../../../../assets/categories/icons/optimized/app-navigation-v2.png'),
  'app-reference': require('../../../../assets/categories/icons/optimized/app-reference-v2.png'),
  'app-health-fitness': require('../../../../assets/categories/icons/optimized/app-health-fitness-v2.png'),
  'app-travel': require('../../../../assets/categories/icons/optimized/app-travel-v2.png'),
  'app-social': require('../../../../assets/categories/icons/optimized/app-social-v2.png'),
  'app-sports': require('../../../../assets/categories/icons/optimized/app-sports-v2.png'),
  'app-utilities': require('../../../../assets/categories/icons/optimized/app-utilities-v2.png'),
  'app-lifestyle': require('../../../../assets/categories/icons/optimized/app-lifestyle-v2.png'),
  'app-food-drink': require('../../../../assets/categories/icons/optimized/app-food-drink-v2.png'),
  'app-productivity': require('../../../../assets/categories/icons/optimized/app-productivity-v2.png'),

  // Ekstra / Alternatif Eşleşmeler
  'app-devtools': require('../../../../assets/categories/icons/optimized/app-developer-tools-v2.png'),
  'games': require('../../../../assets/categories/icons/game-controller.png'),
  'game-controller': require('../../../../assets/categories/icons/game-controller.png'),
  'apps': require('../../../../assets/categories/icons/app-tools.png'),
  'app-tools': require('../../../../assets/categories/icons/app-tools.png'),
};

export const getCategory3DIcon = (key: string): any => {
  if (!key) return null;
  if (CATEGORY_3D_ICONS[key]) return CATEGORY_3D_ICONS[key];
  
  // Normalizasyon denemesi: 'shopping' -> 'app-shopping' veya 'puzzle' -> 'game-puzzle'
  const asApp = `app-${key}`;
  if (CATEGORY_3D_ICONS[asApp]) return CATEGORY_3D_ICONS[asApp];

  const asGame = `game-${key}`;
  if (CATEGORY_3D_ICONS[asGame]) return CATEGORY_3D_ICONS[asGame];

  return null;
};
