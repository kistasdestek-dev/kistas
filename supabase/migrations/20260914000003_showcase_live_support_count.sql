-- Liderlik kaydı hafta boyunca sabit kalır; karttaki destek sayısı ise
-- vitrin başladıktan sonra gelen doğrulanmış desteklerle canlı büyür.

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
        (winner.support_score + live_support.support_count)::INTEGER AS support_score,
        winner.category_rank,
        winner.starts_at,
        winner.ends_at
    FROM public.weekly_showcase_winners AS winner
    INNER JOIN public.listings AS listing ON listing.id = winner.project_id
    INNER JOIN public.categories AS category ON category.id = winner.category_id
    CROSS JOIN LATERAL (
        SELECT COUNT(*)::INTEGER AS support_count
        FROM public.project_upvotes AS support
        INNER JOIN auth.users AS verified_user
          ON verified_user.id = support.user_id
         AND verified_user.email_confirmed_at IS NOT NULL
        WHERE support.project_id = winner.project_id
          AND support.user_id <> listing.seller_id
          AND support.created_at >= winner.starts_at
          AND support.created_at <= p_reference_time
    ) AS live_support
    WHERE winner.starts_at <= p_reference_time
      AND winner.ends_at > p_reference_time
      AND listing.status = 'active'
      AND category.is_active = true
      AND (listing.boosted_until IS NULL OR listing.boosted_until <= p_reference_time)
      AND (listing.category_boosted_until IS NULL OR listing.category_boosted_until <= p_reference_time)
      AND (p_category_id IS NULL OR winner.category_id = p_category_id)
    ORDER BY
        (winner.support_score + live_support.support_count) DESC,
        category.order_index ASC,
        winner.project_id ASC;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) TO anon, authenticated;

COMMENT ON FUNCTION public.get_weekly_showcase_winners(UUID, TIMESTAMPTZ) IS
'Sabit haftalık kategori liderlerini, vitrin başlangıcından sonra gelen doğrulanmış destekleri canlı ekleyerek döndürür.';
