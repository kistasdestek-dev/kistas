-- M2: private work-in-progress archive and atomic submissions. No launch quota or deduplication.
BEGIN;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS save_revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE public.launch_configuration (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  media_origin TEXT NOT NULL CHECK (media_origin ~ '^https://[a-z0-9.-]+$')
);
REVOKE ALL ON public.launch_configuration FROM PUBLIC, anon, authenticated;
-- Set the actual project's Storage origin before enabling M2 in a different environment.
INSERT INTO public.launch_configuration(singleton, media_origin) VALUES (TRUE, 'https://iojgqicgeztqwkbetboa.supabase.co');

CREATE TABLE public.launch_drafts (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  source_listing_revision INTEGER,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::TEXT) <= 65536),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  submitted_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'editing' CHECK (state IN ('editing', 'submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX launch_drafts_owner_archive ON public.launch_drafts(owner_id, created_at DESC, id DESC) WHERE state = 'editing';
ALTER TABLE public.launch_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.launch_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.launch_drafts TO authenticated;
CREATE POLICY launch_drafts_owner_read ON public.launch_drafts FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE FUNCTION public.save_launch_draft(p_id UUID, p_revision INTEGER, p_payload JSONB, p_source_listing_id UUID DEFAULT NULL, p_source_revision INTEGER DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user UUID := auth.uid(); v_draft public.launch_drafts%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_id IS NULL OR p_revision IS NULL OR p_revision < 0 OR p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::TEXT) > 65536 THEN RAISE EXCEPTION 'INVALID_DRAFT'; END IF;
  -- Serialize initial insert and updates of one archive item, without limiting new launches.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::TEXT, 0));
  SELECT * INTO v_draft FROM public.launch_drafts WHERE id = p_id FOR UPDATE;
  IF FOUND THEN
    IF v_draft.owner_id <> v_user THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    IF v_draft.state <> 'editing' OR v_draft.revision <> p_revision
       OR v_draft.source_listing_id IS DISTINCT FROM p_source_listing_id
       OR v_draft.source_listing_revision IS DISTINCT FROM p_source_revision THEN RAISE EXCEPTION 'DRAFT_CONFLICT'; END IF;
    UPDATE public.launch_drafts SET payload = p_payload, revision = revision + 1, updated_at = clock_timestamp()
    WHERE id = p_id RETURNING * INTO v_draft;
  ELSE
    IF p_revision <> 0 THEN RAISE EXCEPTION 'DRAFT_CONFLICT'; END IF;
    IF p_source_listing_id IS NOT NULL AND (p_source_revision IS NULL OR p_source_revision < 0) THEN RAISE EXCEPTION 'INVALID_DRAFT'; END IF;
    IF p_source_listing_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.listings WHERE id = p_source_listing_id AND seller_id = v_user
    ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    INSERT INTO public.launch_drafts(id, owner_id, source_listing_id, source_listing_revision, payload)
    VALUES (p_id, v_user, p_source_listing_id, p_source_revision, p_payload) RETURNING * INTO v_draft;
  END IF;
  RETURN jsonb_build_object('revision', v_draft.revision, 'updatedAt', v_draft.updated_at);
END;
$$;

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
    IF OLD.status::TEXT = 'inactive' AND NEW.status::TEXT = 'draft'
       AND OLD.seller_id = auth.uid()
       AND current_setting('app.kistas_launch_resubmit', TRUE) = NEW.id::TEXT THEN
      NEW.review_feedback := NULL;
      NEW.review_requested_at := NULL;
      NEW.reviewed_by := NULL;
    ELSE
      NEW.review_feedback := OLD.review_feedback;
      NEW.review_requested_at := OLD.review_requested_at;
      NEW.reviewed_by := OLD.reviewed_by;
    END IF;
    IF current_setting('app.kistas_launch_write', TRUE) = NEW.id::TEXT
       OR (NEW.title, NEW.tagline, NEW.description, NEW.category_id, NEW.price, NEW.pricing_model,
           NEW.platforms, NEW.logo_url, NEW.web_url, NEW.app_store_url, NEW.play_store_url, NEW.status)
          IS DISTINCT FROM
          (OLD.title, OLD.tagline, OLD.description, OLD.category_id, OLD.price, OLD.pricing_model,
           OLD.platforms, OLD.logo_url, OLD.web_url, OLD.app_store_url, OLD.play_store_url, OLD.status)
    THEN
      IF current_setting('app.kistas_launch_resubmit', TRUE) = NEW.id::TEXT THEN NEW.save_revision := OLD.save_revision;
      ELSE NEW.save_revision := OLD.save_revision + 1; END IF;
    ELSE NEW.save_revision := OLD.save_revision;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.submit_launch(p_payload JSONB, p_listing_id UUID DEFAULT NULL, p_expected_revision INTEGER DEFAULT NULL, p_draft_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user UUID := auth.uid(); v_id UUID; v_current public.listings%ROWTYPE;
  v_draft public.launch_drafts%ROWTYPE; v_images TEXT[]; v_url TEXT; v_key TEXT; v_revision INTEGER; v_review JSONB; v_origin TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT media_origin INTO v_origin FROM public.launch_configuration WHERE singleton = TRUE;
  IF v_origin IS NULL THEN RAISE EXCEPTION 'MEDIA_NOT_CONFIGURED'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::TEXT) > 65536
     OR char_length(btrim(COALESCE(p_payload->>'title', ''))) NOT BETWEEN 2 AND 150
     OR char_length(btrim(COALESCE(p_payload->>'description', ''))) NOT BETWEEN 10 AND 6000
     OR char_length(COALESCE(p_payload->>'tagline', '')) > 160
     OR COALESCE(p_payload->>'pricingModel', '') NOT IN ('free', 'freemium', 'subscription', 'paid')
     OR COALESCE(jsonb_typeof(p_payload->'platforms'), '') <> 'array'
     OR COALESCE(jsonb_typeof(p_payload->'screenshots'), '') <> 'array'
  THEN RAISE EXCEPTION 'INVALID_LAUNCH'; END IF;
  IF jsonb_array_length(p_payload->'screenshots') > 6
     OR jsonb_array_length(p_payload->'platforms') NOT BETWEEN 1 AND 5
     OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_payload->'platforms') AS platform(value)
                WHERE value IS NULL OR value NOT IN ('iOS', 'Android', 'Web', 'macOS', 'SaaS'))
     OR COALESCE(p_payload->>'price','0')::NUMERIC NOT BETWEEN 0 AND 999999
  THEN RAISE EXCEPTION 'INVALID_LAUNCH'; END IF;
  IF COALESCE(NULLIF(p_payload->>'websiteUrl',''), NULLIF(p_payload->>'appStoreUrl',''), NULLIF(p_payload->>'playStoreUrl','')) IS NULL
  THEN RAISE EXCEPTION 'INVALID_LINK'; END IF;
  FOREACH v_url IN ARRAY ARRAY[p_payload->>'websiteUrl', p_payload->>'appStoreUrl', p_payload->>'playStoreUrl'] LOOP
    IF v_url IS NOT NULL AND v_url <> '' AND (v_url !~ '^https://' OR char_length(v_url) > 2048 OR v_url ~ '[[:cntrl:]]')
    THEN RAISE EXCEPTION 'INVALID_LINK'; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = (p_payload->>'categoryId')::UUID) THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;

  IF p_draft_id IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_draft_id::TEXT, 0));
    SELECT * INTO v_draft FROM public.launch_drafts WHERE id = p_draft_id FOR UPDATE;
    IF NOT FOUND OR v_draft.owner_id <> v_user OR v_draft.source_listing_id IS DISTINCT FROM p_listing_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  END IF;
  IF p_listing_id IS NOT NULL THEN
    SELECT * INTO v_current FROM public.listings WHERE id = p_listing_id AND seller_id = v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    IF v_current.status::TEXT NOT IN ('draft', 'inactive', 'active') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
    IF p_expected_revision IS NULL OR v_current.save_revision <> p_expected_revision THEN RAISE EXCEPTION 'EDIT_CONFLICT'; END IF;
    IF p_draft_id IS NOT NULL AND v_draft.source_listing_revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'EDIT_CONFLICT'; END IF;
  END IF;

  SELECT ARRAY(SELECT image FROM (
    SELECT NULLIF(p_payload->>'coverUrl','') AS image, 0 AS position
    UNION ALL SELECT value, ordinality::INTEGER FROM jsonb_array_elements_text(p_payload->'screenshots') WITH ORDINALITY
  ) AS raw_images WHERE image IS NOT NULL AND image <> '' GROUP BY image ORDER BY min(position)) INTO v_images;
  IF cardinality(v_images) NOT BETWEEN 1 AND 7 OR COALESCE(p_payload->>'logoUrl','') = '' THEN RAISE EXCEPTION 'INVALID_MEDIA'; END IF;
  FOREACH v_url IN ARRAY array_append(v_images, p_payload->>'logoUrl') LOOP
    IF v_url !~ '^https://' OR char_length(v_url) > 2048 THEN RAISE EXCEPTION 'INVALID_MEDIA'; END IF;
    -- Existing legacy media may be retained only on its original owned listing.
    IF p_listing_id IS NOT NULL AND (v_url = v_current.logo_url OR EXISTS (
      SELECT 1 FROM public.listing_images WHERE listing_id = p_listing_id AND image_url = v_url
    )) THEN CONTINUE; END IF;
    IF left(v_url, char_length(v_origin) + 1) <> v_origin || '/' THEN RAISE EXCEPTION 'INVALID_MEDIA_ORIGIN'; END IF;
    v_key := substring(v_url FROM '/storage/v1/object/public/kistas/([^?#]+)$');
    IF v_key IS NULL OR NOT EXISTS (
      SELECT 1 FROM storage.objects AS object WHERE bucket_id = 'kistas' AND name = v_key
      AND COALESCE(NULLIF(to_jsonb(object)->>'owner_id',''), to_jsonb(object)->>'owner') = v_user::TEXT
    ) THEN RAISE EXCEPTION 'MEDIA_NOT_OWNED'; END IF;
  END LOOP;

  IF p_listing_id IS NULL THEN
    INSERT INTO public.listings(seller_id, category_id, title, tagline, description, price, pricing_model,
      platforms, logo_url, web_url, app_store_url, play_store_url, promo_code, status, save_revision)
    VALUES(v_user, (p_payload->>'categoryId')::UUID, btrim(p_payload->>'title'), NULLIF(p_payload->>'tagline',''),
      btrim(p_payload->>'description'), COALESCE(p_payload->>'price','0')::NUMERIC, p_payload->>'pricingModel',
      ARRAY(SELECT jsonb_array_elements_text(p_payload->'platforms')), p_payload->>'logoUrl',
      NULLIF(p_payload->>'websiteUrl',''), NULLIF(p_payload->>'appStoreUrl',''), NULLIF(p_payload->>'playStoreUrl',''),
      NULLIF(p_payload->>'promoCode',''), 'draft', 1) RETURNING id, save_revision INTO v_id, v_revision;
  ELSE
    v_id := p_listing_id;
    PERFORM set_config('app.kistas_launch_write', v_id::TEXT, TRUE);
    UPDATE public.listings SET category_id = (p_payload->>'categoryId')::UUID, title = btrim(p_payload->>'title'),
      tagline = NULLIF(p_payload->>'tagline',''), description = btrim(p_payload->>'description'),
      price = COALESCE(p_payload->>'price','0')::NUMERIC, pricing_model = p_payload->>'pricingModel',
      platforms = ARRAY(SELECT jsonb_array_elements_text(p_payload->'platforms')), logo_url = p_payload->>'logoUrl',
      web_url = NULLIF(p_payload->>'websiteUrl',''), app_store_url = NULLIF(p_payload->>'appStoreUrl',''),
      play_store_url = NULLIF(p_payload->>'playStoreUrl',''),
      status = CASE WHEN v_current.status::TEXT = 'inactive' THEN status ELSE 'draft'::public.listing_status END,
      save_revision = save_revision + 1, updated_at = clock_timestamp()
    WHERE id = v_id AND seller_id = v_user RETURNING save_revision INTO v_revision;
    DELETE FROM public.listing_images WHERE listing_id = v_id;
  END IF;
  INSERT INTO public.listing_images(listing_id, image_url, display_order, is_cover)
  SELECT v_id, value, ordinality - 1, ordinality = 1 FROM unnest(v_images) WITH ORDINALITY AS image(value, ordinality);
  IF p_listing_id IS NOT NULL AND v_current.status::TEXT = 'inactive' THEN
    PERFORM set_config('app.kistas_launch_resubmit', v_id::TEXT, TRUE);
    SELECT public.resubmit_listing_for_review(v_id) INTO v_review;
    IF NOT COALESCE((v_review->>'success')::BOOLEAN, FALSE) THEN RAISE EXCEPTION 'REVIEW_FAILED'; END IF;
  END IF;
  IF p_draft_id IS NOT NULL THEN
    UPDATE public.launch_drafts SET state = 'submitted', submitted_listing_id = v_id, revision = revision + 1,
      updated_at = clock_timestamp() WHERE id = p_draft_id;
  END IF;
  RETURN jsonb_build_object('success', TRUE, 'listingId', v_id, 'status', 'draft', 'revision', v_revision);
END;
$$;
REVOKE ALL ON FUNCTION public.save_launch_draft(UUID, INTEGER, JSONB, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_launch_draft(UUID, INTEGER, JSONB, UUID, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_launch(JSONB, UUID, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_launch(JSONB, UUID, INTEGER, UUID) TO authenticated;
COMMIT;
