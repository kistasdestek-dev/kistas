-- ============================================================================
-- KISTAS: Bildirimler 3 Günlük Saklama (Retention) ve Kullanıcı Toplu Silme
-- ============================================================================

-- 1. Kullanıcıların kendi bildirimlerini silebilmesi için RLS DELETE politikası
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.notifications'::regclass 
      AND polname = 'Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications" 
      ON public.notifications 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- 2. Hızlı tarih aramaları ve periyodik silme için B-Tree indeksi
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON public.notifications (created_at ASC);

-- 3. Kullanıcının tüm bildirimlerini tek hamlede silen atomik RPC
CREATE OR REPLACE FUNCTION public.delete_all_user_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deleted_count INT := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'AUTH_REQUIRED',
            'error', 'Yetkisiz erişim: Bildirimleri silmek için oturum açmalısınız.'
        );
    END IF;

    DELETE FROM public.notifications
    WHERE user_id = v_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_all_user_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_all_user_notifications() TO authenticated;

-- 4. 3 günden eski bildirimleri sistem genelinde temizleyen otonom fonksiyon
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_deleted_count INT := 0;
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < clock_timestamp() - INTERVAL '3 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_notifications() TO authenticated;

COMMENT ON FUNCTION public.delete_all_user_notifications() IS 
'Oturum açmış kullanıcının tüm bildirimlerini güvenli bir şekilde siler.';

COMMENT ON FUNCTION public.cleanup_expired_notifications() IS 
'3 günden (72 saat) eski olan tüm bildirimleri veritabanından süpürerek depolamayı optimize eder.';
