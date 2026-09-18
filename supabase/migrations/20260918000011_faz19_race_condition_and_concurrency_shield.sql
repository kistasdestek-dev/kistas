-- ============================================================================
-- 20260918000011_faz19_race_condition_and_concurrency_shield.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 19 / AŞAMA 2
-- EŞZAMANLI İSTEK PATLAMASI & FİNANSAL BÜTÜNLÜK KALKANI (RACE CONDITION & CONCURRENCY SHIELD)
-- ============================================================================

-- 1. PROFILES BAKIYE VE KREDİ NEGATİF DEĞER KORUMASI (IMMUTABLE BOUNDARY)
-- Eşzamanlı yarış durumlarında (Race Condition / TOCTOU) veritabanı seviyesinde
-- hiçbir koşulda bakiyenin 0'ın altına inemeyeceğini garanti eder.

DO $$
BEGIN
    -- boost_credits negatif olamaz
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_boost_credits_positive'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_boost_credits_positive
            CHECK (boost_credits >= 0);
    END IF;

    -- available_balance negatif olamaz
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_available_balance_positive'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_available_balance_positive
            CHECK (available_balance >= 0.00);
    END IF;

    -- pending_balance negatif olamaz
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_pending_balance_positive'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_pending_balance_positive
            CHECK (pending_balance >= 0.00);
    END IF;
END $$;

-- 2. ORDERS SİPARİŞ NUMARASI VE İLAN KİLİT BÜTÜNLÜĞÜ
-- Aynı ilan için aynı anda birden fazla 'pending_payment' veya 'paid' sipariş açılamaz.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_listing_unique
ON public.orders (listing_id)
WHERE status IN ('pending_payment', 'paid', 'shipped');

-- 3. PROJECT_UPVOTES ÇİFT OYLAMA / EŞZAMANLI YARIŞ KORUMASI
-- project_id ve user_id ikilisi üzerinde tekillik indeksi kesinleştirilir.
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_upvotes_unique_pair
ON public.project_upvotes (project_id, user_id);

-- 4. KREDİ VE SPONSORLUK İŞLEM KUYRUĞU DENETİMİ
-- Son 3 saniye içinde aynı kullanıcı ve aynı ilan için mükerrer boost çağrısını önler.
CREATE OR REPLACE FUNCTION public.check_recent_boost_spam(
    p_user_id UUID,
    p_listing_id UUID,
    p_cooldown_seconds INT DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.credit_transactions
        WHERE user_id = p_user_id
          AND description LIKE '%' || p_listing_id::TEXT || '%'
          AND created_at > NOW() - (p_cooldown_seconds || ' seconds')::INTERVAL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_recent_boost_spam(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_recent_boost_spam(UUID, UUID, INT) TO authenticated, service_role;
