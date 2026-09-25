-- ============================================================================
-- KISTAS — ADIM 1: FOUNDATION SCHEMA & DEFAULT-DENY RLS ARCHITECTURE
-- Migration: 20260919000001_foundation_schema_and_rls.sql
-- Description: 23 tablo ve görünüm için eksiksiz DDL, PII-arındırılmış profiles_public
--              görünümü, D1/D2 IDOR kesin kapatması, fintech bütünlük tetikleyicileri
--              (guard_financial_columns, write_financial_audit, enforce_double_entry,
--              check_velocity, protect_brand_name) ve bağımsız is_platform_admin RPC'si.
-- Standart: Pars DevState Bank-Grade Güvenlik Çerçevesi & Default-Deny
-- ============================================================================

-- 0. GEREKLİ EKLENTİLER & YÖNETİM ŞEMASI
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.platform_admins (
    email TEXT PRIMARY KEY CHECK (email = LOWER(email)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE private.platform_admins FROM PUBLIC, anon, authenticated;

INSERT INTO private.platform_admins (email)
VALUES 
    ('visionprefabrik@gmail.com'),
    ('kistasdestek@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 1. YÖNETİCİ YETKİ KONTROL RPC FONKSİYONLARI (IS_PLATFORM_ADMIN)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        INNER JOIN private.platform_admins AS platform_admin
          ON platform_admin.email = LOWER(auth_user.email)
        WHERE auth_user.id = COALESCE(p_user_id, auth.uid())
          AND auth_user.email_confirmed_at IS NOT NULL
    );
$$;

-- Geriye dönük uyumluluk için parametresiz imza:
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.is_platform_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;


-- ============================================================================
-- 2. TABLO TANIMLARI (23 ÇEKİRDEK TABLO VE GÖRÜNÜMLER)
-- ============================================================================

-- 2.1 PROFILES (Kullanıcı Profil Tablosu — Tam ve Hassas Veriler)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    city VARCHAR(50),
    district VARCHAR(50),
    iban VARCHAR(34),
    identity_number VARCHAR(11),
    available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
    boost_credits INTEGER NOT NULL DEFAULT 50 CHECK (boost_credits >= 0),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_average BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    fcm_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS chk_no_negative_balance;
ALTER TABLE public.profiles
    ADD CONSTRAINT chk_no_negative_balance 
    CHECK (available_balance >= 0 AND pending_balance >= 0 AND boost_credits >= 0);

-- 2.2 PROFILES_PUBLIC (PII-Arındırılmış Kamuya Açık Görünüm)
-- D1 IDOR Kalkanı: Anon ve diğer kullanıcılar profilleri ASLA doğrudan tablodan okuyamaz.
-- Telefon, IBAN, TCKN, bakiye, fcm_token bu görünümde kesinlikle yer almaz.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    is_verified,
    rating_average,
    rating_count,
    created_at
FROM public.profiles;

-- 2.3 CATEGORIES (Platform Kategorileri)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    icon_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.4 LISTINGS (Projeler & Vitrin İlanları)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    tagline VARCHAR(220),
    description TEXT NOT NULL,
    price NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    pricing_model VARCHAR(30) NOT NULL DEFAULT 'freemium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' 
        CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'rejected', 'suspended')),
    is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
    boosted_until TIMESTAMPTZ,
    upvote_count INTEGER NOT NULL DEFAULT 0 CHECK (upvote_count >= 0),
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_average BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    platforms TEXT[] DEFAULT ARRAY['iOS']::TEXT[],
    website_url TEXT,
    app_store_url TEXT,
    play_store_url TEXT,
    logo_url TEXT,
    promo_code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.5 LISTING_IMAGES (Proje Ekran Görüntüleri ve Görseller)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.6 PROJECT_COMMENTS (Topluluk Yorumları & Geliştirici Yanıtları)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.7 PROJECT_UPVOTES (Topluluk Oyları & Destekleri)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_listing_user_upvote UNIQUE (listing_id, user_id)
);

-- 2.8 BLOG_POSTS (SEO Uyumlu Editoryal İçerik)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image_url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Girişimcilik',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    author_name TEXT NOT NULL DEFAULT 'Kıstas Editoryal',
    author_title TEXT NOT NULL DEFAULT 'Teknoloji & İnovasyon Ekibi',
    author_avatar_url TEXT,
    reading_time_minutes INTEGER NOT NULL DEFAULT 4,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    view_count INTEGER NOT NULL DEFAULT 0,
    meta_title TEXT,
    meta_description TEXT,
    canonical_url TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.9 ORDERS (Hizmet Siparişleri ve Escrow Durum Makinesi)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed', 'resolved', 'cancelled')),
    request_id TEXT UNIQUE,
    payout_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.10 CREDIT_TRANSACTIONS (Finansal Defter-i Kebir / Wallet Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL,
    balance_after NUMERIC(18, 2),
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'admin_adjustment',
    type VARCHAR(50),
    direction VARCHAR(10) CHECK (direction IN ('debit', 'credit')),
    related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    related_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    request_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.11 CONVERSATIONS (Mesajlaşma & Destek Odaları)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    buyer_unread_count INTEGER NOT NULL DEFAULT 0,
    seller_unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_listing_conversation UNIQUE (listing_id, buyer_id, seller_id)
);

-- 2.12 MESSAGES (Şifreli / Korumalı Sohbet Mesajları)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.13 USER_ADDRESSES (Fatura & İletişim Adresleri)
-- ----------------------------------------------------------------------------
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
    is_default_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_invoice BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.14 USER_CONSENTS (KVKK & ETK Yasal Onay Denetim Defteri)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    document_version VARCHAR(20) NOT NULL,
    is_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT unique_user_consent_version UNIQUE (user_id, consent_type, document_version)
);

-- 2.15 DISPUTES (İtirazlar & Fon Uyuşmazlık Kayıtları)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    raised_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    status VARCHAR(30) NOT NULL DEFAULT 'opened'
        CHECK (status IN ('opened', 'in_review', 'resolved', 'dismissed')),
    winner VARCHAR(20) CHECK (winner IN ('buyer', 'seller')),
    resolution_notes TEXT,
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.16 OFFERS (Pazarlık & Özel Teklifler)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    offered_price NUMERIC(18, 2) NOT NULL CHECK (offered_price > 0),
    counter_price NUMERIC(18, 2) CHECK (counter_price > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '48 HOURS'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.17 REPORTS (Kullanıcı / İçerik İhbar & Şikayetler)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    reported_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason_category VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.18 BLOCKED_USERS (Engellenen Kullanıcılar — UGC Standardı)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_blocker_blocked UNIQUE (blocker_id, blocked_id),
    CONSTRAINT chk_cannot_block_self CHECK (blocker_id <> blocked_id)
);

-- 2.19 NOTIFICATIONS (Kullanıcı Bildirimleri)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.20 WEEKLY_SHOWCASE_WINNERS (Haftalık Vitrin Liderleri)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_showcase_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    week_start TIMESTAMPTZ NOT NULL,
    support_score INTEGER NOT NULL CHECK (support_score >= 0),
    category_rank SMALLINT NOT NULL DEFAULT 1 CHECK (category_rank = 1),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT weekly_showcase_valid_window CHECK (ends_at > starts_at),
    CONSTRAINT weekly_showcase_one_category_winner UNIQUE (category_id, week_start),
    CONSTRAINT weekly_showcase_one_project_per_week UNIQUE (project_id, week_start)
);

-- 2.21 ADMIN_ACTION_AUDIT (Yönetici Hareketleri Değiştirilemez Günlüğü)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_action_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2.22 FINANCIAL_AUDIT (Banka Düzeyi Kriptografik Hash-Zincirli Denetim Defteri)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    actor UUID,
    actor_email TEXT,
    table_name TEXT NOT NULL,
    row_id UUID,
    op TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    request_id TEXT,
    prev_hash TEXT,
    row_hash TEXT
);

-- 2.23 ANOMALY_EVENTS (Dolandırıcılık ve Anomali Tespit Olayları)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomaly_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    user_id UUID,
    rule TEXT NOT NULL,
    detail JSONB
);


-- ============================================================================
-- 3. PERFORMANS VE ARAMA İNDEKSLERİ
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON public.listings(category_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_seller_created ON public.listings(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_upvotes ON public.listings(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_boosted_until ON public.listings(boosted_until DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_order ON public.listing_images(listing_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_project_comments_listing_created ON public.project_comments(listing_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_project_comments_user ON public.project_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_parent ON public.project_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_upvotes_listing ON public.project_upvotes(listing_id);
CREATE INDEX IF NOT EXISTS idx_project_upvotes_user ON public.project_upvotes(user_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_request_id ON public.orders(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_time ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_request_id ON public.credit_transactions(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON public.conversations(listing_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_actor_created ON public.admin_action_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_row_time ON public.financial_audit(row_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_user_ts ON public.anomaly_events(user_id, ts DESC);


-- ============================================================================
-- 4. SAVUNMA TETİKLEYİCİLERİ VE GÜVENLİK FONKSİYONLARI
-- ============================================================================

-- 4.1 MARKA SAHTECİLİĞİNE KARŞI KORUMA (PROTECT_BRAND_NAME)
-- "Kıstas" adını ve tüm leetspeak varyasyonlarını yalnızca yöneticilere tahsis eder.
-- Normal kullanıcının kaydı veya güncellemesinde 403 (FORBIDDEN) hatası döndürür.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_brand_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    normalized_name TEXT;
    is_reserved BOOLEAN := false;
BEGIN
    -- service_role her zaman muaf
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Platform yöneticisi muaf
    BEGIN
        IF auth.role() = 'authenticated' AND public.is_platform_admin(auth.uid()) THEN
            RETURN NEW;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    IF NEW.full_name IS NOT NULL THEN
        normalized_name := LOWER(TRANSLATE(NEW.full_name, 'Iİıîíïì@41!|05$', 'iiiiiiiaaiioos'));
        normalized_name := REGEXP_REPLACE(normalized_name, '[^a-z0-9]', '', 'g');

        IF normalized_name LIKE '%kistas%' THEN
            is_reserved := true;
        ELSIF NEW.full_name ~* 'k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]' THEN
            is_reserved := true;
        END IF;

        IF is_reserved THEN
            RAISE EXCEPTION 'FORBIDDEN: ‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_brand_name ON public.profiles;
CREATE TRIGGER trg_protect_brand_name
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_brand_name();


-- 4.2 HASSAS VE FİNANSAL ALAN MUHAFIZI (GUARD_FINANCIAL_COLUMNS)
-- Bakiye, doğrulama ve kredi alanlarına doğrudan kullanıcı yazımını bloke eder.
-- Profil silme taleplerini finansal bütünlük gereği yalnızca yöneticiye açar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF TG_OP = 'UPDATE' THEN
            IF (
                NEW.is_verified IS DISTINCT FROM OLD.is_verified
                OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
                OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
                OR NEW.boost_credits IS DISTINCT FROM OLD.boost_credits
            ) AND NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'FORBIDDEN: financial/verification fields are admin-only'
                    USING ERRCODE = 'P0001';
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'FORBIDDEN: self-deletion of profile with financial records is forbidden'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_financial ON public.profiles;
CREATE TRIGGER trg_guard_financial
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_financial_columns();


-- 4.3 KRİPTOGRAFİK HASH HESAPLAYICI VE DENETİM İZİ (WRITE_FINANCIAL_AUDIT)
-- Bakiye ve işlem hareketlerini SHA-256 zinciriyle mühürler.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._audit_hash(p_prev TEXT, p_payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(extensions.digest(COALESCE(p_prev, 'GENESIS') || ':' || p_payload::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.write_financial_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    p_prev TEXT;
    p_payload JSONB;
    v_actor UUID;
    v_email TEXT;
BEGIN
    v_actor := auth.uid();
    
    SELECT row_hash INTO p_prev
    FROM public.financial_audit
    ORDER BY id DESC
    LIMIT 1;

    IF v_actor IS NOT NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE id = v_actor;
    END IF;

    p_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'row_id', COALESCE(NEW.id, OLD.id),
        'op', TG_OP,
        'actor', v_actor,
        'before', to_jsonb(OLD),
        'after', to_jsonb(NEW)
    );

    INSERT INTO public.financial_audit (
        actor,
        actor_email,
        table_name,
        row_id,
        op,
        before_data,
        after_data,
        prev_hash,
        row_hash
    )
    VALUES (
        v_actor,
        v_email,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        p_prev,
        public._audit_hash(p_prev, p_payload)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
AFTER UPDATE OF available_balance, pending_balance, boost_credits ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();

DROP TRIGGER IF EXISTS trg_audit_credit ON public.credit_transactions;
CREATE TRIGGER trg_audit_credit
AFTER INSERT OR UPDATE OR DELETE ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();


-- 4.4 ÇİFT TARAFLI MUHASEBE TETİKLEYİCİSİ (ENFORCE_DOUBLE_ENTRY)
-- Borç (debit) hareketinin aynı request_id ile eşleşen bir alacak (credit)
-- kaydı olmadan işlenmesini engeller.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_double_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.direction = 'debit' AND NEW.request_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.credit_transactions
            WHERE request_id = NEW.request_id 
              AND direction = 'credit'
              AND amount = NEW.amount 
              AND id <> NEW.id
        ) THEN
            RAISE EXCEPTION 'DOUBLE_ENTRY_VIOLATION: debit without matching credit'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_double_entry ON public.credit_transactions;
CREATE CONSTRAINT TRIGGER trg_double_entry
AFTER INSERT ON public.credit_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_double_entry();


-- 4.5 HIZ KONTROLÜ VE ANOMALİ RADARI (CHECK_VELOCITY)
-- 1 saat içinde 10'dan fazla finansal hareket gerçekleştiren hesapları
-- otomatik yakalayarak anomaly_events tablosuna loglar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_velocity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.credit_transactions
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_count > 10 THEN
        INSERT INTO public.anomaly_events (user_id, rule, detail)
        VALUES (
            NEW.user_id,
            'velocity_balance_change',
            jsonb_build_object(
                'count_1h', v_count,
                'transaction_id', NEW.id,
                'amount', NEW.amount,
                'type', COALESCE(NEW.transaction_type, NEW.type)
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_velocity ON public.credit_transactions;
CREATE TRIGGER trg_velocity
AFTER INSERT ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.check_velocity();


-- ============================================================================
-- 5. RLS (ROW LEVEL SECURITY) POLİTİKALARI (DEFAULT-DENY & IDOR KALKANI)
-- ============================================================================

-- Bütün tablolarda RLS etkinleştirilir:
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_showcase_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_events ENABLE ROW LEVEL SECURITY;

-- 5.0 DEFAULT REVOKE (ANON İÇİN VARSAYILAN RET - DEFAULT-DENY)
REVOKE ALL ON TABLE public.profiles FROM anon, public;
REVOKE ALL ON TABLE public.orders FROM anon, public;
REVOKE ALL ON TABLE public.credit_transactions FROM anon, public;
REVOKE ALL ON TABLE public.conversations FROM anon, public;
REVOKE ALL ON TABLE public.messages FROM anon, public;
REVOKE ALL ON TABLE public.user_addresses FROM anon, public;
REVOKE ALL ON TABLE public.user_consents FROM anon, public;
REVOKE ALL ON TABLE public.disputes FROM anon, public;
REVOKE ALL ON TABLE public.offers FROM anon, public;
REVOKE ALL ON TABLE public.reports FROM anon, public;
REVOKE ALL ON TABLE public.blocked_users FROM anon, public;
REVOKE ALL ON TABLE public.notifications FROM anon, public;
REVOKE ALL ON TABLE public.admin_action_audit FROM anon, public;
REVOKE ALL ON TABLE public.financial_audit FROM anon, public;
REVOKE ALL ON TABLE public.anomaly_events FROM anon, public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- 5.1 PROFILES & PROFILES_PUBLIC (D1 IDOR DÜZELTMESİ)
-- Anonim ve normal oturumlu kullanıcılar vitrin profil bilgilerini YALNIZCA profiles_public görünümünden alır.
-- profiles tablosuna doğrudan SELECT sorgusu atan kullanıcı YALNIZCA kendi satırını görebilir.
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, service_role;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_anon_active_seller_read" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5.2 CATEGORIES (Kamusal Okuma, Yönetici Yönetimi)
GRANT SELECT ON public.categories TO anon, authenticated, service_role;
GRANT ALL ON public.categories TO service_role;

DROP POLICY IF EXISTS "categories_read_public" ON public.categories;
CREATE POLICY "categories_read_public" ON public.categories
FOR SELECT USING (is_active = TRUE OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
CREATE POLICY "categories_admin_manage" ON public.categories
FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- 5.3 LISTINGS (Kamusal Okuma, Sahip Yönetimi)
GRANT SELECT ON public.listings TO anon, authenticated, service_role;
GRANT ALL ON public.listings TO authenticated, service_role;

DROP POLICY IF EXISTS "listings_read_public" ON public.listings;
CREATE POLICY "listings_read_public" ON public.listings
FOR SELECT USING (
    status IN ('approved', 'active') 
    OR (auth.role() = 'authenticated' AND (seller_id = auth.uid() OR public.is_platform_admin(auth.uid())))
);

DROP POLICY IF EXISTS "listings_insert_owner" ON public.listings;
CREATE POLICY "listings_insert_owner" ON public.listings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "listings_update_owner" ON public.listings;
CREATE POLICY "listings_update_owner" ON public.listings
FOR UPDATE TO authenticated
USING (auth.uid() = seller_id OR public.is_platform_admin(auth.uid()))
WITH CHECK (auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "listings_delete_owner" ON public.listings;
CREATE POLICY "listings_delete_owner" ON public.listings
FOR DELETE TO authenticated
USING (auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

-- 5.4 LISTING_IMAGES (Kamusal Okuma, İlan Sahibi Yönetimi)
GRANT SELECT ON public.listing_images TO anon, authenticated, service_role;
GRANT ALL ON public.listing_images TO authenticated, service_role;

DROP POLICY IF EXISTS "listing_images_read_public" ON public.listing_images;
CREATE POLICY "listing_images_read_public" ON public.listing_images
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "listing_images_manage_owner" ON public.listing_images;
CREATE POLICY "listing_images_manage_owner" ON public.listing_images
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.listings
        WHERE listings.id = listing_images.listing_id
          AND (listings.seller_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.listings
        WHERE listings.id = listing_images.listing_id
          AND (listings.seller_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    )
);

-- 5.5 PROJECT_COMMENTS (Kamusal Okuma, Yazar Silme)
GRANT SELECT ON public.project_comments TO anon, authenticated, service_role;
GRANT INSERT, DELETE ON public.project_comments TO authenticated, service_role;

DROP POLICY IF EXISTS "project_comments_read_public" ON public.project_comments;
CREATE POLICY "project_comments_read_public" ON public.project_comments
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "project_comments_insert_user" ON public.project_comments;
CREATE POLICY "project_comments_insert_user" ON public.project_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = author_id);

DROP POLICY IF EXISTS "project_comments_delete_owner" ON public.project_comments;
CREATE POLICY "project_comments_delete_owner" ON public.project_comments
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = author_id OR public.is_platform_admin(auth.uid()));

-- 5.6 PROJECT_UPVOTES (Kamusal Okuma, Kendi Oyunu Yönetme)
GRANT SELECT ON public.project_upvotes TO anon, authenticated, service_role;
GRANT ALL ON public.project_upvotes TO authenticated, service_role;

DROP POLICY IF EXISTS "project_upvotes_read_public" ON public.project_upvotes;
CREATE POLICY "project_upvotes_read_public" ON public.project_upvotes
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "project_upvotes_manage_own" ON public.project_upvotes;
CREATE POLICY "project_upvotes_manage_own" ON public.project_upvotes
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5.7 BLOG_POSTS (Kamusal Okuma, Yönetici Yönetimi)
GRANT SELECT ON public.blog_posts TO anon, authenticated, service_role;
GRANT ALL ON public.blog_posts TO authenticated, service_role;

DROP POLICY IF EXISTS "blog_posts_read_public" ON public.blog_posts;
CREATE POLICY "blog_posts_read_public" ON public.blog_posts
FOR SELECT USING (is_published = TRUE OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "blog_posts_admin_manage" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_manage" ON public.blog_posts
FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- 5.8 ORDERS (D2 IDOR DÜZELTMESİ — Yalnızca Alıcı, Satıcı ve Admin)
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated, service_role;

DROP POLICY IF EXISTS "orders_select_participants" ON public.orders;
CREATE POLICY "orders_select_participants" ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
CREATE POLICY "orders_insert_buyer" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "orders_update_participants" ON public.orders;
CREATE POLICY "orders_update_participants" ON public.orders
FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()))
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

-- 5.9 CREDIT_TRANSACTIONS (D2 IDOR DÜZELTMESİ — Yalnızca Hesap Sahibi ve Admin)
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT INSERT ON public.credit_transactions TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.credit_transactions FROM authenticated, anon, public;

DROP POLICY IF EXISTS "credit_transactions_select_own" ON public.credit_transactions;
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "credit_transactions_insert_authenticated" ON public.credit_transactions;
CREATE POLICY "credit_transactions_insert_authenticated" ON public.credit_transactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_platform_admin(auth.uid()));

-- 5.10 CONVERSATIONS & MESSAGES (D2 IDOR DÜZELTMESİ — Yalnızca Katılımcılar)
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated, service_role;
GRANT SELECT, INSERT ON public.messages TO authenticated, service_role;

DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;
CREATE POLICY "conversations_select_participants" ON public.conversations
FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "conversations_insert_buyer" ON public.conversations;
CREATE POLICY "conversations_insert_buyer" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = buyer_id 
    AND buyer_id <> seller_id
);

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants" ON public.messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
    OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;
CREATE POLICY "messages_insert_participants" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
);

-- 5.11 USER_ADDRESSES (D2 IDOR DÜZELTMESİ — Yalnızca Kendi Adresleri)
GRANT ALL ON public.user_addresses TO authenticated, service_role;

DROP POLICY IF EXISTS "user_addresses_manage_own" ON public.user_addresses;
CREATE POLICY "user_addresses_manage_own" ON public.user_addresses
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_platform_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id);

-- 5.12 USER_CONSENTS (Yalnızca Kendi İzinleri, İmmutable)
GRANT SELECT, INSERT ON public.user_consents TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.user_consents FROM authenticated, anon, public;

DROP POLICY IF EXISTS "user_consents_select_own" ON public.user_consents;
CREATE POLICY "user_consents_select_own" ON public.user_consents
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "user_consents_insert_own" ON public.user_consents;
CREATE POLICY "user_consents_insert_own" ON public.user_consents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5.13 DISPUTES (Yalnızca İlgili Taraflar ve Admin)
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated, service_role;

DROP POLICY IF EXISTS "disputes_select_participants" ON public.disputes;
CREATE POLICY "disputes_select_participants" ON public.disputes
FOR SELECT TO authenticated
USING (
    auth.uid() = opened_by 
    OR auth.uid() = raised_by
    OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = disputes.order_id
          AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "disputes_insert_party" ON public.disputes;
CREATE POLICY "disputes_insert_party" ON public.disputes
FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = opened_by OR auth.uid() = raised_by)
    AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = disputes.order_id
          AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "disputes_update_admin" ON public.disputes;
CREATE POLICY "disputes_update_admin" ON public.disputes
FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- 5.14 OFFERS (Alıcı ve Satıcı İzolasyonu)
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated, service_role;

DROP POLICY IF EXISTS "offers_select_parties" ON public.offers;
CREATE POLICY "offers_select_parties" ON public.offers
FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "offers_insert_buyer" ON public.offers;
CREATE POLICY "offers_insert_buyer" ON public.offers
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "offers_update_parties" ON public.offers;
CREATE POLICY "offers_update_parties" ON public.offers
FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()))
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_platform_admin(auth.uid()));

-- 5.15 REPORTS (Yalnızca Bildiren ve Admin)
GRANT SELECT, INSERT ON public.reports TO authenticated, service_role;

DROP POLICY IF EXISTS "reports_select_reporter" ON public.reports;
CREATE POLICY "reports_select_reporter" ON public.reports
FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "reports_insert_reporter" ON public.reports;
CREATE POLICY "reports_insert_reporter" ON public.reports
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- 5.16 BLOCKED_USERS (Yalnızca Engelleyen)
GRANT ALL ON public.blocked_users TO authenticated, service_role;

DROP POLICY IF EXISTS "blocked_users_manage_own" ON public.blocked_users;
CREATE POLICY "blocked_users_manage_own" ON public.blocked_users
FOR ALL TO authenticated
USING (auth.uid() = blocker_id OR public.is_platform_admin(auth.uid()))
WITH CHECK (auth.uid() = blocker_id);

-- 5.17 NOTIFICATIONS (Yalnızca Kendi Bildirimleri)
GRANT SELECT, UPDATE ON public.notifications TO authenticated, service_role;
GRANT INSERT ON public.notifications TO authenticated, service_role;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_platform_admin(auth.uid()));

-- 5.18 WEEKLY_SHOWCASE_WINNERS (Kamusal Okuma, Admin Yönetimi)
GRANT SELECT ON public.weekly_showcase_winners TO anon, authenticated, service_role;
GRANT ALL ON public.weekly_showcase_winners TO service_role;

DROP POLICY IF EXISTS "weekly_showcase_winners_read_public" ON public.weekly_showcase_winners;
CREATE POLICY "weekly_showcase_winners_read_public" ON public.weekly_showcase_winners
FOR SELECT USING (TRUE);

-- 5.19 ADMIN_ACTION_AUDIT (Yalnızca Yönetici Okuma, Append-Only)
GRANT SELECT ON public.admin_action_audit TO authenticated, service_role;
GRANT INSERT ON public.admin_action_audit TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.admin_action_audit FROM authenticated, anon, public;

DROP POLICY IF EXISTS "admin_action_audit_select_admin" ON public.admin_action_audit;
CREATE POLICY "admin_action_audit_select_admin" ON public.admin_action_audit
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- 5.20 FINANCIAL_AUDIT (Yalnızca Yönetici Okuma, Append-Only)
GRANT SELECT ON public.financial_audit TO authenticated, service_role;
GRANT INSERT ON public.financial_audit TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.financial_audit FROM authenticated, anon, public;

DROP POLICY IF EXISTS "financial_audit_select_admin" ON public.financial_audit;
CREATE POLICY "financial_audit_select_admin" ON public.financial_audit
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- 5.21 ANOMALY_EVENTS (Yalnızca Yönetici Okuma, Sistem Ekler)
GRANT SELECT ON public.anomaly_events TO authenticated, service_role;
GRANT INSERT ON public.anomaly_events TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.anomaly_events FROM authenticated, anon, public;

DROP POLICY IF EXISTS "anomaly_events_select_admin" ON public.anomaly_events;
CREATE POLICY "anomaly_events_select_admin" ON public.anomaly_events
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));


-- ============================================================================
-- 6. DOĞRULAMA VE TEST SENARYOSU (SQL AUDIT & VALIDATION BLOCK)
-- ============================================================================
-- Bu blok RLS ve güvenlik kurallarının doğru kurulduğunu teyit etmek için kullanılır.
-- Canlı veya staging veritabanında çalıştırılarak denetim yapılabilir:
/*
-- TEST 1: Anon role ile doğrudan profiles tablosu okunamamalı (Beklenen: 0 satır veya 401/403)
SET ROLE anon;
SELECT * FROM public.profiles; -- Boş dönmeli veya yetki hatası vermeli

-- TEST 2: Anon role ile profiles_public sorunsuz okunabilmeli (Beklenen: 200, PII içermeyen veriler)
SELECT id, full_name, avatar_url, is_verified, rating_average FROM public.profiles_public LIMIT 5;

-- TEST 3: Authenticated kullanıcının diğer tabloları (credit_transactions, orders) çapraz okuması engellenmeli
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT * FROM public.credit_transactions WHERE user_id <> '00000000-0000-0000-0000-000000000001'; -- Beklenen: 0 satır

-- TEST 4: Kıstas isim sahteciliği denemesi (Beklenen: FORBIDDEN hatası)
UPDATE public.profiles SET full_name = 'Kıstas Resmi Destek' WHERE id = '00000000-0000-0000-0000-000000000001'; -- Beklenen: Hata

-- RESET
RESET ROLE;
*/
