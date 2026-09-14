-- Kıstas yönetim ekibi: sabit süper yönetici + en az yetkili ekip üyeleri.

CREATE TABLE IF NOT EXISTS private.admin_team_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT admin_team_permissions_allowed CHECK (
    permissions <@ ARRAY['community', 'launches', 'blog']::TEXT[]
    AND cardinality(permissions) > 0
  )
);

REVOKE ALL ON TABLE private.admin_team_members FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM private.admin_team_members AS member
      INNER JOIN auth.users AS auth_user ON auth_user.id = member.user_id
      WHERE member.user_id = auth.uid()
        AND auth_user.email_confirmed_at IS NOT NULL
        AND p_permission = ANY(member.permissions)
    );
$$;

REVOKE ALL ON FUNCTION public.has_admin_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_current_admin_access()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN public.is_platform_admin() THEN jsonb_build_object(
      'is_admin', TRUE,
      'is_owner', TRUE,
      'permissions', ARRAY['community', 'launches', 'blog']::TEXT[]
    )
    ELSE COALESCE((
      SELECT jsonb_build_object(
        'is_admin', TRUE,
        'is_owner', FALSE,
        'permissions', member.permissions
      )
      FROM private.admin_team_members AS member
      INNER JOIN auth.users AS auth_user ON auth_user.id = member.user_id
      WHERE member.user_id = auth.uid()
        AND auth_user.email_confirmed_at IS NOT NULL
    ), jsonb_build_object('is_admin', FALSE, 'is_owner', FALSE, 'permissions', ARRAY[]::TEXT[]))
  END;
$$;

REVOKE ALL ON FUNCTION public.get_current_admin_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_admin_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_team_member(
  p_user_id UUID,
  p_permissions TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_permissions TEXT[];
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Yalnızca süper yönetici ekip yetkilerini değiştirebilir.';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'PROTECTED_ADMIN: Ana yönetici hesabı değiştirilemez.';
  END IF;

  SELECT LOWER(auth_user.email)
  INTO v_email
  FROM auth.users AS auth_user
  WHERE auth_user.id = p_user_id
    AND auth_user.email_confirmed_at IS NOT NULL;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: Doğrulanmış kullanıcı bulunamadı.';
  END IF;
  IF EXISTS (SELECT 1 FROM private.platform_admins AS owner WHERE owner.email = v_email) THEN
    RAISE EXCEPTION 'PROTECTED_ADMIN: Ana yönetici hesabı değiştirilemez.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT permission ORDER BY permission), ARRAY[]::TEXT[])
  INTO v_permissions
  FROM unnest(COALESCE(p_permissions, ARRAY[]::TEXT[])) AS permission
  WHERE permission IN ('community', 'launches', 'blog');

  IF cardinality(v_permissions) <> cardinality(COALESCE(p_permissions, ARRAY[]::TEXT[])) THEN
    RAISE EXCEPTION 'INVALID_PERMISSION: Tanımsız yönetim yetkisi gönderildi.';
  END IF;

  IF cardinality(v_permissions) = 0 THEN
    DELETE FROM private.admin_team_members WHERE user_id = p_user_id;
  ELSE
    INSERT INTO private.admin_team_members (user_id, permissions, created_by)
    VALUES (p_user_id, v_permissions, auth.uid())
    ON CONFLICT (user_id) DO UPDATE
      SET permissions = EXCLUDED.permissions,
          updated_at = clock_timestamp();
  END IF;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN cardinality(v_permissions) = 0 THEN 'admin_team_access_removed' ELSE 'admin_team_access_updated' END,
    'profile',
    p_user_id,
    jsonb_build_object('permissions', v_permissions)
  );

  RETURN jsonb_build_object('success', TRUE, 'permissions', v_permissions);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_team_member(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_team_member(UUID, TEXT[]) TO authenticated;

DROP FUNCTION IF EXISTS public.get_admin_users();
CREATE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  user_role TEXT,
  boost_credits INTEGER,
  available_balance NUMERIC,
  is_verified BOOLEAN,
  projects_count BIGINT,
  comment_muted_until TIMESTAMPTZ,
  admin_permissions TEXT[],
  is_admin_owner BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_owner BOOLEAN := public.is_platform_admin();
BEGIN
  IF NOT v_is_owner AND NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Kullanıcı ve yorum yönetimi yetkisi gerekli.';
  END IF;

  RETURN QUERY
  SELECT
    auth_user.id,
    COALESCE(profile.full_name, split_part(auth_user.email, '@', 1))::TEXT,
    CASE WHEN v_is_owner THEN auth_user.email::TEXT ELSE NULL::TEXT END,
    CASE
      WHEN owner.email IS NOT NULL THEN 'admin'
      WHEN member.user_id IS NOT NULL THEN 'staff'
      ELSE 'user'
    END::TEXT,
    CASE WHEN v_is_owner THEN COALESCE(profile.boost_credits, 0) ELSE 0 END,
    CASE WHEN v_is_owner THEN COALESCE(profile.available_balance, 0) ELSE 0 END,
    COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL,
    CASE WHEN v_is_owner THEN COUNT(listing.id) ELSE 0 END,
    profile.comment_muted_until,
    COALESCE(member.permissions, ARRAY[]::TEXT[]),
    owner.email IS NOT NULL,
    COALESCE(profile.created_at, auth_user.created_at)
  FROM auth.users AS auth_user
  LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
  LEFT JOIN private.platform_admins AS owner ON owner.email = LOWER(auth_user.email)
  LEFT JOIN private.admin_team_members AS member ON member.user_id = auth_user.id
  LEFT JOIN public.listings AS listing ON listing.seller_id = auth_user.id AND v_is_owner
  GROUP BY auth_user.id, auth_user.email, auth_user.email_confirmed_at, auth_user.created_at,
    profile.full_name, profile.boost_credits, profile.available_balance, profile.is_verified,
    profile.comment_muted_until, profile.created_at, owner.email, member.user_id, member.permissions
  ORDER BY COALESCE(profile.created_at, auth_user.created_at) DESC, auth_user.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_comment_mute(p_user_id UUID, p_muted BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_muted_until TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Yorum yönetimi yetkisi gerekli.';
  END IF;
  IF p_user_id IS NULL OR p_muted IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Kullanıcı ve işlem bilgisi gerekli.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users AS auth_user
    LEFT JOIN private.platform_admins AS owner ON owner.email = LOWER(auth_user.email)
    LEFT JOIN private.admin_team_members AS member ON member.user_id = auth_user.id
    WHERE auth_user.id = p_user_id AND (owner.email IS NOT NULL OR member.user_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'ADMIN_PROTECTED: Yönetim ekibinin yorum yetkisi kapatılamaz.';
  END IF;

  v_muted_until := CASE WHEN p_muted THEN clock_timestamp() + INTERVAL '3 days' ELSE NULL END;
  UPDATE public.profiles
  SET comment_muted_until = v_muted_until, updated_at = clock_timestamp()
  WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND: Kullanıcı profili bulunamadı.'; END IF;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), CASE WHEN p_muted THEN 'user_comment_muted' ELSE 'user_comment_unmuted' END,
    'profile', p_user_id, jsonb_build_object('muted_until', v_muted_until, 'duration_hours', CASE WHEN p_muted THEN 72 ELSE 0 END));
  RETURN jsonb_build_object('success', TRUE, 'muted_until', v_muted_until);
END;
$$;

CREATE POLICY "Launch team views listings"
ON public.listings FOR SELECT TO authenticated
USING (public.has_admin_permission('launches'));

DROP POLICY IF EXISTS "Platform admins manage blog posts" ON public.blog_posts;
CREATE POLICY "Authorized team manages blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (public.has_admin_permission('blog'))
WITH CHECK (public.has_admin_permission('blog'));

DROP POLICY IF EXISTS "Platform admins view support conversations" ON public.conversations;
CREATE POLICY "Authorized team views support conversations"
ON public.conversations FOR SELECT TO authenticated
USING (listing_id IS NULL AND public.has_admin_permission('community'));

DROP POLICY IF EXISTS "Platform admins view support messages" ON public.messages;
CREATE POLICY "Authorized team views support messages"
ON public.messages FOR SELECT TO authenticated
USING (
  public.has_admin_permission('community')
  AND EXISTS (
    SELECT 1 FROM public.conversations AS conversation
    WHERE conversation.id = messages.conversation_id AND conversation.listing_id IS NULL
  )
);

DROP POLICY IF EXISTS "Platform admins reply to support messages" ON public.messages;
CREATE POLICY "Authorized team replies to support messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.has_admin_permission('community')
  AND EXISTS (
    SELECT 1 FROM public.conversations AS conversation
    WHERE conversation.id = messages.conversation_id
      AND conversation.listing_id IS NULL AND conversation.closed_at IS NULL
  )
);

CREATE OR REPLACE FUNCTION public.admin_request_listing_revision(p_listing_id UUID, p_feedback TEXT)
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
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('launches') THEN
    RAISE EXCEPTION 'FORBIDDEN: Lansman inceleme yetkisi gerekli.';
  END IF;
  IF char_length(v_feedback) < 10 OR char_length(v_feedback) > 1200 THEN
    RAISE EXCEPTION 'INVALID_FEEDBACK: Düzeltme açıklaması 10-1200 karakter arasında olmalıdır.';
  END IF;
  SELECT l.seller_id, l.title, l.status INTO v_seller_id, v_title, v_status
  FROM public.listings AS l WHERE l.id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.'; END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Yalnızca inceleme bekleyen projeler düzeltmeye gönderilebilir.';
  END IF;
  UPDATE public.listings SET status = 'inactive', review_feedback = v_feedback,
    review_requested_at = clock_timestamp(), reviewed_by = auth.uid(), boosted_until = NULL,
    category_boosted_until = NULL, updated_at = clock_timestamp() WHERE id = p_listing_id;
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  VALUES (v_seller_id, auth.uid(), 'revision_requested', format('“%s” için düzenleme istendi', v_title),
    v_feedback, jsonb_build_object('listing_id', p_listing_id, 'title', v_title, 'feedback', v_feedback, 'action', 'edit_listing'));
  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'listing_revision_requested', 'listing', p_listing_id,
    jsonb_build_object('previous_status', v_status, 'new_status', 'inactive', 'seller_id', v_seller_id, 'feedback', v_feedback));
  RETURN jsonb_build_object('success', TRUE, 'status', 'inactive');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_listing_status(p_listing_id UUID, p_status public.listing_status)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_seller_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('launches') THEN
    RAISE EXCEPTION 'FORBIDDEN: Lansman inceleme yetkisi gerekli.';
  END IF;
  UPDATE public.listings SET status = p_status,
    boosted_until = CASE WHEN p_status = 'active' THEN boosted_until ELSE NULL END,
    category_boosted_until = CASE WHEN p_status = 'active' THEN category_boosted_until ELSE NULL END,
    review_feedback = CASE WHEN p_status = 'active' THEN NULL ELSE review_feedback END,
    review_requested_at = CASE WHEN p_status = 'active' THEN NULL ELSE review_requested_at END,
    reviewed_by = CASE WHEN p_status = 'active' THEN auth.uid() ELSE reviewed_by END,
    updated_at = clock_timestamp()
  WHERE id = p_listing_id RETURNING seller_id INTO v_seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.'; END IF;
  IF p_status = 'active' AND v_seller_id IS NOT NULL THEN
    UPDATE public.profiles SET is_verified = TRUE, updated_at = clock_timestamp() WHERE id = v_seller_id;
  END IF;
  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'listing_status_updated', 'listing', p_listing_id,
    jsonb_build_object('status', p_status, 'seller_id', v_seller_id));
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID, p_content TEXT, p_type public.message_type DEFAULT 'text', p_metadata JSONB DEFAULT NULL
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED: Mesaj göndermek için oturum açmalısınız.'; END IF;
  IF p_content IS NULL OR btrim(p_content) = '' THEN RAISE EXCEPTION 'EMPTY_MESSAGE: Mesaj boş olamaz.'; END IF;
  IF char_length(btrim(p_content)) > 2000 THEN RAISE EXCEPTION 'MESSAGE_TOO_LONG: Mesaj 2000 karakteri aşamaz.'; END IF;
  SELECT conversation.* INTO v_conversation FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id FOR UPDATE;
  IF v_conversation.id IS NULL THEN RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.'; END IF;
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
  ) THEN RAISE EXCEPTION 'BLOCKED_CONVERSATION: Bu görüşmede mesaj gönderilemez.'; END IF;
  INSERT INTO public.messages (conversation_id, sender_id, content, type, metadata)
  VALUES (p_conversation_id, v_user_id, btrim(p_content), p_type, p_metadata) RETURNING * INTO v_message;
  RETURN to_jsonb(v_message);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_buyer_id UUID;
  v_seller_id UUID;
  v_listing_id UUID;
  v_is_support_admin BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.'; END IF;
  SELECT conversation.buyer_id, conversation.seller_id, conversation.listing_id
  INTO v_buyer_id, v_seller_id, v_listing_id FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id;
  v_is_support_admin := v_listing_id IS NULL AND public.has_admin_permission('community');
  IF v_user_id <> v_buyer_id AND v_user_id <> v_seller_id AND NOT v_is_support_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: Bu konuşmaya erişemezsiniz.';
  END IF;
  UPDATE public.conversations SET
    buyer_unread_count = CASE WHEN v_user_id = v_buyer_id THEN 0 ELSE buyer_unread_count END,
    seller_unread_count = CASE WHEN v_user_id = v_seller_id OR v_is_support_admin THEN 0 ELSE seller_unread_count END
  WHERE id = p_conversation_id;
  UPDATE public.messages SET is_read = TRUE
  WHERE conversation_id = p_conversation_id AND sender_id <> v_user_id AND is_read = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_support_conversation(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Destek yönetimi yetkisi gerekli.';
  END IF;
  SELECT conversation.* INTO v_conversation FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id FOR UPDATE;
  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.';
  END IF;
  IF v_conversation.closed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'already_closed', TRUE, 'closed_at', v_conversation.closed_at);
  END IF;
  INSERT INTO public.messages (conversation_id, sender_id, content, type)
  VALUES (p_conversation_id, auth.uid(), 'Görüşme Kıstas Destek tarafından sonlandırıldı.', 'system');
  UPDATE public.conversations SET closed_at = clock_timestamp(), closed_by = auth.uid(),
    last_message = 'Görüşme sonlandırıldı.', last_message_at = clock_timestamp()
  WHERE id = p_conversation_id RETURNING closed_at INTO v_conversation.closed_at;
  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'support_conversation_closed', 'conversation', p_conversation_id,
    jsonb_build_object('buyer_id', v_conversation.buyer_id, 'seller_id', v_conversation.seller_id));
  RETURN jsonb_build_object('success', TRUE, 'closed_at', v_conversation.closed_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_support_messages(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Destek yönetimi yetkisi gerekli.';
  END IF;
  SELECT conversation.* INTO v_conversation FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id FOR UPDATE;
  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.';
  END IF;
  IF v_conversation.closed_at IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_OPEN: Mesaj geçmişi yalnızca sonlandırılmış görüşmelerde silinebilir.';
  END IF;
  DELETE FROM public.messages WHERE conversation_id = p_conversation_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  UPDATE public.conversations SET last_message = 'Mesaj geçmişi temizlendi.',
    buyer_unread_count = 0, seller_unread_count = 0 WHERE id = p_conversation_id;
  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'support_messages_cleared', 'conversation', p_conversation_id,
    jsonb_build_object('deleted_count', v_deleted_count, 'buyer_id', v_conversation.buyer_id));
  RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_deleted_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_comment_mute(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_request_listing_revision(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_close_support_conversation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clear_support_messages(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_comment_mute(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_request_listing_revision(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_support_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_support_messages(UUID) TO authenticated;

COMMENT ON TABLE private.admin_team_members IS
'Süper yönetici dışındaki ekip üyelerinin en az yetki kapsamlarını sunucu tarafında saklar.';
