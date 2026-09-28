-- Only owners can remove an editing archive; published listings and Storage remain untouched.
BEGIN;
CREATE FUNCTION public.delete_launch_draft(p_id UUID, p_revision INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user UUID := auth.uid(); v_draft public.launch_drafts%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_id IS NULL OR p_revision IS NULL OR p_revision < 0 THEN RAISE EXCEPTION 'INVALID_DRAFT'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::TEXT, 0));
  SELECT * INTO v_draft FROM public.launch_drafts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_draft.owner_id <> v_user THEN RAISE EXCEPTION 'DRAFT_CONFLICT'; END IF;
  IF v_draft.state <> 'editing' OR v_draft.revision <> p_revision THEN RAISE EXCEPTION 'DRAFT_CONFLICT'; END IF;
  DELETE FROM public.launch_drafts WHERE id = p_id AND owner_id = v_user;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_launch_draft(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_launch_draft(UUID, INTEGER) TO authenticated;
COMMIT;
