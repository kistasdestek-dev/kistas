-- ============================================================================
-- FAZ 4: HAFTALIK KATEGORİ LİDERLERİ VE GÜNÜN VİTRİNİ
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_showcase_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    week_start TIMESTAMPTZ NOT NULL,
    support_score INTEGER NOT NULL CHECK (support_score >= 5),
    category_rank SMALLINT NOT NULL DEFAULT 1 CHECK (category_rank = 1),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT weekly_showcase_valid_window CHECK (ends_at > starts_at),
    CONSTRAINT weekly_showcase_one_category_winner UNIQUE (category_id, week_start),
    CONSTRAINT weekly_showcase_one_project_per_week UNIQUE (project_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_showcase_active_window
    ON public.weekly_showcase_winners (starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_weekly_showcase_project_starts
    ON public.weekly_showcase_winners (project_id, starts_at DESC);

ALTER TABLE public.weekly_showcase_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Weekly showcase winners are public" ON public.weekly_showcase_winners;
CREATE POLICY "Weekly showcase winners are public"
    ON public.weekly_showcase_winners
    FOR SELECT
    USING (true);

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
    v_inserted_count INTEGER := 0;
BEGIN
    -- PostgreSQL haftası pazartesi başlar. Bütün sınırlar Türkiye yerel
    -- saatinde hesaplanıp timestamptz olarak saklanır.
    v_local_week_start := DATE_TRUNC('week', p_reference_time AT TIME ZONE 'Europe/Istanbul');
    v_competition_start := (v_local_week_start - INTERVAL '7 days') AT TIME ZONE 'Europe/Istanbul';
    v_competition_end := v_local_week_start AT TIME ZONE 'Europe/Istanbul';
    v_showcase_starts_at := (v_local_week_start + INTERVAL '5 minutes') AT TIME ZONE 'Europe/Istanbul';
    v_showcase_ends_at := v_showcase_starts_at + INTERVAL '7 days';

    WITH candidate_scores AS (
        SELECT
            l.id AS project_id,
            l.category_id,
            l.upvotes_count AS lifetime_support_count,
            l.created_at,
            COUNT(verified_user.id)::INTEGER AS support_score
        FROM public.listings AS l
        LEFT JOIN public.project_upvotes AS pu
          ON pu.project_id = l.id
         AND pu.created_at >= v_competition_start
         AND pu.created_at < v_competition_end
         AND pu.user_id <> l.seller_id
        LEFT JOIN auth.users AS verified_user
          ON verified_user.id = pu.user_id
         AND verified_user.email_confirmed_at IS NOT NULL
        WHERE l.status = 'active'
          AND l.category_id IS NOT NULL
          AND (l.boosted_until IS NULL OR l.boosted_until <= v_showcase_starts_at)
          AND NOT EXISTS (
              SELECT 1
              FROM public.weekly_showcase_winners AS previous_winner
              WHERE previous_winner.project_id = l.id
                AND previous_winner.starts_at > v_showcase_starts_at - INTERVAL '14 days'
                AND previous_winner.starts_at < v_showcase_starts_at
          )
        GROUP BY l.id, l.category_id, l.upvotes_count, l.created_at
        HAVING COUNT(verified_user.id) >= 5
    ),
    category_ranking AS (
        SELECT
            cs.*,
            ROW_NUMBER() OVER (
                PARTITION BY cs.category_id
                ORDER BY
                    cs.support_score DESC,
                    cs.lifetime_support_count DESC,
                    cs.created_at DESC,
                    cs.project_id ASC
            ) AS category_position
        FROM candidate_scores AS cs
    )
    INSERT INTO public.weekly_showcase_winners (
        project_id,
        category_id,
        week_start,
        support_score,
        category_rank,
        starts_at,
        ends_at
    )
    SELECT
        cr.project_id,
        cr.category_id,
        v_competition_start,
        cr.support_score,
        1,
        v_showcase_starts_at,
        v_showcase_ends_at
    FROM category_ranking AS cr
    WHERE cr.category_position = 1
    ON CONFLICT (category_id, week_start) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'competition_start', v_competition_start,
        'competition_end', v_competition_end,
        'showcase_starts_at', v_showcase_starts_at,
        'showcase_ends_at', v_showcase_ends_at,
        'inserted_winners', v_inserted_count
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
      AND (p_category_id IS NULL OR winner.category_id = p_category_id)
    ORDER BY winner.support_score DESC, category.order_index ASC, winner.project_id ASC;
$$;

REVOKE ALL ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) TO anon, authenticated;

COMMENT ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) IS
'Önceki Türkiye haftasındaki kategori liderlerini seçer; 5 destek barajı ve 14 günlük tekrar kazanma engeli uygular.';

COMMENT ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) IS
'Oy değişikliklerinden etkilenmeyen aktif 7 günlük kategori lideri vitrini.';

-- Supabase pg_cron UTC çalışır. Pazar 21:05 UTC, Türkiye saatinde pazartesi 00:05'tir.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
DECLARE
    v_existing_job_id BIGINT;
BEGIN
    SELECT jobid
    INTO v_existing_job_id
    FROM cron.job
    WHERE jobname = 'kistas-weekly-showcase-leaders'
    LIMIT 1;

    IF v_existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_existing_job_id);
    END IF;

    PERFORM cron.schedule(
        'kistas-weekly-showcase-leaders',
        '5 21 * * 0',
        'SELECT public.select_weekly_showcase_winners();'
    );
END;
$$;
