-- Retention: archive last edit + 72h, notification creation + 72h, last real message + 30 days.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    JOIN pg_catalog.pg_attribute AS column_row ON column_row.attrelid = constraint_row.conrelid
      AND column_row.attnum = constraint_row.conkey[1]
    WHERE constraint_row.contype = 'f' AND constraint_row.conrelid = 'public.messages'::regclass
      AND constraint_row.confrelid = 'public.conversations'::regclass
      AND column_row.attname = 'conversation_id' AND constraint_row.confdeltype = 'c'
  ) THEN RAISE EXCEPTION 'RETENTION_PREFLIGHT: messages must cascade on conversation deletion'; END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS launch_drafts_retention ON public.launch_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at ASC);
CREATE INDEX IF NOT EXISTS conversations_retention ON public.conversations(created_at, id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);

ALTER POLICY launch_drafts_owner_read ON public.launch_drafts
  USING (owner_id = auth.uid() AND updated_at > statement_timestamp() - INTERVAL '72 hours');

CREATE FUNCTION public.guard_launch_archive_retention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.updated_at <= clock_timestamp() - INTERVAL '72 hours' THEN
    RAISE EXCEPTION 'DRAFT_EXPIRED';
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_launch_archive_retention() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_launch_archive_retention BEFORE UPDATE ON public.launch_drafts
FOR EACH ROW EXECUTE FUNCTION public.guard_launch_archive_retention();

-- Lock the parent BEFORE the message FK/AFTER INSERT triggers, in the same order as cleanup.
-- Whichever transaction wins the parent lock determines whether the new message is accepted.
CREATE FUNCTION public.lock_conversation_for_message_retention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.conversations WHERE id = NEW.conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONVERSATION_NOT_FOUND'; END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_conversation_for_message_retention() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lock_conversation_for_message_retention BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.lock_conversation_for_message_retention();

CREATE FUNCTION public.cleanup_expired_launch_archives()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_deleted INTEGER;
BEGIN
  -- Does not delete the source/submitted listing or shared Storage objects.
  DELETE FROM public.launch_drafts WHERE updated_at <= clock_timestamp() - INTERVAL '72 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_deleted);
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_expired_launch_archives() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.notifications WHERE created_at <= clock_timestamp() - INTERVAL '72 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_deleted);
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_expired_notifications() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.cleanup_idle_conversations()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id UUID; v_count INTEGER; v_deleted INTEGER := 0;
  v_cutoff TIMESTAMPTZ := clock_timestamp() - INTERVAL '30 days';
BEGIN
  FOR v_id IN
    SELECT conversation.id FROM public.conversations AS conversation
    WHERE conversation.created_at <= v_cutoff
      AND NOT EXISTS (
        SELECT 1 FROM public.messages AS message WHERE message.conversation_id = conversation.id
          AND message.type IS DISTINCT FROM 'system' AND message.created_at > v_cutoff)
    ORDER BY conversation.created_at, conversation.id FOR UPDATE OF conversation SKIP LOCKED
  LOOP
    -- Recheck with a fresh statement snapshot AFTER acquiring the parent lock.
    DELETE FROM public.conversations AS conversation WHERE conversation.id = v_id
      AND conversation.created_at <= v_cutoff
      AND NOT EXISTS (
        SELECT 1 FROM public.messages AS message WHERE message.conversation_id = conversation.id
          AND message.type IS DISTINCT FROM 'system' AND message.created_at > v_cutoff);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted + v_count;
  END LOOP;
  RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_deleted);
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_idle_conversations() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.cleanup_idle_conversations() IS
'Deletes conversations and cascading messages after 30 days without a real message; reads/system messages do not renew the deadline.';
COMMIT;
