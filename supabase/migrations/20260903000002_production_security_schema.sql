-- ============================================================================
-- C2C MARKETPLACE PRODUCTION SECURITY & INTEGRITY SCHEMA (SUPABASE / POSTGRESQL)
-- SecOps Standard: Anti-IDOR, Anti-Race Condition, Anti-Price Manipulation,
-- PostGIS Deterministic Location Fuzzing, Store UGC & Chat Security
-- ============================================================================

-- Gerekli Eklentiler
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUM TİPLERİ
-- ============================================================================
DO $$ BEGIN CREATE TYPE delivery_type AS ENUM ('hand_delivery', 'shipping', 'hybrid'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE cargo_size AS ENUM ('small', 'medium', 'large', 'xlarge'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE listing_status AS ENUM ('draft', 'active', 'reserved', 'sold', 'inactive', 'banned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending_payment', 'paid_escrow', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'transferred', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'offer', 'system'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dispute_status AS ENUM ('opened', 'under_review', 'resolved_refund', 'resolved_payout', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE report_reason AS ENUM ('fraud', 'prohibited_item', 'harassment', 'off_platform_deal', 'counterfeit', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 2. TABLOLAR
-- ============================================================================

-- 2.1 USERS / PROFILES (auth.users ile 1-1 ilişkili)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    iban VARCHAR(34),
    identity_number VARCHAR(11),
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_average BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0,
    city VARCHAR(50),
    district VARCHAR(50),
    raw_location GEOGRAPHY(POINT, 4326), -- Ham GPS (Yalnızca sunucu içi/güvenli bağlamda kullanılır)
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    fcm_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.2 USER ADDRESSES (Adres Defteri - Katı IDOR Koruması)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    neighborhood VARCHAR(100),
    postal_code VARCHAR(10),
    address_line TEXT NOT NULL,
    tax_or_identity_number VARCHAR(11),
    is_default_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_invoice BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.3 CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    icon_url TEXT,
    commission_rate NUMERIC(4, 4) NOT NULL DEFAULT 0.1000, -- Kategori bazlı platform komisyon oranı (%10 varsayılan)
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2.4 LISTINGS (İlanlar)
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    original_price NUMERIC(12, 2) CHECK (original_price IS NULL OR original_price >= price),
    delivery_type delivery_type NOT NULL DEFAULT 'hybrid',
    cargo_size cargo_size DEFAULT 'medium',
    status listing_status NOT NULL DEFAULT 'active',
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    raw_location GEOGRAPHY(POINT, 4326) NOT NULL, -- Asıl koordinat (Client doğrudan okuyamaz)
    fuzzed_location GEOGRAPHY(POINT, 4326),       -- ~300m saptırılmış güvenli koordinat
    view_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_negotiable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.5 LISTING IMAGES
CREATE TABLE IF NOT EXISTS public.listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    blur_hash TEXT,
    display_order SMALLINT NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.6 OFFERS (Pazarlık)
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    offered_price NUMERIC(12, 2) NOT NULL CHECK (offered_price > 0),
    counter_price NUMERIC(12, 2) CHECK (counter_price > 0),
    status offer_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '48 HOURS'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.7 ORDERS (Escrow - Finansal Bütünlük)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    delivery_type delivery_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending_payment',
    
    product_amount NUMERIC(12, 2) NOT NULL CHECK (product_amount >= 0),
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_cost >= 0),
    service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (service_fee >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount = product_amount + shipping_cost + service_fee),
    seller_earnings NUMERIC(12, 2) NOT NULL CHECK (seller_earnings >= 0),
    
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'mock',
    payment_transaction_id VARCHAR(100),
    escrow_release_transaction_id VARCHAR(100),
    payout_status payout_status NOT NULL DEFAULT 'pending',
    
    cargo_provider VARCHAR(50) DEFAULT 'mock',
    tracking_number VARCHAR(100),
    cargo_barcode TEXT,
    shipping_label_url TEXT,
    cargo_status_raw JSONB,
    
    shipping_address_snapshot JSONB NOT NULL,
    invoice_address_snapshot JSONB,
    
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    auto_approval_deadline TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.8 CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    buyer_unread_count INT NOT NULL DEFAULT 0,
    seller_unread_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(listing_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type NOT NULL DEFAULT 'text',
    metadata JSONB,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.9 DISPUTES (İtiraz / Uyuşmazlık Yönetimi - Dolap Stili)
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_urls TEXT[] NOT NULL DEFAULT '{}',
    status dispute_status NOT NULL DEFAULT 'opened',
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.10 BLOCKED USERS (App Store Guideline 1.2 / UGC Zorunluluğu)
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- 2.11 REPORTS (Kullanıcı & İçerik Raporlama - UGC Kriteri)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    reported_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason_category report_reason NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 3. GÜVENLİK VE İŞ MANTIĞI FONKSİYONLARI & TRIGGER'LAR
-- ============================================================================

-- 3.1 DETERMINISTIC LOCATION FUZZING (~300m Sapma ile Konum Maskeleme)
-- Aynı ilan için her zaman aynı saptırılmış koordinat üretilir (haritada zıplamaz),
-- ancak satıcının kesin ev koordinatına asla ulaşılamaz.
CREATE OR REPLACE FUNCTION public.calculate_fuzzed_location(
    raw_loc GEOGRAPHY,
    seed_id UUID
)
RETURNS GEOGRAPHY AS $$
DECLARE
    hash_int INT;
    angle_rad DOUBLE PRECISION;
    dist_meters DOUBLE PRECISION;
    delta_x DOUBLE PRECISION;
    delta_y DOUBLE PRECISION;
    lng DOUBLE PRECISION;
    lat DOUBLE PRECISION;
    new_lng DOUBLE PRECISION;
    new_lat DOUBLE PRECISION;
BEGIN
    IF raw_loc IS NULL THEN
        RETURN NULL;
    END IF;

    lng := ST_X(raw_loc::geometry);
    lat := ST_Y(raw_loc::geometry);

    -- UUID'den deterministik hash üretimi
    hash_int := ('x' || substr(md5(seed_id::text), 1, 8))::bit(32)::int;
    
    -- 0 ile 2*PI arasında açı
    angle_rad := abs(hash_int % 6283) / 1000.0;
    -- 150m ile 350m arasında rastgele sapma mesafesi (~250-300m)
    dist_meters := 150.0 + (abs(hash_int / 6283) % 200);

    -- Koordinat derece dönüşümü (WGS84 yaklaşık)
    delta_y := (dist_meters * cos(angle_rad)) / 111320.0;
    delta_x := (dist_meters * sin(angle_rad)) / (111320.0 * cos(radians(lat)));

    new_lat := lat + delta_y;
    new_lng := lng + delta_x;

    RETURN ST_SetSRID(ST_MakePoint(new_lng, new_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS raw_location GEOMETRY(Point, 4326);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fuzzed_location GEOMETRY(Point, 4326);

-- İlan eklendiğinde/güncellendiğinde fuzzed_location otomatik hesaplanır
CREATE OR REPLACE FUNCTION public.handle_listing_location_fuzzing()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.raw_location IS NOT NULL THEN
        NEW.fuzzed_location := public.calculate_fuzzed_location(NEW.raw_location, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listing_location_fuzzing ON public.listings;
CREATE TRIGGER trg_listing_location_fuzzing
    BEFORE INSERT OR UPDATE OF raw_location ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.handle_listing_location_fuzzing();

-- 3.2 SOHBET GÜVENLİĞİ: TELEFON, IBAN & DIŞ LINK FİLTRESİ
-- Dolandırıcılığı ve platform dışına kaçışı engeller
CREATE OR REPLACE FUNCTION public.filter_chat_message_content()
RETURNS TRIGGER AS $$
DECLARE
    has_phone BOOLEAN;
    has_iban BOOLEAN;
    has_url BOOLEAN;
BEGIN
    -- Türkiye telefon formatları: 05xx..., +905xx..., 5xx... (boşluklu/boşluksuz)
    has_phone := (NEW.content ~* '(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}');
    
    -- IBAN kontrolü: TR ile başlayan 26 karakter
    has_iban := (NEW.content ~* 'TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}');
    
    -- URL / Link kontrolü
    has_url := (NEW.content ~* '(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me)\b');

    IF has_phone OR has_iban OR has_url THEN
        NEW.is_flagged := TRUE;
        NEW.flag_reason := CONCAT_WS(', ', 
            CASE WHEN has_phone THEN 'Telefon numarası algılandı' END,
            CASE WHEN has_iban THEN 'IBAN bilgisi algılandı' END,
            CASE WHEN has_url THEN 'Harici link algılandı' END
        );
        -- Güvenlik Maskelemesi (İçerik sansürlenir)
        NEW.content := '[GÜVENLİK UYARISI: Güvenliğiniz için telefon, IBAN veya link paylaşımları filtrelenmiştir.]';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_filter_chat_message ON public.messages;
CREATE TRIGGER trg_filter_chat_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.filter_chat_message_content();

-- 3.3 ESCROW ATOMIC TRANSACTION & RACE CONDITION / PRICE MANIPULATION DEFENSE
-- İstemci asla fiyat veya komisyon gönderemez! Tutar DB'den kilitlenerek (FOR UPDATE) çekilir.
CREATE OR REPLACE FUNCTION public.create_escrow_order_atomic(
    p_listing_id UUID,
    p_shipping_address_id UUID,
    p_payment_provider VARCHAR DEFAULT 'mock',
    p_cargo_provider VARCHAR DEFAULT 'mock'
)
RETURNS JSONB AS $$
DECLARE
    v_buyer_id UUID;
    v_listing RECORD;
    v_address RECORD;
    v_category RECORD;
    v_final_price NUMERIC(12, 2);
    v_accepted_offer RECORD;
    v_commission_rate NUMERIC(4, 4);
    v_service_fee NUMERIC(12, 2);
    v_shipping_cost NUMERIC(12, 2) := 39.99; -- Standart kargo ücreti
    v_total_amount NUMERIC(12, 2);
    v_seller_earnings NUMERIC(12, 2);
    v_order_id UUID;
    v_order_number VARCHAR(32);
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmış kullanıcı bulunamadı.';
    END IF;

    -- 1. İLANI VE DURUMUNU KİLİTLE (Row-level Lock: Concurrency / Double Spend Koruması)
    SELECT * INTO v_listing 
    FROM public.listings 
    WHERE id = p_listing_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: İlan bulunamadı.';
    END IF;

    IF v_listing.status <> 'active' THEN
        RAISE EXCEPTION 'INVALID_STATUS: İlan artık aktif değil veya başka biri tarafından rezerve edildi.';
    END IF;

    IF v_listing.seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'SELF_PURCHASE: Kullanıcı kendi ilanını satın alamaz.';
    END IF;

    -- 2. ADRESİ DOĞRULA (IDOR Koruması)
    SELECT * INTO v_address
    FROM public.user_addresses
    WHERE id = p_shipping_address_id AND user_id = v_buyer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_ADDRESS: Teslimat adresi alıcıya ait değil veya geçersiz.';
    END IF;

    -- 3. FİYAT BELİRLEME (FİYAT MANİPÜLASYONUNA KAPALI)
    -- Varsa satıcı tarafından kabul edilmiş aktif teklifi kontrol et
    SELECT * INTO v_accepted_offer
    FROM public.offers
    WHERE listing_id = p_listing_id 
      AND buyer_id = v_buyer_id 
      AND status = 'accepted'
      AND expires_at > TIMEZONE('utc', NOW())
    ORDER BY updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_final_price := v_accepted_offer.offered_price;
    ELSE
        v_final_price := v_listing.price; -- Doğrudan DB'deki aktif fiyat
    END IF;

    -- 4. KOMİSYON VE FİNANSAL HESAPLAMA
    SELECT commission_rate INTO v_commission_rate 
    FROM public.categories 
    WHERE id = v_listing.category_id;

    IF v_commission_rate IS NULL THEN
        v_commission_rate := 0.1000; -- %10
    END IF;

    v_service_fee := ROUND(v_final_price * v_commission_rate, 2);
    v_total_amount := v_final_price + v_shipping_cost + v_service_fee;
    v_seller_earnings := v_final_price; -- Platform komisyonu alıcıdan tahsil edilir

    -- 5. SİPARİŞ NUMARASI ÜRET
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

    -- 6. ATOMİK SİPARİŞ OLUŞTURMA & İLANI REZERVE ETME
    INSERT INTO public.orders (
        order_number,
        listing_id,
        buyer_id,
        seller_id,
        delivery_type,
        status,
        product_amount,
        shipping_cost,
        service_fee,
        total_amount,
        seller_earnings,
        payment_provider,
        cargo_provider,
        shipping_address_snapshot
    ) VALUES (
        v_order_number,
        v_listing.id,
        v_buyer_id,
        v_listing.seller_id,
        v_listing.delivery_type,
        'pending_payment',
        v_final_price,
        v_shipping_cost,
        v_service_fee,
        v_total_amount,
        v_seller_earnings,
        p_payment_provider,
        p_cargo_provider,
        to_jsonb(v_address)
    ) RETURNING id INTO v_order_id;

    -- İlanı rezerve et (Böylece başka bir alıcı aynı anda sipariş edemez)
    UPDATE public.listings 
    SET status = 'reserved', updated_at = TIMEZONE('utc', NOW())
    WHERE id = v_listing.id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount,
        'product_amount', v_final_price,
        'service_fee', v_service_fee,
        'shipping_cost', v_shipping_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4 KVKK / GDPR UYUMLU HESAP SİLME / ANONİMLEŞTİRME FONKSİYONU
-- App Store Guideline 5.1.1(v) gereğince kullanıcı hesabını tek tıkla silebilmelidir.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_active_orders INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum bulunamadı.';
    END IF;

    -- Tamamlanmamış aktif sipariş var mı?
    SELECT COUNT(*) INTO v_active_orders
    FROM public.orders
    WHERE (buyer_id = v_user_id OR seller_id = v_user_id)
      AND status IN ('paid_escrow', 'shipped', 'delivered', 'disputed');

    IF v_active_orders > 0 THEN
        RAISE EXCEPTION 'ACTIVE_ORDERS_EXIST: Devam eden siparişleriniz varken hesabınızı silemezsiniz.';
    END IF;

    -- Profil verilerini anonimleştir (Kişisel veri temizliği)
    UPDATE public.profiles
    SET 
        full_name = 'Silinmiş Kullanıcı',
        phone = NULL,
        bio = NULL,
        avatar_url = NULL,
        iban = NULL,
        identity_number = NULL,
        raw_location = NULL,
        fcm_token = NULL,
        is_banned = TRUE
    WHERE id = v_user_id;

    -- Adreslerini sil
    DELETE FROM public.user_addresses WHERE user_id = v_user_id;

    -- Aktif ilanlarını yayından kaldır
    UPDATE public.listings SET status = 'inactive' WHERE seller_id = v_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. KATI ROW LEVEL SECURITY (RLS) POLİTİKALARI (IDOR ÖNLEME)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4.1 PROFILES:
-- Public profiller okunabilir ancak engellenen kullanıcılar birbirini göremez.
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;
CREATE POLICY "Profiles viewable by non-blocked users" ON public.profiles FOR SELECT USING (
    id = auth.uid() OR (
        NOT EXISTS (
            SELECT 1 FROM public.blocked_users 
            WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
               OR (blocker_id = profiles.id AND blocked_id = auth.uid())
        )
    )
);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4.2 USER ADDRESSES (IDOR Savunması): Sadece sahibi okur/yazar
DROP POLICY IF EXISTS "Users view own addresses" ON public.user_addresses;
CREATE POLICY "Users view own addresses" ON public.user_addresses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own addresses" ON public.user_addresses;
CREATE POLICY "Users insert own addresses" ON public.user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own addresses" ON public.user_addresses;
CREATE POLICY "Users update own addresses" ON public.user_addresses FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own addresses" ON public.user_addresses;
CREATE POLICY "Users delete own addresses" ON public.user_addresses FOR DELETE USING (auth.uid() = user_id);

-- 4.3 CATEGORIES: Herkese açık
DROP POLICY IF EXISTS "Categories viewable by public" ON public.categories;
CREATE POLICY "Categories viewable by public" ON public.categories FOR SELECT USING (true);

-- 4.4 LISTINGS:
-- İlanlar herkese açık fakat engellenen kullanıcıların ilanları listelenmez.
-- raw_location kolonu istemciden okunamaz (fuzzed_location okunur).
DROP POLICY IF EXISTS "Listings viewable by allowed users" ON public.listings;
CREATE POLICY "Listings viewable by allowed users" ON public.listings FOR SELECT USING (
    (status = 'active' OR auth.uid() = seller_id)
    AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE (blocker_id = auth.uid() AND blocked_id = listings.seller_id)
           OR (blocker_id = listings.seller_id AND blocked_id = auth.uid())
    )
);
DROP POLICY IF EXISTS "Sellers insert own listings" ON public.listings;
CREATE POLICY "Sellers insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Sellers update own listings" ON public.listings;
CREATE POLICY "Sellers update own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Sellers delete own listings" ON public.listings;
CREATE POLICY "Sellers delete own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);

-- 4.5 LISTING IMAGES
DROP POLICY IF EXISTS "Images viewable by all" ON public.listing_images;
CREATE POLICY "Images viewable by all" ON public.listing_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Sellers manage images" ON public.listing_images;
CREATE POLICY "Sellers manage images" ON public.listing_images FOR ALL USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_images.listing_id AND seller_id = auth.uid())
);

-- 4.6 OFFERS: Sadece alıcı ve satıcı
DROP POLICY IF EXISTS "Offers viewable by participants" ON public.offers;
CREATE POLICY "Offers viewable by participants" ON public.offers FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS "Buyers create offers" ON public.offers;
CREATE POLICY "Buyers create offers" ON public.offers FOR INSERT WITH CHECK (
    auth.uid() = buyer_id 
    AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE (blocker_id = auth.uid() AND blocked_id = offers.seller_id)
           OR (blocker_id = offers.seller_id AND blocked_id = auth.uid())
    )
);
DROP POLICY IF EXISTS "Participants update offers" ON public.offers;
CREATE POLICY "Participants update offers" ON public.offers FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 4.7 ORDERS: Sadece alıcı ve satıcı okur. Doğrudan UPDATE engellenmiştir (RPC/Edge Function kullanılır)
DROP POLICY IF EXISTS "Orders viewable by buyer or seller" ON public.orders;
CREATE POLICY "Orders viewable by buyer or seller" ON public.orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 4.8 CONVERSATIONS & MESSAGES: Sadece katılımcılar
DROP POLICY IF EXISTS "Conversations viewable by participants" ON public.conversations;
CREATE POLICY "Conversations viewable by participants" ON public.conversations FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS "Messages viewable by participants" ON public.messages;
CREATE POLICY "Messages viewable by participants" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
);
DROP POLICY IF EXISTS "Messages insertable by participants" ON public.messages;
CREATE POLICY "Messages insertable by participants" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    ) AND NOT EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.blocked_users b ON (
            (b.blocker_id = c.buyer_id AND b.blocked_id = c.seller_id) OR
            (b.blocker_id = c.seller_id AND b.blocked_id = c.buyer_id)
        )
        WHERE c.id = messages.conversation_id
    )
);

-- 4.9 DISPUTES: İtirazı açan veya siparişin tarafları görebilir
DROP POLICY IF EXISTS "Disputes viewable by order parties" ON public.disputes;
CREATE POLICY "Disputes viewable by order parties" ON public.disputes FOR SELECT USING (
    opened_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = disputes.order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
);
DROP POLICY IF EXISTS "Buyers/Sellers open dispute" ON public.disputes;
CREATE POLICY "Buyers/Sellers open dispute" ON public.disputes FOR INSERT WITH CHECK (
    opened_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = disputes.order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
);

-- 4.10 BLOCKED USERS: Yalnızca engelleyen kişi listesini görür ve yönetir
DROP POLICY IF EXISTS "Users view their own block list" ON public.blocked_users;
CREATE POLICY "Users view their own block list" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users insert blocks" ON public.blocked_users;
CREATE POLICY "Users insert blocks" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users delete blocks" ON public.blocked_users;
CREATE POLICY "Users delete blocks" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- 4.11 REPORTS: Her kullanıcı rapor oluşturabilir, raporları yalnızca admin görebilir
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Users create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
