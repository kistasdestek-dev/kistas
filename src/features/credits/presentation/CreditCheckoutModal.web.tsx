import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../auth/domain/User';
import { CreditPurchaseService } from '../application/CreditPurchaseService.web';
import { StoreCreditProduct } from '../application/CreditPurchaseContracts';

export interface CreditPlanItem {
  id: string;
  storeProductId: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
}

export interface CreditCheckoutModalProps {
  isOpen: boolean;
  selectedPlan: CreditPlanItem | null;
  storeProduct?: StoreCreditProduct;
  user?: UserProfile | null;
  activeBalance: number;
  onClose: () => void;
  onRefreshCredits: () => Promise<number>;
  onRefreshProfile?: () => void;
}

const MODAL_STYLE_ID = 'kistas-credit-modal-styles';

const MODAL_CSS = `
.k-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(37, 54, 78, 0.58);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  animation: kModalFadeIn 0.2s ease-out forwards;
}

.k-modal-card {
  position: relative;
  width: 100%;
  max-width: 500px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 26px;
  border: 1px solid rgba(50, 105, 199, 0.20);
  box-shadow: 0 24px 60px rgba(37, 54, 78, 0.22), inset 0 1px 0 #FFFFFF;
  padding: 32px 28px;
  box-sizing: border-box;
  animation: kModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes kModalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes kModalScaleIn {
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.k-modal-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(241, 245, 249, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.7);
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  font-size: 20px;
  line-height: 1;
}

.k-modal-close-btn:hover {
  background: #E2E8F0;
  color: #25364E;
  transform: scale(1.05);
}

.k-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.k-modal-icon-wrap {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(50, 105, 199, 0.12), rgba(50, 105, 199, 0.04));
  border: 1px solid rgba(50, 105, 199, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3269C7;
  box-shadow: 0 4px 12px rgba(50, 105, 199, 0.10);
}

.k-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #25364E;
  margin: 0;
  letter-spacing: -0.4px;
}

.k-modal-subtitle {
  font-size: 13px;
  color: #64748B;
  margin: 3px 0 0;
}

.k-modal-summary-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 18px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  margin-bottom: 20px;
}

.k-modal-pkg-name {
  font-size: 16px;
  font-weight: 700;
  color: #25364E;
}

.k-modal-pkg-credits {
  font-size: 12.5px;
  color: #3269C7;
  font-weight: 600;
  margin-top: 2px;
}

.k-modal-pkg-price {
  font-size: 24px;
  font-weight: 700;
  color: #25364E;
  letter-spacing: -0.5px;
}

.k-modal-instruction-box {
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(235, 243, 255, 0.92));
  border: 1px solid rgba(50, 105, 199, 0.22);
  box-shadow: 0 10px 28px rgba(50, 105, 199, 0.10), inset 0 1px 0 #FFFFFF;
  margin-bottom: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.k-modal-instruction-title {
  font-size: 12px;
  font-weight: 700;
  color: #2554A5;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.k-modal-instruction-lead {
  margin: -2px 0 0;
  color: #25364E;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 600;
}

.k-modal-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(50, 105, 199, 0.18);
  gap: 8px;
}

.k-modal-user-row.missing {
  border-color: rgba(185, 137, 22, 0.30);
  background: #FFFBEB;
}

.k-modal-user-email {
  font-size: 13.5px;
  font-weight: 600;
  color: #25364E;
  word-break: break-all;
}

.k-modal-copy-btn {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  color: #2563EB;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.k-modal-copy-btn:hover {
  background: #DBEAFE;
}

.k-modal-match-points {
  display: grid;
  gap: 7px;
}

.k-modal-match-point {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #475569;
  font-size: 12px;
  line-height: 1.45;
}

.k-modal-match-number {
  flex: 0 0 19px;
  width: 19px;
  height: 19px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(50, 105, 199, 0.10);
  border: 1px solid rgba(50, 105, 199, 0.18);
  color: #2554A5;
  font-size: 10px;
  font-weight: 700;
}

.k-modal-auto-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(50, 105, 199, 0.13);
  color: #187657;
  font-size: 11.5px;
  font-weight: 700;
}

.k-modal-auto-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #21A179;
  box-shadow: 0 0 0 4px rgba(33, 161, 121, 0.12);
}

.k-modal-status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  color: #1D4ED8;
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 16px;
}

.k-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.k-modal-primary-btn {
  width: 100%;
  padding: 14px 20px;
  border-radius: 14px;
  background: #3269C7;
  color: #FFFFFF;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 18px rgba(50, 105, 199, 0.35);
  transition: all 0.2s ease;
}

.k-modal-primary-btn:hover {
  background: #2554A5;
  box-shadow: 0 8px 24px rgba(50, 105, 199, 0.45);
  transform: translateY(-1px);
}

.k-modal-primary-btn:disabled {
  cursor: not-allowed;
  background: #94A3B8;
  box-shadow: none;
  transform: none;
}

.k-modal-secondary-btn {
  width: 100%;
  padding: 12px 20px;
  border-radius: 14px;
  background: #F8FAFC;
  color: #475569;
  border: 1px solid #E2E8F0;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.18s ease;
}

.k-modal-secondary-btn:hover {
  background: #F1F5F9;
  color: #25364E;
}

.k-modal-guarantee-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  color: #64748B;
  margin-top: 14px;
}

.k-modal-feedback {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  animation: kModalFadeIn 0.2s ease;
}

.k-modal-feedback.success {
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #065F46;
}

.k-modal-feedback.info {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  color: #1E40AF;
}

@media (max-width: 767px) {
  .k-modal-card { padding: 24px 18px; border-radius: 20px; }
}
`;

export const CreditCheckoutModal: React.FC<CreditCheckoutModalProps> = ({
  isOpen,
  selectedPlan,
  storeProduct,
  user,
  activeBalance,
  onClose,
  onRefreshCredits,
  onRefreshProfile,
}) => {
  const [hasOpenedWindow, setHasOpenedWindow] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceFeedback, setBalanceFeedback] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById(MODAL_STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = MODAL_STYLE_ID;
      styleEl.textContent = MODAL_CSS;
      document.head.appendChild(styleEl);
    }
  }, []);

  if (!isOpen || !selectedPlan) return null;

  const handleProceedToShopier = () => {
    if (!user?.email?.trim()) return;
    const popup = CreditPurchaseService.openShopierCheckout(selectedPlan.storeProductId);
    if (popup) {
      setHasOpenedWindow(true);
    } else {
      const url = CreditPurchaseService.getCheckoutUrl(selectedPlan.storeProductId);
      if (url && typeof window !== 'undefined') {
        window.open(url, '_blank');
        setHasOpenedWindow(true);
      }
    }
  };

  const handleCopyEmail = () => {
    const textToCopy = user?.email?.trim() || '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2400);
      });
    }
  };

  const handleCheckBalance = async () => {
    setIsCheckingBalance(true);
    setBalanceFeedback(null);
    try {
      const latestBalance = await onRefreshCredits();
      onRefreshProfile?.();
      if (latestBalance >= activeBalance + selectedPlan.credits) {
        setBalanceFeedback({
          text: `Harika! ${selectedPlan.credits} kredi hesabınıza tanımlandı. Güncel bakiyeniz: ${latestBalance}`,
          type: 'success',
        });
      } else {
        setBalanceFeedback({
          text: `Mevcut bakiyeniz: ${latestBalance} kredi. Shopier ödemeniz onaylandıktan sonra bakiyenize otomatik yansıyacaktır.`,
          type: 'info',
        });
      }
    } catch {
      setBalanceFeedback({
        text: 'Bakiye sorgulanırken bir sorun oluştu. Sayfayı yenileyerek tekrar deneyebilirsiniz.',
        type: 'info',
      });
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const priceLabel = storeProduct?.priceString || `₺${selectedPlan.price.toLocaleString('tr-TR')}`;
  const accountEmail = user?.email?.trim() || '';

  return (
    <div
      className="k-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="k-modal-card">
        <button
          type="button"
          className="k-modal-close-btn"
          onClick={onClose}
          aria-label="Kapat"
        >
          &times;
        </button>

        <div className="k-modal-header">
          <div className="k-modal-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="k-modal-title">Güvenli Kredi Satın Alımı</h3>
            <p className="k-modal-subtitle">Shopier 3D Secure Güvenli Ödeme Altyapısı</p>
          </div>
        </div>

        {/* Package Summary Box */}
        <div className="k-modal-summary-box">
          <div>
            <div className="k-modal-pkg-name">{selectedPlan.name} Paketi</div>
            <div className="k-modal-pkg-credits">{selectedPlan.credits.toLocaleString('tr-TR')} Vitrin Kredisi</div>
          </div>
          <div className="k-modal-pkg-price">{priceLabel}</div>
        </div>

        {/* User Account Matching Information */}
        <div className="k-modal-instruction-box">
          <div className="k-modal-instruction-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Kredinin Doğru Hesaba Yüklenmesi İçin</span>
          </div>
          <p className="k-modal-instruction-lead">
            Shopier siparişiniz aşağıdaki Kıstas hesap e-postasıyla eşleşmelidir.
          </p>
          <div className={`k-modal-user-row${accountEmail ? '' : ' missing'}`}>
            <span className="k-modal-user-email">
              {accountEmail || 'Hesabınızda doğrulanmış e-posta bulunamadı'}
            </span>
            <button
              type="button"
              className="k-modal-copy-btn"
              onClick={handleCopyEmail}
              disabled={!accountEmail}
            >
              {copiedEmail ? '✓ Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <div className="k-modal-match-points">
            <div className="k-modal-match-point">
              <span className="k-modal-match-number">1</span>
              <span>Bu e-posta adresini Shopier ödeme ekranındaki <strong>sipariş notuna</strong> aynen yazın.</span>
            </div>
            <div className="k-modal-match-point">
              <span className="k-modal-match-number">2</span>
              <span>Sipariş notunu boş bırakırsanız Shopier alıcı e-postanız bu adresle aynı olmalıdır.</span>
            </div>
          </div>
          <div className="k-modal-auto-note">
            <span className="k-modal-auto-dot" />
            <span>Ödeme doğrulanınca krediniz otomatik yüklenir ve uygulama içi bildirim gelir.</span>
          </div>
        </div>

        {hasOpenedWindow && (
          <div className="k-modal-status-badge">
            <span className="k-store-badge-dot" />
            <span>Shopier ödeme penceresi açıldı. İşleminizi tamamlayabilirsiniz.</span>
          </div>
        )}

        {balanceFeedback && (
          <div className={`k-modal-feedback ${balanceFeedback.type}`}>
            {balanceFeedback.text}
          </div>
        )}

        {/* Actions */}
        <div className="k-modal-actions">
          <button
            type="button"
            className="k-modal-primary-btn"
            onClick={handleProceedToShopier}
            disabled={!accountEmail}
          >
            <span>{!accountEmail ? 'Ödeme İçin E-posta Gerekli' : hasOpenedWindow ? 'Ödeme Penceresini Tekrar Aç' : 'Shopier ile Güvenli Öde'}</span>
            <span>&rarr;</span>
          </button>

          {hasOpenedWindow && (
            <button
              type="button"
              className="k-modal-secondary-btn"
              disabled={isCheckingBalance}
              onClick={handleCheckBalance}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{isCheckingBalance ? 'Bakiye Kontrol Ediliyor…' : 'Ödemeyi Tamamladım, Bakiyemi Güncelle'}</span>
            </button>
          )}
        </div>

        <div className="k-modal-guarantee-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>256-Bit SSL Şifreleme · 3D Secure Koruma · BDDK Lisanslı Ödeme</span>
        </div>
      </div>
    </div>
  );
};

export default CreditCheckoutModal;
