-- KISTAS: Bildirim saklama kuralını istemciden bağımsız, saatlik göreve bağla.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

REVOKE ALL ON FUNCTION public.cleanup_expired_notifications() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
    v_existing_job_id BIGINT;
BEGIN
    SELECT jobid
    INTO v_existing_job_id
    FROM cron.job
    WHERE jobname = 'kistas-notifications-retention-cleanup'
    LIMIT 1;

    IF v_existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_existing_job_id);
    END IF;

    PERFORM cron.schedule(
        'kistas-notifications-retention-cleanup',
        '17 * * * *',
        'SELECT public.cleanup_expired_notifications();'
    );
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_notifications() IS
'3 günden (72 saat) eski bildirimleri pg_cron ile saatlik olarak otomatik temizler.';
