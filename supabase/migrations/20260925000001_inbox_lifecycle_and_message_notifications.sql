-- Kullanıcı bazlı Inbox görünürlüğü, yönetici destek yaşam döngüsü ve güvenli mesaj bildirimleri.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_hidden_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  message_in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_preferences FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.notification_preferences TO authenticated, service_role;

-- Eski şemadaki WITH CHECK (TRUE) bildirim ekleme politikasını kapat; bildirimleri yalnız
-- güvenilir SECURITY DEFINER tetikleyicileri/RPC'ler veya service_role üretebilir.
DROP POLICY IF EXISTS "Users or triggers can insert notifications" ON public.notifications;
REVOKE INSERT ON TABLE public.notifications FROM authenticated;

DROP POLICY IF EXISTS "notification_preferences_select_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select_own"
ON public.notification_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_message_notification_preference(p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Bildirim tercihi için oturum açmalısınız.';
  END IF;

  INSERT INTO public.notification_preferences (user_id, message_in_app_enabled)
  VALUES (v_user_id, COALESCE(p_enabled, TRUE))
  ON CONFLICT (user_id) DO UPDATE
  SET message_in_app_enabled = EXCLUDED.message_in_app_enabled,
      updated_at = clock_timestamp();

  RETURN jsonb_build_object('success', TRUE, 'message_in_app_enabled', COALESCE(p_enabled, TRUE));
END;
$$;

CREATE OR REPLACE FUNCTION public.hide_conversation_for_current_user(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Görüşme işlemi için oturum açmalısınız.';
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  IF v_user_id = v_conversation.buyer_id THEN
    UPDATE public.conversations
    SET buyer_hidden_at = clock_timestamp(), buyer_unread_count = 0
    WHERE id = p_conversation_id;
  ELSIF v_user_id = v_conversation.seller_id THEN
    UPDATE public.conversations
    SET seller_hidden_at = clock_timestamp(), seller_unread_count = 0
    WHERE id = p_conversation_id;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN: Yalnızca görüşme katılımcıları kendi Inbox kayıtlarını kaldırabilir.';
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'conversation_id', p_conversation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_conversation_for_current_user(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Görüşme işlemi için oturum açmalısınız.';
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_NOT_FOUND: Görüşme bulunamadı.';
  END IF;

  IF v_user_id = v_conversation.buyer_id THEN
    UPDATE public.conversations SET buyer_hidden_at = NULL WHERE id = p_conversation_id;
  ELSIF v_user_id = v_conversation.seller_id THEN
    UPDATE public.conversations SET seller_hidden_at = NULL WHERE id = p_conversation_id;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN: Yalnızca görüşme katılımcıları kendi Inbox kayıtlarını geri açabilir.';
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'conversation_id', p_conversation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_notifications_enabled BOOLEAN := TRUE;
  v_preview TEXT;
BEGIN
  IF NEW.type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = NEW.conversation_id;

  IF v_conversation.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_recipient_id := CASE
    WHEN NEW.sender_id = v_conversation.buyer_id THEN v_conversation.seller_id
    WHEN NEW.sender_id = v_conversation.seller_id THEN v_conversation.buyer_id
    WHEN v_conversation.listing_id IS NULL THEN v_conversation.buyer_id
    ELSE NULL
  END;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT preference.message_in_app_enabled
  INTO v_notifications_enabled
  FROM public.notification_preferences AS preference
  WHERE preference.user_id = v_recipient_id;

  IF COALESCE(v_notifications_enabled, TRUE) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(btrim(profile.full_name), '')
  INTO v_sender_name
  FROM public.profiles AS profile
  WHERE profile.id = NEW.sender_id;

  v_sender_name := COALESCE(v_sender_name, 'Kıstas kullanıcısı');
  v_preview := left(regexp_replace(btrim(NEW.content), '[\r\n\t]+', ' ', 'g'), 140);

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    NEW.sender_id,
    'message',
    v_sender_name,
    v_preview,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_message ON public.messages;
CREATE TRIGGER trg_notify_chat_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_chat_message();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.set_message_notification_preference(BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hide_conversation_for_current_user(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_conversation_for_current_user(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_notify_chat_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_message_notification_preference(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_conversation_for_current_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_conversation_for_current_user(UUID) TO authenticated;

COMMENT ON FUNCTION public.hide_conversation_for_current_user(UUID) IS
'Bir görüşmeyi yalnız çağıran katılımcının Inbox görünümünden kaldırır; karşı tarafın verisini silmez.';
COMMENT ON FUNCTION public.trg_notify_chat_message() IS
'Yeni kullanıcı mesajı için tercih kontrollü ve alıcıya özel uygulama içi bildirim üretir.';
