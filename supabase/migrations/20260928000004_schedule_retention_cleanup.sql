-- One owner-only scheduled job per retention rule. Does not run cleanup during migration.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
DO $$
DECLARE v_job BIGINT;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname IN (
    'kistas-notifications-retention-cleanup', 'kistas-launch-archive-retention-cleanup', 'kistas-idle-conversations-cleanup')
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;
  PERFORM cron.schedule('kistas-notifications-retention-cleanup', '17 * * * *',
    'SELECT public.cleanup_expired_notifications();');
  PERFORM cron.schedule('kistas-launch-archive-retention-cleanup', '27 * * * *',
    'SELECT public.cleanup_expired_launch_archives();');
  PERFORM cron.schedule('kistas-idle-conversations-cleanup', '37 * * * *',
    'SELECT public.cleanup_idle_conversations();');
END;
$$;
COMMIT;
