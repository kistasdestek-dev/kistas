-- Yönetim merkezi: kapsamlı kredi yetkisi, gerçek etkileşim metriği ve güvenli blog yazımı.

DROP FUNCTION IF EXISTS public.admin_grant_credits(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.admin_grant_credits(UUID, INTEGER, TEXT, UUID);

CREATE FUNCTION public.admin_grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_request_id TEXT := p_request_id::TEXT;
  v_new_credits INTEGER;
  v_existing_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Topluluk yönetimi yetkisi gerekli.';
  END IF;
  IF p_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Kullanıcı ve işlem kimliği gerekli.';
  END IF;
  IF p_amount < 1 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Kredi miktarı 1 ile 10000 arasında olmalıdır.';
  END IF;
  IF char_length(v_reason) < 5 OR char_length(v_reason) > 240 THEN
    RAISE EXCEPTION 'INVALID_REASON: Yönetici notu 5 ile 240 karakter arasında olmalıdır.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_request_id, 0));
  SELECT tx.balance_after
  INTO v_existing_balance
  FROM public.credit_transactions AS tx
  WHERE tx.request_id = v_request_id
    AND tx.user_id = p_user_id
  ORDER BY tx.created_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE, 'new_credits', v_existing_balance);
  END IF;

  UPDATE public.profiles
  SET boost_credits = boost_credits + p_amount,
      updated_at = clock_timestamp()
  WHERE id = p_user_id
  RETURNING boost_credits INTO v_new_credits;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: Kullanıcı profili bulunamadı.';
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description, metadata, request_id, direction
  ) VALUES (
    p_user_id, p_amount, v_new_credits, 'reward',
    'Yönetici tarafından tanımlanan görünürlük kredisi',
    jsonb_build_object('reason', v_reason, 'actor_id', auth.uid(), 'source', 'admin_community'),
    v_request_id, 'credit'
  );

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  VALUES (
    p_user_id, auth.uid(), 'credits_granted', 'Hesabınıza kredi tanımlandı',
    format('%s Kıstas kredisi hesabınıza eklendi.', p_amount),
    jsonb_build_object('amount', p_amount, 'balance_after', v_new_credits)
  );

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(), 'credits_granted', 'profile', p_user_id,
    jsonb_build_object('amount', p_amount, 'balance_after', v_new_credits, 'reason', v_reason, 'request_id', v_request_id)
  );

  RETURN jsonb_build_object('success', TRUE, 'duplicate', FALSE, 'new_credits', v_new_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_credits(UUID, INTEGER, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(UUID, INTEGER, TEXT, UUID) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.admin_create_blog_post(
  p_title TEXT,
  p_slug TEXT,
  p_category TEXT,
  p_excerpt TEXT,
  p_content TEXT,
  p_cover_image_url TEXT,
  p_tags TEXT[],
  p_meta_title TEXT,
  p_meta_description TEXT,
  p_is_published BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_slug TEXT := lower(btrim(COALESCE(p_slug, '')));
  v_word_count INTEGER;
  v_reading_time INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('blog') THEN
    RAISE EXCEPTION 'FORBIDDEN: Blog yönetimi yetkisi gerekli.';
  END IF;
  IF char_length(btrim(COALESCE(p_title, ''))) NOT BETWEEN 10 AND 120 THEN
    RAISE EXCEPTION 'INVALID_TITLE: Başlık 10 ile 120 karakter arasında olmalıdır.';
  END IF;
  IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR char_length(v_slug) > 120 THEN
    RAISE EXCEPTION 'INVALID_SLUG: URL slug biçimi geçersiz.';
  END IF;
  IF char_length(btrim(COALESCE(p_excerpt, ''))) NOT BETWEEN 50 AND 320 THEN
    RAISE EXCEPTION 'INVALID_EXCERPT: Özet 50 ile 320 karakter arasında olmalıdır.';
  END IF;
  IF char_length(btrim(COALESCE(p_content, ''))) < 200 OR char_length(p_content) > 60000 THEN
    RAISE EXCEPTION 'INVALID_CONTENT: İçerik 200 ile 60000 karakter arasında olmalıdır.';
  END IF;
  IF COALESCE(p_cover_image_url, '') !~ '^https://[^[:space:]]{1,1900}$' THEN
    RAISE EXCEPTION 'INVALID_IMAGE_URL: Kapak görseli güvenli HTTPS adresi olmalıdır.';
  END IF;
  IF char_length(btrim(COALESCE(p_meta_title, ''))) NOT BETWEEN 20 AND 70
     OR char_length(btrim(COALESCE(p_meta_description, ''))) NOT BETWEEN 50 AND 180 THEN
    RAISE EXCEPTION 'INVALID_SEO: SEO başlığı veya açıklaması geçersiz.';
  END IF;
  IF btrim(COALESCE(p_category, '')) NOT IN ('Girişimcilik', 'Teknoloji', 'Rehberler', 'Yapay Zeka', 'Kıstas Güncellemeleri') THEN
    RAISE EXCEPTION 'INVALID_CATEGORY: Blog kategorisi izinli listede değil.';
  END IF;
  IF cardinality(COALESCE(p_tags, ARRAY[]::TEXT[])) > 8 OR EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_tags, ARRAY[]::TEXT[])) AS tag
    WHERE char_length(btrim(tag)) NOT BETWEEN 2 AND 30
  ) THEN
    RAISE EXCEPTION 'INVALID_TAGS: En fazla 8 adet, 2-30 karakterlik etiket kullanılabilir.';
  END IF;

  v_word_count := cardinality(regexp_split_to_array(btrim(p_content), E'\\s+'));
  v_reading_time := greatest(1, ceil(v_word_count / 200.0)::INTEGER);

  INSERT INTO public.blog_posts (
    title, slug, category, excerpt, content, cover_image_url, tags,
    reading_time_minutes, is_published, author_name, author_title,
    meta_title, meta_description, canonical_url, published_at
  ) VALUES (
    btrim(p_title), v_slug, btrim(p_category), btrim(p_excerpt), btrim(p_content),
    btrim(p_cover_image_url), COALESCE(p_tags, ARRAY[]::TEXT[]), v_reading_time,
    p_is_published, 'Kıstas Editoryal', 'Teknoloji & İnovasyon Ekibi',
    btrim(p_meta_title), btrim(p_meta_description), 'https://kistas.com.tr/blog/' || v_slug,
    clock_timestamp()
  ) RETURNING id INTO v_id;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'blog_post_created', 'blog_post', v_id, jsonb_build_object('slug', v_slug, 'published', p_is_published));

  RETURN jsonb_build_object('success', TRUE, 'id', v_id, 'slug', v_slug, 'reading_time_minutes', v_reading_time);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLUG_EXISTS: Bu URL slug daha önce kullanılmış.';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_blog_post(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_blog_post(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.admin_grant_credits(UUID, INTEGER, TEXT, UUID) IS
'Topluluk yetkilisinin idempotent, nedenli ve denetim izli kredi tanımlama işlemi.';
