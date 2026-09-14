-- Günün Vitrini: her aktif kategorinin haftalık doğrulanmış destek lideri.
-- Mevcut haftanın seçilmiş kazananlarını değiştirmez; eksik kategorileri tamamlar.

ALTER TABLE public.weekly_showcase_winners
    DROP CONSTRAINT IF EXISTS weekly_showcase_winners_support_score_check;

ALTER TABLE public.weekly_showcase_winners
    ADD CONSTRAINT weekly_showcase_winners_support_score_check
    CHECK (support_score >= 1);

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
          AND (listing.boosted_until IS NULL OR listing.boosted_until <= v_showcase_starts_at)
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

REVOKE ALL ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.select_weekly_showcase_winners(TIMESTAMPTZ) IS
'Önceki Türkiye haftasında en az 1 doğrulanmış destek alan her kategorinin organik liderini seçer; tekrar kazanmaya izin verir.';

-- Migration uygulandığında, mevcut haftada henüz seçilmemiş kategorileri güvenle doldur.
SELECT public.select_weekly_showcase_winners();
