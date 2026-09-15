import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Category } from '../../features/categories/domain/Category';

export interface CategoryFilterBarProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  categories?: Category[];
  onOpenBrowse?: () => void;
  style?: any;
}

interface ActionCategoryItem {
  id: string | null;
  name: string;
  subtitle: string;
  tag: string;
  iconSvg: React.ReactNode;
  iconBg: string;
  iconColor: string;
  slug?: string;
}

const STYLE_ID = 'kistas-dynamic-action-bar-styles';

const BAR_STYLES = `
.k-action-bar-root {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 6px 0 14px 0;
  z-index: 40;
}

.k-action-bar-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow:
    0 12px 32px -8px rgba(15, 23, 42, 0.10),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
  transition: width 0.36s cubic-bezier(0.34, 1.25, 0.64, 1),
              height 0.36s cubic-bezier(0.34, 1.25, 0.64, 1),
              box-shadow 0.25s ease;
  will-change: width, height;
}

.k-action-bar-card.expanded {
  box-shadow:
    0 24px 50px -12px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(50, 105, 199, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.9) inset;
}

/* Content area */
.k-action-content-box {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 14px 8px 14px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
  animation: kContentFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes kContentFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.k-action-content-box::-webkit-scrollbar {
  width: 5px;
}
.k-action-content-box::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

/* Items in expanded list */
.k-action-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 96%;
  margin: 0 auto 5px auto;
  padding: 8px 10px;
  border-radius: 14px;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.22s ease;
  box-sizing: border-box;
}

.k-action-item-row:hover {
  background: rgba(15, 23, 42, 0.045);
  padding-left: 14px;
  padding-right: 14px;
}

.k-action-item-row.active {
  background: rgba(50, 105, 199, 0.08);
  border-color: rgba(50, 105, 199, 0.28);
}

.k-action-item-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.k-action-item-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.k-action-item-title {
  font-size: 14px;
  font-weight: 700;
  color: #25364E;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.k-action-item-sub {
  font-size: 11.5px;
  color: #64748B;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin-top: 2px;
}

.k-action-item-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  color: #475569;
  flex-shrink: 0;
}

.k-action-divider {
  height: 1px;
  width: 95%;
  margin: 10px auto 8px auto;
  background: rgba(15, 23, 42, 0.08);
}

.k-action-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 95%;
  margin: 4px auto 0 auto;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #3269C7;
  background: rgba(50, 105, 199, 0.06);
  border: 1px dashed rgba(50, 105, 199, 0.25);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.18s ease;
}
.k-action-more-btn:hover {
  background: rgba(50, 105, 199, 0.12);
}

/* Bottom Buttons Bar */
.k-action-btn-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
  height: 52px;
  flex-shrink: 0;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.4);
}

.k-action-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 14px;
  padding: 8px 14px;
  font-size: 13.5px;
  font-weight: 700;
  color: #25364E;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.22s ease;
  user-select: none;
}

.k-action-nav-btn:hover {
  background: #0F172A;
  color: #FFFFFF;
}

.k-action-nav-btn.active-tab {
  background: #3269C7;
  color: #FFFFFF;
}

/* Active Filter Chip Badge */
.k-active-filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(50, 105, 199, 0.10);
  border: 1px solid rgba(50, 105, 199, 0.3);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #2554A5;
  margin-left: 4px;
}

.k-active-filter-clear {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #3269C7;
  font-size: 14px;
  font-weight:700;
  display: flex;
  align-items: center;
  padding: 0 2px;
  transition: transform 0.15s ease;
}
.k-active-filter-clear:hover {
  transform: scale(1.2);
  color: #E11D48;
}
`;

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedCategoryId,
  onSelectCategory,
  categories = [],
  onOpenBrowse,
  style,
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'games' | 'explore' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Inject CSS once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById(STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = BAR_STYLES;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Find real category matching slug or fallback
  const getCatIdBySlug = (slugKeywords: string[]): string | null => {
    const found = categories.find((c) =>
      slugKeywords.some((k) => c.slug.includes(k) || c.name.toLowerCase().includes(k))
    );
    return found ? found.id : null;
  };

  // Pre-configured App Categories
  const appCategories: ActionCategoryItem[] = useMemo(() => [
    {
      id: getCatIdBySlug(['ai', 'ml', 'yapay']),
      slug: 'ai-ml',
      name: 'Yapay Zeka & Makine Öğrenimi',
      subtitle: 'LLM, akıllı asistanlar ve otomasyon araçları',
      tag: 'AI',
      iconBg: '#EBF1FF',
      iconColor: '#3269C7',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['dev', 'gelistirici']),
      slug: 'devtools',
      name: 'Geliştirici Araçları & API',
      subtitle: 'Kod kütüphaneleri, SDK, CLI ve açık kaynak',
      tag: 'Dev',
      iconBg: '#EEF0F5',
      iconColor: '#475569',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['prod', 'verimlilik']),
      slug: 'productivity',
      name: 'Verimlilik & İş Yönetimi',
      subtitle: 'Görev takibi, notlar ve iş akışı optimizasyonu',
      tag: 'Tools',
      iconBg: '#E9F5F4',
      iconColor: '#0D9488',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['fin', 'fintech']),
      slug: 'fintech',
      name: 'Finans & Portföy',
      subtitle: 'Bütçe, kripto para, yatırım ve ödeme çözümleri',
      tag: 'Finance',
      iconBg: '#EBF5EE',
      iconColor: '#16A34A',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['saas']),
      slug: 'saas',
      name: 'SaaS & Bulut Çözümleri',
      subtitle: 'Abonelik tabanlı modern bulut web servisleri',
      tag: 'SaaS',
      iconBg: '#EAF4FB',
      iconColor: '#0284C7',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['des', 'tasarim']),
      slug: 'design',
      name: 'Grafik & Tasarım Araçları',
      subtitle: 'UI/UX şablonları, prototip ve kreatif yazılımlar',
      tag: 'Design',
      iconBg: '#FFF1E8',
      iconColor: '#EA580C',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['soc', 'sosyal']),
      slug: 'social',
      name: 'Sosyal Ağlar & Topluluk',
      subtitle: 'Sohbet, etkileşim ve dijital buluşma ağları',
      tag: 'Social',
      iconBg: '#F8ECF3',
      iconColor: '#DB2777',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ], [categories]);

  // Pre-configured Game Categories
  const gameCategories: ActionCategoryItem[] = useMemo(() => [
    {
      id: getCatIdBySlug(['game-action', 'aksiyon']),
      slug: 'game-action',
      name: 'Aksiyon & Dövüş',
      subtitle: 'Hızlı refleks ve adrenalini yüksek oyunlar',
      tag: 'Aksiyon',
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['game-puzzle', 'bulmaca']),
      slug: 'game-puzzle',
      name: 'Bulmaca & Zeka',
      subtitle: 'Stratejik düşünme ve beyin egzersizleri',
      tag: 'Bulmaca',
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.439 7.85c-.049-.322.059-.648.289-.878l1.568-1.568c.47-.47.704-1.096.704-1.704 0-1.328-1.072-2.4-2.4-2.4-.608 0-1.234.234-1.704.704l-1.568 1.568a.747.747 0 0 1-.878.29c-.383-.122-.792-.187-1.21-.187-.418 0-.827.065-1.21.187a.747.747 0 0 1-.878-.29l-1.568-1.568c-.47-.47-1.096-.704-1.704-.704-1.328 0-2.4 1.072-2.4 2.4 0 .608.234 1.234.704 1.704l1.568 1.568c.23.23.338.556.289.878-.122.383-.187.792-.187 1.21 0 .418.065.827.187 1.21.049.322-.059.648-.289.878l-1.568 1.568c-.47.47-.704 1.096-.704 1.704 0 1.328 1.072 2.4 2.4 2.4.608 0 1.234-.234 1.704-.704l1.568-1.568a.747.747 0 0 1 .878-.29c.383.122.792.187 1.21.187.418 0 .827-.065 1.21-.187a.747.747 0 0 1 .878.29l1.568 1.568c.47.47 1.096.704 1.704.704 1.328 0 2.4-1.072 2.4-2.4 0-.608-.234-1.234-.704-1.704l-1.568-1.568a.747.747 0 0 1-.289-.878c.122-.383.187-.792.187-1.21 0-.418-.065-.827-.187-1.21z"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['game-adventure', 'macera']),
      slug: 'game-adventure',
      name: 'Macera & Keşif',
      subtitle: 'Sürükleyici senaryolar ve gizemli dünyalar',
      tag: 'Macera',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['game-rpg', 'rol']),
      slug: 'game-rpg',
      name: 'Rol Yapma (RPG)',
      subtitle: 'Karakter gelişimi, loot ve derin hikayeler',
      tag: 'RPG',
      iconBg: '#F3E8FF',
      iconColor: '#9333EA',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 22 5-5"/><path d="m8 14-5 5h3l4-4"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['game-strategy', 'strateji']),
      slug: 'game-strategy',
      name: 'Strateji & Taktik',
      subtitle: 'Kaynak yönetimi ve taktiksel üstünlük',
      tag: 'Strateji',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      id: getCatIdBySlug(['game-casual', 'eglence']),
      slug: 'game-casual',
      name: 'Basit Eğlence (Casual)',
      subtitle: 'Hızlı, dinlendirici ve tek dokunuşlu oyunlar',
      tag: 'Casual',
      iconBg: '#FEF9C3',
      iconColor: '#CA8A04',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      ),
    },
  ], [categories]);

  // Find active category label
  const activeCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const fromCat = categories.find((c) => c.id === selectedCategoryId);
    if (fromCat) return fromCat.name.split('&')[0].trim();
    const fromApps = appCategories.find((a) => a.id === selectedCategoryId);
    if (fromApps) return fromApps.name.split('&')[0].trim();
    const fromGames = gameCategories.find((g) => g.id === selectedCategoryId);
    if (fromGames) return fromGames.name.split('&')[0].trim();
    return 'Seçili';
  }, [selectedCategoryId, categories, appCategories, gameCategories]);

  // Dynamic dimensions based on active tab
  const dimensions = useMemo(() => {
    switch (activeTab) {
      case 'apps':
        return { width: 500, height: 260 };
      case 'games':
        return { width: 480, height: 250 };
      case 'explore':
        return { width: 440, height: 180 };
      default:
        return { width: activeCategoryName ? 480 : 430, height: 0 };
    }
  }, [activeTab, activeCategoryName]);

  const BUTTON_BAR_HEIGHT = 52;
  const currentHeight = activeTab ? dimensions.height + BUTTON_BAR_HEIGHT : BUTTON_BAR_HEIGHT;
  const currentWidth = dimensions.width;

  const handleSelect = (catId: string | null) => {
    onSelectCategory(catId);
    setActiveTab(null);
  };

  return (
    <div
      ref={containerRef}
      className="k-action-bar-root"
      onMouseLeave={() => setActiveTab(null)}
      style={style}
    >
      <div
        className={`k-action-bar-card ${activeTab ? 'expanded' : ''}`}
        style={{
          width: `${currentWidth}px`,
          height: `${currentHeight}px`,
        }}
      >
        {/* Expanded Content Area */}
        <div style={{ flex: '1 1 auto', overflow: 'hidden', display: activeTab ? 'flex' : 'none', flexDirection: 'column' }}>
          {activeTab === 'apps' && (
            <div className="k-action-content-box">
              {appCategories.map((item, idx) => {
                const isSelected = selectedCategoryId === item.id;
                return (
                  <div
                    key={idx}
                    className={`k-action-item-row ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className="k-action-item-icon" style={{ background: item.iconBg, color: item.iconColor }}>
                      {item.iconSvg}
                    </div>
                    <div className="k-action-item-info">
                      <div className="k-action-item-title">{item.name}</div>
                      <div className="k-action-item-sub">{item.subtitle}</div>
                    </div>
                    <span className="k-action-item-tag">{item.tag}</span>
                  </div>
                );
              })}
              <div className="k-action-divider" />
              <div
                className="k-action-more-btn"
                onClick={() => {
                  setActiveTab(null);
                  onOpenBrowse?.();
                }}
              >
                <span>Tüm 23 Uygulama Kategorisini Gör</span>
                <span>&rarr;</span>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="k-action-content-box">
              {gameCategories.map((item, idx) => {
                const isSelected = selectedCategoryId === item.id;
                return (
                  <div
                    key={idx}
                    className={`k-action-item-row ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className="k-action-item-icon" style={{ background: item.iconBg, color: item.iconColor }}>
                      {item.iconSvg}
                    </div>
                    <div className="k-action-item-info">
                      <div className="k-action-item-title">{item.name}</div>
                      <div className="k-action-item-sub">{item.subtitle}</div>
                    </div>
                    <span className="k-action-item-tag">{item.tag}</span>
                  </div>
                );
              })}
              <div className="k-action-divider" />
              <div
                className="k-action-more-btn"
                onClick={() => {
                  setActiveTab(null);
                  onOpenBrowse?.();
                }}
              >
                <span>Tüm 15 Oyun Kategorisini Gör</span>
                <span>&rarr;</span>
              </div>
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="k-action-content-box">
              <div
                className={`k-action-item-row ${!selectedCategoryId ? 'active' : ''}`}
                onClick={() => handleSelect(null)}
              >
                <div className="k-action-item-icon" style={{ background: '#EAF2FC', color: '#3269C7' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
                  </svg>
                </div>
                <div className="k-action-item-info">
                  <div className="k-action-item-title">Tüm Projeler</div>
                  <div className="k-action-item-sub">Kategori filtresini temizle, tüm akışı göster</div>
                </div>
                <span className="k-action-item-tag">Tümü</span>
              </div>

              <div
                className="k-action-item-row"
                onClick={() => {
                  setActiveTab(null);
                  onOpenBrowse?.();
                }}
              >
                <div className="k-action-item-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                  </svg>
                </div>
                <div className="k-action-item-info">
                  <div className="k-action-item-title">Göz At Kataloğu</div>
                  <div className="k-action-item-sub">38 bağımsız kategori ve 3D stüdyo ikonları</div>
                </div>
                <span className="k-action-item-tag">Göz At &rarr;</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Action Button Bar */}
        <div className="k-action-btn-bar" style={{ height: `${BUTTON_BAR_HEIGHT}px` }}>
          <button
            type="button"
            onMouseEnter={() => setActiveTab('apps')}
            onClick={() => setActiveTab(activeTab === 'apps' ? null : 'apps')}
            className={`k-action-nav-btn ${activeTab === 'apps' ? 'active-tab' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
            </svg>
            <span>Uygulamalar</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => setActiveTab('games')}
            onClick={() => setActiveTab(activeTab === 'games' ? null : 'games')}
            className={`k-action-nav-btn ${activeTab === 'games' ? 'active-tab' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/>
            </svg>
            <span>Oyunlar</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => setActiveTab('explore')}
            onClick={() => setActiveTab(activeTab === 'explore' ? null : 'explore')}
            className={`k-action-nav-btn ${activeTab === 'explore' ? 'active-tab' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Tümü</span>
          </button>

          {/* Active Filter Chip Pill */}
          {activeCategoryName && (
            <div className="k-active-filter-badge">
              <span>{activeCategoryName}</span>
              <button
                type="button"
                className="k-active-filter-clear"
                title="Filtreyi Temizle"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory(null);
                }}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryFilterBar;
