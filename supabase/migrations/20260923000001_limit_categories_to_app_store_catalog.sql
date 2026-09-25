-- Kıstas kategori bütünlüğü: yalnız 15 oyun + 23 uygulama kategorisi aktiftir.
UPDATE public.categories
SET is_active = FALSE
WHERE slug NOT IN (
  'game-family', 'game-action', 'game-casual', 'game-puzzle', 'game-card',
  'game-word', 'game-adventure', 'game-board', 'game-music', 'game-rpg',
  'game-simulation', 'game-trivia', 'game-sports', 'game-strategy', 'game-racing',
  'app-shopping', 'app-magazines', 'app-education', 'app-entertainment', 'app-finance',
  'app-photo-video', 'app-devtools', 'app-design', 'app-news', 'app-weather',
  'app-business', 'app-books', 'app-music', 'app-navigation', 'app-reference',
  'app-health-fitness', 'app-travel', 'app-social', 'app-sports', 'app-utilities',
  'app-lifestyle', 'app-food-drink', 'app-productivity'
);

UPDATE public.categories
SET is_active = TRUE
WHERE slug IN (
  'game-family', 'game-action', 'game-casual', 'game-puzzle', 'game-card',
  'game-word', 'game-adventure', 'game-board', 'game-music', 'game-rpg',
  'game-simulation', 'game-trivia', 'game-sports', 'game-strategy', 'game-racing',
  'app-shopping', 'app-magazines', 'app-education', 'app-entertainment', 'app-finance',
  'app-photo-video', 'app-devtools', 'app-design', 'app-news', 'app-weather',
  'app-business', 'app-books', 'app-music', 'app-navigation', 'app-reference',
  'app-health-fitness', 'app-travel', 'app-social', 'app-sports', 'app-utilities',
  'app-lifestyle', 'app-food-drink', 'app-productivity'
);

-- Rollback: yalnız bu migration'ın pasife aldığı eski kategorileri tekrar açmak için
-- UPDATE public.categories SET is_active = TRUE;
