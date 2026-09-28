-- Read-only production preflight. Does not apply a migration or create test data.
BEGIN TRANSACTION READ ONLY;
DO $$
DECLARE v_missing TEXT;
BEGIN
  IF to_regtype('public.listing_status') IS NULL
     OR to_regprocedure('public.resubmit_listing_for_review(uuid)') IS NULL
     OR to_regprocedure('public.handle_listing_status_protection()') IS NULL
     OR to_regprocedure('public.is_platform_admin()') IS NULL
     OR to_regprocedure('public.has_admin_permission(text)') IS NULL
  THEN RAISE EXCEPTION 'M2_PREFLIGHT: required moderation functions/type missing'; END IF;
  SELECT string_agg(required.name, ', ') INTO v_missing
  FROM unnest(ARRAY['id','seller_id','category_id','title','tagline','description','price','pricing_model',
    'platforms','logo_url','web_url','app_store_url','play_store_url','promo_code','status','boosted_until',
    'category_boosted_until','upvotes_count','view_count','review_feedback','review_requested_at','reviewed_by','updated_at']) AS required(name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.listings')
    AND attname = required.name AND NOT attisdropped);
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'M2_PREFLIGHT: missing listing columns: %', v_missing; END IF;
  SELECT string_agg(required.name, ', ') INTO v_missing
  FROM unnest(ARRAY['listing_id','image_url','display_order','is_cover']) AS required(name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.listing_images')
    AND attname = required.name AND NOT attisdropped);
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'M2_PREFLIGHT: missing image columns: %', v_missing; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'kistas') THEN RAISE EXCEPTION 'M2_PREFLIGHT: storage bucket missing'; END IF;
  IF to_regclass('public.launch_drafts') IS NOT NULL OR to_regclass('public.launch_configuration') IS NOT NULL
  THEN RAISE EXCEPTION 'M2_PREFLIGHT: M2 objects already exist; inspect migration history before reapplying'; END IF;
END;
$$;
-- Review existing constraints/policies/triggers and save the ACTUAL old function for rollback.
SELECT current_setting('server_version') AS server_version;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.listing_status'::regtype ORDER BY enumsortorder;
SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE conrelid IN ('public.listings'::regclass,'public.listing_images'::regclass);
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('listings','listing_images')) OR (schemaname = 'storage' AND tablename = 'objects');
SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid = 'public.listings'::regclass AND NOT tgisinternal;
SELECT pg_get_functiondef('public.handle_listing_status_protection()'::regprocedure) AS rollback_function;
COMMIT;
