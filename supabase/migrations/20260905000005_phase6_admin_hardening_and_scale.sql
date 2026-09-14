-- ============================================================================
-- FAZ 6: YÖNETİM YETKİSİ, HASSAS ALAN KORUMASI VE ÖLÇEK DOĞRULAMASI
-- ============================================================================

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

CREATE OR REPLACE FUNCTION public.is_platform_admin()
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
        WHERE auth_user.id = auth.uid()
          AND auth_user.email_confirmed_at IS NOT NULL
    );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

COMMENT ON FUNCTION public.is_platform_admin() IS
'İstemci e-posta karşılaştırmasına güvenmeden, doğrulanmış auth kullanıcısını sunucu allowlisti ile denetler.';

CREATE TABLE IF NOT EXISTS public.admin_action_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_actor_created
    ON public.admin_action_audit (actor_id, created_at DESC);

ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_action_audit FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Platform admins view all listings" ON public.listings;
CREATE POLICY "Platform admins view all listings"
    ON public.listings
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins view all profiles" ON public.profiles;
CREATE POLICY "Platform admins view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

-- Kullanıcılar sayaç, kredi veya sponsor bitiş zamanlarını doğrudan değiştiremez.
REVOKE UPDATE ON public.listings FROM anon, authenticated;
GRANT UPDATE (
    category_id,
    title,
    description,
    price,
    original_price,
    delivery_type,
    cargo_size,
    status,
    city,
    district,
    location,
    is_negotiable,
    tagline,
    logo_url,
    app_store_url,
    play_store_url,
    web_url,
    platforms,
    promo_code,
    pricing_model,
    updated_at
) ON public.listings TO authenticated;

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
    full_name,
    avatar_url,
    bio,
    iban,
    identity_number,
    city,
    district,
    location,
    fcm_token,
    updated_at
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_verified_phone_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_phone TEXT;
    v_phone_confirmed_at TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
    END IF;

    SELECT auth_user.phone, auth_user.phone_confirmed_at
    INTO v_phone, v_phone_confirmed_at
    FROM auth.users AS auth_user
    WHERE auth_user.id = v_user_id;

    IF v_phone IS NULL OR v_phone_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'PHONE_NOT_VERIFIED: Doğrulanmış telefon bulunamadı.';
    END IF;

    UPDATE public.profiles
    SET phone = v_phone,
        is_verified = TRUE,
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', TRUE, 'phone', v_phone);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_verified_phone_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_verified_phone_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    user_role TEXT,
    boost_credits INTEGER,
    available_balance NUMERIC,
    is_verified BOOLEAN,
    projects_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    RETURN QUERY
    SELECT
        auth_user.id,
        COALESCE(profile.full_name, SPLIT_PART(auth_user.email, '@', 1))::TEXT,
        auth_user.email::TEXT,
        CASE WHEN platform_admin.email IS NULL THEN 'user' ELSE 'admin' END::TEXT,
        COALESCE(profile.boost_credits, 0),
        COALESCE(profile.available_balance, 0),
        COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL,
        COUNT(listing.id),
        COALESCE(profile.created_at, auth_user.created_at)
    FROM auth.users AS auth_user
    LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
    LEFT JOIN private.platform_admins AS platform_admin
      ON platform_admin.email = LOWER(auth_user.email)
    LEFT JOIN public.listings AS listing ON listing.seller_id = auth_user.id
    GROUP BY
        auth_user.id,
        auth_user.email,
        auth_user.email_confirmed_at,
        auth_user.created_at,
        profile.full_name,
        profile.boost_credits,
        profile.available_balance,
        profile.is_verified,
        profile.created_at,
        platform_admin.email
    ORDER BY COALESCE(profile.created_at, auth_user.created_at) DESC, auth_user.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    SELECT jsonb_build_object(
        'total_projects', COUNT(*),
        'active_projects', COUNT(*) FILTER (WHERE listing.status = 'active'),
        'sponsored_projects', COUNT(*) FILTER (
            WHERE listing.status = 'active' AND listing.boosted_until > NOW()
        ),
        'pending_projects', COUNT(*) FILTER (
            WHERE listing.status IN ('draft', 'inactive')
        ),
        'total_upvotes', COALESCE(SUM(listing.upvotes_count), 0),
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'circulating_credits', (
            SELECT COALESCE(SUM(profile.boost_credits), 0) FROM public.profiles AS profile
        )
    )
    INTO v_stats
    FROM public.listings AS listing;

    RETURN v_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_listing_status(
    p_listing_id UUID,
    p_status public.listing_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    UPDATE public.listings
    SET status = p_status,
        boosted_until = CASE WHEN p_status = 'active' THEN boosted_until ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
    END IF;

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        'listing_status_updated',
        'listing',
        p_listing_id,
        jsonb_build_object('status', p_status)
    );

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_listing_sponsorship(
    p_listing_id UUID,
    p_duration_hours INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status public.listing_status;
    v_current_until TIMESTAMPTZ;
    v_new_until TIMESTAMPTZ;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    IF p_duration_hours NOT IN (0, 24, 72, 168) THEN
        RAISE EXCEPTION 'INVALID_DURATION: Süre 0, 24, 72 veya 168 saat olmalıdır.';
    END IF;

    SELECT listing.status, listing.boosted_until
    INTO v_status, v_current_until
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
    END IF;

    IF p_duration_hours > 0 AND v_status <> 'active' THEN
        RAISE EXCEPTION 'LISTING_NOT_ACTIVE: Yalnızca aktif proje sponsorlanabilir.';
    END IF;

    v_new_until := CASE
        WHEN p_duration_hours = 0 THEN NULL
        ELSE GREATEST(COALESCE(v_current_until, NOW()), NOW())
             + MAKE_INTERVAL(hours => p_duration_hours)
    END;

    UPDATE public.listings
    SET boosted_until = v_new_until,
        updated_at = NOW()
    WHERE id = p_listing_id;

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        CASE WHEN p_duration_hours = 0 THEN 'sponsorship_removed' ELSE 'sponsorship_extended' END,
        'listing',
        p_listing_id,
        jsonb_build_object(
            'duration_hours', p_duration_hours,
            'boosted_until', v_new_until,
            'ranking_advantage', FALSE
        )
    );

    RETURN jsonb_build_object('success', TRUE, 'boosted_until', v_new_until);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_listing(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = p_listing_id) THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
    END IF;

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id)
    VALUES (auth.uid(), 'listing_deleted', 'listing', p_listing_id);

    DELETE FROM public.listings WHERE id = p_listing_id;
    RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_credits(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_new_credits INTEGER;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    IF p_amount < 1 OR p_amount > 10000 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Kredi miktarı 1 ile 10000 arasında olmalıdır.';
    END IF;

    UPDATE public.profiles
    SET boost_credits = boost_credits + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING boost_credits INTO v_new_credits;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND: Kullanıcı profili bulunamadı.';
    END IF;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        type,
        description
    ) VALUES (
        p_user_id,
        p_amount,
        v_new_credits,
        'reward',
        'Yönetici tarafından tanımlanan görünürlük kredisi'
    );

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        'credits_granted',
        'profile',
        p_user_id,
        jsonb_build_object('amount', p_amount, 'balance_after', v_new_credits)
    );

    RETURN jsonb_build_object('success', TRUE, 'new_credits', v_new_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_listing_sponsorship(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_listing(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_credits(UUID, INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_sponsorship(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_listing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(UUID, INTEGER) TO authenticated;

-- Sponsor sorgularının hem global hem kategori akışlarında veri büyüdükçe
-- boosted_until filtresini tarama maliyeti artmasın.
CREATE INDEX IF NOT EXISTS idx_listings_active_sponsor_global
    ON public.listings (boosted_until, created_at, id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_active_sponsor_category
    ON public.listings (category_id, boosted_until, created_at, id)
    WHERE status = 'active';

-- 10.000 aktif sponsor varsayımıyla rotasyonun her saatte tekil pozisyonlar
-- ürettiğini ve tam bir çevrimde aynı projenin bütün pozisyonları aldığını
-- migration sırasında, kalıcı test verisi oluşturmadan doğrula.
DO $$
DECLARE
    v_candidate_count CONSTANT INTEGER := 10000;
    v_unique_positions BIGINT;
    v_project_one_positions BIGINT;
BEGIN
    SELECT COUNT(DISTINCT (
        MOD(
            candidate_id - 1 + v_candidate_count - MOD(777777::BIGINT, v_candidate_count),
            v_candidate_count
        ) + 1
    ))
    INTO v_unique_positions
    FROM GENERATE_SERIES(1, v_candidate_count) AS candidate_id;

    IF v_unique_positions <> v_candidate_count THEN
        RAISE EXCEPTION 'SCALE_TEST_FAILED: Sponsor pozisyonları tekil değil.';
    END IF;

    SELECT COUNT(DISTINCT (
        MOD(
            v_candidate_count - MOD(hour_slot::BIGINT, v_candidate_count),
            v_candidate_count
        ) + 1
    ))
    INTO v_project_one_positions
    FROM GENERATE_SERIES(0, v_candidate_count - 1) AS hour_slot;

    IF v_project_one_positions <> v_candidate_count THEN
        RAISE EXCEPTION 'SCALE_TEST_FAILED: Tam rotasyon çevrimi adil değil.';
    END IF;
END;
$$;
