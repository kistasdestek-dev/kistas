-- Migration: 20260925000003_admin_announcements_allow_listing_path.sql
-- Kurumsal proje duyuruları: aktif proje doğrulaması ve sunucu kaynaklı logo verisi.

ALTER TABLE public.admin_announcements
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_send_announcement(
  p_title TEXT,
  p_body TEXT,
  p_action_label TEXT,
  p_action_path TEXT,
  p_template_key TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_announcement_id UUID;
  v_recipient_count INTEGER := 0;
  v_existing public.admin_announcements%ROWTYPE;
  v_listing_id UUID;
  v_listing_logo_url TEXT;
  v_effective_action_path TEXT := btrim(COALESCE(p_action_path, ''));
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Duyuru göndermek için topluluk yönetimi yetkisi gerekli.';
  END IF;

  -- Aynı yöneticinin eşzamanlı isteklerini sırala
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_admin_id::TEXT, 0)
  );

  SELECT announcement.* INTO v_existing
  FROM public.admin_announcements AS announcement
  WHERE announcement.created_by = v_admin_id
    AND announcement.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'announcement_id', v_existing.id,
      'recipient_count', v_existing.recipient_count,
      'already_sent', TRUE
    );
  END IF;

  IF btrim(COALESCE(p_title, '')) = '' OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 80 THEN
    RAISE EXCEPTION 'INVALID_TITLE: Duyuru başlığı 3-80 karakter olmalıdır.';
  END IF;
  IF btrim(COALESCE(p_body, '')) = '' OR char_length(btrim(p_body)) NOT BETWEEN 5 AND 240 THEN
    RAISE EXCEPTION 'INVALID_BODY: Duyuru metni 5-240 karakter olmalıdır.';
  END IF;
  IF btrim(COALESCE(p_action_label, '')) = '' OR char_length(btrim(p_action_label)) NOT BETWEEN 2 AND 32 THEN
    RAISE EXCEPTION 'INVALID_ACTION_LABEL: Aksiyon metni 2-32 karakter olmalıdır.';
  END IF;
  IF v_effective_action_path ~ '^/listings/[0-9a-fA-F-]{36}$' THEN
    BEGIN
      v_listing_id := substring(v_effective_action_path FROM 11)::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_ACTION_PATH: Geçersiz proje kimliği.';
    END;

    SELECT listing.logo_url
    INTO v_listing_logo_url
    FROM public.listings AS listing
    WHERE listing.id = v_listing_id
      AND listing.status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_LISTING: Yalnızca yayındaki projeler bildirilebilir.';
    END IF;

    v_effective_action_path := '/listings/' || v_listing_id::TEXT;
  ELSIF v_effective_action_path NOT IN ('/', '/browse', '/new', '/popular', '/blog') THEN
    RAISE EXCEPTION 'INVALID_ACTION_PATH: Yalnızca izinli Kıstas rotaları kullanılabilir.';
  END IF;
  IF p_template_key NOT IN ('new_projects', 'popular_projects', 'discover', 'custom') THEN
    RAISE EXCEPTION 'INVALID_TEMPLATE: Geçersiz duyuru şablonu.';
  END IF;
  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 16 AND 80 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: Geçersiz işlem anahtarı.';
  END IF;

  -- Aynı yöneticinin bir saat içinde en fazla beş toplu duyuru göndermesine izin verilir.
  IF (
    SELECT count(*)
    FROM public.admin_announcements AS announcement
    WHERE announcement.created_by = v_admin_id
      AND announcement.created_at > clock_timestamp() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED: Bir saat içinde en fazla 5 duyuru gönderilebilir.';
  END IF;

  INSERT INTO public.admin_announcements (
    created_by, title, body, action_label, action_path, template_key, idempotency_key, listing_id
  ) VALUES (
    v_admin_id,
    btrim(p_title),
    btrim(p_body),
    btrim(p_action_label),
    v_effective_action_path,
    p_template_key,
    p_idempotency_key,
    v_listing_id
  )
  ON CONFLICT (created_by, idempotency_key) DO NOTHING
  RETURNING id INTO v_announcement_id;

  IF v_announcement_id IS NULL THEN
    SELECT announcement.* INTO v_existing
    FROM public.admin_announcements AS announcement
    WHERE announcement.created_by = v_admin_id
      AND announcement.idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object(
      'success', TRUE,
      'announcement_id', v_existing.id,
      'recipient_count', v_existing.recipient_count,
      'already_sent', TRUE
    );
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  SELECT
    profile.id,
    v_admin_id,
    'admin_announcement',
    btrim(p_title),
    btrim(p_body),
    jsonb_strip_nulls(jsonb_build_object(
      'announcement_id', v_announcement_id,
      'action_label', btrim(p_action_label),
      'action_path', v_effective_action_path,
      'template_key', p_template_key,
      'listing_id', v_listing_id,
      'logo_url', v_listing_logo_url
    ))
  FROM public.profiles AS profile;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;

  UPDATE public.admin_announcements
  SET recipient_count = v_recipient_count
  WHERE id = v_announcement_id;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    v_admin_id,
    'admin_announcement_sent',
    'admin_announcement',
    v_announcement_id,
    jsonb_build_object(
      'template_key', p_template_key,
      'action_path', v_effective_action_path,
      'listing_id', v_listing_id,
      'recipient_count', v_recipient_count
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'announcement_id', v_announcement_id,
    'recipient_count', v_recipient_count,
    'already_sent', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_send_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_send_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
'Topluluk yetkilisinin izinli Kıstas rotalarına, aktif proje doğrulamalı ve sunucu kaynaklı logolu toplu duyuru göndermesini sağlar.';
