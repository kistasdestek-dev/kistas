-- Proje moderasyonu: gerekçeli düzeltme talebi ve yeniden inceleme akışı.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS review_feedback TEXT,
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_review_feedback_length_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_review_feedback_length_check
  CHECK (
    review_feedback IS NULL
    OR char_length(btrim(review_feedback)) BETWEEN 10 AND 1200
  );

CREATE INDEX IF NOT EXISTS idx_listings_revision_queue
  ON public.listings (status, review_requested_at DESC)
  WHERE status = 'inactive';

CREATE OR REPLACE FUNCTION public.admin_request_listing_revision(
  p_listing_id UUID,
  p_feedback TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_feedback TEXT := btrim(COALESCE(p_feedback, ''));
  v_seller_id UUID;
  v_title TEXT;
  v_status public.listing_status;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
  END IF;

  IF char_length(v_feedback) < 10 OR char_length(v_feedback) > 1200 THEN
    RAISE EXCEPTION 'INVALID_FEEDBACK: Düzeltme açıklaması 10-1200 karakter arasında olmalıdır.';
  END IF;

  SELECT l.seller_id, l.title, l.status
  INTO v_seller_id, v_title, v_status
  FROM public.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Yalnızca inceleme bekleyen projeler düzeltmeye gönderilebilir.';
  END IF;

  UPDATE public.listings
  SET status = 'inactive',
      review_feedback = v_feedback,
      review_requested_at = clock_timestamp(),
      reviewed_by = auth.uid(),
      boosted_until = NULL,
      category_boosted_until = NULL,
      updated_at = clock_timestamp()
  WHERE id = p_listing_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  VALUES (
    v_seller_id,
    auth.uid(),
    'revision_requested',
    format('“%s” için düzenleme istendi', v_title),
    v_feedback,
    jsonb_build_object(
      'listing_id', p_listing_id,
      'title', v_title,
      'feedback', v_feedback,
      'action', 'edit_listing'
    )
  );

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'listing_revision_requested',
    'listing',
    p_listing_id,
    jsonb_build_object(
      'previous_status', v_status,
      'new_status', 'inactive',
      'seller_id', v_seller_id,
      'feedback', v_feedback
    )
  );

  RETURN jsonb_build_object('success', TRUE, 'status', 'inactive');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_request_listing_revision(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_request_listing_revision(UUID, TEXT) TO authenticated;

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
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
  END IF;

  UPDATE public.listings
  SET status = p_status,
      boosted_until = CASE WHEN p_status = 'active' THEN boosted_until ELSE NULL END,
      category_boosted_until = CASE WHEN p_status = 'active' THEN category_boosted_until ELSE NULL END,
      review_feedback = CASE WHEN p_status = 'active' THEN NULL ELSE review_feedback END,
      review_requested_at = CASE WHEN p_status = 'active' THEN NULL ELSE review_requested_at END,
      reviewed_by = CASE WHEN p_status = 'active' THEN auth.uid() ELSE reviewed_by END,
      updated_at = clock_timestamp()
  WHERE id = p_listing_id
  RETURNING seller_id INTO v_seller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
  END IF;

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
    jsonb_build_object('status', p_status, 'seller_id', v_seller_id)
  );

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) TO authenticated;

COMMENT ON FUNCTION public.admin_request_listing_revision(UUID, TEXT) IS
'İnceleme bekleyen projeyi gerekçesi ve kullanıcı bildirimiyle birlikte düzeltmeye gönderir.';
