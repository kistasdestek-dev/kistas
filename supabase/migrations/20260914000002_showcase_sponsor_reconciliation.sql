-- Sponsor durumu hafta içinde değiştiğinde organik kategori liderlerini uzlaştırır.
-- Oy penceresi sabit kalır; yalnızca artık sponsorlu olmayan gerçek haftalık lider yerleşir.

CREATE OR REPLACE FUNCTION public.select_weekly_showcase_winners(
    p_reference_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_local_week_start TIMESTAMP;
    v_competition_start TIMESTAMPTZ;
    v_competition_end TIMESTAMPTZ;
    v_showcase_starts_at TIMESTAMPTZ;
    v_showcase_ends_at TIMESTAMPTZ;
    v_changed_count INTEGER := 0;
BEGIN
    v_local_week_start := DATE_TRUNC('week', p_reference_time AT TIME ZONE 'Europe/Istanbul');
    v_competition_start := (v_local_week_start - INTERVAL '7 days') AT TIME ZONE 'Europe/Istanbul';
    v_competition_end := v_local_week_start AT TIME ZONE 'Europe/Istanbul';
    v_showcase_starts_at := (v_local_week_start + INTERVAL '5 minutes') AT TIME ZONE 'Europe/Istanbul';
    v_showcase_ends_at := v_showcase_starts_at + INTERVAL '7 days';

    WITH candidate_scores AS (
        SELECT
            listing.id AS project_id,
            listing.category_id,
            listing.upvotes_count AS lifetime_support_count,
            listing.created_at,
            COUNT(verified_user.id)::INTEGER AS support_score
        FROM public.listings AS listing
        LEFT JOIN public.project_upvotes AS support
          ON support.project_id = listing.id
         AND support.created_at >= v_competition_start
         AND support.created_at < v_competition_end
         AND support.user_id <> listing.seller_id
        LEFT JOIN auth.users AS verified_user
          ON verified_user.id = support.user_id
         AND verified_user.email_confirmed_at IS NOT NULL
        WHERE listing.status = 'active'
          AND listing.category_id IS NOT NULL
          AND (listing.boosted_until IS NULL OR listing.boosted_until <= p_reference_time)
          AND (listing.category_boosted_until IS NULL OR listing.category_boosted_until <= p_reference_time)
        GROUP BY listing.id, listing.category_id, listing.upvotes_count, listing.created_at
        HAVING COUNT(verified_user.id) >= 1
    ),
    category_ranking AS (
        SELECT
            candidate.*,
            ROW_NUMBER() OVER (
                PARTITION BY candidate.category_id
                ORDER BY
                    candidate.support_score DESC,
                    candidate.lifetime_support_count DESC,
                    candidate.created_at DESC,
                    candidate.project_id ASC
            ) AS category_position
        FROM candidate_scores AS candidate
    )
    INSERT INTO public.weekly_showcase_winners (
        project_id, category_id, week_start, support_score,
        category_rank, starts_at, ends_at
    )
    SELECT
        ranked.project_id, ranked.category_id, v_competition_start,
        ranked.support_score, 1, v_showcase_starts_at, v_showcase_ends_at
    FROM category_ranking AS ranked
    WHERE ranked.category_position = 1
    ON CONFLICT (category_id, week_start) DO UPDATE
    SET project_id = EXCLUDED.project_id,
        support_score = EXCLUDED.support_score,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at
    WHERE public.weekly_showcase_winners.project_id IS DISTINCT FROM EXCLUDED.project_id
       OR public.weekly_showcase_winners.support_score IS DISTINCT FROM EXCLUDED.support_score;

    GET DIAGNOSTICS v_changed_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'competition_start', v_competition_start,
        'competition_end', v_competition_end,
        'showcase_starts_at', v_showcase_starts_at,
        'showcase_ends_at', v_showcase_ends_at,
        'changed_winners', v_changed_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_showcase_winners(
    p_category_id UUID DEFAULT NULL,
    p_reference_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    project_id UUID,
    category_id UUID,
    support_score INTEGER,
    category_rank SMALLINT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        winner.project_id,
        winner.category_id,
        winner.support_score,
        winner.category_rank,
        winner.starts_at,
        winner.ends_at
    FROM public.weekly_showcase_winners AS winner
    INNER JOIN public.listings AS listing ON listing.id = winner.project_id
    INNER JOIN public.categories AS category ON category.id = winner.category_id
    WHERE winner.starts_at <= p_reference_time
      AND winner.ends_at > p_reference_time
      AND listing.status = 'active'
      AND category.is_active = true
      AND (listing.boosted_until IS NULL OR listing.boosted_until <= p_reference_time)
      AND (listing.category_boosted_until IS NULL OR listing.category_boosted_until <= p_reference_time)
      AND (p_category_id IS NULL OR winner.category_id = p_category_id)
    ORDER BY winner.support_score DESC, category.order_index ASC, winner.project_id ASC;
$$;

REVOKE ALL ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) TO anon, authenticated;

COMMENT ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) IS
'Sabit haftalık doğrulanmış destek puanlarıyla kategori liderlerini seçer ve değişen sponsor durumunu uzlaştırır.';

DO $$
DECLARE
    v_existing_job_id BIGINT;
BEGIN
    SELECT jobid INTO v_existing_job_id
    FROM cron.job
    WHERE jobname = 'kistas-showcase-sponsor-reconciliation'
    LIMIT 1;

    IF v_existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_existing_job_id);
    END IF;

    PERFORM cron.schedule(
        'kistas-showcase-sponsor-reconciliation',
        '17 * * * *',
        'SELECT public.select_weekly_showcase_winners();'
    );
END;
$$;

-- Halihazırda süresi bitmiş sponsorları bekletmeden güncel vitrine al.
SELECT public.select_weekly_showcase_winners();
