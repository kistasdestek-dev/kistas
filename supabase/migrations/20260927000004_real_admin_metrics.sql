-- Yönetim merkezindeki sabit vitrin değerlerini gerçek, yetki kontrollü metriklerle değiştirir.
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
  IF auth.uid() IS NULL OR NOT (
    public.has_admin_permission('community')
    OR public.has_admin_permission('launches')
    OR public.has_admin_permission('blog')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
  END IF;

  SELECT jsonb_build_object(
    'total_projects', (SELECT COUNT(*) FROM public.listings),
    'active_projects', (SELECT COUNT(*) FROM public.listings WHERE status IN ('active', 'approved')),
    'sponsored_projects', (SELECT COUNT(*) FROM public.listings WHERE status IN ('active', 'approved') AND boosted_until > clock_timestamp()),
    'pending_projects', (SELECT COUNT(*) FROM public.listings WHERE status IN ('draft', 'pending_review')),
    'open_support_conversations', (
      SELECT COUNT(*) FROM public.conversations
      WHERE listing_id IS NULL AND closed_at IS NULL
    ),
    'total_blog_posts', (SELECT COUNT(*) FROM public.blog_posts),
    'active_security_quarantines', (
      SELECT COUNT(*) FROM public.security_quarantine_blocklist WHERE is_active = TRUE
    ),
    'total_upvotes', (SELECT COUNT(*) FROM public.project_upvotes),
    'total_comments', (SELECT COUNT(*) FROM public.project_comments),
    'total_project_views', (SELECT COALESCE(SUM(view_count), 0) FROM public.listings),
    'total_interactions',
      (SELECT COALESCE(SUM(view_count), 0) FROM public.listings)
      + (SELECT COUNT(*) FROM public.project_upvotes)
      + (SELECT COUNT(*) FROM public.project_comments),
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'circulating_credits', (SELECT COALESCE(SUM(boost_credits), 0) FROM public.profiles)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

COMMENT ON FUNCTION public.get_admin_dashboard_stats() IS
'Yetkili yönetim merkezi için gerçek proje, destek, blog, güvenlik ve etkileşim metriklerini döndürür.';
