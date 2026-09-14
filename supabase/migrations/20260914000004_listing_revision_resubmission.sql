-- Proje sahibinin yönetici düzeltmesini tamamladıktan sonra projeyi güvenle yeniden incelemeye göndermesi.
CREATE OR REPLACE FUNCTION public.resubmit_listing_for_review(
  p_listing_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_status public.listing_status;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
  END IF;

  SELECT listing.status
  INTO v_status
  FROM public.listings AS listing
  WHERE listing.id = p_listing_id
    AND listing.seller_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı veya güncelleme yetkiniz yok.';
  END IF;

  IF v_status <> 'inactive' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Yalnızca düzeltme bekleyen proje yeniden incelemeye gönderilebilir.';
  END IF;

  UPDATE public.listings
  SET status = 'draft',
      review_feedback = NULL,
      review_requested_at = NULL,
      reviewed_by = NULL,
      updated_at = clock_timestamp()
  WHERE id = p_listing_id
    AND seller_id = v_user_id;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    v_user_id,
    'listing_revision_resubmitted',
    'listing',
    p_listing_id,
    jsonb_build_object('previous_status', v_status, 'new_status', 'draft')
  );

  RETURN jsonb_build_object('success', TRUE, 'status', 'draft');
END;
$$;

REVOKE ALL ON FUNCTION public.resubmit_listing_for_review(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_listing_for_review(UUID) TO authenticated;

COMMENT ON FUNCTION public.resubmit_listing_for_review(UUID) IS
'Yalnızca proje sahibinin inactive durumundaki projesini yönetici incelemesine yeniden göndermesine izin verir.';
