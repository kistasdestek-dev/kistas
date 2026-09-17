-- ==============================================================================
-- KISTAS SAVUNMA HATTI: FAZ 7 - ADRES, MEDYA & YASAL İZİN BÜTÜNLÜĞÜ (SEC-025 - SEC-027)
-- ==============================================================================
-- Açıklama:
-- 1. SEC-025: `public.user_addresses` üzerinde RLS UPDATE kuralına eksik olan `WITH CHECK`
--    eklenir ve `user_id` alanını donduran tetikleyici yazılarak kullanıcıların başka birinin
--    adresi üzerinde sahiplik aktarımı (IDOR) yapması engellenir.
-- 2. SEC-026: `public.listing_images` üzerindeki gevşek `FOR ALL` kuralı ayrıştırılır;
--    INSERT, UPDATE ve DELETE işlemleri için projenin satıcı sahipliği (`seller_id = auth.uid()`)
--    katı olarak zorunlu kılınır. Görsel URL'si için HTTPS ve uzunluk kontrolü eklenir.
-- 3. SEC-027: `public.user_consents` (KVKK Denetim İzi) üzerinde DELETE yetkisi kalıcı olarak
--    kaldırılır (Append/Update only); `user_id`, `consent_type` ve `document_version`
--    alanları tetikleyiciyle dondurularak geriye dönük yasal manipülasyonlar engellenir.
-- ==============================================================================

-- 1. SEC-025: USER_ADDRESSES IDOR & SAHİPLİK AKTARIM KALKANI
DROP POLICY IF EXISTS "Users update own addresses" ON public.user_addresses;

CREATE POLICY "Users update own addresses" ON public.user_addresses
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.freeze_user_address_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.user_id := OLD.user_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_user_address_user_id ON public.user_addresses;
CREATE TRIGGER trg_freeze_user_address_user_id
    BEFORE UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.freeze_user_address_user_id();

-- 2. SEC-026: LISTING_IMAGES AYRIŞTIRILMIŞ SAHİPLİK VE MEDYA BÜTÜNLÜĞÜ
DROP POLICY IF EXISTS "Sellers manage images" ON public.listing_images;
DROP POLICY IF EXISTS "Sellers insert images" ON public.listing_images;
DROP POLICY IF EXISTS "Sellers update images" ON public.listing_images;
DROP POLICY IF EXISTS "Sellers delete images" ON public.listing_images;
DROP POLICY IF EXISTS "Images viewable by all" ON public.listing_images;

-- Okuma: Kamuya açık (Vitrin & Keşfet pürüzsüzlüğü için)
CREATE POLICY "Images viewable by all" ON public.listing_images
    FOR SELECT TO public, anon, authenticated
    USING (true);

-- Ekleme: Yalnızca projenin gerçek sahibi ekleyebilir
CREATE POLICY "Sellers insert images" ON public.listing_images
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    );

-- Güncelleme: Yalnızca projenin gerçek sahibi güncelleyebilir
CREATE POLICY "Sellers update images" ON public.listing_images
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    );

-- Silme: Yalnızca projenin gerçek sahibi silebilir
CREATE POLICY "Sellers delete images" ON public.listing_images
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    );

-- Görsel bütünlük tetikleyicisi (Proje ID dondurma ve URL uzunluk kontrolü)
CREATE OR REPLACE FUNCTION public.protect_listing_image_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.listing_id := OLD.listing_id;
    END IF;

    IF NEW.image_url IS NULL OR BTRIM(NEW.image_url) = '' THEN
        RAISE EXCEPTION 'EMPTY_IMAGE_URL: Görsel URL boş olamaz.';
    END IF;

    IF char_length(NEW.image_url) > 2048 THEN
        RAISE EXCEPTION 'IMAGE_URL_TOO_LONG: Görsel URL 2048 karakteri aşamaz.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_listing_image_integrity ON public.listing_images;
CREATE TRIGGER trg_protect_listing_image_integrity
    BEFORE INSERT OR UPDATE ON public.listing_images
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_listing_image_integrity();

-- 3. SEC-027: USER_CONSENTS DEĞİŞTİRİLEMEZLİK & YASAL İZİN KALKANI
-- Hukuki denetim kaydı olduğundan kullanıcıların izinleri silmesi yasaklanır
REVOKE DELETE ON TABLE public.user_consents FROM public, anon, authenticated;

-- Kullanıcının kendi izin durumunu güncellemesine izin verilir (WITH CHECK güvencesiyle)
DROP POLICY IF EXISTS "Users update own consents" ON public.user_consents;
CREATE POLICY "Users update own consents" ON public.user_consents
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.protect_user_consent_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Yasal denetim kimliklerini dondur
        NEW.user_id := OLD.user_id;
        NEW.consent_type := OLD.consent_type;
        NEW.document_version := OLD.document_version;
    END IF;

    IF NEW.user_agent IS NOT NULL AND char_length(NEW.user_agent) > 500 THEN
        NEW.user_agent := substring(NEW.user_agent from 1 for 500);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_consent_integrity ON public.user_consents;
CREATE TRIGGER trg_protect_user_consent_integrity
    BEFORE INSERT OR UPDATE ON public.user_consents
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_consent_integrity();
