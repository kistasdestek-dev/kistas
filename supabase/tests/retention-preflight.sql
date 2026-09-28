-- Read-only: run after M2 schema exists, before applying retention migrations 000003/000004.
BEGIN TRANSACTION READ ONLY;
DO $$
BEGIN
  IF to_regclass('public.launch_drafts') IS NULL OR to_regclass('public.notifications') IS NULL
    OR to_regclass('public.conversations') IS NULL OR to_regclass('public.messages') IS NULL
  THEN RAISE EXCEPTION 'RETENTION_PREFLIGHT: required tables missing; apply/verify M2 first'; END IF;
  IF to_regprocedure('public.guard_launch_archive_retention()') IS NOT NULL
    OR to_regprocedure('public.cleanup_idle_conversations()') IS NOT NULL
  THEN RAISE EXCEPTION 'RETENTION_PREFLIGHT: retention already installed; inspect migration history'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    JOIN pg_catalog.pg_attribute AS column_row ON column_row.attrelid = constraint_row.conrelid
      AND column_row.attnum = constraint_row.conkey[1]
    WHERE constraint_row.contype='f' AND constraint_row.conrelid='public.messages'::regclass
      AND constraint_row.confrelid='public.conversations'::regclass
      AND column_row.attname='conversation_id' AND constraint_row.confdeltype='c'
  ) THEN RAISE EXCEPTION 'RETENTION_PREFLIGHT: messages cascade FK missing'; END IF;
END;
$$;
SELECT current_setting('server_version') AS server_version;
SELECT extname, extversion FROM pg_extension WHERE extname='pg_cron';
SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name='pg_cron';
-- Save ACTUAL definitions/grants for rollback. No message/notification/draft text is selected.
SELECT pg_get_functiondef(oid) AS definition FROM pg_proc
WHERE oid=to_regprocedure('public.cleanup_expired_notifications()');
SELECT proname,proacl FROM pg_proc WHERE oid IN (
  to_regprocedure('public.cleanup_expired_notifications()'),
  to_regprocedure('public.save_launch_draft(uuid,integer,jsonb,uuid,integer)'));
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('launch_drafts','messages','conversations','notifications');
SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal
AND tgrelid IN ('public.launch_drafts'::regclass,'public.messages'::regclass,'public.conversations'::regclass);
SELECT conrelid::regclass AS source_table,confrelid::regclass AS referenced_table,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype='f' AND confrelid IN ('public.messages'::regclass,'public.conversations'::regclass);
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'
AND tablename IN ('launch_drafts','notifications','messages','conversations');
SELECT count(*) AS archive_candidates FROM public.launch_drafts WHERE updated_at<=statement_timestamp()-interval '72 hours';
SELECT count(*) AS notification_candidates FROM public.notifications WHERE created_at<=statement_timestamp()-interval '72 hours';
SELECT count(*) AS idle_conversation_candidates FROM public.conversations AS conversation
WHERE conversation.created_at<=statement_timestamp()-interval '30 days' AND NOT EXISTS (
  SELECT 1 FROM public.messages AS message WHERE message.conversation_id=conversation.id
  AND message.type IS DISTINCT FROM 'system' AND message.created_at>statement_timestamp()-interval '30 days');
COMMIT;
