-- ============================================================================
-- FAZ 4: RATE LIMITING, ANTI-SPAM & DOS / RESOURCE EXHAUSTION KALKANI
-- SEC-020: Mesaj/Yorum Hız Limitleri, Görünüm Sayaç Bot Kalkanı & Depolama Boyut Sınırı
-- ============================================================================

-- 1. DEPOLAMA KOVANI (kistas) DOSYA BOYUT SINIRI (Storage Resource Exhaustion Kalkanı)
-- Kötü niyetli kullanıcıların 100+ MB devasa dosyalar yükleyerek depolama kotasını tüketmesini engeller.
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10 MB tavan sınır
WHERE id = 'kistas';


-- 2. MESAJLAŞMA FLOOD & SPAM KALKANI (send_chat_message)
-- Otomasyon botlarının saniyede yüzlerce mesaj atarak veritabanını şişirmesini ve
-- bildirim yağmuru ile sunucu kaynaklarını tüketmesini engeller.
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type public.message_type DEFAULT 'text',
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation public.conversations%ROWTYPE;
  v_message public.messages%ROWTYPE;
  v_is_support_admin BOOLEAN := FALSE;
  v_recent_messages_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Mesaj göndermek için oturum açmalısınız.';
  END IF;

  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE: Mesaj boş olamaz.';
  END IF;

  IF char_length(btrim(p_content)) > 2000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG: Mesaj 2000 karakteri aşamaz.';
  END IF;

  -- Rate Limit Kalkanı: Son 5 saniyede aynı kullanıcı en fazla 5 mesaj gönderebilir
  SELECT COUNT(*)
  INTO v_recent_messages_count
  FROM public.messages
  WHERE sender_id = v_user_id
    AND created_at > (clock_timestamp() - INTERVAL '5 seconds');

  IF v_recent_messages_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED: Çok hızlı mesaj gönderiyorsunuz. Lütfen birkaç saniye bekleyin.';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  v_is_support_admin := v_conversation.listing_id IS NULL AND public.has_admin_permission('community');

  IF v_user_id <> v_conversation.buyer_id AND v_user_id <> v_conversation.seller_id AND NOT v_is_support_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu görüşmeye mesaj gönderemezsiniz.';
  END IF;

  IF v_conversation.listing_id IS NULL AND v_conversation.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CONVERSATION_CLOSED: Bu destek görüşmesi sonlandırıldı.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users AS blocked
    WHERE (blocked.blocker_id = v_conversation.buyer_id AND blocked.blocked_id = v_conversation.seller_id)
       OR (blocked.blocker_id = v_conversation.seller_id AND blocked.blocked_id = v_conversation.buyer_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED_CONVERSATION: Bu görüşmede mesaj gönderilemez.';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type, metadata)
  VALUES (p_conversation_id, v_user_id, btrim(p_content), p_type, p_metadata)
  RETURNING * INTO v_message;

  RETURN to_jsonb(v_message);
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;


-- 3. YORUM FLOOD & SPAM KALKANI (create_project_comment)
-- Proje sayfalarına flood yorum basılmasını engeller (Kullanıcı başına 10 saniyede max 2 yorum).
CREATE OR REPLACE FUNCTION public.create_project_comment(
    p_listing_id UUID,
    p_body TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS public.project_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_listing public.listings%ROWTYPE;
    v_is_verified BOOLEAN := FALSE;
    v_muted_until TIMESTAMPTZ;
    v_recent_comments_count INTEGER;
    v_comment public.project_comments%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Yorum yapmak için giriş yapmalısınız.';
    END IF;

    -- Rate Limit Kalkanı: Son 10 saniyede aynı kullanıcı en fazla 2 yorum gönderebilir
    SELECT COUNT(*)
    INTO v_recent_comments_count
    FROM public.project_comments
    WHERE author_id = v_user_id
      AND created_at > (clock_timestamp() - INTERVAL '10 seconds');

    IF v_recent_comments_count >= 2 THEN
        RAISE EXCEPTION 'RATE_LIMITED: Çok sık yorum yapıyorsunuz. Lütfen 10 saniye bekleyin.';
    END IF;

    SELECT profile.comment_muted_until
    INTO v_muted_until
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id;

    IF v_muted_until > clock_timestamp() THEN
        RAISE EXCEPTION 'COMMENT_MUTED: Yorum yapma yetkiniz geçici olarak durduruldu.';
    END IF;

    IF char_length(btrim(COALESCE(p_body, ''))) NOT BETWEEN 2 AND 1200 THEN
        RAISE EXCEPTION 'INVALID_COMMENT: Yorum 2 ile 1200 karakter arasında olmalıdır.';
    END IF;

    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje yorumlara açık değil.';
    END IF;

    IF p_parent_id IS NULL THEN
        SELECT COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL
        INTO v_is_verified
        FROM auth.users AS auth_user
        LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
        WHERE auth_user.id = v_user_id;

        IF NOT COALESCE(v_is_verified, FALSE) THEN
            RAISE EXCEPTION 'VERIFICATION_REQUIRED: Yalnızca doğrulanmış kullanıcılar yorum yapabilir.';
        END IF;
    ELSE
        IF v_listing.seller_id <> v_user_id THEN
            RAISE EXCEPTION 'OWNER_REPLY_ONLY: Yorumları yalnızca proje sahibi yanıtlayabilir.';
        END IF;

        PERFORM 1
        FROM public.project_comments
        WHERE id = p_parent_id
          AND listing_id = p_listing_id
          AND parent_id IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PARENT_NOT_FOUND: Yanıtlanacak yorum bulunamadı.';
        END IF;
    END IF;

    INSERT INTO public.project_comments (listing_id, author_id, parent_id, body)
    VALUES (p_listing_id, v_user_id, p_parent_id, btrim(p_body))
    RETURNING * INTO v_comment;

    RETURN v_comment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_comment(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_comment(UUID, TEXT, UUID) TO authenticated;


-- 4. GÖRÜNTÜLENME SAYACI BOT & FLOOD KALKANI (record_listing_view)
-- Bir botun aynı projeye binlerce kez döngüyle görünüm basmasını engeller (60 saniye tekil izleyici kilidi).
CREATE OR REPLACE FUNCTION public.record_listing_view(
    p_listing_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_seller_id UUID;
    v_status public.listing_status;
    v_viewer_key TEXT;
    v_view_count INTEGER := 0;
    v_already_viewed BOOLEAN;
BEGIN
    SELECT listing.seller_id, listing.status, COALESCE(listing.view_count, 0)
    INTO v_seller_id, v_status, v_view_count
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id;

    IF NOT FOUND OR v_status <> 'active' THEN
        RETURN jsonb_build_object('success', FALSE, 'recorded', FALSE, 'view_count', 0);
    END IF;

    -- Yaratıcının kendi projesini görüntülemesi sayacı artırmaz
    IF v_actor_id IS NOT NULL AND v_actor_id = v_seller_id THEN
        RETURN jsonb_build_object('success', TRUE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    IF v_actor_id IS NOT NULL THEN
        v_viewer_key := 'user:' || v_actor_id::TEXT;
    ELSIF p_session_id IS NOT NULL THEN
        v_viewer_key := 'anon:' || p_session_id::TEXT;
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    -- Anti-Flood / Bot Kalkanı: Aynı viewer_key son 60 saniye içinde zaten sayıldıysa mükerrer sayma
    SELECT EXISTS (
        SELECT 1
        FROM public.listing_view_events
        WHERE listing_id = p_listing_id
          AND viewer_key = v_viewer_key
          AND created_at > (clock_timestamp() - INTERVAL '60 seconds')
    ) INTO v_already_viewed;

    IF v_already_viewed THEN
        RETURN jsonb_build_object('success', TRUE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    INSERT INTO public.listing_view_events (listing_id, viewer_key)
    VALUES (p_listing_id, v_viewer_key);

    UPDATE public.listings
    SET view_count = LEAST(COALESCE(view_count, 0) + 1, 2147483647)
    WHERE id = p_listing_id
    RETURNING view_count INTO v_view_count;

    RETURN jsonb_build_object(
        'success', TRUE,
        'recorded', TRUE,
        'view_count', v_view_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO anon, authenticated, service_role;
