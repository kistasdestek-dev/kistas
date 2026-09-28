'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscoveryCard } from '@kistas/shared';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface ActionSearchBarProps {
  query?: string;
  onQueryChange?: (q: string) => void;
  projects?: DiscoveryCard[];
  placeholder?: string;
  onSelectProject?: (project: DiscoveryCard) => void;
  className?: string;
}

const normalizeSearchText = (value?: string | null): string => {
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

const calculateSearchRelevance = (project: DiscoveryCard, rawQuery: string): number => {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const title = normalizeSearchText(project.title);
  const tagline = normalizeSearchText(project.tagline);
  const desc = normalizeSearchText(project.description);

  let score = 0;
  if (title === q) {
    score += 1200;
  } else if (title.startsWith(q)) {
    score += 1000;
  } else if (title.includes(q)) {
    score += 500;
  }

  if (tagline) {
    if (tagline.startsWith(q)) {
      score += 400;
    } else if (tagline.includes(q)) {
      score += 200;
    }
  }

  if (desc && q.length >= 3 && desc.includes(q)) {
    score += 80;
  }

  if (normalizeSearchText(project.developer_name).includes(q)) score += 100;

  if (score > 0 && project.is_boosted) {
    score += 10;
  }

  return score;
};

export const ActionSearchBar: React.FC<ActionSearchBarProps> = ({
  query: controlledQuery,
  onQueryChange,
  projects = [],
  placeholder = 'Uygulama, proje veya geliştirici ara...',
  onSelectProject,
  className = '',
}) => {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = controlledQuery !== undefined ? controlledQuery : internalQuery;

  const handleQueryChange = (val: string) => {
    if (onQueryChange) {
      onQueryChange(val);
    } else {
      setInternalQuery(val);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter projects by relevance
  const searchResults = useMemo(() => {
    if (!isFocused) return [];
    const q = query.trim();
    if (!q) {
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
  }, [projects, query, isFocused]);

  const handleSelect = (project: DiscoveryCard) => {
    setIsFocused(false);
    if (onSelectProject) {
      onSelectProject(project);
    } else {
      router.push(`/listings/${project.id}`);
    }
  };

  const hasValue = query.length > 0;

  return (
    <div ref={rootRef} className={`asb-root${isFocused ? ' is-active' : ''} ${className}`}>
      {/* Search Input Shell */}
      <div
        className={`asb-input-shell${isFocused ? ' is-focused' : ''} cursor-text`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Left Magnifier Icon */}
        <span className="asb-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        {/* Text Input */}
        <input
          maxLength={100}
          ref={inputRef}
          type="text"
          className="asb-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onClick={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsFocused(false);
              handleQueryChange('');
            }
          }}
          aria-label={placeholder}
        />

        {/* Trailing Controls: Clear + Classic Search Action Icon */}
        <div className="asb-trailing">
          {hasValue ? (
            <button
              type="button"
              className="asb-clear-btn"
              title="Aramayı temizle"
              onClick={(e) => {
                e.preventDefault();
                handleQueryChange('');
                inputRef.current?.focus();
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Dropdown Results */}
      {isFocused && searchResults.length > 0 ? (
        <div
          className="asb-dropdown"
          style={{ WebkitBackdropFilter: 'blur(24px) saturate(180%)', transform: 'translateZ(0)' }}
        >
          <div className="asb-dropdown-header">
            <span className="asb-dropdown-title">
              {query.trim().length > 0 ? 'Arama Sonuçları' : 'Öne Çıkan Girişimler'}
            </span>
            <span className="asb-dropdown-count">
              {searchResults.length} {query.trim().length > 0 ? 'Sonuç' : 'Girişim'}
            </span>
          </div>

          <ul className="asb-list">
            {searchResults.map((project, idx) => {
              const initials = (project.title || 'K').slice(0, 2).toUpperCase();
              const logo = project.logo_url || (project.images && project.images[0]?.image_url);
              const primaryPlatform = (project.platforms && project.platforms[0]) || 'Web';

              return (
                <li
                  key={project.id || `search-res-${idx}`}
                  className="asb-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(project);
                  }}
                  onClick={() => handleSelect(project)}
                >
                  <div className="asb-item-left">
                    <div className="asb-item-logo-shell">
                      {logo ? (
                        <AutoTransparentLogo
                          src={logo}
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
                        {project.is_boosted ? (
                          <span className="asb-item-sponsored">Sponsorlu</span>
                        ) : null}
                      </div>
                      <span className="asb-item-tagline">
                        {project.tagline || project.description || 'Kıstas Vitrin Projesi'}
                      </span>
                    </div>
                  </div>

                  <div className="asb-item-right">
                    <span className="asb-item-badge">{primaryPlatform}</span>
                    <span className="asb-item-arrow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="asb-dropdown-footer">
            <span className="inline-flex items-center gap-1.5">
              <span className="asb-kbd">ESC</span> Kapat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="asb-kbd">↵</span> Seç
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
