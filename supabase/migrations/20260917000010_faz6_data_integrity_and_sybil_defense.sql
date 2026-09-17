-- ==============================================================================
-- KISTAS SAVUNMA HATTI: FAZ 6 - VERİ BÜTÜNLÜĞÜ, RAPOR KALKANI & SYBIL SAVUNMASI (SEC-024)
-- ==============================================================================
-- Açıklama:
-- 1. `public.reports` tablosuna spam flood ve DoS yapılmasını önlemek için 1 saatlik
--    aynı hedefe mükerrer raporlama engeli ve 1.000 karakter sınırı getiren tetikleyici eklenir.
--    Raporlar tablosundaki doğrudan UPDATE/DELETE yetkileri authenticated rolünden geri alınır.
-- 2. `public.profiles` ve `public.listings` tablolarında sınırsız TEXT kolonlarına
--    (bio <= 1000, description <= 6000, tagline <= 200) veritabanı seviyesinde CHECK kısıtları konulur.
-- 3. `public.project_comments` tablosuna doğrudan INSERT ve UPDATE yetkisi kapatılır;
--    bütün yorumlar güvenli ve hız limitli `create_project_comment` fonksiyonu üzerinden zorunlu kılınır.
-- 4. `handle_listing_status_protection` tetikleyicisine Sybil savunması eklenir:
--    Doğrulanmamış (unconfirmed) e-posta adresleriyle sahte taslak projeler yüklenerek
--    inceleme kuyruğunun kilitlenmesi veritabanı seviyesinde engellenir.
-- ==============================================================================

-- 1. RAPORLAMA ABUSE VE FLOOD KALKANI
CREATE OR REPLACE FUNCTION public.check_report_abuse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Karakter tavanı denetimi
    IF NEW.description IS NOT NULL AND char_length(NEW.description) > 1000 THEN
        RAISE EXCEPTION 'REPORT_TOO_LONG: Şikayet açıklaması en fazla 1000 karakter olabilir.';
    END IF;

    -- 1 Saatlik Cooldown / Tekillik Kalkanı
    IF EXISTS (
        SELECT 1 FROM public.reports
        WHERE reporter_id = NEW.reporter_id
          AND created_at > (clock_timestamp() - INTERVAL '1 hour')
          AND (
            (NEW.reported_listing_id IS NOT NULL AND reported_listing_id = NEW.reported_listing_id)
            OR (NEW.reported_user_id IS NOT NULL AND reported_user_id = NEW.reported_user_id)
            OR (NEW.reported_message_id IS NOT NULL AND reported_message_id = NEW.reported_message_id)
          )
    ) THEN
        RAISE EXCEPTION 'REPORT_COOLDOWN: Bu içerik için yakın zamanda bir bildirimde bulundunuz. İncelememiz devam ediyor.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_report_abuse ON public.reports;
CREATE TRIGGER trg_check_report_abuse
    BEFORE INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.check_report_abuse();

-- Reports tablosunda doğrudan UPDATE/DELETE yetkilerini geri al
REVOKE UPDATE, DELETE ON TABLE public.reports FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reports TO authenticated;

-- Platform yöneticilerinin raporları okuyabilmesi için RLS politikası
DROP POLICY IF EXISTS "Platform admins view reports" ON public.reports;
CREATE POLICY "Platform admins view reports"
    ON public.reports FOR SELECT TO authenticated
    USING (public.is_platform_admin());

-- 2. VERİTABANI METİN KOLON SINIRLARI (DATABASE BLOAT & DOS KORUMASI)
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS chk_profiles_bio_length;
ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_bio_length 
    CHECK (bio IS NULL OR char_length(bio) <= 1000) NOT VALID;

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_description_length,
    DROP CONSTRAINT IF EXISTS chk_listings_tagline_length;
ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_description_length 
    CHECK (char_length(description) <= 6000) NOT VALID,
    ADD CONSTRAINT chk_listings_tagline_length 
    CHECK (tagline IS NULL OR char_length(tagline) <= 200) NOT VALID;

-- 3. YORUMLAR TABLOSUNDA DOĞRUDAN INSERT VE UPDATE YETKİSİNİN MÜHÜRLENMESİ
REVOKE INSERT, UPDATE ON TABLE public.project_comments FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.project_comments TO anon, authenticated;
GRANT DELETE ON TABLE public.project_comments TO authenticated;

-- 4. SYBIL VE BOT KALKANI (PROJE OLUŞTURMADA E-POSTA DOĞRULAMA ZORUNLULUĞU)
CREATE OR REPLACE FUNCTION public.handle_listing_status_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_email_confirmed BOOLEAN;
BEGIN
    -- Super admin ve background servisler serbesttir
    IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Sybil kalkanı: Kullanıcı e-posta adresini onaylamış olmalıdır
        SELECT (u.email_confirmed_at IS NOT NULL)
        INTO v_email_confirmed
        FROM auth.users AS u
        WHERE u.id = auth.uid();

        IF COALESCE(v_email_confirmed, FALSE) = FALSE THEN
            RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED: Proje oluşturabilmek için lütfen e-posta adresinizi doğrulayın.';
        END IF;

        -- Güvenli varsayılanlar
        NEW.status := 'draft';
        NEW.boosted_until := NULL;
        NEW.category_boosted_until := NULL;
        NEW.upvotes_count := 0;
        NEW.view_count := 0;
        NEW.review_feedback := NULL;
        NEW.review_requested_at := NULL;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Satıcı kendi projesinin durumunu taslaktan yayına (active), rezerveye veya satıldıya geçiremez
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NEW.status IN ('active', 'reserved', 'sold') THEN
                RAISE EXCEPTION 'FORBIDDEN: Proje durumunu doğrudan bu aşamaya geçiremezsiniz. Lütfen inceleme talep edin.';
            END IF;
        END IF;

        -- Kritik alanları dondur (yalnızca admin değiştirebilir)
        NEW.boosted_until := OLD.boosted_until;
        NEW.category_boosted_until := OLD.category_boosted_until;
        NEW.upvotes_count := OLD.upvotes_count;
        NEW.view_count := OLD.view_count;
        NEW.seller_id := OLD.seller_id;
        NEW.review_feedback := OLD.review_feedback;
        NEW.review_requested_at := OLD.review_requested_at;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;
