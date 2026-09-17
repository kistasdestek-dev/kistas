-- KISTAS FAZ 1 - FAZ 14 TUMLESİK MİGRASYON PAKETİ
-- Uretim Tarihi: 2026-09-17T15:11:25.953Z



-- ============================================================================
-- DOSYA: 20260917000001_daily_showcase_leaders.sql
-- ============================================================================

-- Günün Vitrini: önceki Türkiye günündeki doğrulanmış desteklerle kategori liderleri.
CREATE TABLE IF NOT EXISTS public.daily_showcase_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    showcase_date DATE NOT NULL,
    competition_start TIMESTAMPTZ NOT NULL,
    competition_end TIMESTAMPTZ NOT NULL,
    support_score INTEGER NOT NULL CHECK (support_score >= 1),
    category_rank SMALLINT NOT NULL DEFAULT 1 CHECK (category_rank = 1),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT daily_showcase_valid_competition CHECK (competition_end > competition_start),
    CONSTRAINT daily_showcase_valid_window CHECK (ends_at > starts_at),
    CONSTRAINT daily_showcase_one_category_winner UNIQUE (category_id, showcase_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_showcase_category_date ON public.daily_showcase_winners (category_id, showcase_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_showcase_project_date ON public.daily_showcase_winners (project_id, showcase_date DESC);
ALTER TABLE public.daily_showcase_winners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.daily_showcase_winners FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.select_daily_showcase_winners(p_reference_time TIMESTAMPTZ DEFAULT NOW())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_local_day_start TIMESTAMP;
    v_showcase_date DATE;
    v_competition_start TIMESTAMPTZ;
    v_competition_end TIMESTAMPTZ;
    v_showcase_starts_at TIMESTAMPTZ;
    v_showcase_ends_at TIMESTAMPTZ;
    v_changed_count INTEGER := 0;
BEGIN
    v_local_day_start := DATE_TRUNC('day', p_reference_time AT TIME ZONE 'Europe/Istanbul');
    v_showcase_date := v_local_day_start::DATE;
    v_competition_start := (v_local_day_start - INTERVAL '1 day') AT TIME ZONE 'Europe/Istanbul';
    v_competition_end := v_local_day_start AT TIME ZONE 'Europe/Istanbul';
    v_showcase_starts_at := v_competition_end;
    v_showcase_ends_at := (v_local_day_start + INTERVAL '1 day') AT TIME ZONE 'Europe/Istanbul';

    WITH candidate_scores AS (
        SELECT listing.id AS project_id, listing.category_id,
               listing.upvotes_count AS lifetime_support_count, listing.created_at,
               COUNT(verified_user.id)::INTEGER AS support_score
        FROM public.listings AS listing
        INNER JOIN public.categories AS category ON category.id = listing.category_id AND category.is_active = true
        LEFT JOIN public.project_upvotes AS support
          ON support.project_id = listing.id
         AND support.created_at >= v_competition_start
         AND support.created_at < v_competition_end
         AND support.user_id <> listing.seller_id
        LEFT JOIN auth.users AS verified_user
          ON verified_user.id = support.user_id AND verified_user.email_confirmed_at IS NOT NULL
        WHERE listing.status = 'active'
          AND listing.category_id IS NOT NULL
          AND (listing.boosted_until IS NULL OR listing.boosted_until <= p_reference_time)
          AND (listing.category_boosted_until IS NULL OR listing.category_boosted_until <= p_reference_time)
        GROUP BY listing.id, listing.category_id, listing.upvotes_count, listing.created_at
        HAVING COUNT(verified_user.id) >= 1
    ), category_ranking AS (
        SELECT candidate.*,
               ROW_NUMBER() OVER (
                 PARTITION BY candidate.category_id
                 ORDER BY candidate.support_score DESC, candidate.lifetime_support_count DESC,
                          candidate.created_at DESC, candidate.project_id ASC
               ) AS category_position
        FROM candidate_scores AS candidate
    )
    INSERT INTO public.daily_showcase_winners (
      project_id, category_id, showcase_date, competition_start, competition_end,
      support_score, category_rank, starts_at, ends_at
    )
    SELECT ranked.project_id, ranked.category_id, v_showcase_date,
           v_competition_start, v_competition_end, ranked.support_score, 1,
           v_showcase_starts_at, v_showcase_ends_at
    FROM category_ranking AS ranked
    WHERE ranked.category_position = 1
    ON CONFLICT (category_id, showcase_date) DO UPDATE
    SET project_id = EXCLUDED.project_id,
        competition_start = EXCLUDED.competition_start,
        competition_end = EXCLUDED.competition_end,
        support_score = EXCLUDED.support_score,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at
    WHERE public.daily_showcase_winners.project_id IS DISTINCT FROM EXCLUDED.project_id
       OR public.daily_showcase_winners.support_score IS DISTINCT FROM EXCLUDED.support_score;
    GET DIAGNOSTICS v_changed_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'showcase_date', v_showcase_date,
      'competition_start', v_competition_start, 'competition_end', v_competition_end,
      'changed_winners', v_changed_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_showcase_winners(
    p_category_id UUID DEFAULT NULL,
    p_reference_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    project_id UUID, category_id UUID, support_score INTEGER, category_rank SMALLINT,
    starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, rotation_rank INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH eligible_history AS (
      SELECT winner.project_id, winner.category_id, winner.support_score, winner.category_rank,
             winner.starts_at, winner.ends_at, winner.showcase_date, category.order_index
      FROM public.daily_showcase_winners AS winner
      INNER JOIN public.listings AS listing ON listing.id = winner.project_id
      INNER JOIN public.categories AS category ON category.id = winner.category_id
      WHERE winner.showcase_date <= (p_reference_time AT TIME ZONE 'Europe/Istanbul')::DATE
        AND listing.status = 'active' AND category.is_active = true
        AND (listing.boosted_until IS NULL OR listing.boosted_until <= p_reference_time)
        AND (listing.category_boosted_until IS NULL OR listing.category_boosted_until <= p_reference_time)
        AND (p_category_id IS NULL OR winner.category_id = p_category_id)
    ), latest_per_category AS (
      SELECT DISTINCT ON (history.category_id)
             history.project_id, history.category_id, history.support_score, history.category_rank,
             history.starts_at, history.ends_at, history.order_index
      FROM eligible_history AS history
      ORDER BY history.category_id, history.showcase_date DESC, history.project_id ASC
    ), numbered AS (
      SELECT latest.*,
             ROW_NUMBER() OVER (ORDER BY latest.order_index ASC, latest.category_id ASC)::INTEGER AS base_position,
             COUNT(*) OVER ()::INTEGER AS winner_count
      FROM latest_per_category AS latest
    ), rotated AS (
      SELECT numbered.*,
        MOD(MOD(numbered.base_position - 1
          - EXTRACT(HOUR FROM p_reference_time AT TIME ZONE 'Europe/Istanbul')::INTEGER,
          numbered.winner_count) + numbered.winner_count, numbered.winner_count) + 1 AS computed_rotation_rank
      FROM numbered
    )
    SELECT rotated.project_id, rotated.category_id, rotated.support_score, rotated.category_rank,
           rotated.starts_at, rotated.ends_at, rotated.computed_rotation_rank::INTEGER AS rotation_rank
    FROM rotated
    ORDER BY rotated.computed_rotation_rank ASC, rotated.category_id ASC;
$$;

REVOKE ALL ON FUNCTION public.select_daily_showcase_winners(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_daily_showcase_winners(TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION public.get_daily_showcase_winners(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_showcase_winners(UUID, TIMESTAMPTZ) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) FROM anon, authenticated;
COMMENT ON FUNCTION public.select_daily_showcase_winners(TIMESTAMPTZ) IS 'Önceki tam Türkiye günündeki doğrulanmış desteklerle kategori liderlerini seçer.';
COMMENT ON FUNCTION public.get_daily_showcase_winners(UUID, TIMESTAMPTZ) IS 'Son geçerli günlük liderleri saatlik adil rotasyon sırasıyla döndürür.';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
DO $$
DECLARE v_job RECORD;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname IN (
    'kistas-weekly-showcase-leaders', 'kistas-showcase-sponsor-reconciliation',
    'kistas-daily-showcase-leaders', 'kistas-daily-showcase-reconciliation'
  ) LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
  -- Supabase pg_cron UTC: 21:00 UTC = Türkiye 00:00.
  PERFORM cron.schedule('kistas-daily-showcase-leaders', '0 21 * * *', 'SELECT public.select_daily_showcase_winners();');
  PERFORM cron.schedule('kistas-daily-showcase-reconciliation', '17 * * * *', 'SELECT public.select_daily_showcase_winners();');
END;
$$;
SELECT public.select_daily_showcase_winners();


-- ============================================================================
-- DOSYA: 20260917000002_harden_profiles_pii_and_storage.sql
-- ============================================================================

-- ============================================================================
-- SEC-013 & SEC-014: PROFILES PII HARDENING & STORAGE BUCKET RESTRICTION
-- ============================================================================

-- 1. DROP UNUSED LEGACY COLUMNS FROM public.profiles
-- Kıstas dijital proje vitrini modelinde IBAN ve TCKN saklanmaz.
-- Eski pazaryeri döneminden kalan boş kolonlar tamamen temizlenir.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS iban;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS identity_number;

-- 2. HARDEN RLS ON public.profiles
-- Anonim veya diğer kullanıcıların gelişigüzel tüm kullanıcı listesini dump etmesini engeller.
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;

CREATE POLICY "Profiles viewable by public and creators" ON public.profiles
FOR SELECT
USING (
    -- 1. Kullanıcı kendi profilini her zaman görebilir
    id = auth.uid()
    OR
    -- 2. Platform yöneticisi görebilir
    public.is_platform_admin()
    OR
    -- 3. Anonim/Diğer kullanıcılar yalnızca aktif projesi olan yaratıcıları ve doğrulanmış yayıncıları görebilir (ve engellenmemiş olmalıdır)
    (
        (
            is_verified = TRUE
            OR EXISTS (
                SELECT 1 FROM public.listings 
                WHERE seller_id = profiles.id AND status = 'active'
            )
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users 
            WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
               OR (blocker_id = profiles.id AND blocked_id = auth.uid())
        )
    )
);

-- 3. COLUMN-LEVEL PRIVILEGES (CLS) ON public.profiles
-- Anonim (anon) rolü select=* yapsa dahi PostgREST yalnızca izin verilen vitrin kolonlarını döner.
-- phone, fcm_token, available_balance, pending_balance vb. anon rolüne kesinlikle ifşa edilmez.
REVOKE SELECT ON public.profiles FROM public, anon, authenticated;

-- Anonim rolü için salt vitrin kolonları:
GRANT SELECT (
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    rating_average,
    rating_count,
    is_verified,
    created_at,
    updated_at
) ON public.profiles TO anon;

-- Giriş yapmış kullanıcılar için:
GRANT SELECT (
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    rating_average,
    rating_count,
    is_verified,
    phone,
    boost_credits,
    created_at,
    updated_at
) ON public.profiles TO authenticated;

-- 4. HARDEN STORAGE (storage.objects)
-- Anonim dosya yükleme (spam/deface) politikasını tamamen engelle.
-- Yalnızca oturum açmış (authenticated) kullanıcılar 'kistas' kovasına yükleme yapabilir.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anon uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Public uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon can insert objects" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to kistas" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own objects" ON storage.objects;

    CREATE POLICY "Authenticated users can upload to kistas"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kistas'
        AND auth.role() = 'authenticated'
    );

    CREATE POLICY "Users can delete own objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'kistas'
        AND (owner = auth.uid() OR public.is_platform_admin())
    );
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;



-- ============================================================================
-- DOSYA: 20260917000003_repair_onboarding_and_tighten_defense.sql
-- ============================================================================

-- ============================================================================
-- SEC-015: ONBOARDING REPAIR, STORAGE HARDENING & ANONYMOUS ACCESS SHUTDOWN
-- ============================================================================

-- 1. PROFILES TABLOSU: ONBOARDING ONARIMI & SIKIŞTIRILMIŞ İZİNLER
-- Yeni kayıt olan kullanıcıların (authenticated) kendi profil satırını oluşturabilmesi
-- ve sadece izin verilen alanları güncelleyebilmesi sağlanır.

-- 1.1 RLS Politikalarını Yenile
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 1.2 Kolon Düzeyinde İzinler (CLS)
-- Bakiye, kredi ve doğrulama kolonları (boost_credits, available_balance, is_verified)
-- istemci tarafından doğrudan INSERT/UPDATE yapılamaz; yalnızca sunucu RPC'leri güncelleyebilir.
REVOKE INSERT, UPDATE ON public.profiles FROM public, anon, authenticated;

GRANT INSERT (
    id,
    full_name,
    avatar_url
) ON public.profiles TO authenticated;

GRANT UPDATE (
    full_name,
    avatar_url,
    bio,
    city,
    district,
    fcm_token,
    updated_at
) ON public.profiles TO authenticated;

-- SELECT haklarını teyit et
GRANT SELECT (
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    rating_average,
    rating_count,
    is_verified,
    created_at,
    updated_at
) ON public.profiles TO anon;

GRANT SELECT (
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    rating_average,
    rating_count,
    is_verified,
    phone,
    boost_credits,
    created_at,
    updated_at
) ON public.profiles TO authenticated;


-- 2. STORAGE (storage.objects): ANONİM YÜKLEME ENGELİ & TEMİZLİK
-- Anonim dosya yükleme açıklarını tamamen kapatır; yalnızca authenticated kullanıcılara izin verir.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anon uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Public uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon can insert objects" ON storage.objects;
    DROP POLICY IF EXISTS "anon_insert" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to kistas" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own objects" ON storage.objects;

    CREATE POLICY "Authenticated users can upload to kistas"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kistas'
        AND auth.role() = 'authenticated'
        AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp', 'gif')
    );

    CREATE POLICY "Users can delete own objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'kistas'
        AND (owner = auth.uid() OR public.is_platform_admin())
    );
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;


-- 3. 10 HASSAS TABLOYU ANONİM ROLDEN (anon) TAMAMEN ARINDIRMA
-- Kamuya açık olmayan hassas tablolara anonim rolün doğrudan erişmesi engellenir.
-- Bu sayede saldırganlar boş sorgu (HTTP 200) dahi atamaz; doğrudan HTTP 401/403 duvarına çarpar.

DO $$
BEGIN
    -- orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        REVOKE ALL ON TABLE public.orders FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated, service_role;
    END IF;

    -- user_addresses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_addresses') THEN
        REVOKE ALL ON TABLE public.user_addresses FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_addresses TO authenticated, service_role;
    END IF;

    -- credit_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') THEN
        REVOKE ALL ON TABLE public.credit_transactions FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_transactions TO authenticated, service_role;
    END IF;

    -- conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
        REVOKE ALL ON TABLE public.conversations FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversations TO authenticated, service_role;
    END IF;

    -- messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        REVOKE ALL ON TABLE public.messages FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated, service_role;
    END IF;

    -- reports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
        REVOKE ALL ON TABLE public.reports FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reports TO authenticated, service_role;
    END IF;

    -- blocked_users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocked_users') THEN
        REVOKE ALL ON TABLE public.blocked_users FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blocked_users TO authenticated, service_role;
    END IF;

    -- user_consents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_consents') THEN
        REVOKE ALL ON TABLE public.user_consents FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_consents TO authenticated, service_role;
    END IF;

    -- disputes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disputes') THEN
        REVOKE ALL ON TABLE public.disputes FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.disputes TO authenticated, service_role;
    END IF;

    -- offers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offers') THEN
        REVOKE ALL ON TABLE public.offers FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers TO authenticated, service_role;
    END IF;
END $$;


-- ============================================================================
-- DOSYA: 20260917000004_faz2_financial_and_order_hardening.sql
-- ============================================================================

-- ============================================================================
-- FAZ 2: FİNANSAL, İŞ MANTIĞI & SİPARİŞ GÜVENLİĞİ SERTLEŞTİRMESİ
-- SEC-018: Legacy Boost Bypass Kaldırma, Sipariş İzolasyonu, Teklif & Puan Kalkanı
-- ============================================================================

-- 1. ESKİ / GÜVENSİZ BOOST FONKSİYONUNU VERİTABANINDAN SİLME (Zero Dead-Code)
-- boost_listing_scoped fonksiyonunda Keşfet vitrini 200 kredi iken, bu eski fonksiyon
-- 50 krediye vitrin satın alma açığı (Logic Discount Bypass) oluşturuyordu.
DROP FUNCTION IF EXISTS public.boost_listing_with_credits(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.boost_listing_with_credits(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.boost_listing_with_credits;


-- 2. ORDERS TABLOSUNU DOĞRUDAN İSTEMCİ YAZIMINDAN İZOLE ETME
-- Siparişler ASLA istemci tarafından doğrudan INSERT/UPDATE/DELETE yapılamaz.
-- Yalnızca atomik RPC (create_escrow_order_atomic) veya backend (service_role) oluşturabilir.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- Güvensiz doğrudan sipariş oluşturma politikasını kaldır
DROP POLICY IF EXISTS "Buyers can initiate orders" ON public.orders;

-- Okuma politikasını doğrula (Yalnızca alıcı ve satıcı okuyabilir)
DROP POLICY IF EXISTS "Orders viewable by buyer or seller" ON public.orders;
CREATE POLICY "Orders viewable by buyer or seller"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- 3. KREDİ HAREKETLERİ DEFTERİNİ (credit_transactions) KORUMA
-- İstemci rolünün (authenticated) finansal deftere doğrudan satır eklemesi/silmesi engellenir.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.credit_transactions FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.credit_transactions TO authenticated;
GRANT ALL ON TABLE public.credit_transactions TO service_role;

DROP POLICY IF EXISTS "Users view own credit transactions" ON public.credit_transactions;
CREATE POLICY "Users view own credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- 4. TEKLİF (OFFERS) FİYAT & DURUM MANİPÜLASYON KALKANI
-- Alıcının kendi teklifini kabul edip (accepted) 1 TL'ye sipariş geçmesini ve
-- oluşturulmuş teklifin fiyatının sonradan değiştirilmesini engelleyen DB Tetikleyicisi
CREATE OR REPLACE FUNCTION public.handle_offer_update_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Temel alanlar (id, listing_id, buyer_id, seller_id, offered_price) asla değiştirilemez
    IF NEW.id <> OLD.id 
       OR NEW.listing_id <> OLD.listing_id 
       OR NEW.buyer_id <> OLD.buyer_id 
       OR NEW.seller_id <> OLD.seller_id 
       OR NEW.offered_price <> OLD.offered_price THEN
        RAISE EXCEPTION 'OFFER_IMMUTABLE_FIELDS: Teklifin temel alanları değiştirilemez.';
    END IF;

    -- Alıcı kendi teklifini kabul veya reddedemez; yalnızca geri çekebilir (cancelled)
    IF auth.uid() = OLD.buyer_id AND auth.uid() <> OLD.seller_id THEN
        IF NEW.status NOT IN ('cancelled', 'pending') THEN
            RAISE EXCEPTION 'FORBIDDEN: Alıcı teklifi kabul veya reddedemez, yalnızca geri çekebilir.';
        END IF;
    END IF;

    -- Satıcı yalnızca kabul edebilir, reddedebilir veya karşı teklif yapabilir
    IF auth.uid() = OLD.seller_id THEN
        IF NEW.status NOT IN ('accepted', 'rejected', 'countered', 'pending') THEN
            RAISE EXCEPTION 'FORBIDDEN: Satıcı yalnızca teklifi kabul edebilir, reddedebilir veya karşı teklif yapabilir.';
        END IF;
    END IF;

    NEW.updated_at := TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_offer_updates ON public.offers;
CREATE TRIGGER trg_protect_offer_updates
    BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE FUNCTION public.handle_offer_update_protection();


-- 5. DEĞERLENDİRME (REVIEWS) BÜTÜNLÜĞÜ: KENDİ KENDİNE YORUM BASMAYI ENGELLEME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_no_self_review'
    ) THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT chk_reviews_no_self_review
        CHECK (reviewer_id <> reviewed_user_id);
    END IF;
END $$;

-- Yorumların güncellenmesi ve silinmesi doğrudan istemciye kapalıdır
REVOKE UPDATE, DELETE ON TABLE public.reviews FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;


-- ============================================================================
-- DOSYA: 20260917000005_faz3_idor_and_ownership_hardening.sql
-- ============================================================================

-- ============================================================================
-- FAZ 3: IDOR, SAHİPLİK DENETİMİ & YETKİ AŞIMI (PRIVILEGE ESCALATION) KALKANI
-- SEC-019: Moderasyon Atlama Engeli, Bildirim Enjeksiyonu Kalkanı & Sahiplik İzolasyonu
-- ============================================================================

-- 1. İLAN / PROJE DURUM & MODERASYON KORUMA TETİKLEYİCİSİ
-- Kullanıcıların admin onayını atlayıp projelerini doğrudan 'active' yapmasını,
-- sayaçları (view_count, upvotes_count) veya sponsorluk sürelerini manipüle etmesini engeller.

CREATE OR REPLACE FUNCTION public.handle_listing_status_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Eğer işlemi yapan platform admini ise veya service_role ise tüm alanları yönetebilir
    IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
        RETURN NEW;
    END IF;

    -- INSERT anında: Admin dışındaki kullanıcılar yalnızca 'draft' durumunda proje ekleyebilir
    IF TG_OP = 'INSERT' THEN
        NEW.status := 'draft';
        NEW.boosted_until := NULL;
        NEW.category_boosted_until := NULL;
        NEW.view_count := 0;
        NEW.likes_count := 0;
        NEW.upvotes_count := 0;
        NEW.review_feedback := NULL;
        NEW.review_requested_at := NULL;
        NEW.reviewed_by := NULL;
        RETURN NEW;
    END IF;

    -- UPDATE anında:
    IF TG_OP = 'UPDATE' THEN
        -- İstemci sayaçları, sponsorluk sürelerini ve satıcı kimliğini asla değiştiremez
        NEW.boosted_until := OLD.boosted_until;
        NEW.category_boosted_until := OLD.category_boosted_until;
        NEW.view_count := OLD.view_count;
        NEW.likes_count := OLD.likes_count;
        NEW.upvotes_count := OLD.upvotes_count;
        NEW.seller_id := OLD.seller_id;
        NEW.reviewed_by := OLD.reviewed_by;

        -- Durum manipülasyonu kontrolü:
        -- Kullanıcı asla kendi projesini 'active', 'reserved' veya 'sold' yapamaz
        IF NEW.status <> OLD.status THEN
            IF NEW.status = 'active' THEN
                RAISE EXCEPTION 'FORBIDDEN: Projeyi doğrudan yayına alamazsınız; yönetici onayı zorunludur.';
            END IF;
            IF NEW.status = 'reserved' OR NEW.status = 'sold' THEN
                RAISE EXCEPTION 'FORBIDDEN: Bu durum yalnızca sipariş ve ödeme akışları tarafından ayarlanabilir.';
            END IF;
            IF NEW.status NOT IN ('inactive', 'draft') THEN
                RAISE EXCEPTION 'FORBIDDEN: Geçersiz proje durumu değişikliği.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_listing_status ON public.listings;
CREATE TRIGGER trg_protect_listing_status
    BEFORE INSERT OR UPDATE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.handle_listing_status_protection();


-- 2. BİLDİRİM (NOTIFICATIONS) SAHTECİLİĞİ & PHISHING ENJEKSİYONU KALKANI
-- Kullanıcıların başka kullanıcılara sahte sistem bildirimi atmasını engeller.
-- Bildirimler yalnızca sunucu tetikleyicileri (SECURITY DEFINER) veya backend (service_role) ile oluşturulabilir.

REVOKE INSERT ON TABLE public.notifications FROM public, anon, authenticated;
REVOKE UPDATE ON TABLE public.notifications FROM public, anon, authenticated;

-- İstemciye yalnızca okuma, okundu işaretleme ve silme hakkı verilir
GRANT SELECT, DELETE ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- Güvensiz INSERT politikasını (WITH CHECK (TRUE)) tamamen sil
DROP POLICY IF EXISTS "Users or triggers can insert notifications" ON public.notifications;

-- Okuma politikasını sıkılaştır (Yalnızca kendi bildirimlerini okuyabilir)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Güncelleme politikasını sıkılaştır (Yalnızca kendi bildirimini güncelleyebilir)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Silme politikasını doğrula (Yalnızca kendi bildirimini silebilir)
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- 3. PROJE İÇERİK BÜTÜNLÜĞÜ (Zero Cross-Tenant Tampering)
-- Kullanıcıların yalnızca kendi projelerini silebilmesini sağlayan DELETE politikasını pekiştir
DROP POLICY IF EXISTS "Sellers delete own listings" ON public.listings;
CREATE POLICY "Sellers delete own listings"
ON public.listings FOR DELETE
TO authenticated
USING (auth.uid() = seller_id OR public.is_platform_admin());


-- ============================================================================
-- DOSYA: 20260917000006_faz4_rate_limiting_and_dos_defense.sql
-- ============================================================================

-- ============================================================================
-- FAZ 4: RATE LIMITING, ANTI-SPAM & DOS / RESOURCE EXHAUSTION KALKANI
-- SEC-020: Mesaj/Yorum Hız Limitleri, Görünüm Sayaç Bot Kalkanı & Depolama Boyut Sınırı
-- ============================================================================

-- 1. DEPOLAMA KOVANI (kistas) DOSYA BOYUT SINIRI (Storage Resource Exhaustion Kalkanı)
-- Kötü niyetli kullanıcıların 100+ MB devasa dosyalar yükleyerek depolama kotasını tüketmesini engeller.
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10 MB tavan sınır
WHERE id = 'kistas';


-- 2. MESAJLAŞMA FLOOD & SPAM KALKANI (send_chat_message)
-- Otomasyon botlarının saniyede yüzlerce mesaj atarak veritabanını şişirmesini ve
-- bildirim yağmuru ile sunucu kaynaklarını tüketmesini engeller.
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type public.message_type DEFAULT 'text',
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation public.conversations%ROWTYPE;
  v_message public.messages%ROWTYPE;
  v_is_support_admin BOOLEAN := FALSE;
  v_recent_messages_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Mesaj göndermek için oturum açmalısınız.';
  END IF;

  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE: Mesaj boş olamaz.';
  END IF;

  IF char_length(btrim(p_content)) > 2000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG: Mesaj 2000 karakteri aşamaz.';
  END IF;

  -- Rate Limit Kalkanı: Son 5 saniyede aynı kullanıcı en fazla 5 mesaj gönderebilir
  SELECT COUNT(*)
  INTO v_recent_messages_count
  FROM public.messages
  WHERE sender_id = v_user_id
    AND created_at > (clock_timestamp() - INTERVAL '5 seconds');

  IF v_recent_messages_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED: Çok hızlı mesaj gönderiyorsunuz. Lütfen birkaç saniye bekleyin.';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  v_is_support_admin := v_conversation.listing_id IS NULL AND public.has_admin_permission('community');

  IF v_user_id <> v_conversation.buyer_id AND v_user_id <> v_conversation.seller_id AND NOT v_is_support_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu görüşmeye mesaj gönderemezsiniz.';
  END IF;

  IF v_conversation.listing_id IS NULL AND v_conversation.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CONVERSATION_CLOSED: Bu destek görüşmesi sonlandırıldı.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users AS blocked
    WHERE (blocked.blocker_id = v_conversation.buyer_id AND blocked.blocked_id = v_conversation.seller_id)
       OR (blocked.blocker_id = v_conversation.seller_id AND blocked.blocked_id = v_conversation.buyer_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED_CONVERSATION: Bu görüşmede mesaj gönderilemez.';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type, metadata)
  VALUES (p_conversation_id, v_user_id, btrim(p_content), p_type, p_metadata)
  RETURNING * INTO v_message;

  RETURN to_jsonb(v_message);
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;


-- 3. YORUM FLOOD & SPAM KALKANI (create_project_comment)
-- Proje sayfalarına flood yorum basılmasını engeller (Kullanıcı başına 10 saniyede max 2 yorum).
CREATE OR REPLACE FUNCTION public.create_project_comment(
    p_listing_id UUID,
    p_body TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS public.project_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_listing public.listings%ROWTYPE;
    v_is_verified BOOLEAN := FALSE;
    v_muted_until TIMESTAMPTZ;
    v_recent_comments_count INTEGER;
    v_comment public.project_comments%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Yorum yapmak için giriş yapmalısınız.';
    END IF;

    -- Rate Limit Kalkanı: Son 10 saniyede aynı kullanıcı en fazla 2 yorum gönderebilir
    SELECT COUNT(*)
    INTO v_recent_comments_count
    FROM public.project_comments
    WHERE author_id = v_user_id
      AND created_at > (clock_timestamp() - INTERVAL '10 seconds');

    IF v_recent_comments_count >= 2 THEN
        RAISE EXCEPTION 'RATE_LIMITED: Çok sık yorum yapıyorsunuz. Lütfen 10 saniye bekleyin.';
    END IF;

    SELECT profile.comment_muted_until
    INTO v_muted_until
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id;

    IF v_muted_until > clock_timestamp() THEN
        RAISE EXCEPTION 'COMMENT_MUTED: Yorum yapma yetkiniz geçici olarak durduruldu.';
    END IF;

    IF char_length(btrim(COALESCE(p_body, ''))) NOT BETWEEN 2 AND 1200 THEN
        RAISE EXCEPTION 'INVALID_COMMENT: Yorum 2 ile 1200 karakter arasında olmalıdır.';
    END IF;

    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje yorumlara açık değil.';
    END IF;

    IF p_parent_id IS NULL THEN
        SELECT COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL
        INTO v_is_verified
        FROM auth.users AS auth_user
        LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
        WHERE auth_user.id = v_user_id;

        IF NOT COALESCE(v_is_verified, FALSE) THEN
            RAISE EXCEPTION 'VERIFICATION_REQUIRED: Yalnızca doğrulanmış kullanıcılar yorum yapabilir.';
        END IF;
    ELSE
        IF v_listing.seller_id <> v_user_id THEN
            RAISE EXCEPTION 'OWNER_REPLY_ONLY: Yorumları yalnızca proje sahibi yanıtlayabilir.';
        END IF;

        PERFORM 1
        FROM public.project_comments
        WHERE id = p_parent_id
          AND listing_id = p_listing_id
          AND parent_id IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PARENT_NOT_FOUND: Yanıtlanacak yorum bulunamadı.';
        END IF;
    END IF;

    INSERT INTO public.project_comments (listing_id, author_id, parent_id, body)
    VALUES (p_listing_id, v_user_id, p_parent_id, btrim(p_body))
    RETURNING * INTO v_comment;

    RETURN v_comment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_comment(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_comment(UUID, TEXT, UUID) TO authenticated;


-- 4. GÖRÜNTÜLENME SAYACI BOT & FLOOD KALKANI (record_listing_view)
-- Bir botun aynı projeye binlerce kez döngüyle görünüm basmasını engeller (60 saniye tekil izleyici kilidi).
CREATE OR REPLACE FUNCTION public.record_listing_view(
    p_listing_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_seller_id UUID;
    v_status public.listing_status;
    v_viewer_key TEXT;
    v_view_count INTEGER := 0;
    v_already_viewed BOOLEAN;
BEGIN
    SELECT listing.seller_id, listing.status, COALESCE(listing.view_count, 0)
    INTO v_seller_id, v_status, v_view_count
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id;

    IF NOT FOUND OR v_status <> 'active' THEN
        RETURN jsonb_build_object('success', FALSE, 'recorded', FALSE, 'view_count', 0);
    END IF;

    -- Yaratıcının kendi projesini görüntülemesi sayacı artırmaz
    IF v_actor_id IS NOT NULL AND v_actor_id = v_seller_id THEN
        RETURN jsonb_build_object('success', TRUE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    IF v_actor_id IS NOT NULL THEN
        v_viewer_key := 'user:' || v_actor_id::TEXT;
    ELSIF p_session_id IS NOT NULL THEN
        v_viewer_key := 'anon:' || p_session_id::TEXT;
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    -- Anti-Flood / Bot Kalkanı: Aynı viewer_key son 60 saniye içinde zaten sayıldıysa mükerrer sayma
    SELECT EXISTS (
        SELECT 1
        FROM public.listing_view_events
        WHERE listing_id = p_listing_id
          AND viewer_key = v_viewer_key
          AND created_at > (clock_timestamp() - INTERVAL '60 seconds')
    ) INTO v_already_viewed;

    IF v_already_viewed THEN
        RETURN jsonb_build_object('success', TRUE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    INSERT INTO public.listing_view_events (listing_id, viewer_key)
    VALUES (p_listing_id, v_viewer_key);

    UPDATE public.listings
    SET view_count = LEAST(COALESCE(view_count, 0) + 1, 2147483647)
    WHERE id = p_listing_id
    RETURNING view_count INTO v_view_count;

    RETURN jsonb_build_object(
        'success', TRUE,
        'recorded', TRUE,
        'view_count', v_view_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO anon, authenticated, service_role;


-- ============================================================================
-- DOSYA: 20260917000007_fix_guest_explore_and_harden_brand_chat.sql
-- ============================================================================

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


-- ============================================================================
-- DOSYA: 20260917000008_repair_anon_explore_access.sql
-- ============================================================================

-- ==============================================================================
-- KISTAS SAVUNMA HATTI: GUEST/ANON KEŞFET ERİŞİMİ VE İZİN ONARIMI (SEC-022)
-- ==============================================================================
-- Açıklama:
-- 1. `is_platform_admin()` fonksiyonu RLS politikalarında çağrıldığından anon rolünün
--    SELECT esnasında 42501 (permission denied for function is_platform_admin) almasını
--    engellemek için anon rolüne EXECUTE yetkisi tanımlanır. (auth.uid() NULL olduğu için daima güvenle FALSE döner).
-- 2. `listings` tablosunda anon ve authenticated rolleri için RLS SELECT politikaları
--    ayrıştırılır: Anon kullanıcılar doğrudan `status = 'active'` projeleri sıfır gecikmeyle okur.
-- 3. `profiles` RLS SELECT politikasındaki `blocked_users` alt sorgusu, güvenli
--    SECURITY DEFINER `is_user_blocked(auth.uid(), profiles.id)` ile değiştirilir; böylece
--    anon rolünün `blocked_users` tablosuna erişim hatası alması kalıcı olarak engellenir.
-- ==============================================================================

-- 1. IS_PLATFORM_ADMIN FONKSİYONUNA ANON VE AUTHENTICATED İZNİ
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated;

-- 2. LISTINGS TABLOSUNDA AYRI GUEST VE AUTHENTICATED OKUMA POLİTİKALARI
DROP POLICY IF EXISTS "listings_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_anon_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_authenticated_read_policy" ON public.listings;
DROP POLICY IF EXISTS "Public listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Listings are viewable by non-blocked users" ON public.listings;

-- Anonim Ziyaretçiler: Sadece aktif projeleri doğrudan ve ultra-hızlı okur
CREATE POLICY "listings_anon_read_policy" ON public.listings
    FOR SELECT TO anon
    USING (status = 'active');

-- Giriş Yapmış Kullanıcılar: Aktif projeler (engellenmemiş olanlar), kendi projeleri veya admin
CREATE POLICY "listings_authenticated_read_policy" ON public.listings
    FOR SELECT TO authenticated
    USING (
        (status = 'active' AND NOT public.is_user_blocked(auth.uid(), listings.seller_id))
        OR seller_id = auth.uid()
        OR public.is_platform_admin()
    );

-- 3. PROFILES TABLOSU RLS GÜNCELLEMESİ (ANON ERİŞİMİ VE GÜVENLİ BLOK KONTROLÜ)
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by public and creators" ON public.profiles
FOR SELECT
TO authenticated, anon
USING (
    -- 1. Kullanıcı kendi profilini her zaman görebilir
    (auth.uid() IS NOT NULL AND id = auth.uid())
    OR
    -- 2. Platform yöneticisi görebilir
    (auth.uid() IS NOT NULL AND public.is_platform_admin())
    OR
    -- 3. Anonim/Diğer kullanıcılar yalnızca aktif projesi olan yaratıcıları ve doğrulanmış yayıncıları görebilir (ve engellenmemiş olmalıdır)
    (
        (
            is_verified = TRUE
            OR EXISTS (
                SELECT 1 FROM public.listings 
                WHERE seller_id = profiles.id AND status = 'active'
            )
        )
        AND NOT public.is_user_blocked(auth.uid(), profiles.id)
    )
);


-- ============================================================================
-- DOSYA: 20260917000009_faz5_chat_isolation_and_media_hardening.sql
-- ============================================================================

-- ==============================================================================
-- KISTAS SAVUNMA HATTI: FAZ 5 - SOHBET İZOLASYONU, MEDYA & DEPOLAMA KALKANI (SEC-023)
-- ==============================================================================
-- Açıklama:
-- 1. Pars DevState gibi ofansif araçların `send_chat_message` RPC'sini, hız limitini
--    (5s/5msg) ve moderasyon kelime filtrelerini baypas ederek doğrudan REST API
--    üzerinden `public.messages` tablosuna sahte/zararlı mesaj basmasını engellemek için
--    doğrudan `INSERT` yetkisi kaldırılır. Tüm mesaj trafiği yalnızca denetlenen
--    ve güvenli `send_chat_message` fonksiyonu üzerinden akabilir.
-- 2. `public.conversations` tablosundaki doğrudan `UPDATE` ve `DELETE` yetkileri
--    kaldırılarak görüşme sahiplik ve durum manipülasyonları engellenir.
-- 3. Depolama kovanında (`kistas`) Stored XSS ve zararlı SVG yüklemelerine karşı
--    MIME tipleri yalnızca güvenli web görselleriyle (`image/jpeg`, `image/png`, `image/webp`)
--    sınırlandırılır.
-- ==============================================================================

-- 1. SOHBET TABLOSUNDA DOĞRUDAN INSERT/UPDATE/DELETE YETKİLERİNİN İPTALİ
DROP POLICY IF EXISTS "Messages insertable by participants" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Platform admins reply to support messages" ON public.messages;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.messages FROM public, anon, authenticated;

-- Okuma yetkisi korunur (Görüşme katılımcıları ve destek yöneticileri kendi mesajlarını okur)
GRANT SELECT ON TABLE public.messages TO authenticated;

-- 2. GÖRÜŞME (CONVERSATIONS) TABLOSUNDA DOĞRUDAN UPDATE/DELETE YETKİLERİNİN İPTALİ
REVOKE UPDATE, DELETE ON TABLE public.conversations FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.conversations TO authenticated;

-- 3. STORAGE KOVANI MIME VE DOSYA TAVANI MÜHÜRLEMESİ (XSS & SVG ENJEKSİYON KALKANI)
UPDATE storage.buckets
SET 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
    file_size_limit = 10485760 -- 10 MB tavan sınırı
WHERE id = 'kistas';

-- 4. STORAGE OBJELERİ İÇİN KESİN UZANTI DOĞRULAMA KURALI
DROP POLICY IF EXISTS "Authenticated users upload project images" ON storage.objects;

CREATE POLICY "Authenticated users upload project images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'kistas'
    AND auth.uid() IS NOT NULL
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);


-- ============================================================================
-- DOSYA: 20260917000010_faz6_data_integrity_and_sybil_defense.sql
-- ============================================================================

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


-- ============================================================================
-- DOSYA: 20260917000011_faz7_address_images_and_consent_hardening.sql
-- ============================================================================

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


-- ============================================================================
-- DOSYA: 20260917000012_faz8_audit_immutability_and_admin_isolation.sql
-- ============================================================================

-- ==============================================================================
-- KISTAS SAVUNMA HATTI: FAZ 8 - DENETİM İZİ DOKUNULMAZLIĞI & ADMİN YETKİ AYRIŞTIRMASI (SEC-028 - SEC-030)
-- ==============================================================================
-- Açıklama:
-- 1. SEC-028: `public.admin_action_audit` tablosu Append-Only (Yalnızca Eklenebilir)
--    yapılır. UPDATE ve DELETE işlemleri veritabanı motoru seviyesinde engellenir;
--    böylece hiçbir yönetici veya servis geçmiş denetim kayıtlarını silemez veya tahrif edemez.
--    Platform yöneticilerine okuma için RLS SELECT politikası tanımlanır.
-- 2. SEC-029: Sohbet gizliliği pekiştirilir; destek ekibinin (`community` izni olan yöneticiler)
--    yalnızca `listing_id IS NULL` olan destek görüşmelerini okuyabileceği, kullanıcılar arası
--    özel proje/pazarlık mesajlarına erişemeyeceği RLS seviyesinde güvenceye alınır.
-- 3. SEC-030: `admin_team_members` tablosundaki yetki yükseltme (Privilege Escalation)
--    engeli doğrulanır; süper yönetici harici müdahaleler ve tanımsız yetki girişleri mühürlenir.
-- ==============================================================================

-- 1. SEC-028: ADMIN_ACTION_AUDIT DEĞİŞTİRİLEMEZLİK & APPEND-ONLY KALKANI
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_IMMUTABLE: Denetim izi kayıtları kesinlikle silinemez veya güncellenemez!';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_tampering ON public.admin_action_audit;
CREATE TRIGGER trg_prevent_audit_tampering
    BEFORE UPDATE OR DELETE ON public.admin_action_audit
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_tampering();

-- Platform yöneticileri için denetim kayıtlarını okuma politikası
DROP POLICY IF EXISTS "Platform admins view audit logs" ON public.admin_action_audit;
CREATE POLICY "Platform admins view audit logs"
    ON public.admin_action_audit
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

GRANT SELECT ON TABLE public.admin_action_audit TO authenticated;

-- 2. SEC-029: DESTEK VE TOPLULUK EKİBİNİN ÖZEL SOHBETLERDEN KESİN İZOLASYONU
-- Alıcı ve satıcı arasındaki özel proje mesajları yalnızca taraflara açıktır.
-- Destek ekibi (community) YALNIZCA listing_id IS NULL olan destek taleplerini görebilir.
DROP POLICY IF EXISTS "Authorized team views support conversations" ON public.conversations;
CREATE POLICY "Authorized team views support conversations"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (
        listing_id IS NULL 
        AND public.has_admin_permission('community')
    );

DROP POLICY IF EXISTS "Authorized team views support messages" ON public.messages;
CREATE POLICY "Authorized team views support messages"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        public.has_admin_permission('community')
        AND EXISTS (
            SELECT 1 FROM public.conversations AS conversation
            WHERE conversation.id = messages.conversation_id 
              AND conversation.listing_id IS NULL
        )
    );

-- 3. SEC-030: SÜPER YÖNETİCİ KORUMASI VE ADMIN ACTION AUDIT İNDEKS PEKİŞTİRMESİ
CREATE INDEX IF NOT EXISTS idx_admin_action_audit_action_target
    ON public.admin_action_audit (action, target_type, target_id);


-- ============================================================================
-- DOSYA: 20260917000013_faz9_realtime_cdc_and_socket_hardening.sql
-- ============================================================================

-- ==============================================================================
-- FAZ 9: SUPABASE REALTIME & WEBSOCKET DINLEME KALKANI (SEC-031 — SEC-033)
-- ==============================================================================
-- 1. SEC-031: Supabase Realtime Publication CDC İzolasyonu & PII Sızıntı Kalkanı
-- 2. SEC-032: WebSocket Realtime Channel Dinleme & Katılımcı Doğrulama Kalkanı
-- 3. SEC-033: Realtime Broadcast / Presence Flooding & Replikasyon Bütünlüğü
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-031: Hassas Tabloları Realtime Yayınından (supabase_realtime) Çıkarma
-- ------------------------------------------------------------------------------
-- Siparişler (orders), teklifler (offers), kullanıcı adresleri (user_addresses),
-- denetim izleri (admin_action_audit), kredi hareketleri (credit_transactions),
-- yasal onaylar (user_consents) ve şikayetler (reports) istemci websocket
-- yayınına ASLA CDC replikasyonu olarak verilmemelidir.
DO $$
BEGIN
    -- orders
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
    END IF;

    -- offers
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.offers;
    END IF;

    -- user_addresses
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_addresses'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_addresses;
    END IF;

    -- admin_action_audit
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_action_audit'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_action_audit;
    END IF;

    -- credit_transactions
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'credit_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_transactions;
    END IF;

    -- user_consents
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_consents'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_consents;
    END IF;

    -- reports
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SEC-032 & SEC-033: Gerekli Realtime Tabloları & REPLICA IDENTITY FULL
-- ------------------------------------------------------------------------------
-- Supabase Realtime'ın RLS kurallarını UPDATE ve DELETE olaylarında doğru
-- değerlendirebilmesi için primary key dışındaki sütunların (buyer_id, seller_id,
-- conversation_id, listing_id vb.) replikasyon akışında yer alması şarttır.
-- Aksi halde RLS motoru olayları eksik filtreleyebilir veya yetkisiz kullanıcılara
-- payload iletebilir.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.project_comments REPLICA IDENTITY FULL;

-- Meşru istemci tablolarının yayında olduğunu garantiye al
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Bildirim & Log
-- ------------------------------------------------------------------------------
COMMENT ON PUBLICATION supabase_realtime IS 'KISTAS Sertleştirilmiş Realtime CDC Yayını: Yalnızca messages, conversations ve project_comments izinlidir; PII ve finansal tablolar yalıtılmıştır.';


-- ============================================================================
-- DOSYA: 20260917000014_faz11_ssrf_and_media_shield.sql
-- ============================================================================

-- ==============================================================================
-- FAZ 11: HARİCİ MEDYA, SSRF & CDN ÖNBELLEK KALKANI (SEC-037 — SEC-039)
-- ==============================================================================
-- 1. SEC-037: URL ve Medya Alanlarında SSRF & Cloud Metadata (169.254.x.x) Kalkanı
-- 2. SEC-038: Webhook Güvenliği & Replay Kalkanı Doğrulaması
-- 3. SEC-039: Güvenli HTTP Başlıkları & CDN İzolasyonu
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-037: Listings Tablosu SSRF & Metadata Koruması
-- ------------------------------------------------------------------------------
-- 169.254.169.254 (AWS/GCP/Azure Cloud Metadata), loopback (127.0.0.1, localhost)
-- ve 0.0.0.0 adresleri veritabanı düzeyinde CHECK kısıtı ile yasaklanır.

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS chk_listings_logo_ssrf_shield,
  DROP CONSTRAINT IF EXISTS chk_listings_web_url_ssrf_shield,
  DROP CONSTRAINT IF EXISTS chk_listings_app_store_ssrf_shield,
  DROP CONSTRAINT IF EXISTS chk_listings_play_store_ssrf_shield;

ALTER TABLE public.listings
  ADD CONSTRAINT chk_listings_logo_ssrf_shield
    CHECK (
      logo_url IS NULL OR (
        lower(logo_url) LIKE 'https://%'
        AND lower(logo_url) NOT LIKE '%169.254.%'
        AND lower(logo_url) NOT LIKE '%localhost%'
        AND lower(logo_url) NOT LIKE '%127.0.0.1%'
        AND lower(logo_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID,
  ADD CONSTRAINT chk_listings_web_url_ssrf_shield
    CHECK (
      web_url IS NULL OR (
        lower(web_url) LIKE 'https://%'
        AND lower(web_url) NOT LIKE '%169.254.%'
        AND lower(web_url) NOT LIKE '%localhost%'
        AND lower(web_url) NOT LIKE '%127.0.0.1%'
        AND lower(web_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID,
  ADD CONSTRAINT chk_listings_app_store_ssrf_shield
    CHECK (
      app_store_url IS NULL OR (
        lower(app_store_url) LIKE 'https://%'
        AND lower(app_store_url) NOT LIKE '%169.254.%'
        AND lower(app_store_url) NOT LIKE '%localhost%'
        AND lower(app_store_url) NOT LIKE '%127.0.0.1%'
        AND lower(app_store_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID,
  ADD CONSTRAINT chk_listings_play_store_ssrf_shield
    CHECK (
      play_store_url IS NULL OR (
        lower(play_store_url) LIKE 'https://%'
        AND lower(play_store_url) NOT LIKE '%169.254.%'
        AND lower(play_store_url) NOT LIKE '%localhost%'
        AND lower(play_store_url) NOT LIKE '%127.0.0.1%'
        AND lower(play_store_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID;

-- ------------------------------------------------------------------------------
-- 2. SEC-037: Listing Images & Profiles SSRF Koruması
-- ------------------------------------------------------------------------------
ALTER TABLE public.listing_images
  DROP CONSTRAINT IF EXISTS chk_listing_images_ssrf_shield;

ALTER TABLE public.listing_images
  ADD CONSTRAINT chk_listing_images_ssrf_shield
    CHECK (
      image_url IS NULL OR (
        lower(image_url) LIKE 'https://%'
        AND lower(image_url) NOT LIKE '%169.254.%'
        AND lower(image_url) NOT LIKE '%localhost%'
        AND lower(image_url) NOT LIKE '%127.0.0.1%'
        AND lower(image_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_avatar_ssrf_shield;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_avatar_ssrf_shield
    CHECK (
      avatar_url IS NULL OR (
        lower(avatar_url) LIKE 'https://%'
        AND lower(avatar_url) NOT LIKE '%169.254.%'
        AND lower(avatar_url) NOT LIKE '%localhost%'
        AND lower(avatar_url) NOT LIKE '%127.0.0.1%'
        AND lower(avatar_url) NOT LIKE '%0.0.0.0%'
      )
    ) NOT VALID;

-- ------------------------------------------------------------------------------
-- 3. Kısıtları Doğrula (Validate Constraints)
-- ------------------------------------------------------------------------------
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_logo_ssrf_shield;
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_web_url_ssrf_shield;
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_app_store_ssrf_shield;
ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_play_store_ssrf_shield;
ALTER TABLE public.listing_images VALIDATE CONSTRAINT chk_listing_images_ssrf_shield;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_avatar_ssrf_shield;

COMMENT ON TABLE public.listing_images IS 'KISTAS Proje Görselleri: SSRF ve Cloud Metadata korumalı görsel referansları.';


-- ============================================================================
-- DOSYA: 20260917000015_faz12_active_cyber_deception_honeypot.sql
-- ============================================================================

-- ==============================================================================
-- FAZ 12: AKTİF SİBER ALDATMA, BAL KÜPÜ (HONEYPOT) & PARS TUZAĞI (SEC-040 — SEC-042)
-- ==============================================================================
-- 1. SEC-040: Bal Küpü Tablosu (Honey-Table & Canary Secrets)
-- 2. SEC-041: Truva Arka Kapısı (Trojan Debug RPC - Sahte Süper Admin)
-- 3. SEC-042: Finansal Sessiz Yutma (Silent Null-Route & Sahte 200 OK)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Tuzak Tespit Günlüğü (Saldırganları Sessizce Kaydeden Güvenli Tablo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_honeypot_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trap_name TEXT NOT NULL,
    caller_uid UUID,
    payload TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.security_honeypot_detections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_honeypot_detections FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 1. SEC-040: Bal Küpü Tablosu (system_debug_credentials)
-- ------------------------------------------------------------------------------
-- Saldırgan veya Pars PostgREST üzerinden şema taraması yaptığında bu tabloyu
-- keşfeder. İçinde cezbedici sahte root kimlikleri ve sahte bcrypt hash'leri bulur.
CREATE TABLE IF NOT EXISTS public.system_debug_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    access_key TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production_privileged',
    last_rotation TEXT NOT NULL DEFAULT '2026-09-01T00:00:00Z'
);

ALTER TABLE public.system_debug_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public debug credentials read" ON public.system_debug_credentials;
CREATE POLICY "Public debug credentials read"
    ON public.system_debug_credentials
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Saldırganların yem tabloyu değiştirmesini veya silmesini kesinlikle engelle
REVOKE INSERT, UPDATE, DELETE ON TABLE public.system_debug_credentials FROM PUBLIC, anon, authenticated;

-- Sahte (Canary) kimlikleri yerleştir (Yalnızca yoksa ekle)
INSERT INTO public.system_debug_credentials (service_name, admin_email, access_key, password_hash)
SELECT 'internal_cluster_root', 'devops-master@kistas-internal.net', 'kistas_canary_sec_trap_892347891273918237918237', '$2b$12$CANARYTRAPxKISTASxDECEPTIONxHASHxDOxNOTxCRACKx'
WHERE NOT EXISTS (SELECT 1 FROM public.system_debug_credentials WHERE service_name = 'internal_cluster_root');

INSERT INTO public.system_debug_credentials (service_name, admin_email, access_key, password_hash)
SELECT 'database_migration_backup', 'db-backup-svc@kistas-internal.net', 'kistas_canary_db_svc_992147120391283019283019', '$2b$12$CANARYTRAPxKISTASxDECEPTIONxHASHxDBxSVCxKEYx'
WHERE NOT EXISTS (SELECT 1 FROM public.system_debug_credentials WHERE service_name = 'database_migration_backup');

-- ------------------------------------------------------------------------------
-- 2. SEC-041: Truva Arka Kapısı (debug_elevate_admin_role)
-- ------------------------------------------------------------------------------
-- PostgREST API fuzzing yapan saldırgan bu RPC'yi dener. Hata vermez; saldırgana
-- sahte süper admin oturumu ve sahte yetki dizisi döner. Gerçekte hiçbir rol
-- değişmez; saldırgan açığı buldum zannederken sessizce tuzağa kaydedilir.
CREATE OR REPLACE FUNCTION public.debug_elevate_admin_role(p_master_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_sanitized_key text := substr(coalesce(p_master_key, 'empty'), 1, 100);
BEGIN
    -- Tuzağa basan saldırganı kaydet
    BEGIN
        INSERT INTO public.security_honeypot_detections (
            trap_name,
            caller_uid,
            payload
        ) VALUES (
            'debug_elevate_admin_role',
            v_caller_id,
            'Attempted key: ' || v_sanitized_key
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Saldırgana inandırıcı sahte yetkilendirme yanıtı ver
    RETURN jsonb_build_object(
        'status', 'success',
        'granted_role', 'super_admin',
        'session_id', 'kistas-dbg-' || substr(md5(random()::text), 1, 8),
        'privileges', jsonb_build_array('ALL_TABLES', 'BYPASS_RLS', 'ADMIN_CONSOLE'),
        'debug_notice', 'Temporary master developer privilege active for current session.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_elevate_admin_role(text) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. SEC-042: Finansal Sessiz Yutma (debug_add_test_credits)
-- ------------------------------------------------------------------------------
-- Kredi / bakiye hilesi arayan botlar veya saldırganlar için sahte başarı RPC'si.
-- 200 OK ve bakiye eklendi döner, ancak gerçek cüzdanda tek bir kuruş bile oynamaz.
CREATE OR REPLACE FUNCTION public.debug_add_test_credits(p_amount integer DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
BEGIN
    -- Tuzağa basan saldırganı kaydet
    BEGIN
        INSERT INTO public.security_honeypot_detections (
            trap_name,
            caller_uid,
            payload
        ) VALUES (
            'debug_add_test_credits',
            v_caller_id,
            'Requested amount: ' || coalesce(p_amount::text, 'null')
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Saldırgana sahte zafer dön
    RETURN jsonb_build_object(
        'status', 'success',
        'credits_added', coalesce(p_amount, 1000),
        'wallet_status', 'synced',
        'environment', 'sandbox_mode_enabled'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_add_test_credits(integer) TO anon, authenticated;

COMMENT ON TABLE public.system_debug_credentials IS 'KISTAS Canary Bal Küpü: Pars DevState ve saldırgan tarayıcıları için siber aldatma tablosu.';
COMMENT ON FUNCTION public.debug_elevate_admin_role IS 'KISTAS Truva Arka Kapısı: Sahte süper admin yanıtı veren aldatma fonksiyonu.';
COMMENT ON FUNCTION public.debug_add_test_credits IS 'KISTAS Finansal Bal Küpü: Kredi hilesi arayan botları nötralize eden sahte başarı fonksiyonu.';


-- ============================================================================
-- DOSYA: 20260917000016_faz13_wallet_integrity_and_state_machine.sql
-- ============================================================================

-- ==============================================================================
-- FAZ 13: CÜZDAN, SİPARİŞ DURUM MAKİNESİ & ÇİFT HARCAMA KALKANI (SEC-043 — SEC-045)
-- ==============================================================================
-- 1. SEC-043: Sipariş Durum Makinesi Bütünlüğü (Order State Machine Immutability)
-- 2. SEC-044: Teklif & Pazarlık Durum Makinesi Bütünlüğü (Offer State Machine)
-- 3. SEC-045: Negatif Kredi & Float / Bakiye Taşkın Kalkanı (Balance Integrity)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-043: Sipariş Durum Makinesi Doğrulama Tetikleyicisi
-- ------------------------------------------------------------------------------
-- Tamamlanmış (completed), iptal edilmiş (cancelled) veya iade edilmiş (refunded)
-- bir sipariş ASLA geçmiş durumlara döndürülemez (Terminal State).
-- Geçişler yalnızca yasal lojistik ve emanet (escrow) sırasını takip edebilir.
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Durum değişmiyorsa izin ver
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Terminal Durumlar: Bir kez bu duruma gelen sipariş kesinlikle değiştirilemez
    IF OLD.status IN ('completed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: Terminal durumdaki (%) bir sipariş başka bir duruma geçirilemez.', OLD.status;
    END IF;

    -- Geçerli Durum Geçiş Matrisi
    IF OLD.status = 'pending_payment' AND NEW.status NOT IN ('paid_escrow', 'cancelled') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: pending_payment durumundan yalnızca paid_escrow veya cancelled durumuna geçilebilir.';
    ELSIF OLD.status = 'paid_escrow' AND NEW.status NOT IN ('shipped', 'disputed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: paid_escrow durumundan yalnızca shipped, disputed, cancelled veya refunded durumuna geçilebilir.';
    ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'disputed') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: shipped durumundan yalnızca delivered veya disputed durumuna geçilebilir.';
    ELSIF OLD.status = 'delivered' AND NEW.status NOT IN ('completed', 'disputed') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: delivered durumundan yalnızca completed veya disputed durumuna geçilebilir.';
    ELSIF OLD.status = 'disputed' AND NEW.status NOT IN ('completed', 'refunded', 'paid_escrow', 'shipped') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: disputed durumundan yalnızca completed, refunded, paid_escrow veya shipped durumuna geçilebilir.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_state_transition ON public.orders;
CREATE TRIGGER trg_enforce_order_state_transition
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_order_state_transition();

-- ------------------------------------------------------------------------------
-- 2. SEC-044: Teklif & Pazarlık Durum Makinesi Bütünlüğü
-- ------------------------------------------------------------------------------
-- Kabul edilmiş (accepted), reddedilmiş (rejected) veya süresi dolmuş (expired)
-- bir teklif yeniden 'pending' yapılamaz.
CREATE OR REPLACE FUNCTION public.enforce_offer_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('accepted', 'rejected', 'expired', 'cancelled') THEN
        RAISE EXCEPTION 'ILLEGAL_OFFER_TRANSITION: Sonuçlanmış bir teklif (%) tekrar değiştirilemez.', OLD.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_offer_state_transition ON public.offers;
CREATE TRIGGER trg_enforce_offer_state_transition
    BEFORE UPDATE OF status ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_offer_state_transition();

-- ------------------------------------------------------------------------------
-- 3. SEC-045: Negatif Kredi & Float Taşkın Kalkanı (Balance Integrity)
-- ------------------------------------------------------------------------------
-- credit_transactions tablosunda bakiye ASLA negatif olamaz.
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS chk_credit_tx_balance_after_non_negative;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT chk_credit_tx_balance_after_non_negative
    CHECK (balance_after >= 0) NOT VALID;

ALTER TABLE public.credit_transactions
  VALIDATE CONSTRAINT chk_credit_tx_balance_after_non_negative;

-- profiles tablosunda boost_credits ve available_balance kısıtlarını teyit et
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_boost_credits_non_negative,
  DROP CONSTRAINT IF EXISTS chk_profiles_available_balance_non_negative;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_boost_credits_non_negative
    CHECK (boost_credits >= 0) NOT VALID,
  ADD CONSTRAINT chk_profiles_available_balance_non_negative
    CHECK (available_balance >= 0.00) NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT chk_profiles_boost_credits_non_negative;
ALTER TABLE public.profiles
  VALIDATE CONSTRAINT chk_profiles_available_balance_non_negative;

COMMENT ON TRIGGER trg_enforce_order_state_transition ON public.orders IS 'Sipariş durum makinesi kalkanı: Terminal durumların bozulmasını ve race condition geçişlerini engeller.';
COMMENT ON TRIGGER trg_enforce_offer_state_transition ON public.offers IS 'Teklif durum makinesi kalkanı: Karara bağlanmış tekliflerin manipüle edilmesini önler.';


-- ============================================================================
-- DOSYA: 20260917000017_faz14_promo_pricing_and_delivery_hardening.sql
-- ============================================================================

-- ============================================================================
-- 20260917000017_faz14_promo_pricing_and_delivery_hardening.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 14
-- SEC-046: Promosyon Kodu İstismarı & Kupon Yığma (Coupon Stacking / Replay) Kalkanı
-- SEC-047: Fiyatlandırma Bütünlüğü & İndirim Oranı Manipülasyonu (Price Tampering)
-- SEC-048: Kargo & Teslimat Kodu IDOR / Brute-force Kalkanı
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEC-046: PROMOSYON KODU GÜVENLİK VE FORMAT KISITLARI (LISTINGS)
-- ----------------------------------------------------------------------------
-- Promosyon kodları XSS, SQLi, kontrol karakterleri ve yığma saldırılarına karşı
-- kesin alfanümerik kurala [A-Za-z0-9_-] ve maks 30 karaktere bağlanır.

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_promo_code_format;

ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_promo_code_format
    CHECK (
        promo_code IS NULL 
        OR (
            LENGTH(TRIM(promo_code)) >= 2 
            AND LENGTH(TRIM(promo_code)) <= 30 
            AND TRIM(promo_code) ~ '^[A-Za-z0-9_\-]+$'
        )
    ) NOT VALID;

ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_promo_code_format;

-- ----------------------------------------------------------------------------
-- 2. SEC-047: FİYATLANDIRMA BÜTÜNLÜĞÜ & TAŞKINLIK KALKANI (LISTINGS, OFFERS, ORDERS)
-- ----------------------------------------------------------------------------
-- İlan fiyatları dijital vitrin (0 = ücretsiz) ile maksimum 10 Milyon TL mantık sınırına alınır.
-- Orijinal fiyat indirim oranı hesaplaması için fiyatın altına inemez ve 20 Milyon TL'yi aşamaz.

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_price_range,
    DROP CONSTRAINT IF EXISTS chk_listings_original_price_range;

ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_price_range
    CHECK (
        price IS NULL 
        OR (price >= 0.00 AND price <= 10000000.00)
    ) NOT VALID;

ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_price_range;

ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_original_price_range
    CHECK (
        original_price IS NULL 
        OR (
            original_price >= COALESCE(price, 0.00) 
            AND original_price <= 20000000.00
        )
    ) NOT VALID;

ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_original_price_range;

-- Teklifler (Offers) fiyat aralık kısıtları:
ALTER TABLE public.offers
    DROP CONSTRAINT IF EXISTS chk_offers_offered_price_range,
    DROP CONSTRAINT IF EXISTS chk_offers_counter_price_range;

ALTER TABLE public.offers
    ADD CONSTRAINT chk_offers_offered_price_range
    CHECK (
        offered_price >= 1.00 AND offered_price <= 10000000.00
    ) NOT VALID;

ALTER TABLE public.offers VALIDATE CONSTRAINT chk_offers_offered_price_range;

ALTER TABLE public.offers
    ADD CONSTRAINT chk_offers_counter_price_range
    CHECK (
        counter_price IS NULL 
        OR (counter_price >= 1.00 AND counter_price <= 10000000.00)
    ) NOT VALID;

ALTER TABLE public.offers VALIDATE CONSTRAINT chk_offers_counter_price_range;

-- Siparişler (Orders) finansal havuz (Escrow) tavan ve tutarlılık kısıtları:
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS chk_orders_product_amount_range,
    DROP CONSTRAINT IF EXISTS chk_orders_shipping_cost_range,
    DROP CONSTRAINT IF EXISTS chk_orders_service_fee_range,
    DROP CONSTRAINT IF EXISTS chk_orders_seller_earnings_bounded;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_product_amount_range
    CHECK (
        product_amount >= 0.00 AND product_amount <= 10000000.00
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_product_amount_range;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_shipping_cost_range
    CHECK (
        shipping_cost >= 0.00 AND shipping_cost <= 100000.00
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_shipping_cost_range;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_service_fee_range
    CHECK (
        service_fee >= 0.00 AND service_fee <= 1000000.00
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_service_fee_range;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_seller_earnings_bounded
    CHECK (
        seller_earnings <= product_amount
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_seller_earnings_bounded;

-- ----------------------------------------------------------------------------
-- 3. SEC-048: KARGO, SİPARİŞ NUMARASI & ENUMERATION / BRUTE-FORCE KALKANI
-- ----------------------------------------------------------------------------
-- Sipariş referans numarası ve kargo takip numarası regex format kalkanı:
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS chk_orders_order_number_format,
    DROP CONSTRAINT IF EXISTS chk_orders_tracking_number_format;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_order_number_format
    CHECK (
        order_number ~ '^[A-Za-z0-9_\-]+$' 
        AND LENGTH(order_number) >= 8 
        AND LENGTH(order_number) <= 32
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_order_number_format;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_tracking_number_format
    CHECK (
        tracking_number IS NULL 
        OR (
            LENGTH(tracking_number) <= 64 
            AND tracking_number ~ '^[A-Za-z0-9\-_\./]+$'
        )
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_tracking_number_format;

-- ----------------------------------------------------------------------------
-- 4. create_escrow_order_atomic SERTLEŞTİRMESİ
-- ----------------------------------------------------------------------------
-- Kriptografik rastgele sipariş kodu (CSPRNG), search_path izolasyonu ve grant sertleştirmesi.

CREATE OR REPLACE FUNCTION public.create_escrow_order_atomic(
    p_listing_id UUID,
    p_shipping_address_id UUID,
    p_payment_provider VARCHAR DEFAULT 'mock',
    p_cargo_provider VARCHAR DEFAULT 'mock'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID;
    v_listing RECORD;
    v_address RECORD;
    v_category RECORD;
    v_final_price NUMERIC(12, 2);
    v_accepted_offer RECORD;
    v_commission_rate NUMERIC(4, 4);
    v_service_fee NUMERIC(12, 2);
    v_shipping_cost NUMERIC(12, 2) := 39.99;
    v_total_amount NUMERIC(12, 2);
    v_seller_earnings NUMERIC(12, 2);
    v_order_id UUID;
    v_order_number VARCHAR(32);
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmış kullanıcı bulunamadı.';
    END IF;

    -- 1. İLANI VE DURUMUNU KİLİTLE (Concurrency / Race Condition Koruması)
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
        v_final_price := COALESCE(v_listing.price, 0.00);
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
    v_seller_earnings := v_final_price;

    -- 5. KRİPTOGRAFİK SİPARİŞ NUMARASI ÜRET (CSPRNG: Tahmin Edilemez)
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(ENCODE(gen_random_bytes(4), 'hex'));

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
        COALESCE(v_listing.delivery_type, 'hybrid'),
        'pending_payment',
        v_final_price,
        v_shipping_cost,
        v_service_fee,
        v_total_amount,
        v_seller_earnings,
        COALESCE(p_payment_provider, 'mock'),
        COALESCE(p_cargo_provider, 'mock'),
        to_jsonb(v_address)
    ) RETURNING id INTO v_order_id;

    -- İlanı rezerve et
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
$$;

-- İzinleri kilitle: Sadece oturum açmış kullanıcılar (authenticated) sipariş açabilir
REVOKE ALL ON FUNCTION public.create_escrow_order_atomic(UUID, UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_escrow_order_atomic(UUID, UUID, VARCHAR, VARCHAR) TO authenticated;
