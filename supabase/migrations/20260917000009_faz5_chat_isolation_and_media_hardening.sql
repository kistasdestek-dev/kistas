-- ==============================================================================
-- KISTAS SAVUNMA HATTI: FAZ 5 - SOHBET İZOLASYONU, MEDYA & DEPOLAMA KALKANI (SEC-023)
-- ==============================================================================
-- Açıklama:
-- 1. Pars DevState gibi ofansif araçların `send_chat_message` RPC'sini, hız limitini
--    (5s/5msg) ve moderasyon kelime filtrelerini baypas ederek doğrudan REST API
--    üzerinden `public.messages` tablosuna sahte/zararlı mesaj basmasını engellemek için
--    doğrudan `INSERT` yetkisi kaldırılır. Tüm mesaj trafiği yalnızca denetlenen
--    ve güvenli `send_chat_message` fonksiyonu üzerinden akabilir.
-- 2. `public.conversations` tablosundaki doğrudan `UPDATE` ve `DELETE` yetkileri
--    kaldırılarak görüşme sahiplik ve durum manipülasyonları engellenir.
-- 3. Depolama kovanında (`kistas`) Stored XSS ve zararlı SVG yüklemelerine karşı
--    MIME tipleri yalnızca güvenli web görselleriyle (`image/jpeg`, `image/png`, `image/webp`)
--    sınırlandırılır.
-- ==============================================================================

-- 1. SOHBET TABLOSUNDA DOĞRUDAN INSERT/UPDATE/DELETE YETKİLERİNİN İPTALİ
DROP POLICY IF EXISTS "Messages insertable by participants" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Platform admins reply to support messages" ON public.messages;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.messages FROM public, anon, authenticated;

-- Okuma yetkisi korunur (Görüşme katılımcıları ve destek yöneticileri kendi mesajlarını okur)
GRANT SELECT ON TABLE public.messages TO authenticated;

-- 2. GÖRÜŞME (CONVERSATIONS) TABLOSUNDA DOĞRUDAN UPDATE/DELETE YETKİLERİNİN İPTALİ
REVOKE UPDATE, DELETE ON TABLE public.conversations FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.conversations TO authenticated;

-- 3. STORAGE KOVANI MIME VE DOSYA TAVANI MÜHÜRLEMESİ (XSS & SVG ENJEKSİYON KALKANI)
UPDATE storage.buckets
SET 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
    file_size_limit = 10485760 -- 10 MB tavan sınırı
WHERE id = 'kistas';

-- 4. STORAGE OBJELERİ İÇİN KESİN UZANTI DOĞRULAMA KURALI
DROP POLICY IF EXISTS "Authenticated users upload project images" ON storage.objects;

CREATE POLICY "Authenticated users upload project images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'kistas'
    AND auth.uid() IS NOT NULL
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);
