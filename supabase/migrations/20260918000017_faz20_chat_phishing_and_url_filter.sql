-- ============================================================================
-- FAZ 20 / AŞAMA 5: P2P SOHBET & YORUM PHISHING / ZARARLI URL KALKANI
-- (ANTI-PHISHING, URL OBFUSCATION & COMMENT CONTENT SECURITY)
-- ============================================================================
-- Bu migration:
-- 1. Sohbet mesajlarındaki ve proje yorumlarındaki phishing, sahte ödeme linkleri,
--    kısaltılmış URL'ler (bit.ly, t.me, wa.me vb.), IP adresli bağlantılar ve
--    obfuscated domain ('dot', '[.]', 'hxxp') saldırı vektörlerini yakalar.
-- 2. Proje yorumları (project_comments) tablosuna da aynı askeri düzeyde filtreleme
--    tetikleyicisi entegre eder (daha önce yorumlarda link koruması yoktu).
-- 3. Yetkili platform yöneticilerini meşru destek bağlantıları için muaf tutar.

-- 1. GELİŞMİŞ SOHBET MESAJI FİLTRESİ (MESSAGES)
CREATE OR REPLACE FUNCTION public.filter_chat_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    has_phone BOOLEAN;
    has_iban BOOLEAN;
    has_url BOOLEAN;
    has_phishing_shortener BOOLEAN;
    has_obfuscated_url BOOLEAN;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Platform yöneticileri resmi destek sohbetlerinde bağlantı ve bilgi paylaşabilir
    SELECT public.is_platform_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    -- 1. Telefon kontrolü: Türkiye ve uluslararası formatlar
    has_phone := (NEW.content ~* '(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}');
    
    -- 2. IBAN kontrolü: TR ile başlayan 26 karakter
    has_iban := (NEW.content ~* 'TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}');
    
    -- 3. Standart URL ve IP adresi kontrolü (http://, https://, www. veya IP/Port)
    has_url := (NEW.content ~* '(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me|cc|biz|info|top|ru|cn)\b|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b');

    -- 4. Kısaltılmış URL & Sosyal Mühendislik Yönlendiricileri (Phishing Link Shorteners)
    has_phishing_shortener := (NEW.content ~* '\b(t\.me|wa\.me|bit\.ly|tinyurl\.com|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|discord\.gg|goo\.gl)\/[^\s]+');

    -- 5. Obfuscated / Maskelenmiş URL Tespiti (hxxp, [dot], (dot), [.])
    has_obfuscated_url := (NEW.content ~* '(hxxp|h\*\*p|\[dot\]|\(dot\)|\[\.\]|\(\.\))');

    IF has_phone OR has_iban OR has_url OR has_phishing_shortener OR has_obfuscated_url THEN
        NEW.is_flagged := TRUE;
        NEW.flag_reason := CONCAT_WS(', ', 
            CASE WHEN has_phone THEN 'Telefon numarası algılandı' END,
            CASE WHEN has_iban THEN 'IBAN bilgisi algılandı' END,
            CASE WHEN has_url THEN 'Harici link algılandı' END,
            CASE WHEN has_phishing_shortener THEN 'Şüpheli URL kısaltma bağlantısı algılandı' END,
            CASE WHEN has_obfuscated_url THEN 'Gizlenmiş (obfuscated) web adresi algılandı' END
        );
        NEW.content := '[GÜVENLİK UYARISI: Güvenliğiniz için telefon, IBAN veya harici link paylaşımları filtrelenmiştir.]';
    END IF;

    RETURN NEW;
END;
$$;


-- 2. GELİŞMİŞ PROJE YORUMU FİLTRESİ (PROJECT_COMMENTS)
CREATE OR REPLACE FUNCTION public.filter_project_comment_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    has_phone BOOLEAN;
    has_iban BOOLEAN;
    has_url BOOLEAN;
    has_phishing_shortener BOOLEAN;
    has_obfuscated_url BOOLEAN;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Platform yöneticileri yorumlarda resmi bilgi paylaşabilir
    SELECT public.is_platform_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    -- Telefon kontrolü
    has_phone := (NEW.content ~* '(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}');
    
    -- IBAN kontrolü
    has_iban := (NEW.content ~* 'TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}');
    
    -- Standart URL / IP kontrolü
    has_url := (NEW.content ~* '(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me|cc|biz|info|top|ru|cn)\b|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b');

    -- Kısaltma servisleri
    has_phishing_shortener := (NEW.content ~* '\b(t\.me|wa\.me|bit\.ly|tinyurl\.com|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|discord\.gg|goo\.gl)\/[^\s]+');

    -- Maskelenmiş domainler
    has_obfuscated_url := (NEW.content ~* '(hxxp|h\*\*p|\[dot\]|\(dot\)|\[\.\]|\(\.\))');

    IF has_phone OR has_iban OR has_url OR has_phishing_shortener OR has_obfuscated_url THEN
        NEW.content := '[GÜVENLİK UYARISI: Güvenliğiniz için telefon, IBAN veya harici link paylaşımları filtrelenmiştir.]';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_filter_project_comment_content ON public.project_comments;
CREATE TRIGGER trg_filter_project_comment_content
BEFORE INSERT OR UPDATE OF content ON public.project_comments
FOR EACH ROW
EXECUTE FUNCTION public.filter_project_comment_content();
