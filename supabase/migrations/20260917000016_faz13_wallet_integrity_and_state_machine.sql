-- ==============================================================================
-- FAZ 13: CÜZDAN, SİPARİŞ DURUM MAKİNESİ & ÇİFT HARCAMA KALKANI (SEC-043 — SEC-045)
-- ==============================================================================
-- 1. SEC-043: Sipariş Durum Makinesi Bütünlüğü (Order State Machine Immutability)
-- 2. SEC-044: Teklif & Pazarlık Durum Makinesi Bütünlüğü (Offer State Machine)
-- 3. SEC-045: Negatif Kredi & Float / Bakiye Taşkın Kalkanı (Balance Integrity)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-043: Sipariş Durum Makinesi Doğrulama Tetikleyicisi
-- ------------------------------------------------------------------------------
-- Tamamlanmış (completed), iptal edilmiş (cancelled) veya iade edilmiş (refunded)
-- bir sipariş ASLA geçmiş durumlara döndürülemez (Terminal State).
-- Geçişler yalnızca yasal lojistik ve emanet (escrow) sırasını takip edebilir.
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Durum değişmiyorsa izin ver
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Terminal Durumlar: Bir kez bu duruma gelen sipariş kesinlikle değiştirilemez
    IF OLD.status IN ('completed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: Terminal durumdaki (%) bir sipariş başka bir duruma geçirilemez.', OLD.status;
    END IF;

    -- Geçerli Durum Geçiş Matrisi
    IF OLD.status = 'pending_payment' AND NEW.status NOT IN ('paid_escrow', 'cancelled') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: pending_payment durumundan yalnızca paid_escrow veya cancelled durumuna geçilebilir.';
    ELSIF OLD.status = 'paid_escrow' AND NEW.status NOT IN ('shipped', 'disputed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: paid_escrow durumundan yalnızca shipped, disputed, cancelled veya refunded durumuna geçilebilir.';
    ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'disputed') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: shipped durumundan yalnızca delivered veya disputed durumuna geçilebilir.';
    ELSIF OLD.status = 'delivered' AND NEW.status NOT IN ('completed', 'disputed') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: delivered durumundan yalnızca completed veya disputed durumuna geçilebilir.';
    ELSIF OLD.status = 'disputed' AND NEW.status NOT IN ('completed', 'refunded', 'paid_escrow', 'shipped') THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION: disputed durumundan yalnızca completed, refunded, paid_escrow veya shipped durumuna geçilebilir.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_state_transition ON public.orders;
CREATE TRIGGER trg_enforce_order_state_transition
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_order_state_transition();

-- ------------------------------------------------------------------------------
-- 2. SEC-044: Teklif & Pazarlık Durum Makinesi Bütünlüğü
-- ------------------------------------------------------------------------------
-- Kabul edilmiş (accepted), reddedilmiş (rejected) veya süresi dolmuş (expired)
-- bir teklif yeniden 'pending' yapılamaz.
CREATE OR REPLACE FUNCTION public.enforce_offer_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('accepted', 'rejected', 'expired', 'cancelled') THEN
        RAISE EXCEPTION 'ILLEGAL_OFFER_TRANSITION: Sonuçlanmış bir teklif (%) tekrar değiştirilemez.', OLD.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_offer_state_transition ON public.offers;
CREATE TRIGGER trg_enforce_offer_state_transition
    BEFORE UPDATE OF status ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_offer_state_transition();

-- ------------------------------------------------------------------------------
-- 3. SEC-045: Negatif Kredi & Float Taşkın Kalkanı (Balance Integrity)
-- ------------------------------------------------------------------------------
-- credit_transactions tablosunda bakiye ASLA negatif olamaz.
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS chk_credit_tx_balance_after_non_negative;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT chk_credit_tx_balance_after_non_negative
    CHECK (balance_after >= 0) NOT VALID;

ALTER TABLE public.credit_transactions
  VALIDATE CONSTRAINT chk_credit_tx_balance_after_non_negative;

-- profiles tablosunda boost_credits ve available_balance kısıtlarını teyit et
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_boost_credits_non_negative,
  DROP CONSTRAINT IF EXISTS chk_profiles_available_balance_non_negative;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_boost_credits_non_negative
    CHECK (boost_credits >= 0) NOT VALID,
  ADD CONSTRAINT chk_profiles_available_balance_non_negative
    CHECK (available_balance >= 0.00) NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT chk_profiles_boost_credits_non_negative;
ALTER TABLE public.profiles
  VALIDATE CONSTRAINT chk_profiles_available_balance_non_negative;

COMMENT ON TRIGGER trg_enforce_order_state_transition ON public.orders IS 'Sipariş durum makinesi kalkanı: Terminal durumların bozulmasını ve race condition geçişlerini engeller.';
COMMENT ON TRIGGER trg_enforce_offer_state_transition ON public.offers IS 'Teklif durum makinesi kalkanı: Karara bağlanmış tekliflerin manipüle edilmesini önler.';
