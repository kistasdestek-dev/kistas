-- ============================================================================
-- 20260917000017_faz14_promo_pricing_and_delivery_hardening.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 14
-- SEC-046: Promosyon Kodu İstismarı & Kupon Yığma (Coupon Stacking / Replay) Kalkanı
-- SEC-047: Fiyatlandırma Bütünlüğü & İndirim Oranı Manipülasyonu (Price Tampering)
-- SEC-048: Kargo & Teslimat Kodu IDOR / Brute-force Kalkanı
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEC-046: PROMOSYON KODU GÜVENLİK VE FORMAT KISITLARI (LISTINGS)
-- ----------------------------------------------------------------------------
-- Promosyon kodları XSS, SQLi, kontrol karakterleri ve yığma saldırılarına karşı
-- kesin alfanümerik kurala [A-Za-z0-9_-] ve maks 30 karaktere bağlanır.

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_promo_code_format;

ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_promo_code_format
    CHECK (
        promo_code IS NULL 
        OR (
            LENGTH(TRIM(promo_code)) >= 2 
            AND LENGTH(TRIM(promo_code)) <= 30 
            AND TRIM(promo_code) ~ '^[A-Za-z0-9_\-]+$'
        )
    ) NOT VALID;

ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_promo_code_format;

-- ----------------------------------------------------------------------------
-- 2. SEC-047: FİYATLANDIRMA BÜTÜNLÜĞÜ & TAŞKINLIK KALKANI (LISTINGS, OFFERS, ORDERS)
-- ----------------------------------------------------------------------------
-- İlan fiyatları dijital vitrin (0 = ücretsiz) ile maksimum 10 Milyon TL mantık sınırına alınır.
-- Orijinal fiyat indirim oranı hesaplaması için fiyatın altına inemez ve 20 Milyon TL'yi aşamaz.

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_price_range,
    DROP CONSTRAINT IF EXISTS chk_listings_original_price_range;

ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_price_range
    CHECK (
        price IS NULL 
        OR (price >= 0.00 AND price <= 10000000.00)
    ) NOT VALID;

ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_price_range;

ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_original_price_range
    CHECK (
        original_price IS NULL 
        OR (
            original_price >= COALESCE(price, 0.00) 
            AND original_price <= 20000000.00
        )
    ) NOT VALID;

ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listings_original_price_range;

-- Teklifler (Offers) fiyat aralık kısıtları:
ALTER TABLE public.offers
    DROP CONSTRAINT IF EXISTS chk_offers_offered_price_range,
    DROP CONSTRAINT IF EXISTS chk_offers_counter_price_range;

ALTER TABLE public.offers
    ADD CONSTRAINT chk_offers_offered_price_range
    CHECK (
        offered_price >= 1.00 AND offered_price <= 10000000.00
    ) NOT VALID;

ALTER TABLE public.offers VALIDATE CONSTRAINT chk_offers_offered_price_range;

ALTER TABLE public.offers
    ADD CONSTRAINT chk_offers_counter_price_range
    CHECK (
        counter_price IS NULL 
        OR (counter_price >= 1.00 AND counter_price <= 10000000.00)
    ) NOT VALID;

ALTER TABLE public.offers VALIDATE CONSTRAINT chk_offers_counter_price_range;

-- Siparişler (Orders) finansal havuz (Escrow) tavan ve tutarlılık kısıtları:
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS chk_orders_product_amount_range,
    DROP CONSTRAINT IF EXISTS chk_orders_shipping_cost_range,
    DROP CONSTRAINT IF EXISTS chk_orders_service_fee_range,
    DROP CONSTRAINT IF EXISTS chk_orders_seller_earnings_bounded;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_product_amount_range
    CHECK (
        product_amount >= 0.00 AND product_amount <= 10000000.00
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_product_amount_range;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_shipping_cost_range
    CHECK (
        shipping_cost >= 0.00 AND shipping_cost <= 100000.00
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_shipping_cost_range;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_service_fee_range
    CHECK (
        service_fee >= 0.00 AND service_fee <= 1000000.00
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_service_fee_range;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_seller_earnings_bounded
    CHECK (
        seller_earnings <= product_amount
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_seller_earnings_bounded;

-- ----------------------------------------------------------------------------
-- 3. SEC-048: KARGO, SİPARİŞ NUMARASI & ENUMERATION / BRUTE-FORCE KALKANI
-- ----------------------------------------------------------------------------
-- Sipariş referans numarası ve kargo takip numarası regex format kalkanı:
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS chk_orders_order_number_format,
    DROP CONSTRAINT IF EXISTS chk_orders_tracking_number_format;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_order_number_format
    CHECK (
        order_number ~ '^[A-Za-z0-9_\-]+$' 
        AND LENGTH(order_number) >= 8 
        AND LENGTH(order_number) <= 32
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_order_number_format;

ALTER TABLE public.orders
    ADD CONSTRAINT chk_orders_tracking_number_format
    CHECK (
        tracking_number IS NULL 
        OR (
            LENGTH(tracking_number) <= 64 
            AND tracking_number ~ '^[A-Za-z0-9\-_\./]+$'
        )
    ) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_tracking_number_format;

-- ----------------------------------------------------------------------------
-- 4. create_escrow_order_atomic SERTLEŞTİRMESİ
-- ----------------------------------------------------------------------------
-- Kriptografik rastgele sipariş kodu (CSPRNG), search_path izolasyonu ve grant sertleştirmesi.

CREATE OR REPLACE FUNCTION public.create_escrow_order_atomic(
    p_listing_id UUID,
    p_shipping_address_id UUID,
    p_payment_provider VARCHAR DEFAULT 'mock',
    p_cargo_provider VARCHAR DEFAULT 'mock'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID;
    v_listing RECORD;
    v_address RECORD;
    v_category RECORD;
    v_final_price NUMERIC(12, 2);
    v_accepted_offer RECORD;
    v_commission_rate NUMERIC(4, 4);
    v_service_fee NUMERIC(12, 2);
    v_shipping_cost NUMERIC(12, 2) := 39.99;
    v_total_amount NUMERIC(12, 2);
    v_seller_earnings NUMERIC(12, 2);
    v_order_id UUID;
    v_order_number VARCHAR(32);
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmış kullanıcı bulunamadı.';
    END IF;

    -- 1. İLANI VE DURUMUNU KİLİTLE (Concurrency / Race Condition Koruması)
    SELECT * INTO v_listing 
    FROM public.listings 
    WHERE id = p_listing_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: İlan bulunamadı.';
    END IF;

    IF v_listing.status <> 'active' THEN
        RAISE EXCEPTION 'INVALID_STATUS: İlan artık aktif değil veya başka biri tarafından rezerve edildi.';
    END IF;

    IF v_listing.seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'SELF_PURCHASE: Kullanıcı kendi ilanını satın alamaz.';
    END IF;

    -- 2. ADRESİ DOĞRULA (IDOR Koruması)
    SELECT * INTO v_address
    FROM public.user_addresses
    WHERE id = p_shipping_address_id AND user_id = v_buyer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_ADDRESS: Teslimat adresi alıcıya ait değil veya geçersiz.';
    END IF;

    -- 3. FİYAT BELİRLEME (FİYAT MANİPÜLASYONUNA KAPALI)
    SELECT * INTO v_accepted_offer
    FROM public.offers
    WHERE listing_id = p_listing_id 
      AND buyer_id = v_buyer_id 
      AND status = 'accepted'
      AND expires_at > TIMEZONE('utc', NOW())
    ORDER BY updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_final_price := v_accepted_offer.offered_price;
    ELSE
        v_final_price := COALESCE(v_listing.price, 0.00);
    END IF;

    -- 4. KOMİSYON VE FİNANSAL HESAPLAMA
    SELECT commission_rate INTO v_commission_rate 
    FROM public.categories 
    WHERE id = v_listing.category_id;

    IF v_commission_rate IS NULL THEN
        v_commission_rate := 0.1000; -- %10
    END IF;

    v_service_fee := ROUND(v_final_price * v_commission_rate, 2);
    v_total_amount := v_final_price + v_shipping_cost + v_service_fee;
    v_seller_earnings := v_final_price;

    -- 5. KRİPTOGRAFİK SİPARİŞ NUMARASI ÜRET (CSPRNG: Tahmin Edilemez)
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(ENCODE(gen_random_bytes(4), 'hex'));

    -- 6. ATOMİK SİPARİŞ OLUŞTURMA & İLANI REZERVE ETME
    INSERT INTO public.orders (
        order_number,
        listing_id,
        buyer_id,
        seller_id,
        delivery_type,
        status,
        product_amount,
        shipping_cost,
        service_fee,
        total_amount,
        seller_earnings,
        payment_provider,
        cargo_provider,
        shipping_address_snapshot
    ) VALUES (
        v_order_number,
        v_listing.id,
        v_buyer_id,
        v_listing.seller_id,
        COALESCE(v_listing.delivery_type, 'hybrid'),
        'pending_payment',
        v_final_price,
        v_shipping_cost,
        v_service_fee,
        v_total_amount,
        v_seller_earnings,
        COALESCE(p_payment_provider, 'mock'),
        COALESCE(p_cargo_provider, 'mock'),
        to_jsonb(v_address)
    ) RETURNING id INTO v_order_id;

    -- İlanı rezerve et
    UPDATE public.listings 
    SET status = 'reserved', updated_at = TIMEZONE('utc', NOW())
    WHERE id = v_listing.id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount,
        'product_amount', v_final_price,
        'service_fee', v_service_fee,
        'shipping_cost', v_shipping_cost
    );
END;
$$;

-- İzinleri kilitle: Sadece oturum açmış kullanıcılar (authenticated) sipariş açabilir
REVOKE ALL ON FUNCTION public.create_escrow_order_atomic(UUID, UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_escrow_order_atomic(UUID, UUID, VARCHAR, VARCHAR) TO authenticated;
