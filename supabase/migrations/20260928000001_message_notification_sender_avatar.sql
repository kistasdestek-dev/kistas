-- Mesaj bildirimi, ek istemci sorgusu gerektirmeden gonderenin guvenli profil avatarini tasir.
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
  v_sender_avatar_url TEXT;
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

  SELECT
    NULLIF(btrim(profile.full_name), ''),
    NULLIF(btrim(profile.avatar_url), '')
  INTO v_sender_name, v_sender_avatar_url
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
      'sender_name', v_sender_name,
      'sender_avatar_url', v_sender_avatar_url
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notify_chat_message() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trg_notify_chat_message() IS
'Yeni kullanıcı mesajı için tercih kontrollü, alıcıya özel ve gönderen avatarı içeren uygulama içi bildirim üretir.';
