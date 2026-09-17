-- ============================================================================
-- FAZ 2: FİNANSAL, İŞ MANTIĞI & SİPARİŞ GÜVENLİĞİ SERTLEŞTİRMESİ
-- SEC-018: Legacy Boost Bypass Kaldırma, Sipariş İzolasyonu, Teklif & Puan Kalkanı
-- ============================================================================

-- 1. ESKİ / GÜVENSİZ BOOST FONKSİYONUNU VERİTABANINDAN SİLME (Zero Dead-Code)
-- boost_listing_scoped fonksiyonunda Keşfet vitrini 200 kredi iken, bu eski fonksiyon
-- 50 krediye vitrin satın alma açığı (Logic Discount Bypass) oluşturuyordu.
DROP FUNCTION IF EXISTS public.boost_listing_with_credits(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.boost_listing_with_credits(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.boost_listing_with_credits;


-- 2. ORDERS TABLOSUNU DOĞRUDAN İSTEMCİ YAZIMINDAN İZOLE ETME
-- Siparişler ASLA istemci tarafından doğrudan INSERT/UPDATE/DELETE yapılamaz.
-- Yalnızca atomik RPC (create_escrow_order_atomic) veya backend (service_role) oluşturabilir.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- Güvensiz doğrudan sipariş oluşturma politikasını kaldır
DROP POLICY IF EXISTS "Buyers can initiate orders" ON public.orders;

-- Okuma politikasını doğrula (Yalnızca alıcı ve satıcı okuyabilir)
DROP POLICY IF EXISTS "Orders viewable by buyer or seller" ON public.orders;
CREATE POLICY "Orders viewable by buyer or seller"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- 3. KREDİ HAREKETLERİ DEFTERİNİ (credit_transactions) KORUMA
-- İstemci rolünün (authenticated) finansal deftere doğrudan satır eklemesi/silmesi engellenir.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.credit_transactions FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.credit_transactions TO authenticated;
GRANT ALL ON TABLE public.credit_transactions TO service_role;

DROP POLICY IF EXISTS "Users view own credit transactions" ON public.credit_transactions;
CREATE POLICY "Users view own credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- 4. TEKLİF (OFFERS) FİYAT & DURUM MANİPÜLASYON KALKANI
-- Alıcının kendi teklifini kabul edip (accepted) 1 TL'ye sipariş geçmesini ve
-- oluşturulmuş teklifin fiyatının sonradan değiştirilmesini engelleyen DB Tetikleyicisi
CREATE OR REPLACE FUNCTION public.handle_offer_update_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Temel alanlar (id, listing_id, buyer_id, seller_id, offered_price) asla değiştirilemez
    IF NEW.id <> OLD.id 
       OR NEW.listing_id <> OLD.listing_id 
       OR NEW.buyer_id <> OLD.buyer_id 
       OR NEW.seller_id <> OLD.seller_id 
       OR NEW.offered_price <> OLD.offered_price THEN
        RAISE EXCEPTION 'OFFER_IMMUTABLE_FIELDS: Teklifin temel alanları değiştirilemez.';
    END IF;

    -- Alıcı kendi teklifini kabul veya reddedemez; yalnızca geri çekebilir (cancelled)
    IF auth.uid() = OLD.buyer_id AND auth.uid() <> OLD.seller_id THEN
        IF NEW.status NOT IN ('cancelled', 'pending') THEN
            RAISE EXCEPTION 'FORBIDDEN: Alıcı teklifi kabul veya reddedemez, yalnızca geri çekebilir.';
        END IF;
    END IF;

    -- Satıcı yalnızca kabul edebilir, reddedebilir veya karşı teklif yapabilir
    IF auth.uid() = OLD.seller_id THEN
        IF NEW.status NOT IN ('accepted', 'rejected', 'countered', 'pending') THEN
            RAISE EXCEPTION 'FORBIDDEN: Satıcı yalnızca teklifi kabul edebilir, reddedebilir veya karşı teklif yapabilir.';
        END IF;
    END IF;

    NEW.updated_at := TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_offer_updates ON public.offers;
CREATE TRIGGER trg_protect_offer_updates
    BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE FUNCTION public.handle_offer_update_protection();


-- 5. DEĞERLENDİRME (REVIEWS) BÜTÜNLÜĞÜ: KENDİ KENDİNE YORUM BASMAYI ENGELLEME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_no_self_review'
    ) THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT chk_reviews_no_self_review
        CHECK (reviewer_id <> reviewed_user_id);
    END IF;
END $$;

-- Yorumların güncellenmesi ve silinmesi doğrudan istemciye kapalıdır
REVOKE UPDATE, DELETE ON TABLE public.reviews FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;
