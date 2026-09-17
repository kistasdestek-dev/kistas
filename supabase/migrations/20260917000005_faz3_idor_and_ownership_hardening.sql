-- ============================================================================
-- FAZ 3: IDOR, SAHİPLİK DENETİMİ & YETKİ AŞIMI (PRIVILEGE ESCALATION) KALKANI
-- SEC-019: Moderasyon Atlama Engeli, Bildirim Enjeksiyonu Kalkanı & Sahiplik İzolasyonu
-- ============================================================================

-- 1. İLAN / PROJE DURUM & MODERASYON KORUMA TETİKLEYİCİSİ
-- Kullanıcıların admin onayını atlayıp projelerini doğrudan 'active' yapmasını,
-- sayaçları (view_count, upvotes_count) veya sponsorluk sürelerini manipüle etmesini engeller.

CREATE OR REPLACE FUNCTION public.handle_listing_status_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Eğer işlemi yapan platform admini ise veya service_role ise tüm alanları yönetebilir
    IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
        RETURN NEW;
    END IF;

    -- INSERT anında: Admin dışındaki kullanıcılar yalnızca 'draft' durumunda proje ekleyebilir
    IF TG_OP = 'INSERT' THEN
        NEW.status := 'draft';
        NEW.boosted_until := NULL;
        NEW.category_boosted_until := NULL;
        NEW.view_count := 0;
        NEW.likes_count := 0;
        NEW.upvotes_count := 0;
        NEW.review_feedback := NULL;
        NEW.review_requested_at := NULL;
        NEW.reviewed_by := NULL;
        RETURN NEW;
    END IF;

    -- UPDATE anında:
    IF TG_OP = 'UPDATE' THEN
        -- İstemci sayaçları, sponsorluk sürelerini ve satıcı kimliğini asla değiştiremez
        NEW.boosted_until := OLD.boosted_until;
        NEW.category_boosted_until := OLD.category_boosted_until;
        NEW.view_count := OLD.view_count;
        NEW.likes_count := OLD.likes_count;
        NEW.upvotes_count := OLD.upvotes_count;
        NEW.seller_id := OLD.seller_id;
        NEW.reviewed_by := OLD.reviewed_by;

        -- Durum manipülasyonu kontrolü:
        -- Kullanıcı asla kendi projesini 'active', 'reserved' veya 'sold' yapamaz
        IF NEW.status <> OLD.status THEN
            IF NEW.status = 'active' THEN
                RAISE EXCEPTION 'FORBIDDEN: Projeyi doğrudan yayına alamazsınız; yönetici onayı zorunludur.';
            END IF;
            IF NEW.status = 'reserved' OR NEW.status = 'sold' THEN
                RAISE EXCEPTION 'FORBIDDEN: Bu durum yalnızca sipariş ve ödeme akışları tarafından ayarlanabilir.';
            END IF;
            IF NEW.status NOT IN ('inactive', 'draft') THEN
                RAISE EXCEPTION 'FORBIDDEN: Geçersiz proje durumu değişikliği.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_listing_status ON public.listings;
CREATE TRIGGER trg_protect_listing_status
    BEFORE INSERT OR UPDATE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.handle_listing_status_protection();


-- 2. BİLDİRİM (NOTIFICATIONS) SAHTECİLİĞİ & PHISHING ENJEKSİYONU KALKANI
-- Kullanıcıların başka kullanıcılara sahte sistem bildirimi atmasını engeller.
-- Bildirimler yalnızca sunucu tetikleyicileri (SECURITY DEFINER) veya backend (service_role) ile oluşturulabilir.

REVOKE INSERT ON TABLE public.notifications FROM public, anon, authenticated;
REVOKE UPDATE ON TABLE public.notifications FROM public, anon, authenticated;

-- İstemciye yalnızca okuma, okundu işaretleme ve silme hakkı verilir
GRANT SELECT, DELETE ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- Güvensiz INSERT politikasını (WITH CHECK (TRUE)) tamamen sil
DROP POLICY IF EXISTS "Users or triggers can insert notifications" ON public.notifications;

-- Okuma politikasını sıkılaştır (Yalnızca kendi bildirimlerini okuyabilir)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Güncelleme politikasını sıkılaştır (Yalnızca kendi bildirimini güncelleyebilir)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Silme politikasını doğrula (Yalnızca kendi bildirimini silebilir)
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- 3. PROJE İÇERİK BÜTÜNLÜĞÜ (Zero Cross-Tenant Tampering)
-- Kullanıcıların yalnızca kendi projelerini silebilmesini sağlayan DELETE politikasını pekiştir
DROP POLICY IF EXISTS "Sellers delete own listings" ON public.listings;
CREATE POLICY "Sellers delete own listings"
ON public.listings FOR DELETE
TO authenticated
USING (auth.uid() = seller_id OR public.is_platform_admin());
