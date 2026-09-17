-- ============================================================================
-- KEŞFET EKRANI ONARIMI & MARKA/SOHBET SAVUNMA SERTLEŞTİRMESİ
-- SEC-021: Ziyaretçi Keşfet Erişimi Onarımı, Kiril Homoglyph ve Destek Sohbet Kalkanı
-- ============================================================================

-- 1. KEŞFET EKRANI ONARIMI: ZİYARETÇİ VE ANONİM KULLANICILARA PROJELERİ AÇMA
-- blocked_users tablosunun anon rolden izole edilmesi sonrasında listings
-- tablosundaki doğrudan alt sorgu izin hatası veriyordu (HTTP 401).
-- Güvenli SECURITY DEFINER fonksiyonu ile ziyaretçiler için keşfet vitrini açılır.

CREATE OR REPLACE FUNCTION public.is_user_blocked(p_user_id UUID, p_target_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT CASE 
        WHEN p_user_id IS NULL OR p_target_id IS NULL THEN FALSE
        ELSE EXISTS (
            SELECT 1 FROM public.blocked_users
            WHERE (blocker_id = p_user_id AND blocked_id = p_target_id)
               OR (blocker_id = p_target_id AND blocked_id = p_user_id)
        )
    END;
$$;

REVOKE ALL ON FUNCTION public.is_user_blocked(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(UUID, UUID) TO anon, authenticated, service_role;

-- Listings tablosuna anonim ve giriş yapmış kullanıcıların okuma iznini teyit et
GRANT SELECT ON TABLE public.listings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Listings viewable by allowed users" ON public.listings;
CREATE POLICY "Listings viewable by allowed users" 
ON public.listings FOR SELECT 
USING (
    (
        status = 'active' 
        OR (auth.uid() IS NOT NULL AND auth.uid() = seller_id) 
        OR (auth.uid() IS NOT NULL AND public.is_platform_admin())
    )
    AND NOT public.is_user_blocked(auth.uid(), listings.seller_id)
);


-- 2. KİRİL IDN HOMOGLYPH İLE MARKA VE YÖNETİCİ TAKLİDİ KALKANI
-- Latin karakterlerle birebir aynı görünen Kiril (к, і, с, т, а) harflerini kullanarak
-- sahte "Kıstas Destek" hesabı açılmasını veritabanında engeller.

CREATE OR REPLACE FUNCTION public.check_profile_brand_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    normalized_name TEXT;
    is_reserved BOOLEAN := false;
BEGIN
    IF NEW.full_name IS NOT NULL THEN
        -- 1. Türkçe leetspeak ve Kiril (Cyrillic) homoglyph normalizasyonu
        -- к/К -> k, і/І -> i, с/С -> s, т/Т -> t, а/А -> a
        normalized_name := LOWER(TRANSLATE(NEW.full_name, 'Iİıîíïì@41!|05$кКіІсСтТаА', 'iiiiiiiaaiiooskkiissttaa'));
        normalized_name := REGEXP_REPLACE(normalized_name, '[^a-z0-9]', '', 'g');

        -- 2. Marka adı eşleşme kontrolü
        IF normalized_name LIKE '%kistas%' THEN
            is_reserved := true;
        ELSIF NEW.full_name ~* '[kк][\W_]*[ıİiîíïì1!|іІ][\W_]*[s5$сС][\W_]*[tт][\W_]*[a@4аА][\W_]*[s5$сС]' THEN
            is_reserved := true;
        END IF;

        -- 3. Yetkisiz kullanım tespiti
        IF is_reserved THEN
            IF NOT public.is_platform_admin() THEN
                RAISE EXCEPTION 'FORBIDDEN: ‘Kıstas’ adı ve görsel benzeri varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- 3. DESTEK SOHBETİ FİLTRESİ SERTLEŞTİRMESİ (Yönetici Muafiyeti & search_path)
-- Meşru yöneticilerin destek mesajlarında yardım bağlantısı gönderebilmesini sağlar.

CREATE OR REPLACE FUNCTION public.filter_chat_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    has_phone BOOLEAN;
    has_iban BOOLEAN;
    has_url BOOLEAN;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Platform yöneticileri destek sohbetlerinde bağlantı ve bilgi paylaşabilir
    SELECT public.is_platform_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    -- Telefon kontrolü: Türkiye formatları (05xx, +905xx)
    has_phone := (NEW.content ~* '(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}');
    
    -- IBAN kontrolü: TR ile başlayan 26 karakter
    has_iban := (NEW.content ~* 'TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}');
    
    -- URL kontrolü
    has_url := (NEW.content ~* '(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me)\b');

    IF has_phone OR has_iban OR has_url THEN
        NEW.is_flagged := TRUE;
        NEW.flag_reason := CONCAT_WS(', ', 
            CASE WHEN has_phone THEN 'Telefon numarası algılandı' END,
            CASE WHEN has_iban THEN 'IBAN bilgisi algılandı' END,
            CASE WHEN has_url THEN 'Harici link algılandı' END
        );
        NEW.content := '[GÜVENLİK UYARISI: Güvenliğiniz için telefon, IBAN veya link paylaşımları filtrelenmiştir.]';
    END IF;

    RETURN NEW;
END;
$$;
