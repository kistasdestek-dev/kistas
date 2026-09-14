-- ============================================================================
-- 20260909000002_app_store_categories.sql
-- APP STORE TARZI KATEGORİ SİSTEMİ (15 Oyunlar + 23 Uygulamalar)
-- ============================================================================

INSERT INTO public.categories (name, slug, icon_url, order_index, is_active) VALUES
    -- OYUNLAR (15 Kategori)
    ('Aile', 'game-family', 'people-outline', 101, TRUE),
    ('Aksiyon', 'game-action', 'flash-outline', 102, TRUE),
    ('Basit Eğlence', 'game-casual', 'happy-outline', 103, TRUE),
    ('Bulmaca', 'game-puzzle', 'extension-puzzle-outline', 104, TRUE),
    ('Kart', 'game-card', 'albums-outline', 105, TRUE),
    ('Kelime', 'game-word', 'text-outline', 106, TRUE),
    ('Macera', 'game-adventure', 'compass-outline', 107, TRUE),
    ('Masa', 'game-board', 'grid-outline', 108, TRUE),
    ('Müzik', 'game-music', 'musical-notes-outline', 109, TRUE),
    ('RYO', 'game-rpg', 'shield-outline', 110, TRUE),
    ('Simülasyon', 'game-simulation', 'planet-outline', 111, TRUE),
    ('Soru Cevap', 'game-trivia', 'help-circle-outline', 112, TRUE),
    ('Spor', 'game-sports', 'football-outline', 113, TRUE),
    ('Strateji', 'game-strategy', 'cube-outline', 114, TRUE),
    ('Yarış', 'game-racing', 'speedometer-outline', 115, TRUE),

    -- UYGULAMALAR (23 Kategori)
    ('Alışveriş', 'app-shopping', 'bag-handle-outline', 201, TRUE),
    ('Dergi ve Gazete', 'app-magazines', 'newspaper-outline', 202, TRUE),
    ('Eğitim', 'app-education', 'school-outline', 203, TRUE),
    ('Eğlence', 'app-entertainment', 'film-outline', 204, TRUE),
    ('Finans', 'app-finance', 'wallet-outline', 205, TRUE),
    ('Fotoğraf ve Video', 'app-photo-video', 'camera-outline', 206, TRUE),
    ('Geliştirici Araçları', 'app-devtools', 'code-slash-outline', 207, TRUE),
    ('Grafik ve Tasarım', 'app-design', 'color-palette-outline', 208, TRUE),
    ('Haberler', 'app-news', 'megaphone-outline', 209, TRUE),
    ('Hava Durumu', 'app-weather', 'partly-sunny-outline', 210, TRUE),
    ('İş', 'app-business', 'briefcase-outline', 211, TRUE),
    ('Kitaplar', 'app-books', 'book-outline', 212, TRUE),
    ('Müzik', 'app-music', 'headset-outline', 213, TRUE),
    ('Navigasyon', 'app-navigation', 'navigate-outline', 214, TRUE),
    ('Referans', 'app-reference', 'library-outline', 215, TRUE),
    ('Sağlık ve Fitness', 'app-health-fitness', 'heart-outline', 216, TRUE),
    ('Seyahat', 'app-travel', 'airplane-outline', 217, TRUE),
    ('Sosyal Ağ', 'app-social', 'chatbubbles-outline', 218, TRUE),
    ('Spor', 'app-sports', 'trophy-outline', 219, TRUE),
    ('Yardımcılar', 'app-utilities', 'build-outline', 220, TRUE),
    ('Yaşam Tarzı', 'app-lifestyle', 'sparkles-outline', 221, TRUE),
    ('Yiyecek ve İçecek', 'app-food-drink', 'restaurant-outline', 222, TRUE),
    ('Üretkenlik', 'app-productivity', 'checkbox-outline', 223, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    icon_url = EXCLUDED.icon_url,
    order_index = EXCLUDED.order_index,
    is_active = TRUE;
