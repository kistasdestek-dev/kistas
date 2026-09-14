-- ============================================================================
-- C2C MARKETPLACE: BOOSTING, CREDITS, REVIEWS & CATEGORY TREE (SUPABASE / POSTGRESQL)
-- Öne Çıkarma (Doping), Kredi Sistemi, Dolap Stili Değerlendirme & Zengin Kategoriler
-- ============================================================================

-- 1. PROFILES & LISTINGS TABLOLARINA KOLON EKLEMELERİ
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS boost_credits INT NOT NULL DEFAULT 50 CHECK (boost_credits >= 0); -- Yeni üyelere hediye 50 kredi

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_listings_boosted ON public.listings(boosted_until DESC NULLS LAST);

-- 2. KREDİ HAREKETLERİ TABLOSU (Credit Transactions)
DO $$ BEGIN
    CREATE TYPE credit_tx_type AS ENUM ('purchase', 'spend_boost', 'reward', 'refund');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- Pozitif: yükleme/hediye, Negatif: harcama
    balance_after INT NOT NULL,
    type credit_tx_type NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);

-- 3. DOLAP STİLİ DEĞERLENDİRME & YORUM TABLOSU (Reviews & Ratings)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user ON public.reviews(reviewed_user_id);

-- Değerlendirme yapıldığında satıcının ortalama puanını ve yorum sayısını güncelleyen trigger
CREATE OR REPLACE FUNCTION public.update_user_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_avg NUMERIC(3, 2);
    v_count INT;
BEGIN
    SELECT COALESCE(ROUND(AVG(rating), 2), 5.00), COUNT(*)
    INTO v_avg, v_count
    FROM public.reviews
    WHERE reviewed_user_id = NEW.reviewed_user_id;

    UPDATE public.profiles
    SET 
        rating_average = v_avg,
        rating_count = v_count,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.reviewed_user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating_stats ON public.reviews;
CREATE TRIGGER trg_update_rating_stats
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_user_rating_stats();

-- 4. ATOMİK İLAN ÖNE ÇIKARMA FONKSİYONU (RPC)
CREATE OR REPLACE FUNCTION public.boost_listing_with_credits(
    p_listing_id UUID,
    p_duration_hours INT,
    p_credit_cost INT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_seller_id UUID;
    v_current_credits INT;
    v_new_credits INT;
    v_new_boosted_until TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
    END IF;

    -- 1. Kullanıcı kredisini kilitle (FOR UPDATE)
    SELECT boost_credits INTO v_current_credits
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_current_credits < p_credit_cost THEN
        RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Yetersiz kredi bakiyesi. Gereken: %, Mevcut: %', p_credit_cost, v_current_credits;
    END IF;

    -- 2. İlan kontrolü
    SELECT seller_id, COALESCE(GREATEST(boosted_until, TIMEZONE('utc', NOW())), TIMEZONE('utc', NOW()))
    INTO v_seller_id, v_new_boosted_until
    FROM public.listings
    WHERE id = p_listing_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Aktif ilan bulunamadı.';
    END IF;

    IF v_seller_id <> v_user_id THEN
        RAISE EXCEPTION 'FORBIDDEN: Sadece kendi ilanınızı öne çıkarabilirsiniz.';
    END IF;

    -- 3. Süreyi uzat ve krediyi düş
    v_new_boosted_until := v_new_boosted_until + (p_duration_hours || ' HOURS')::INTERVAL;
    v_new_credits := v_current_credits - p_credit_cost;

    UPDATE public.profiles
    SET boost_credits = v_new_credits
    WHERE id = v_user_id;

    UPDATE public.listings
    SET boosted_until = v_new_boosted_until
    WHERE id = p_listing_id;

    -- 4. Kredi işlem günlüğü kaydet
    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, type, description
    ) VALUES (
        v_user_id, -p_credit_cost, v_new_credits, 'spend_boost',
        'İlanı ' || p_duration_hours || ' saat öne çıkarma'
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_credits', v_new_credits,
        'boosted_until', v_new_boosted_until
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ZENGİN KATEGORİ VE ALT KATEGORİ VERİLERİ (İNCİK BONCUK TÜM DETAYLAR)
INSERT INTO public.categories (id, name, slug, icon_url, order_index) VALUES
('11111111-1111-1111-1111-111111111101', 'Giyim & Moda', 'giyim-moda', '👗', 1),
('11111111-1111-1111-1111-111111111102', 'Elektronik', 'elektronik', '📱', 2),
('11111111-1111-1111-1111-111111111103', 'Ev & Yaşam', 'ev-yasam', '🛋️', 3),
('11111111-1111-1111-1111-111111111104', 'Anne & Bebek', 'anne-bebek', '🍼', 4),
('11111111-1111-1111-1111-111111111105', 'Aksesuar & Takı', 'aksesuar-taki', '💍', 5),
('11111111-1111-1111-1111-111111111106', 'Kozmetik & Bakım', 'kozmetik-bakim', '💄', 6),
('11111111-1111-1111-1111-111111111107', 'Spor & Outdoor', 'spor-outdoor', '⚽', 7),
('11111111-1111-1111-1111-111111111108', 'Kitap & Hobi & Oyun', 'kitap-hobi', '🎮', 8)
ON CONFLICT (id) DO NOTHING;

-- Alt Kategoriler (Örnek incik boncuk detaylar)
INSERT INTO public.categories (parent_id, name, slug, icon_url, order_index) VALUES
-- Giyim
('11111111-1111-1111-1111-111111111101', 'Elbise & Etek', 'elbise-etek', '👗', 1),
('11111111-1111-1111-1111-111111111101', 'Çanta & Cüzdan', 'canta-cuzdan', '👜', 2),
('11111111-1111-1111-1111-111111111101', 'Ayakkabı & Sneaker', 'ayakkabi-sneaker', '👟', 3),
-- Elektronik
('11111111-1111-1111-1111-111111111102', 'Akıllı Telefon & Aksesuar', 'telefon-aksesuar', '📱', 1),
('11111111-1111-1111-1111-111111111102', 'Kulaklık & Ses', 'kulaklik-ses', '🎧', 2),
('11111111-1111-1111-1111-111111111102', 'Laptop & Tablet', 'bilgisayar-tablet', '💻', 3),
-- Aksesuar & Takı
('11111111-1111-1111-1111-111111111105', 'Kolye, Küpe & Yüzük', 'taki-mucevher', '💎', 1),
('11111111-1111-1111-1111-111111111105', 'Saat & Akıllı Bileklik', 'saat-bileklik', '⌚', 2)
ON CONFLICT DO NOTHING;

-- 6. RLS POLİTİKALARI
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit transactions" ON public.credit_transactions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Reviews viewable by everyone" ON public.reviews 
    FOR SELECT USING (true);

CREATE POLICY "Buyer can review completed order" ON public.reviews 
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = reviews.order_id 
              AND orders.buyer_id = auth.uid() 
              AND orders.status = 'completed'
        )
    );
