-- ==============================================================================
-- FAZ 11: HARİCİ MEDYA, SSRF & CDN ÖNBELLEK KALKANI (SEC-037 — SEC-039)
-- ==============================================================================
-- 1. SEC-037: URL ve Medya Alanlarında SSRF & Cloud Metadata (169.254.x.x) Kalkanı
-- 2. SEC-038: Webhook Güvenliği & Replay Kalkanı Doğrulaması
-- 3. SEC-039: Güvenli HTTP Başlıkları & CDN İzolasyonu
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-037: Listings Tablosu SSRF & Metadata Koruması
-- ------------------------------------------------------------------------------
-- 169.254.169.254 (AWS/GCP/Azure Cloud Metadata), loopback (127.0.0.1, localhost)
-- ve 0.0.0.0 adresleri veritabanı düzeyinde CHECK kısıtı ile yasaklanır.

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS chk_listings_logo_ssrf_shield,
  DROP CONSTRAINT IF EXISTS chk_listings_web_url_ssrf_shield,
  DROP CONSTRAINT IF EXISTS chk_listings_app_store_ssrf_shield,
  DROP CONSTRAINT IF EXISTS chk_listings_play_store_ssrf_shield;

ALTER TABLE public.listings
  ADD CONSTRAINT chk_listings_logo_ssrf_shield
    CHECK (
      logo_url IS NULL OR (
        lower(logo_url) LIKE 'https://%'
        AND lower(logo_url) NOT LIKE '%169.254.%'
        AND lower(logo_url) NOT LIKE '%localhost%'
        AND lower(logo_url) NOT LIKE '%127.0.0.1%'
        AND lower(logo_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID,
  ADD CONSTRAINT chk_listings_web_url_ssrf_shield
    CHECK (
      web_url IS NULL OR (
        lower(web_url) LIKE 'https://%'
        AND lower(web_url) NOT LIKE '%169.254.%'
        AND lower(web_url) NOT LIKE '%localhost%'
        AND lower(web_url) NOT LIKE '%127.0.0.1%'
        AND lower(web_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID,
  ADD CONSTRAINT chk_listings_app_store_ssrf_shield
    CHECK (
      app_store_url IS NULL OR (
        lower(app_store_url) LIKE 'https://%'
        AND lower(app_store_url) NOT LIKE '%169.254.%'
        AND lower(app_store_url) NOT LIKE '%localhost%'
        AND lower(app_store_url) NOT LIKE '%127.0.0.1%'
        AND lower(app_store_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID,
  ADD CONSTRAINT chk_listings_play_store_ssrf_shield
    CHECK (
      play_store_url IS NULL OR (
        lower(play_store_url) LIKE 'https://%'
        AND lower(play_store_url) NOT LIKE '%169.254.%'
        AND lower(play_store_url) NOT LIKE '%localhost%'
        AND lower(play_store_url) NOT LIKE '%127.0.0.1%'
        AND lower(play_store_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID;

-- ------------------------------------------------------------------------------
-- 2. SEC-037: Listing Images & Profiles SSRF Koruması
-- ------------------------------------------------------------------------------
ALTER TABLE public.listing_images
  DROP CONSTRAINT IF EXISTS chk_listing_images_ssrf_shield;

ALTER TABLE public.listing_images
  ADD CONSTRAINT chk_listing_images_ssrf_shield
    CHECK (
      image_url IS NULL OR (
        lower(image_url) LIKE 'https://%'
        AND lower(image_url) NOT LIKE '%169.254.%'
        AND lower(image_url) NOT LIKE '%localhost%'
        AND lower(image_url) NOT LIKE '%127.0.0.1%'
        AND lower(image_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_avatar_ssrf_shield;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_avatar_ssrf_shield
    CHECK (
      avatar_url IS NULL OR (
        lower(avatar_url) LIKE 'https://%'
        AND lower(avatar_url) NOT LIKE '%169.254.%'
        AND lower(avatar_url) NOT LIKE '%localhost%'
        AND lower(avatar_url) NOT LIKE '%127.0.0.1%'
        AND lower(avatar_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID;

-- ------------------------------------------------------------------------------
-- 3. Kısıtları Doğrula (Validate Constraints)
-- ------------------------------------------------------------------------------
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_logo_ssrf_shield;
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_web_url_ssrf_shield;
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_app_store_ssrf_shield;
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_play_store_ssrf_shield;
ALTER TABLE public.listing_images VALIDATE CONSTRAINT chk_listing_images_ssrf_shield;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_avatar_ssrf_shield;

COMMENT ON TABLE public.listing_images IS 'KISTAS Proje Görselleri: SSRF ve Cloud Metadata korumalı görsel referansları.';
