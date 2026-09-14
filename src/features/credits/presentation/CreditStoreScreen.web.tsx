import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../../auth/domain/User';
import { useAuth, useWallet, useWalletActions } from '../../../core/state';
import {
  CREDIT_PRODUCT_IDS,
  CreditPurchaseService,
  StoreCreditProduct,
} from '../application/CreditPurchaseService';

// --- STYLES ID & CSS ---
const STORE_STYLE_ID = 'kistas-credit-store-web-styles';

const STORE_CSS = `
.k-pricing-root {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: #F1F5FA;
  color: #0F172A;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
  padding: 48px 20px 120px 20px;
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

/* Header & Balance */
.k-pricing-header {
  max-width: 760px;
  margin: 0 auto 40px auto;
  text-align: center;
}

.k-pricing-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(50, 105, 199, 0.08);
  border: 1px solid rgba(50, 105, 199, 0.18);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.4px;
  color: #3269C7;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.k-pricing-title {
  font-size: 42px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -1.2px;
  color: #0F172A;
  margin: 0 0 8px 0;
}

.k-pricing-desc {
  font-size: 16px;
  line-height: 1.6;
  color: #64748B;
  margin: 0 auto;
  max-width: 580px;
}

/* User Balance Pill */
.k-balance-banner {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #FFFFFF;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06);
  border-radius: 999px;
  padding: 8px 18px;
  margin-top: 22px;
}

.k-balance-text {
  font-size: 13.5px;
  color: #475569;
}

.k-balance-bold {
  font-weight: 700;
  color: #3269C7;
}

.k-balance-btn {
  background: #EAF2FC;
  color: #2554A5;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background 0.18s ease;
}

.k-balance-btn:hover {
  background: #D5E5FA;
}

/* Toggle */
.k-toggle-wrapper {
  display: flex;
  justify-content: center;
  margin: 36px 0 48px 0;
}

.k-toggle-pill-track {
  position: relative;
  display: flex;
  align-items: center;
  background: #F1F5F9;
  border: 1px solid rgba(203, 213, 225, 0.7);
  border-radius: 999px;
  padding: 4px;
  user-select: none;
}

.k-toggle-slider {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 999px;
  background: #3269C7;
  box-shadow: 0 2px 8px rgba(50, 105, 199, 0.35);
  transition: transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1), width 0.28s ease;
  pointer-events: none;
}

.k-toggle-btn {
  position: relative;
  z-index: 2;
  border: none;
  background: transparent;
  padding: 9px 22px;
  font-size: 13.5px;
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.22s ease;
}

.k-toggle-btn.active {
  color: #FFFFFF;
}

.k-toggle-btn.inactive {
  color: #64748B;
}

.k-toggle-btn.inactive:hover {
  color: #0F172A;
}

.k-toggle-badge {
  margin-left: 6px;
  font-size: 11.5px;
  font-weight: 700;
}

.k-toggle-badge.light {
  color: #93C5FD;
}

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
  padding: 34px 28px 30px 28px;
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
  color: #0F172A;
  margin: 0;
  text-align: center;
}

.k-card-desc {
  font-size: 13.5px;
  line-height: 1.5;
  color: #64748B;
  margin: 8px 0 20px 0;
  text-align: center;
  min-height: 40px;
}

.k-card-price-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.k-card-price {
  font-size: 46px;
  font-weight: 800;
  letter-spacing: -1.5px;
  color: #0F172A;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.k-card-period {
  font-size: 14px;
  font-weight: 600;
  color: #64748B;
}

.k-card-billing-note {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 6px;
  text-align: center;
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
  font-size: 13.5px;
  line-height: 1.45;
  color: #334155;
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
  color: #0F172A;
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
}
`;

// --- INTERFACES ---
export interface CreditStoreScreenProps {
  currentUser?: UserProfile | null;
  onRefreshProfile?: () => void;
  onNavigateToLaunch?: () => void;
}

interface PlanItem {
  id: string;
  storeProductId: string;
  name: string;
  credits: number;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const PLANS: PlanItem[] = [
  {
    id: 'starter',
    storeProductId: CREDIT_PRODUCT_IDS.starter,
    name: 'Başlangıç',
    credits: 100,
    monthlyPrice: 299,
    annualMonthlyPrice: 239,
    period: '100 Kredi',
    description: 'Temel görünürlük ve yeni lansmanlar için ideal başlangıç paketi.',
    features: [
      '100 Görünürlük Kredisi',
      'Sponsorlu Vitrin rotasyonuna katılım',
      'Saatlik eşit rotasyon algoritması',
      'Tüm platformlarda (Web, iOS, Android) listeleme',
    ],
  },
  {
    id: 'pro_launch',
    storeProductId: CREDIT_PRODUCT_IDS.pro_launch,
    name: 'Profesyonel',
    credits: 350,
    monthlyPrice: 699,
    annualMonthlyPrice: 559,
    period: '350 Kredi',
    description: 'Hızlı büyüme ve üst sıralarda uzun süreli görünürlük.',
    isPopular: true,
    features: [
      '350 Görünürlük Kredisi (Bonus Dahil)',
      'Sponsorlu Proje Özel Rozeti',
      'Saatlik eşit sponsor rotasyonu',
      'Öncelikli vitrin eşleşmesi',
      'Organik Kıstas puan desteği',
    ],
  },
  {
    id: 'unicorn',
    storeProductId: CREDIT_PRODUCT_IDS.unicorn,
    name: 'Ölçek',
    credits: 1000,
    monthlyPrice: 1699,
    annualMonthlyPrice: 1359,
    period: '1000 Kredi',
    description: 'Maksimum erişim ve kesintisiz ana sayfa vitrin varlığı.',
    features: [
      '1000 Görünürlük Kredisi (Büyük Paket)',
      'Uzun süreli kesintisiz vitrin gösterimi',
      'Saatlik eşit sponsor rotasyonu',
      'Sponsorlu Proje Rozeti & Vitrin Işıltısı',
      'Özel geliştirici destek hattı',
    ],
  },
];

// --- INTERACTIVE STARFIELD (Canvas Spring Physics) ---
interface StarParticle {
  xPct: number;
  yPct: number;
  size: number;
  color: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const InteractiveStarfield: React.FC<{
  mousePos: { x: number | null; y: number | null };
  containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ mousePos, containerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<StarParticle[]>([]);

  // Initialize 150 stars with random positions & twinkling properties
  useEffect(() => {
    const starColors = [
      'rgba(50, 105, 199, 0.75)',
      'rgba(96, 165, 250, 0.65)',
      'rgba(147, 100, 19, 0.55)',
      'rgba(37, 35, 51, 0.45)',
      'rgba(50, 105, 199, 0.50)',
    ];

    const particles: StarParticle[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        xPct: Math.random(),
        yPct: Math.random(),
        size: 1 + Math.random() * 2.2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        vx: 0,
        vy: 0,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.025,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Animation Loop with Spring Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = (canvas.width = canvas.offsetWidth);
      const height = (canvas.height = canvas.offsetHeight);

      ctx.clearRect(0, 0, width, height);

      const container = containerRef.current;
      const rect = container ? container.getBoundingClientRect() : null;

      const stiffness = 0.08;
      const damping = 0.82;
      const radius = 600;

      for (const p of particlesRef.current) {
        const baseX = p.xPct * width;
        const baseY = p.yPct * height;

        // Calculate magnetic spring pull
        if (rect && mousePos.x !== null && mousePos.y !== null) {
          const starScreenX = rect.left + baseX;
          const starScreenY = rect.top + baseY;

          const dx = mousePos.x - starScreenX;
          const dy = mousePos.y - starScreenY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radius) {
            const force = 1 - dist / radius;
            p.targetX = dx * force * 0.45;
            p.targetY = dy * force * 0.45;
          } else {
            p.targetX = 0;
            p.targetY = 0;
          }
        } else {
          p.targetX = 0;
          p.targetY = 0;
        }

        // Spring integration
        const ax = (p.targetX - p.currentX) * stiffness;
        p.vx = (p.vx + ax) * damping;
        p.currentX += p.vx;

        const ay = (p.targetY - p.currentY) * stiffness;
        p.vy = (p.vy + ay) * damping;
        p.currentY += p.vy;

        // Twinkle phase
        p.twinklePhase += p.twinkleSpeed;
        const opacity = 0.15 + 0.85 * ((Math.sin(p.twinklePhase) + 1) / 2);

        // Draw star
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(baseX + p.currentX, baseY + p.currentY, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mousePos, containerRef]);

  return <canvas ref={canvasRef} className="k-starfield-canvas" />;
};

// --- NUMBER ANIMATION COMPONENT ---
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 320;
    const startTime = performance.now();

    const updateCounter = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    const animId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return <span>₺{displayValue.toLocaleString('tr-TR')}</span>;
};

// --- MAIN CREDIT STORE SCREEN (WEB) ---
export const CreditStoreScreen: React.FC<CreditStoreScreenProps> = ({
  currentUser: propUser,
  onRefreshProfile,
  onNavigateToLaunch,
}) => {
  const { profile: authUser } = useAuth();
  const { credits } = useWallet();
  const { refreshCredits } = useWalletActions();

  const user = propUser !== undefined ? propUser : authUser;
  const activeBalance = credits ?? user?.boostCredits ?? 0;

  const [isMonthly, setIsMonthly] = useState(true);
  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<Record<string, StoreCreditProduct>>({});
  const [storeState, setStoreState] = useState<'loading' | 'ready' | 'unconfigured' | 'error'>(
    CreditPurchaseService.isConfiguredForDevice() ? 'loading' : 'unconfigured'
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const confettiRef = useRef<HTMLDivElement | null>(null);
  const monthlyBtnRef = useRef<HTMLButtonElement | null>(null);
  const annualBtnRef = useRef<HTMLButtonElement | null>(null);
  const [sliderStyle, setSliderStyle] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

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

  // Update slider position for the toggle
  useEffect(() => {
    const activeBtn = isMonthly ? monthlyBtnRef.current : annualBtnRef.current;
    if (activeBtn) {
      setSliderStyle({
        width: activeBtn.offsetWidth,
        left: activeBtn.offsetLeft,
      });
    }
  }, [isMonthly]);

  // Load products from store service
  useEffect(() => {
    let active = true;

    if (!user || !CreditPurchaseService.isConfiguredForDevice()) {
      setStoreState('unconfigured');
      return () => {
        active = false;
      };
    }

    setStoreState('loading');
    CreditPurchaseService.getProducts(user.id)
      .then((products) => {
        if (!active) return;
        setStoreProducts(products);
        const hasAny = PLANS.some((pkg) => products[pkg.storeProductId]);
        setStoreState(hasAny ? 'ready' : 'error');
      })
      .catch((error) => {
        console.warn('Kredi ürünleri mağazadan alınamadı:', error);
        if (active) setStoreState('error');
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: null, y: null });
  };

  // Toggle handler with Confetti
  const handleToggle = (monthly: boolean) => {
    if (isMonthly === monthly) return;
    setIsMonthly(monthly);

    // Fire confetti when switching to Annual (discounted)
    if (!monthly && annualBtnRef.current && typeof window !== 'undefined') {
      const rect = annualBtnRef.current.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 80,
        spread: 75,
        origin: { x: originX, y: originY },
        colors: ['#3269C7', '#60A5FA', '#936413', '#252333', '#EAF2FC'],
        ticks: 280,
        gravity: 1.15,
        decay: 0.94,
        startVelocity: 28,
      });
    }
  };

  // Purchase Handler
  const handlePurchase = async (plan: PlanItem) => {
    if (!user) {
      alert('Kredi satın almak için lütfen giriş yapınız.');
      return;
    }

    if (storeState !== 'ready') {
      alert('Mağaza bağlantısı henüz sandbox modunda hazır değil. Hesabınızdan ücret alınmadı.');
      return;
    }

    setLoadingPkgId(plan.id);
    try {
      const result = await CreditPurchaseService.purchase(user.id, plan.storeProductId);

      if (result.status === 'cancelled') return;
      if (result.status === 'pending') {
        alert('Ödeme Beklemede: Mağaza ödemeyi onayladığında kredileriniz otomatik yüklenecektir.');
        return;
      }

      let delivered = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 700 : 1000));
        const latestBalance = await refreshCredits();
        if (latestBalance >= activeBalance + plan.credits) {
          delivered = true;
          break;
        }
      }

      onRefreshProfile?.();
      alert(
        delivered
          ? `${plan.credits} kredi başarıyla hesabınıza tanımlandı!`
          : 'Ödeme alındı. Kredileriniz kısa süre içinde otomatik yansıyacaktır.'
      );
    } catch (error) {
      console.warn('Kredi satın alma hatası:', error);
      alert('Satın alma tamamlanamadı. Lütfen daha sonra tekrar deneyiniz.');
    } finally {
      setLoadingPkgId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="k-pricing-root"
    >
      {/* Interactive Magnetic Starfield */}
      <InteractiveStarfield mousePos={mousePos} containerRef={containerRef} />

      <div className="k-pricing-container">
        {/* Header */}
        <div className="k-pricing-header">
          <div className="k-pricing-eyebrow">
            <span>✨ KISTAS KREDİ EKOSİSTEMİ</span>
          </div>
          <h1 className="k-pricing-title">Şeffaf ve Esnek Kredi Paketleri</h1>
          <p className="k-pricing-desc">
            Projenizin büyüme hedefine uygun paketi seçin. Tüm paketler bağımsız Sponsorlu Vitrin
            rotasyonu ve organik Kıstas topluluk desteği içerir.
          </p>

          {/* User Balance Banner */}
          <div className="k-balance-banner">
            <span className="k-balance-text">
              Kullanılabilir Bakiyeniz: <span className="k-balance-bold">{activeBalance} Kredi</span>
            </span>
            {onNavigateToLaunch ? (
              <button
                type="button"
                className="k-balance-btn"
                onClick={onNavigateToLaunch}
              >
                Lansmana Git &rarr;
              </button>
            ) : null}
          </div>
        </div>

        {/* Pricing Toggle with Sliding Pill & Confetti */}
        <div className="k-toggle-wrapper">
          <div ref={confettiRef} className="k-toggle-pill-track">
            <div
              className="k-toggle-slider"
              style={{
                width: `${sliderStyle.width}px`,
                transform: `translateX(${sliderStyle.left}px)`,
              }}
            />
            <button
              ref={monthlyBtnRef}
              type="button"
              onClick={() => handleToggle(true)}
              className={`k-toggle-btn ${isMonthly ? 'active' : 'inactive'}`}
            >
              Aylık
            </button>
            <button
              ref={annualBtnRef}
              type="button"
              onClick={() => handleToggle(false)}
              className={`k-toggle-btn ${!isMonthly ? 'active' : 'inactive'}`}
            >
              Yıllık
              <span className={`k-toggle-badge ${!isMonthly ? 'light' : ''}`}>
                (%20 Tasarruf)
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="k-cards-grid">
          {PLANS.map((plan) => {
            const isPopular = plan.isPopular;
            const price = isMonthly ? plan.monthlyPrice : plan.annualMonthlyPrice;
            const isLoading = loadingPkgId === plan.id;

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

                {/* Price Display with Animated Number */}
                <div className="k-card-price-row">
                  <span className="k-card-price">
                    <AnimatedNumber value={price} />
                  </span>
                  <span className="k-card-period">/ {plan.period}</span>
                </div>
                <div className="k-card-billing-note">
                  {isMonthly ? 'Aylık faturalandırılır' : 'Yıllık faturalandırılır (%20 indirimli)'}
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
                    disabled={isLoading}
                    onClick={() => handlePurchase(plan)}
                    className={`k-card-btn ${isPopular ? 'popular-btn' : 'outline-btn'}`}
                  >
                    {isLoading ? (
                      'İşleniyor…'
                    ) : (
                      <>
                        <span>{plan.credits} Kredi Satın Al</span>
                        <span>&rarr;</span>
                      </>
                    )}
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
            Krediler yalnızca Kıstas ekosistemi içerisindeki proje görünürlüğü ve bağımsız vitrin
            için kullanılır.
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreditStoreScreen;
