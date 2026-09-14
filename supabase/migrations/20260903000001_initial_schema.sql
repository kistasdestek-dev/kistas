-- ============================================================================
-- C2C MARKETPLACE DDL SCHEMA (SUPABASE / POSTGRESQL)
-- Letgo & Dolap Hybrid Architecture (Escrow + Hand Delivery + Realtime)
-- ============================================================================

-- 0. Gerekli Eklentiler (PostGIS / UUID / Crypto)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. ENUM TİPLERİ (Domain Sabitleri)
DO $$ BEGIN
    CREATE TYPE delivery_type AS ENUM ('hand_delivery', 'shipping', 'hybrid');
    CREATE TYPE cargo_size AS ENUM ('small', 'medium', 'large', 'xlarge');
    CREATE TYPE listing_status AS ENUM ('draft', 'active', 'reserved', 'sold', 'inactive', 'banned');
    CREATE TYPE order_status AS ENUM (
        'pending_payment',  -- Ödeme bekleniyor
        'paid_escrow',     -- Ödeme havuzda (satıcının kargolaması bekleniyor)
        'shipped',         -- Kargoya verildi / takip no girildi
        'delivered',       -- Alıcıya ulaştı / onay penceresinde
        'completed',       -- Alıcı onayladı / Bakiye satıcıya aktarıldı
        'cancelled',       -- Kargolanmadan iptal edildi / tam iade
        'disputed',        -- İtiraz / iade süreci başlatıldı
        'refunded'         -- İtiraz onaylandı, para alıcıya iade edildi
    );
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'transferred', 'failed');
    CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled');
    CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'offer', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABLOLAR
-- ============================================================================

-- 2.1 USERS / PROFILES (auth.users ile 1-1 ilişkili profil)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    iban VARCHAR(34), -- Satıcı ödeme transferi için
    identity_number VARCHAR(11), -- KVKK & E-Fatura/Kargo zorunlu TCKN
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0), -- Escrow'daki tutar
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_average BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0,
    city VARCHAR(50),
    district VARCHAR(50),
    location GEOGRAPHY(POINT, 4326), -- Letgo tarzı yakınlık araması için PostGIS
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    fcm_token TEXT, -- Mobil Push Bildirimleri
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.2 USER ADDRESSES (Dolap tarzı kargo & fatura adresleri)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL, -- Örn: "Ev", "İş"
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    neighborhood VARCHAR(100),
    postal_code VARCHAR(10),
    address_line TEXT NOT NULL,
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
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2.4 LISTINGS (İLANLAR - Çift Satış Modelli)
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    original_price NUMERIC(12, 2) CHECK (original_price IS NULL OR original_price >= price),
    discount_rate SMALLINT GENERATED ALWAYS AS (
        CASE 
            WHEN original_price > price THEN ROUND(((original_price - price) / original_price) * 100)::SMALLINT
            ELSE 0 
        END
    ) STORED,
    delivery_type delivery_type NOT NULL DEFAULT 'hybrid', -- Letgo (hand_delivery), Dolap (shipping), Hybrid
    cargo_size cargo_size DEFAULT 'medium', -- Kargo desi sınıflandırması
    status listing_status NOT NULL DEFAULT 'active',
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    location GEOGRAPHY(POINT, 4326), -- Konum bazlı arama (Letgo)
    view_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_negotiable BOOLEAN NOT NULL DEFAULT TRUE, -- Pazarlığa açık mı?
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.5 LISTING IMAGES (Çoklu Fotoğraf & Mobil Galeri)
CREATE TABLE IF NOT EXISTS public.listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    blur_hash TEXT, -- Mobil resim ön yükleme placeholder'ı
    display_order SMALLINT NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.6 OFFERS (PAZARLIK TEKLİFLERİ - Letgo Stili)
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

-- 2.7 ORDERS & ESCROW (GÜVENLİ HAVUZ & SİPARİŞ - Dolap Stili)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL, -- Müşteriye gösterilen sipariş referans kodu
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    delivery_type delivery_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending_payment',
    
    -- Finansal Ayrışım (Escrow Breakdown)
    product_amount NUMERIC(12, 2) NOT NULL CHECK (product_amount >= 0),
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_cost >= 0),
    service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (service_fee >= 0), -- Platform komisyonu
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount = product_amount + shipping_cost + service_fee),
    seller_earnings NUMERIC(12, 2) NOT NULL CHECK (seller_earnings >= 0), -- Satıcıya aktarılacak net tutar
    
    -- Ödeme Sağlayıcı İçi Referanslar (Plug & Play Adapter)
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'mock', -- 'mock', 'iyzico', 'stripe'
    payment_transaction_id VARCHAR(100), -- Sağlayıcının ödeme ID'si (Örn: iyzico paymentId)
    escrow_release_transaction_id VARCHAR(100), -- Satıcıya aktarım transfer ID'si
    payout_status payout_status NOT NULL DEFAULT 'pending',
    
    -- Kargo Sağlayıcı İçi Referanslar (Plug & Play Adapter)
    cargo_provider VARCHAR(50) DEFAULT 'mock', -- 'mock', 'yurtici', 'surat', 'mng'
    tracking_number VARCHAR(100),
    cargo_barcode TEXT,
    shipping_label_url TEXT,
    cargo_status_raw JSONB, -- Kargo entegrasyonundan dönen ham webhook payload'ı
    
    -- Teslimat & Adres Snapshot (Sipariş anındaki donmuş adres)
    shipping_address_snapshot JSONB,
    invoice_address_snapshot JSONB,
    
    -- Zaman Çizelgesi
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    auto_approval_deadline TIMESTAMPTZ, -- Teslimattan sonra X saat (Örn: 48 saat) içinde oto-onay
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.8 CONVERSATIONS & MESSAGES (REALTIME CHAT)
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
    metadata JSONB, -- Teklif kartı bilgisi, resim ölçüleri, koordinat vs.
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 3. INDEXES (Performans & Coğrafi Sorgular)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_delivery_type ON public.listings(delivery_type);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_geo ON public.listings USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_listing ON public.orders(listing_id);

CREATE INDEX IF NOT EXISTS idx_offers_listing ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON public.offers(buyer_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(buyer_id, seller_id);

-- ============================================================================
-- 4. TRIGGERS & FUNCTIONS (Otomasyonlar & Güvenlik)
-- ============================================================================

-- 4.1 auth.users oluşturulduğunda otomatik profile satırı açılması
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.phone
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Updated_at sütunlarını otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4.3 Mesaj geldiğinde conversation last_message ve okunmamış sayacı güncelleme
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message = NEW.content,
        last_message_at = NEW.created_at,
        buyer_unread_count = CASE WHEN NEW.sender_id = seller_id THEN buyer_unread_count + 1 ELSE buyer_unread_count END,
        seller_unread_count = CASE WHEN NEW.sender_id = buyer_id THEN seller_unread_count + 1 ELSE seller_unread_count END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- 4.4 Mesafe Bazlı İlan Arama Fonksiyonu (PostGIS Letgo Stili)
CREATE OR REPLACE FUNCTION public.get_nearby_listings(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 20000 -- 20 KM
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    price NUMERIC,
    delivery_type delivery_type,
    city VARCHAR,
    district VARCHAR,
    distance_meters DOUBLE PRECISION,
    cover_image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.price,
        l.delivery_type,
        l.city,
        l.district,
        ST_Distance(l.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_meters,
        (SELECT image_url FROM public.listing_images li WHERE li.listing_id = l.id AND li.is_cover = true LIMIT 1) as cover_image_url
    FROM public.listings l
    WHERE 
        l.status = 'active'
        AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_meters)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLİTİKALARI
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

-- 5.1 Profiles: Herkes okuyabilir, sadece sahibi güncelleyebilir
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5.2 User Addresses: Sadece adres sahibi görebilir ve yönetebilir
CREATE POLICY "Users manage their own addresses" ON public.user_addresses 
    FOR ALL USING (auth.uid() = user_id);

-- 5.3 Categories: Herkes okuyabilir, sadece admin yönetir
CREATE POLICY "Categories are readable by everyone" ON public.categories FOR SELECT USING (true);

-- 5.4 Listings: Aktif ilanlar herkese açık, ilanı oluşturan yönetebilir
CREATE POLICY "Active listings are viewable by everyone" ON public.listings 
    FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Sellers can create listings" ON public.listings 
    FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own listings" ON public.listings 
    FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own listings" ON public.listings 
    FOR DELETE USING (auth.uid() = seller_id);

-- 5.5 Listing Images: İlan resimleri herkese açık, ilan sahibi ekler/siler
CREATE POLICY "Listing images viewable by everyone" ON public.listing_images FOR SELECT USING (true);
CREATE POLICY "Sellers manage images" ON public.listing_images 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.listings 
            WHERE listings.id = listing_images.listing_id AND listings.seller_id = auth.uid()
        )
    );

-- 5.6 Offers: Sadece teklifi veren alıcı ve ilanın satıcısı görebilir
CREATE POLICY "Offers viewable by buyer and seller" ON public.offers 
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers can create offers" ON public.offers 
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update offers" ON public.offers 
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 5.7 Orders: Yalnızca alıcı, satıcı ve Edge Function (service_role) erişebilir
CREATE POLICY "Orders viewable by buyer or seller" ON public.orders 
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers can initiate orders" ON public.orders 
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
-- Not: Sipariş durum güncellemeleri (Escrow release vs.) Edge Function üzerinden Service Role ile yapılmalıdır.

-- 5.8 Conversations: Sadece katılımcılar görebilir
CREATE POLICY "Conversations viewable by participants" ON public.conversations 
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create conversation" ON public.conversations 
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- 5.9 Messages: Sadece konuşma katılımcıları okuyabilir ve mesaj atabilir
CREATE POLICY "Messages viewable by conversation participants" ON public.messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );
CREATE POLICY "Participants can insert messages" ON public.messages 
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

-- ============================================================================
-- 6. SUPABASE REALTIME ETKİLEŞİMİ (WebSocket)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
