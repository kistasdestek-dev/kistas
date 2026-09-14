-- ============================================================================
-- FAZ 2: SUNUCU TARAFINDA ORGANİK KEŞİF SIRALAMASI
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_upvotes_project_created
    ON public.project_upvotes (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_upvotes_created_project
    ON public.project_upvotes (created_at DESC, project_id);

CREATE INDEX IF NOT EXISTS idx_active_listings_category_created
    ON public.listings (category_id, created_at DESC)
    WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.get_popular_listings(
    p_limit INTEGER DEFAULT 50,
    p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
    project_id UUID,
    weekly_support_count BIGINT,
    lifetime_support_count INTEGER,
    organic_rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH eligible_projects AS (
        SELECT
            l.id,
            l.seller_id,
            l.upvotes_count,
            l.created_at
        FROM public.listings AS l
        WHERE l.status = 'active'
          AND (p_category_id IS NULL OR l.category_id = p_category_id)
          AND (l.boosted_until IS NULL OR l.boosted_until <= NOW())
    ),
    support_totals AS (
        SELECT
            ep.id AS project_id,
            ep.upvotes_count AS lifetime_support_count,
            ep.created_at,
            COUNT(verified_user.id)::BIGINT AS weekly_support_count
        FROM eligible_projects AS ep
        LEFT JOIN public.project_upvotes AS pu
          ON pu.project_id = ep.id
         AND pu.created_at >= NOW() - INTERVAL '7 days'
         AND pu.user_id <> ep.seller_id
        LEFT JOIN auth.users AS verified_user
          ON verified_user.id = pu.user_id
         AND verified_user.email_confirmed_at IS NOT NULL
        GROUP BY ep.id, ep.upvotes_count, ep.created_at
    ),
    ranked AS (
        SELECT
            st.project_id,
            st.weekly_support_count,
            st.lifetime_support_count,
            ROW_NUMBER() OVER (
                ORDER BY
                    st.weekly_support_count DESC,
                    st.lifetime_support_count DESC,
                    st.created_at DESC,
                    st.project_id ASC
            ) AS organic_rank
        FROM support_totals AS st
    )
    SELECT
        r.project_id,
        r.weekly_support_count,
        r.lifetime_support_count,
        r.organic_rank
    FROM ranked AS r
    ORDER BY r.organic_rank
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_new_listings(
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    project_id UUID,
    weekly_support_count BIGINT,
    lifetime_support_count INTEGER,
    organic_rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH new_projects AS (
        SELECT
            l.id AS project_id,
            l.seller_id,
            l.upvotes_count AS lifetime_support_count,
            l.created_at
        FROM public.listings AS l
        WHERE l.status = 'active'
          AND l.created_at >= NOW() - INTERVAL '7 days'
          AND (p_category_id IS NULL OR l.category_id = p_category_id)
          AND (l.boosted_until IS NULL OR l.boosted_until <= NOW())
    ),
    support_totals AS (
        SELECT
            np.project_id,
            np.lifetime_support_count,
            np.created_at,
            COUNT(verified_user.id)::BIGINT AS weekly_support_count
        FROM new_projects AS np
        LEFT JOIN public.project_upvotes AS pu
          ON pu.project_id = np.project_id
         AND pu.created_at >= NOW() - INTERVAL '7 days'
         AND pu.user_id <> np.seller_id
        LEFT JOIN auth.users AS verified_user
          ON verified_user.id = pu.user_id
         AND verified_user.email_confirmed_at IS NOT NULL
        GROUP BY np.project_id, np.lifetime_support_count, np.created_at
    )
    SELECT
        st.project_id,
        st.weekly_support_count,
        st.lifetime_support_count,
        ROW_NUMBER() OVER (
            ORDER BY
                st.created_at DESC,
                st.lifetime_support_count DESC,
                st.project_id ASC
        ) AS organic_rank
    FROM support_totals AS st
    ORDER BY st.created_at DESC, st.lifetime_support_count DESC, st.project_id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_popular_listings(INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_new_listings(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_popular_listings(INTEGER, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_new_listings(UUID, INTEGER) TO anon, authenticated;

COMMENT ON FUNCTION public.get_popular_listings(INTEGER, UUID) IS
'Aktif ve sponsorlu olmayan projeleri son 7 günlük doğrulanmış destek, ömür boyu destek ve yenilik sırasıyla döndürür.';

COMMENT ON FUNCTION public.get_new_listings(UUID, INTEGER) IS
'Son 7 günde yayınlanan aktif ve sponsorlu olmayan projeleri en yeniden eskiye döndürür.';
