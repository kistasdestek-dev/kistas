import React, { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Category } from '../../categories/domain/Category';
import type {
  DiscoverPlatform,
  DiscoverSort,
  DynamicDiscoverFiltersProps,
} from './DynamicDiscoverFilters';
import { getCategoryFilterIcon } from './categoryFilterIcons';

type Panel = 'sort' | 'category' | 'platform';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SORTS: ReadonlyArray<{ id: DiscoverSort; label: string; hint: string; icon: IconName }> = [
  { id: 'trending', label: 'Öne Çıkan', hint: 'Editör seçkileri ve yükselen projeler', icon: 'sparkles-outline' },
  { id: 'top_voted', label: 'En Çok Desteklenen', hint: 'Topluluğun en çok destekledikleri', icon: 'chevron-up-circle-outline' },
  { id: 'newest', label: 'Yeni', hint: 'Vitrine yeni katılan projeler', icon: 'time-outline' },
];

const PLATFORMS: ReadonlyArray<{ id: DiscoverPlatform; label: string; icon: IconName }> = [
  { id: 'all', label: 'Tümü', icon: 'layers-outline' },
  { id: 'iOS', label: 'iOS', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
  { id: 'SaaS', label: 'SaaS', icon: 'cloud-outline' },
];

const STYLE_ID = 'kdf-web-styles';
const CSS = `
.kdf-wrap {
  width: 100%;
  max-width: 580px;
  margin: 4px 0 16px;
  position: relative;
  z-index: 35;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.kdf-bar {
  width: 100%;
  height: 48px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #FFFFFF;
  border: 1px solid #D8E2EF;
  border-radius: 15px;
  box-shadow: 0 4px 16px -6px rgba(28, 50, 82, 0.08);
  box-sizing: border-box;
}

.kdf-btn {
  height: 40px;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: #55667D;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.kdf-btn:hover {
  background: #F4F7FB;
  color: #263345;
}

.kdf-btn.is-active {
  background: #EEF7F5;
  border-color: #A3CEC5;
  color: #126D64;
  box-shadow: inset 0 -2px 0 #218779;
}

.kdf-btn-val {
  min-width: 0;
  max-width: 86px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 3px 6px;
  border-radius: 6px;
  background: #EDF2F8;
  color: #48596F;
  font-size: 9.5px;
  font-weight: 650;
}

.kdf-btn.is-active .kdf-btn-val {
  background: #D9EFEA;
  color: #16685D;
}

.kdf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: transparent;
}

.kdf-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 50;
  background: #FFFFFF;
  border: 1px solid #CFDEEF;
  border-radius: 18px;
  box-shadow: 0 18px 42px -10px rgba(20, 42, 74, 0.18), 0 0 0 1px rgba(50, 105, 199, 0.05);
  box-sizing: border-box;
  overflow: hidden;
  contain: paint;
  will-change: transform, opacity;
  animation: kdfPopIn 0.14s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes kdfPopIn {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.kdf-panel-inner {
  padding: 14px 14px 12px;
  box-sizing: border-box;
}

.kdf-p-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 2px;
}

.kdf-p-kicker {
  color: #2F6CBE;
  font-size: 9px;
  font-weight:700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kdf-p-title {
  margin-top: 2px;
  color: #1E2533;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.kdf-p-close {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1px solid #DCE4EE;
  border-radius: 8px;
  background: #FFFFFF;
  color: #607086;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.kdf-p-close:hover {
  background: #EAF2FC;
  color: #285FA8;
  border-color: #BACEE8;
}

/* Sort & Platform Options */
.kdf-list-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kdf-list-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 6px 10px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #FFFFFF;
  color: #242E3D;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}

.kdf-list-item:hover {
  background: #F6F9FD;
  border-color: #B9CFEC;
}

.kdf-list-item.is-selected {
  border-color: #9ECAC0;
  background: linear-gradient(100deg, #F3F9F7 0%, #FAFCFC 80%);
  box-shadow: inset 3px 0 0 #218779;
}

.kdf-item-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #EAF1FB;
  color: #285FA8;
}

.kdf-list-item.is-selected .kdf-item-icon {
  background: #DCF0EB;
  color: #126D64;
}

.kdf-item-copy {
  min-width: 0;
}

.kdf-item-label {
  display: block;
  overflow: hidden;
  color: #242E3D;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kdf-item-hint {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: #748396;
  font-size: 9.5px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kdf-item-check {
  display: grid;
  place-items: center;
  color: #218779;
  opacity: 0;
}

.kdf-list-item.is-selected .kdf-item-check {
  opacity: 1;
}

/* Platform Grid */
.kdf-platform-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.kdf-platform-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 6px 10px;
  border: 1px solid #E2E8F0;
  border-radius: 11px;
  background: #FFFFFF;
  color: #263345;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}

.kdf-platform-item:hover {
  background: #F6F9FD;
  border-color: #B9CFEC;
}

.kdf-platform-item.is-selected {
  border-color: #9ECAC0;
  background: #F1F8F6;
  color: #126D64;
  box-shadow: inset 0 0 0 1px #218779;
}

.kdf-platform-text {
  font-size: 11.5px;
  font-weight: 700;
}

/* Category Grid */
.kdf-cat-scroll {
  max-height: 250px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #C5D4E6 transparent;
}

.kdf-cat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.kdf-cat-item {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 5px 8px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #FFFFFF;
  color: #283547;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}

.kdf-cat-item:hover {
  background: #F6F9FD;
  border-color: #B9CFEC;
}

.kdf-cat-item.is-selected {
  border-color: #9ECAC0;
  background: #F1F8F6;
  box-shadow: inset 0 0 0 1px #218779;
}

.kdf-cat-icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #EAF1FB;
  color: #285FA8;
}

.kdf-cat-item.is-selected .kdf-cat-icon {
  background: #DCF0EB;
  color: #126D64;
}

.kdf-cat-label {
  display: block;
  overflow: hidden;
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kdf-cat-item.is-selected .kdf-cat-label {
  color: #126D64;
  font-weight: 750;
}

.kdf-browse-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #EDF2F8;
}

.kdf-browse-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #2F6CBE;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 6px;
}

.kdf-browse-btn:hover {
  color: #1A54A4;
  text-decoration: underline;
}

@media (max-width: 600px) {
  .kdf-wrap {
    max-width: 100%;
  }
  .kdf-bar {
    height: 44px;
    gap: 2px;
    padding: 3px;
    border-radius: 13px;
  }
  .kdf-btn {
    height: 36px;
    padding: 0 6px;
    gap: 5px;
    font-size: 10.5px;
  }
  .kdf-btn-val {
    display: none;
  }
  .kdf-platform-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .kdf-cat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

export const DynamicDiscoverFilters: React.FC<DynamicDiscoverFiltersProps> = ({
  categories,
  selectedCategoryId,
  selectedPlatform,
  selectedSort,
  onSelectCategory,
  onSelectPlatform,
  onSelectSort,
  onOpenBrowse,
}) => {
  const [panel, setPanel] = useState<Panel | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById(STYLE_ID)) {
      const el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = CSS;
      document.head.appendChild(el);
    }
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const selectedSortLabel = useMemo(
    () => SORTS.find((item) => item.id === selectedSort)?.label ?? 'Öne Çıkan',
    [selectedSort],
  );

  const selectedPlatformLabel = useMemo(
    () => PLATFORMS.find((item) => item.id === selectedPlatform)?.label ?? 'Tümü',
    [selectedPlatform],
  );

  const categoryLabel = selectedCategory?.name ?? 'Tümü';

  const handleSortSelect = (id: DiscoverSort) => {
    onSelectSort(id);
    setPanel(null);
  };

  const handleCategorySelect = (id: string | null) => {
    onSelectCategory(id);
    setPanel(null);
  };

  const handlePlatformSelect = (id: DiscoverPlatform) => {
    onSelectPlatform(id);
    setPanel(null);
  };

  const handleBrowseClick = () => {
    setPanel(null);
    onOpenBrowse?.();
  };

  return (
    <div className="kdf-wrap">
      {panel ? <div className="kdf-backdrop" onClick={() => setPanel(null)} /> : null}

      <div className="kdf-bar" role="toolbar" aria-label="Keşfet filtreleri">
        <button
          type="button"
          className={`kdf-btn${panel === 'sort' ? ' is-active' : ''}`}
          aria-expanded={panel === 'sort'}
          onClick={() => setPanel((curr) => (curr === 'sort' ? null : 'sort'))}
        >
          <Ionicons name="options-outline" size={16} />
          <span>Sıralama</span>
          <span className="kdf-btn-val">{selectedSortLabel}</span>
        </button>

        <button
          type="button"
          className={`kdf-btn${panel === 'category' ? ' is-active' : ''}`}
          aria-expanded={panel === 'category'}
          onClick={() => setPanel((curr) => (curr === 'category' ? null : 'category'))}
        >
          <Ionicons name="grid-outline" size={16} />
          <span>Kategori</span>
          <span className="kdf-btn-val">{categoryLabel}</span>
        </button>

        <button
          type="button"
          className={`kdf-btn${panel === 'platform' ? ' is-active' : ''}`}
          aria-expanded={panel === 'platform'}
          onClick={() => setPanel((curr) => (curr === 'platform' ? null : 'platform'))}
        >
          <Ionicons name="desktop-outline" size={16} />
          <span>Platform</span>
          <span className="kdf-btn-val">{selectedPlatformLabel}</span>
        </button>
      </div>

      {panel ? (
        <div className="kdf-popover">
          <div className="kdf-panel-inner">
            <div className="kdf-p-head">
              <div>
                <div className="kdf-p-kicker">
                  {panel === 'sort' ? 'Keşif Akışı' : panel === 'category' ? 'İlgi Alanı' : 'Uyumluluk'}
                </div>
                <div className="kdf-p-title">
                  {panel === 'sort'
                    ? 'Projeleri nasıl sıralayalım?'
                    : panel === 'category'
                    ? 'Bir kategori seçin'
                    : 'Platforma göre filtreleyin'}
                </div>
              </div>
              <button
                type="button"
                className="kdf-p-close"
                onClick={() => setPanel(null)}
                aria-label="Kapat"
              >
                <Ionicons name="close" size={16} />
              </button>
            </div>

            {panel === 'sort' ? (
              <div className="kdf-list-stack">
                {SORTS.map((item) => {
                  const isSelected = selectedSort === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`kdf-list-item${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handleSortSelect(item.id)}
                    >
                      <span className="kdf-item-icon">
                        <Ionicons name={item.icon} size={16} />
                      </span>
                      <span className="kdf-item-copy">
                        <span className="kdf-item-label">{item.label}</span>
                        <span className="kdf-item-hint">{item.hint}</span>
                      </span>
                      <span className="kdf-item-check">
                        <Ionicons name="checkmark-circle" size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {panel === 'category' ? (
              <>
                <div className="kdf-cat-scroll">
                  <div className="kdf-cat-grid">
                    <button
                      type="button"
                      className={`kdf-cat-item${selectedCategoryId === null ? ' is-selected' : ''}`}
                      onClick={() => handleCategorySelect(null)}
                    >
                      <span className="kdf-cat-icon">
                        <MaterialCommunityIcons name="view-grid-outline" size={15} />
                      </span>
                      <span className="kdf-cat-label">Tümü</span>
                    </button>
                    {categories.map((item) => {
                      const isSelected = selectedCategoryId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`kdf-cat-item${isSelected ? ' is-selected' : ''}`}
                          onClick={() => handleCategorySelect(item.id)}
                        >
                          <span className="kdf-cat-icon">
                            <MaterialCommunityIcons name={getCategoryFilterIcon(item.slug)} size={15} />
                          </span>
                          <span className="kdf-cat-label">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {onOpenBrowse ? (
                  <div className="kdf-browse-footer">
                    <button type="button" className="kdf-browse-btn" onClick={handleBrowseClick}>
                      Tüm kategorileri gör <Ionicons name="arrow-forward" size={13} />
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            {panel === 'platform' ? (
              <div className="kdf-platform-grid">
                {PLATFORMS.map((item) => {
                  const isSelected = selectedPlatform === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`kdf-platform-item${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handlePlatformSelect(item.id)}
                    >
                      <Ionicons name={item.icon} size={15} />
                      <span className="kdf-platform-text">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
