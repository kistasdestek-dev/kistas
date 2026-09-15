import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { isListingSponsored, Listing } from '../../features/listings/domain/Listing';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface ActionSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  projects: Listing[];
  onSelectProject?: (project: Listing) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  accentColor?: string;
}

function useDebounce<T>(value: T, delay: number = 180): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const ACTION_SEARCH_STYLE_ID = 'kistas-action-search-bar-styles';
const ACTION_SEARCH_CSS = `
.asb-root {
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  z-index: 99999 !important;
}
.asb-root.is-active {
  z-index: 999999 !important;
}
.asb-input-shell {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(50, 105, 199, 0.20);
  border-radius: 9999px;
  box-shadow: 0 8px 24px -6px rgba(27, 58, 99, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.26s cubic-bezier(0.2, 0.9, 0.22, 1);
  padding: 0 14px 0 16px;
  box-sizing: border-box;
}
.asb-input-shell:hover {
  border-color: rgba(50, 105, 199, 0.35);
  box-shadow: 0 12px 28px -6px rgba(27, 58, 99, 0.12);
}
.asb-input-shell.is-focused {
  border-color: #3269C7;
  background: #FFFFFF;
  box-shadow: 0 14px 36px -8px rgba(50, 105, 199, 0.22), 0 0 0 3px rgba(50, 105, 199, 0.12);
}
.asb-search-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #718096;
  margin-right: 12px;
  flex-shrink: 0;
  transition: color 0.2s ease, transform 0.2s ease;
}
.asb-input-shell.is-focused .asb-search-icon {
  color: #3269C7;
  transform: scale(1.05);
}
.asb-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14.5px;
  font-weight: 500;
  color: #252333;
  letter-spacing: -0.01em;
}
.asb-input::placeholder {
  color: #8C9BAB;
  font-weight: 400;
}
.asb-trailing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
  flex-shrink: 0;
}
.asb-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(50, 105, 199, 0.08);
  color: #3269C7;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.asb-action-icon:hover {
  background: #3269C7;
  color: #FFFFFF;
  transform: scale(1.1);
}
.asb-action-icon:active {
  transform: scale(0.92);
}
.asb-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: #55657E;
  cursor: pointer;
  transition: all 0.18s ease;
}
.asb-clear-btn:hover {
  background: rgba(0, 0, 0, 0.12);
  color: #252333;
}

/* Floating Dropdown Results */
.asb-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(50, 105, 199, 0.18);
  border-radius: 18px;
  box-shadow: 0 20px 48px -12px rgba(27, 58, 99, 0.24), 0 4px 16px -2px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  overflow: hidden;
  animation: asb-dropdown-in 0.26s cubic-bezier(0.2, 0.9, 0.22, 1) forwards;
  z-index: 999999 !important;
}
@keyframes asb-dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.asb-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 8px;
  border-bottom: 1px solid rgba(50, 105, 199, 0.08);
}
.asb-dropdown-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.asb-dropdown-count {
  font-size: 11px;
  font-weight: 600;
  color: #3269C7;
  background: rgba(50, 105, 199, 0.10);
  padding: 2px 7px;
  border-radius: 12px;
}
.asb-list {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.asb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  background: transparent;
  transition: background-color 0.18s ease, transform 0.16s ease;
  animation: asb-item-in 0.22s ease forwards;
}
@keyframes asb-item-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.asb-item:hover {
  background: rgba(50, 105, 199, 0.08);
  transform: translateX(2px);
}
.asb-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.asb-item-logo-shell {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #F1F5F9;
  border: 1px solid rgba(50, 105, 199, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.asb-item-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.asb-item-initials {
  font-size: 13px;
  font-weight: 800;
  color: #3269C7;
}
.asb-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.asb-item-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.asb-item-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asb-item-sponsored {
  font-size: 9.5px;
  font-weight: 800;
  color: #3269C7;
  background: rgba(50, 105, 199, 0.12);
  padding: 1px 5px;
  border-radius: 6px;
  text-transform: uppercase;
}
.asb-item-tagline {
  font-size: 11.5px;
  font-weight: 400;
  color: #64748B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.asb-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  flex-shrink: 0;
}
.asb-item-badge {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: rgba(0, 0, 0, 0.04);
  padding: 3px 8px;
  border-radius: 8px;
}
.asb-item-arrow {
  color: #94A3B8;
  transition: transform 0.16s ease, color 0.16s ease;
}
.asb-item:hover .asb-item-arrow {
  color: #3269C7;
  transform: translateX(2px) translateY(-2px);
}
.asb-dropdown-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(248, 250, 252, 0.95);
  border-top: 1px solid rgba(50, 105, 199, 0.08);
  font-size: 11.5px;
  color: #556987;
  gap: 12px;
}
.asb-footer-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.asb-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #334155;
  background: #FFFFFF;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-bottom: 2px solid rgba(148, 163, 184, 0.6);
  border-radius: 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.asb-empty-state {
  padding: 24px 16px;
  text-align: center;
  color: #64748B;
  font-size: 13px;
}
`;

export const normalizeSearchText = (value?: string | null): string => {
  if (!value) return '';
  return value
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .trim();
};

export const calculateSearchRelevance = (project: Listing, rawQuery: string): number => {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const title = normalizeSearchText(project.title);
  const tagline = normalizeSearchText(project.tagline);
  const maker = normalizeSearchText(project.developerName || project.seller?.fullName);
  const category = normalizeSearchText(project.showcaseCategoryName);
  const desc = normalizeSearchText(project.description);

  let score = 0;

  // 1. Proje Başlığı (En Yüksek Öncelik)
  if (title === q) {
    score += 1200;
  } else if (title.startsWith(q)) {
    score += 1000;
  } else {
    const titleWords = title.split(/[\s\-_]+/);
    if (titleWords.some((w) => w.startsWith(q))) {
      score += 800;
    } else if (title.includes(q)) {
      score += 500;
    }
  }

  // 2. Proje Sloganı / Tagline
  if (tagline) {
    if (tagline.startsWith(q)) {
      score += 400;
    } else {
      const taglineWords = tagline.split(/[\s\-_]+/);
      if (taglineWords.some((w) => w.startsWith(q))) {
        score += 300;
      } else if (q.length >= 3 && tagline.includes(q)) {
        score += 150;
      }
    }
  }

  // 3. Geliştirici / Ekleyen Kişi
  if (maker) {
    if (maker.startsWith(q)) {
      score += 350;
    } else {
      const makerWords = maker.split(/[\s\-_]+/);
      if (makerWords.some((w) => w.startsWith(q))) {
        score += 250;
      } else if (q.length >= 3 && maker.includes(q)) {
        score += 100;
      }
    }
  }

  // 4. Kategori Adı
  if (category) {
    if (category.startsWith(q)) {
      score += 250;
    } else if (q.length >= 3 && category.includes(q)) {
      score += 120;
    }
  }

  // 5. Uzun Açıklama Metni (Sadece 4 harf ve üzeri aramalarda, kelime başlangıcı ile)
  // Böylece "ge", "an", "de" gibi 2-3 harfli aramalarda alakasız projelerin çıkması önlenir.
  if (q.length >= 4 && desc) {
    const descWords = desc.split(/[\s\-_]+/);
    if (descWords.some((w) => w.startsWith(q))) {
      score += 80;
    } else if (desc.includes(q)) {
      score += 40;
    }
  }

  // Ek bonus: Sponsorlu veya öne çıkan projelere eşit skor durumunda hafif öncelik
  if (score > 0 && isListingSponsored(project)) {
    score += 5;
  }

  return score;
};

export const ActionSearchBar: React.FC<ActionSearchBarProps> = ({
  query,
  onQueryChange,
  projects,
  onSelectProject,
  placeholder = "Uygulama, proje veya geliştirici ara",
  containerStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 160);

  // Inject CSS for Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!document.getElementById(ACTION_SEARCH_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = ACTION_SEARCH_STYLE_ID;
      style.textContent = ACTION_SEARCH_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // 1000'lerce proje dahi olsa alakasız projeleri eleyen alaka puanı sıralaması
  const searchResults = useMemo(() => {
    if (!isFocused) return [];

    const q = debouncedQuery.trim();
    if (!q) {
      // Tıklandığında vitrindeki ilk 5 proje otomatik sıralansın
      return projects.slice(0, 5);
    }

    return projects
      .map((project) => ({
        project,
        score: calculateSearchRelevance(project, q),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.project);
  }, [debouncedQuery, isFocused, projects]);

  const handleSelect = (project: Listing) => {
    setIsFocused(false);
    onSelectProject?.(project);
  };

  const hasValue = query.length > 0;

  if (Platform.OS !== 'web') {
    return (
      <View style={[nativeStyles.root, containerStyle]}>
        <View style={[nativeStyles.inputShell, isFocused && nativeStyles.inputShellFocused]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={isFocused ? '#3269C7' : '#718096'}
            style={nativeStyles.searchIcon}
          />
          <TextInput
            style={nativeStyles.input}
            placeholder={placeholder}
            placeholderTextColor="#8C9BAB"
            value={query}
            onChangeText={onQueryChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 220)}
          />
          {hasValue ? (
            <TouchableOpacity onPress={() => onQueryChange('')} style={nativeStyles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#718096" />
            </TouchableOpacity>
          ) : null}
        </View>

        {isFocused && searchResults.length > 0 ? (
          <View style={nativeStyles.dropdown}>
            {searchResults.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={nativeStyles.item}
                onPress={() => handleSelect(project)}
              >
                <Text style={nativeStyles.itemTitle}>{project.title}</Text>
                <Text style={nativeStyles.itemTagline} numberOfLines={1}>
                  {project.tagline || project.description || 'Kıstas Vitrin Projesi'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <div className={`asb-root${isFocused ? ' is-active' : ''}`} style={containerStyle as any}>
      <div className={`asb-input-shell${isFocused ? ' is-focused' : ''}`}>
        <span className="asb-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="asb-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Click to register on item before blur closes
            setTimeout(() => setIsFocused(false), 220);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsFocused(false);
              onQueryChange('');
            }
          }}
          aria-label={placeholder}
        />
        <div className="asb-trailing">
          {hasValue ? (
            <button
              type="button"
              className="asb-clear-btn"
              title="Aramayı temizle"
              onClick={(e) => {
                e.preventDefault();
                onQueryChange('');
                inputRef.current?.focus();
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className="asb-action-icon"
            title={hasValue ? 'Ara' : 'Keşfet'}
            onClick={() => {
              if (!isFocused) setIsFocused(true);
            }}
          >
            {hasValue ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isFocused ? (
        <div className="asb-dropdown">
          <div className="asb-dropdown-header">
            <span className="asb-dropdown-title">
              {query.trim().length > 0 ? 'Arama Sonuçları' : 'Öne Çıkan Girişimler'}
            </span>
            <span className="asb-dropdown-count">
              {searchResults.length} {query.trim().length > 0 ? 'Sonuç' : 'Girişim'}
            </span>
          </div>

          {searchResults.length > 0 ? (
            <ul className="asb-list">
              {searchResults.map((project, idx) => {
                const initials = (project.title || 'K').slice(0, 2).toUpperCase();
                const categoryLabel = project.showcaseCategoryName || (project.platforms && project.platforms[0]) || 'Proje';
                const isSponsored = isListingSponsored(project);
                return (
                  <li
                    key={project.id || `search-res-${idx}`}
                    className="asb-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(project);
                    }}
                  >
                    <div className="asb-item-left">
                      <div className="asb-item-logo-shell">
                        {project.logoUrl ? (
                          <AutoTransparentLogo
                            src={project.logoUrl}
                            alt={`${project.title} logosu`}
                            className="asb-item-logo"
                          />
                        ) : (
                          <span className="asb-item-initials">{initials}</span>
                        )}
                      </div>
                      <div className="asb-item-info">
                        <div className="asb-item-title-row">
                          <span className="asb-item-title">{project.title}</span>
                          {isSponsored ? (
                            <span className="asb-item-sponsored">Vitrin</span>
                          ) : null}
                        </div>
                        <span className="asb-item-tagline">
                          {project.tagline || project.description || 'Kıstas Vitrin Projesi'}
                        </span>
                      </div>
                    </div>
                    <div className="asb-item-right">
                      <span className="asb-item-badge">{categoryLabel}</span>
                      <svg
                        className="asb-item-arrow"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="asb-empty-state">
              "{query}" ile eşleşen bir girişim bulunamadı.
            </div>
          )}

          <div className="asb-dropdown-footer">
            <div className="asb-footer-action">
              <span className="asb-kbd">↵</span>
              <span>Girişimi İncele</span>
            </div>
            <div className="asb-footer-action">
              <span className="asb-kbd">Esc</span>
              <span>Kapat</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const nativeStyles = StyleSheet.create({
  root: {
    width: '100%',
    position: 'relative',
    zIndex: 99999,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(50, 105, 199, 0.20)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
  },
  inputShellFocused: {
    borderColor: '#3269C7',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#252333',
  },
  clearBtn: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(50, 105, 199, 0.18)',
    shadowColor: '#1B3A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    padding: 8,
    zIndex: 999999,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
