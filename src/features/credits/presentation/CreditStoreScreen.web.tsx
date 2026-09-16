import React, {
  useState,
  useRef,
  useEffect,
} from 'react';
import { UserProfile } from '../../auth/domain/User';
import { useAuth, useWallet, useWalletActions } from '../../../core/state';
import {
  CREDIT_PRODUCT_IDS,
  CreditPurchaseService,
  StoreCreditProduct,
} from '../application/CreditPurchaseService.web';
import { CreditStoreStarfield } from './CreditStoreStarfield.web';
import {
  CreditCheckoutModal,
  CreditPlanItem,
} from './CreditCheckoutModal.web';

// --- STYLES ID & CSS ---
const STORE_STYLE_ID = 'kistas-credit-store-web-styles';

const STORE_CSS = `
.k-pricing-root {
  position: relative;
  width: 100%;
  min-height: 100%;
  background:
    radial-gradient(circle at 12% 8%, rgba(50, 105, 199, 0.10), transparent 34%),
    radial-gradient(circle at 88% 24%, rgba(37, 72, 92, 0.08), transparent 30%),
    #F4F7FB;
  color: #25364E;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
  padding: 42px 20px 120px;
  box-sizing: border-box;
}

.k-pricing-container {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

.k-starfield-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* Hero */
.k-pricing-hero {
  margin-bottom: 22px;
}

.k-pricing-header {
  min-height: 260px;
  padding: 42px;
  border-radius: 30px;
  text-align: left;
  background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(238,244,252,0.92));
  border: 1px solid rgba(50, 105, 199, 0.16);
  box-shadow: 0 18px 45px rgba(37, 54, 78, 0.08), inset 0 1px 0 #FFFFFF;
  box-sizing: border-box;
}

.k-pricing-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.1px;
  color: #3269C7;
  margin-bottom: 20px;
}

.k-pricing-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3269C7;
  box-shadow: 0 0 0 5px rgba(50,105,199,0.10);
}

.k-pricing-title {
  font-size: clamp(36px, 5vw, 58px);
  line-height: 1.02;
  font-weight: 700;
  letter-spacing: -2.2px;
  color: #25364E;
  margin: 0 0 18px;
  max-width: 720px;
}

.k-pricing-desc {
  font-size: 15px;
  line-height: 1.55;
  color: #64748B;
  margin: 0;
  max-width: 620px;
}

.k-store-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(50, 105, 199, 0.18);
  box-shadow: 0 4px 14px rgba(50, 105, 199, 0.08);
  color: #2554A5;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.1px;
}

.k-store-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.18);
  animation: kDotPulse 2s infinite;
}

@keyframes kDotPulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.k-benefit-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 42px; }
.k-benefit-item { display: flex; align-items: center; gap: 10px; padding: 13px 15px; border-radius: 16px; background: rgba(255,255,255,0.78); border: 1px solid rgba(50,105,199,0.12); box-shadow: inset 0 1px 0 #FFFFFF; color: #475569; font-size: 12px; font-weight: 600; letter-spacing: -0.1px; }
.k-benefit-icon { display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 30px; border-radius: 10px; background: #FFFFFF; border: 1px solid rgba(50,105,199,0.18); box-shadow: 0 5px 14px rgba(50,105,199,0.12); color: #3269C7; }

.k-packages-heading { margin-bottom: 28px; }
.k-packages-kicker { margin: 0 0 7px; color: #3269C7; font-size: 12px; font-weight: 600; letter-spacing: -0.1px; }
.k-packages-title { margin: 0; color: #25364E; font-size: 30px; line-height: 1.15; font-weight: 700; letter-spacing: -0.8px; }
.k-packages-desc { margin: 8px 0 0; color: #64748B; font-size: 13px; line-height: 1.5; }

/* Cards Grid */
.k-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  align-items: stretch;
}

@media (min-width: 1024px) {
  .k-cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
}

/* Card */
.k-pricing-card {
  position: relative;
  border-radius: 24px;
  padding: 30px 26px 26px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.08);
  transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.26s ease;
}

.k-pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.12);
}

.k-pricing-card.popular {
  border: 2px solid #3269C7;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 254, 0.94) 100%);
  box-shadow:
    0 24px 50px -12px rgba(50, 105, 199, 0.25),
    0 8px 24px -6px rgba(15, 23, 42, 0.08);
}

@media (min-width: 1024px) {
  .k-pricing-card.popular {
    transform: translateY(-16px);
  }
  .k-pricing-card.popular:hover {
    transform: translateY(-20px);
  }
}

/* Popular Top Floating Badge */
.k-popular-badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #3269C7;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 14px rgba(50, 105, 199, 0.4);
}

.k-popular-badge svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

/* Card Content */
.k-card-title {
  font-size: 22px;
  font-weight: 700;
  color: #25364E;
  margin: 0;
  text-align: left;
}

.k-card-desc {
  font-size: 13.5px;
  line-height: 1.5;
  color: #64748B;
  margin: 7px 0 20px;
  text-align: left;
  min-height: 40px;
}

.k-card-price-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 6px;
}

.k-card-price {
  font-size: 46px;
  font-weight: 700;
  letter-spacing: -1.5px;
  color: #25364E;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.k-card-billing-note {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.1px;
  color: #3269C7;
  margin-top: 6px;
  text-align: left;
}

/* Features list */
.k-card-features {
  list-style: none;
  padding: 0;
  margin: 28px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.k-card-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.1px;
  line-height: 1.45;
  color: #25364E;
}

.k-feature-check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: #3269C7;
  margin-top: 1px;
}

/* Button */
.k-card-btn-container {
  margin-top: 32px;
}

.k-card-btn {
  width: 100%;
  padding: 13px 20px;
  border-radius: 12px;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.k-card-btn.popular-btn {
  background: #3269C7;
  color: #FFFFFF;
  border: none;
  box-shadow: 0 4px 14px rgba(50, 105, 199, 0.35);
}

.k-card-btn.popular-btn:hover {
  background: #2554A5;
  box-shadow: 0 6px 20px rgba(50, 105, 199, 0.45);
}

.k-card-btn.outline-btn {
  background: #FFFFFF;
  color: #25364E;
  border: 1px solid #DFE4EB;
}

.k-card-btn.outline-btn:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}

.k-card-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Transparency footer */
.k-transparency-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 48px;
  color: #64748B;
  font-size: 13px;
  text-align: center;
  font-weight: 600;
  letter-spacing: -0.1px;
}

@media (max-width: 767px) {
  .k-pricing-root { padding: 22px 14px 110px; }
  .k-pricing-hero { grid-template-columns: 1fr; gap: 14px; margin-bottom: 14px; }
  .k-pricing-header { min-height: 0; padding: 24px 22px; border-radius: 24px; }
  .k-pricing-kicker { margin-bottom: 15px; }
  .k-pricing-title { font-size: 36px; letter-spacing: -1.6px; margin-bottom: 14px; }
  .k-pricing-desc { font-size: 14px; }
  .k-store-badge { margin-top: 15px; font-size: 11px; }
  .k-benefit-strip { grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 30px; }
  .k-benefit-item { min-height: 74px; flex-direction: column; justify-content: center; gap: 7px; padding: 9px 6px; text-align: center; font-size: 11.5px; line-height: 1.25; box-sizing: border-box; }
  .k-benefit-icon { width: 27px; height: 27px; flex-basis: 27px; border-radius: 9px; }
  .k-packages-title { font-size: 27px; }
  .k-cards-grid { gap: 18px; }
  .k-pricing-card { padding: 27px 22px 22px; border-radius: 22px; }
  .k-pricing-card.popular { margin-top: 10px; }
  .k-card-price { font-size: 42px; }
}
`;

// --- INTERFACES ---
export interface CreditStoreScreenProps {
  currentUser?: UserProfile | null;
  onRefreshProfile?: () => void;
}

const PLANS: CreditPlanItem[] = [
  {
    id: 'starter',
    storeProductId: CREDIT_PRODUCT_IDS.starter,
    name: 'Başlangıç',
    credits: 100,
    price: 299,
    description: 'İlk Sponsorlu Vitrin kullanımın için.',
    features: [
      '100 Vitrin kredisi',
      'Sponsorlu Vitrin süresi',
      'Saatlik eşit rotasyon',
    ],
  },
  {
    id: 'pro_launch',
    storeProductId: CREDIT_PRODUCT_IDS.pro_launch,
    name: 'Profesyonel',
    credits: 350,
    price: 699,
    description: 'Daha uzun vitrin süreleri için.',
    isPopular: true,
    features: [
      '350 Vitrin kredisi',
      'Sponsorlu proje rozeti',
      'Saatlik eşit rotasyon',
    ],
  },
  {
    id: 'unicorn',
    storeProductId: CREDIT_PRODUCT_IDS.unicorn,
    name: 'Ölçek',
    credits: 1000,
    price: 1699,
    description: 'Uzun kampanyalar ve birden fazla lansman için.',
    features: [
      '1.000 Vitrin kredisi',
      'Uzun süreli vitrin kullanımı',
      'Saatlik eşit rotasyon',
    ],
  },
];

// --- MAIN CREDIT STORE SCREEN (WEB) ---
export const CreditStoreScreen: React.FC<CreditStoreScreenProps> = ({
  currentUser: propUser,
  onRefreshProfile,
}) => {
  const { profile: authUser } = useAuth();
  const { credits } = useWallet();
  const { refreshCredits } = useWalletActions();

  const user = propUser !== undefined ? propUser : authUser;
  const activeBalance = credits ?? user?.boostCredits ?? 0;

  const [storeProducts, setStoreProducts] = useState<Record<string, StoreCreditProduct>>({});
  const [selectedPlan, setSelectedPlan] = useState<CreditPlanItem | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  // Inject Web CSS Once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById(STORE_STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = STORE_STYLE_ID;
      styleEl.textContent = STORE_CSS;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Load products directly
  useEffect(() => {
    CreditPurchaseService.getProducts(user?.id || '')
      .then((products) => {
        setStoreProducts(products);
      })
      .catch((error) => {
        console.warn('Kredi ürünleri mağazadan alınamadı:', error);
      });
  }, [user?.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: null, y: null });
  };

  // Plan Seçildiğinde Checkout Modalını Aç
  const handleOpenCheckoutModal = (plan: CreditPlanItem) => {
    if (!user) {
      alert('Kredi satın almak için lütfen sağ üstten hesabınıza giriş yapınız.');
      return;
    }
    setSelectedPlan(plan);
    setIsCheckoutModalOpen(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="k-pricing-root"
    >
      {/* Interactive Magnetic Starfield */}
      <CreditStoreStarfield mousePos={mousePos} containerRef={containerRef} />

      <div className="k-pricing-container">
        <div className="k-pricing-hero">
          <div className="k-pricing-header">
            <div className="k-pricing-kicker">Kıstas Vitrin Kredileri</div>
            <h1 className="k-pricing-title">Sponsorlu erişiminizi planlayın.</h1>
            <p className="k-pricing-desc">
              Tek seferlik kredi paketleriyle Sponsorlu Vitrin sürenizi ihtiyacınıza göre yönetin.
            </p>
            <div className="k-store-badge" role="status">
              <span className="k-store-badge-dot" aria-hidden="true" />
              <span>Shopier 256-Bit SSL & 3D Secure ile Güvenli Ödeme Aktif</span>
            </div>
          </div>
        </div>

        <div className="k-benefit-strip" aria-label="Kredi avantajları">
          <div className="k-benefit-item"><span className="k-benefit-icon">◎</span><span>Tek seferlik satın alım</span></div>
          <div className="k-benefit-item"><span className="k-benefit-icon">↻</span><span>Saatlik eşit rotasyon</span></div>
          <div className="k-benefit-item"><span className="k-benefit-icon">◇</span><span>İhtiyacın kadar kullan</span></div>
        </div>

        <div className="k-packages-heading">
          <p className="k-packages-kicker">Kredi paketleri</p>
          <h2 className="k-packages-title">Hedefine uygun paketi seç.</h2>
          <p className="k-packages-desc">Abonelik yok. Krediler tek sefer alınır ve bakiyende kalır.</p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="k-cards-grid">
          {PLANS.map((plan) => {
            const isPopular = plan.isPopular;
            const priceLabel = storeProducts[plan.storeProductId]?.priceString || `₺${plan.price.toLocaleString('tr-TR')}`;

            return (
              <div
                key={plan.id}
                className={`k-pricing-card ${isPopular ? 'popular' : ''}`}
              >
                {/* Popular Floating Badge */}
                {isPopular && (
                  <div className="k-popular-badge">
                    <svg viewBox="0 0 24 24">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>Önerilen Paket</span>
                  </div>
                )}

                {/* Plan Info */}
                <h3 className="k-card-title">{plan.name}</h3>
                <p className="k-card-desc">{plan.description}</p>

                {/* One-time package price */}
                <div className="k-card-price-row">
                  <span className="k-card-price">{priceLabel}</span>
                </div>
                <div className="k-card-billing-note">
                  Tek seferlik ödeme · {plan.credits.toLocaleString('tr-TR')} kredi
                </div>

                {/* Features List */}
                <ul className="k-card-features">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="k-card-feature-item">
                      <svg
                        className="k-feature-check"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <div className="k-card-btn-container">
                  <button
                    type="button"
                    onClick={() => handleOpenCheckoutModal(plan)}
                    className={`k-card-btn ${isPopular ? 'popular-btn' : 'outline-btn'}`}
                  >
                    <span>{plan.credits} Kredi Satın Al</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transparency Note */}
        <div className="k-transparency-row">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>
            Vitrin Kredileri yalnızca Sponsorlu Vitrin hizmetinde kullanılır; paketler abonelik başlatmaz.
          </span>
        </div>
      </div>

      {/* Glassmorphic Checkout Modal */}
      <CreditCheckoutModal
        isOpen={isCheckoutModalOpen}
        selectedPlan={selectedPlan}
        storeProduct={selectedPlan ? storeProducts[selectedPlan.storeProductId] : undefined}
        user={user}
        activeBalance={activeBalance}
        onClose={() => setIsCheckoutModalOpen(false)}
        onRefreshCredits={refreshCredits}
        onRefreshProfile={onRefreshProfile}
      />
    </div>
  );
};

export default CreditStoreScreen;
