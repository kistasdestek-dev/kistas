-- Yönetim paneli sayaçlarını ve yetkili lansman moderasyonu durum geçişini onarır.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_admin_permission('community')
    OR public.has_admin_permission('launches')
    OR public.has_admin_permission('blog')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
  END IF;

  RETURN jsonb_build_object(
    'total_projects', (SELECT COUNT(*) FROM public.listings),
    'active_projects', (SELECT COUNT(*) FROM public.listings WHERE status = 'active'),
    'sponsored_projects', (
      SELECT COUNT(*) FROM public.listings
      WHERE status = 'active' AND boosted_until > clock_timestamp()
    ),
    'pending_projects', (SELECT COUNT(*) FROM public.listings WHERE status = 'draft'),
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
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_listing_status_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email_confirmed BOOLEAN;
  v_moderation_scope TEXT := COALESCE(
    current_setting('app.kistas_listing_moderation', TRUE),
    ''
  );
BEGIN
  IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT auth_user.email_confirmed_at IS NOT NULL
    INTO v_email_confirmed
    FROM auth.users AS auth_user
    WHERE auth_user.id = auth.uid();

    IF COALESCE(v_email_confirmed, FALSE) = FALSE THEN
      RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED: Proje oluşturabilmek için lütfen e-posta adresinizi doğrulayın.';
    END IF;

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
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF v_moderation_scope = NEW.id::TEXT || ':' || NEW.status::TEXT
         AND public.has_admin_permission('launches') THEN
        RETURN NEW;
      END IF;

      IF NEW.status IN ('active', 'reserved', 'sold') THEN
        RAISE EXCEPTION 'FORBIDDEN: Proje durumunu doğrudan bu aşamaya geçiremezsiniz. Lütfen inceleme talep edin.';
      END IF;
    END IF;

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

CREATE OR REPLACE FUNCTION public.admin_update_listing_status(
  p_listing_id UUID,
  p_status public.listing_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_previous_status public.listing_status;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('launches') THEN
    RAISE EXCEPTION 'FORBIDDEN: Lansman inceleme yetkisi gerekli.';
  END IF;
  IF p_listing_id IS NULL OR p_status NOT IN ('active', 'banned') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Yönetim işlemi yalnızca active veya banned durumunu kabul eder.';
  END IF;

  SELECT listing.seller_id, listing.status
  INTO v_seller_id, v_previous_status
  FROM public.listings AS listing
  WHERE listing.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
  END IF;

  PERFORM set_config(
    'app.kistas_listing_moderation',
    p_listing_id::TEXT || ':' || p_status::TEXT,
    TRUE
  );

  UPDATE public.listings
  SET status = p_status,
      boosted_until = CASE WHEN p_status = 'active' THEN boosted_until ELSE NULL END,
      category_boosted_until = CASE WHEN p_status = 'active' THEN category_boosted_until ELSE NULL END,
      review_feedback = CASE WHEN p_status = 'active' THEN NULL ELSE review_feedback END,
      review_requested_at = CASE WHEN p_status = 'active' THEN NULL ELSE review_requested_at END,
      reviewed_by = CASE WHEN p_status = 'active' THEN auth.uid() ELSE reviewed_by END,
      updated_at = clock_timestamp()
  WHERE id = p_listing_id;

  PERFORM set_config('app.kistas_listing_moderation', '', TRUE);

  IF p_status = 'active' AND v_seller_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_verified = TRUE,
        updated_at = clock_timestamp()
    WHERE id = v_seller_id;
  END IF;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'listing_status_updated',
    'listing',
    p_listing_id,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'status', p_status,
      'seller_id', v_seller_id
    )
  );

  RETURN jsonb_build_object('success', TRUE, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) TO authenticated;

-- Eski migration'lardan kalan paralel SELECT politikalarını tek sözleşmede birleştirir.
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Listings viewable by allowed users" ON public.listings;
DROP POLICY IF EXISTS "Platform admins view all listings" ON public.listings;
DROP POLICY IF EXISTS "Launch team views listings" ON public.listings;
DROP POLICY IF EXISTS "listings_anon_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_authenticated_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_read_public" ON public.listings;

CREATE POLICY "listings_anon_read_policy" ON public.listings
FOR SELECT TO anon
USING (status = 'active');

CREATE POLICY "listings_authenticated_read_policy" ON public.listings
FOR SELECT TO authenticated
USING (
  (status = 'active' AND NOT public.is_user_blocked(auth.uid(), seller_id))
  OR seller_id = auth.uid()
  OR public.has_admin_permission('launches')
);

COMMENT ON FUNCTION public.get_admin_dashboard_stats() IS
'Yetkili yönetim merkezi için gerçek enum durumlarını ve canlı operasyon metriklerini döndürür.';

COMMENT ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) IS
'Launches yetkisini, proje kapsamlı transaction işareti ve denetim kaydıyla uygular.';
