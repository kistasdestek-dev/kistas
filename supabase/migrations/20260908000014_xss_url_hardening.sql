-- Reject executable and non-TLS URL schemes even when a client bypasses UI validation.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_logo_url_https,
  DROP CONSTRAINT IF EXISTS listings_app_store_url_https,
  DROP CONSTRAINT IF EXISTS listings_play_store_url_https,
  DROP CONSTRAINT IF EXISTS listings_web_url_https;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_logo_url_https
    CHECK (logo_url IS NULL OR lower(logo_url) LIKE 'https://%') NOT VALID,
  ADD CONSTRAINT listings_app_store_url_https
    CHECK (app_store_url IS NULL OR lower(app_store_url) LIKE 'https://%') NOT VALID,
  ADD CONSTRAINT listings_play_store_url_https
    CHECK (play_store_url IS NULL OR lower(play_store_url) LIKE 'https://%') NOT VALID,
  ADD CONSTRAINT listings_web_url_https
    CHECK (web_url IS NULL OR lower(web_url) LIKE 'https://%') NOT VALID;

ALTER TABLE public.listing_images
  DROP CONSTRAINT IF EXISTS listing_images_image_url_https;

ALTER TABLE public.listing_images
  ADD CONSTRAINT listing_images_image_url_https
    CHECK (lower(image_url) LIKE 'https://%') NOT VALID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_https;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_https
    CHECK (avatar_url IS NULL OR lower(avatar_url) LIKE 'https://%') NOT VALID;
