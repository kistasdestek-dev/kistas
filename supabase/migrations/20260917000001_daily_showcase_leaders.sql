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
