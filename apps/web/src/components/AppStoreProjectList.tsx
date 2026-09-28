'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, ChevronUp, Sparkles } from 'lucide-react';
import type { Listing } from '@kistas/shared';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface AppStoreProjectListProps {
  title?: string;
  subtitle?: string;
  projects: Listing[];
  variant?: 'ranked' | 'new';
  maxItems?: number;
  viewAllHref?: string;
  onOpenAll?: () => void;
  showViewAll?: boolean;
  showEmptyState?: boolean;
  fullPage?: boolean;
}

const formatLaunchDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export const AppStoreProjectList: React.FC<AppStoreProjectListProps> = ({
  title,
  subtitle,
  projects,
  variant = 'ranked',
  maxItems = 6,
  viewAllHref = '/popular',
  onOpenAll,
  showViewAll = true,
  showEmptyState = false,
  fullPage = false,
}) => {
  if ((!projects || projects.length === 0) && !showEmptyState) return null;

  const displayList = projects.slice(0, maxItems);
  const splitIndex = Math.ceil(displayList.length / 2);
  const firstColumn = displayList.slice(0, splitIndex);
  const secondColumn = displayList.slice(splitIndex);
  const hasHeader = Boolean(title || subtitle || showViewAll);

  const renderLeadingMarker = (index: number) => {
    if (variant === 'new') {
      return <span className="ios-project-new-marker">Yeni</span>;
    }

    const rank = index + 1;
    return (
      <span className={`ios-project-rank ios-project-rank-${Math.min(rank, 4)}`}>
        {rank}
      </span>
    );
  };

  const renderProjectRow = (project: Listing, index: number, isLast: boolean) => {
    const initials = project.title ? project.title.slice(0, 2).toUpperCase() : 'KT';
    const supportCount = project.upvote_count || 0;
    const launchDate = variant === 'new' ? formatLaunchDate(project.created_at) : null;

    return (
      <Link key={project.id} href={`/listings/${project.id}`} className="ios-project-row group">
        <div className="ios-project-main">
          {renderLeadingMarker(index)}

          <div className="ios-project-icon">
            {project.logo_url ? (
              <AutoTransparentLogo
                src={project.logo_url}
                alt={project.title}
                shape="none"
                className="ios-project-logo"
              />
            ) : (
              <span className="ios-project-initials">{initials}</span>
            )}
          </div>

          <div className="ios-project-copy">
            <h2 className="ios-project-title">{project.title}</h2>
            <p className="ios-project-description">
              {project.tagline || project.description || 'Bağımsız dijital proje'}
            </p>
          </div>
        </div>

        <div className="ios-project-trailing">
          {launchDate && <span className="ios-project-date">{launchDate}</span>}
          {project.is_boosted && (
            <span className="ios-project-sponsored">
              <Sparkles size={10} /> Sponsorlu
            </span>
          )}
          <span className="ios-project-support" aria-label={`${supportCount} destek`}>
            <ChevronUp size={13} />
            <span>{supportCount}</span>
          </span>
          <ChevronRight size={17} className="ios-project-chevron" />
        </div>

        {!isLast && <span className="ios-project-separator" aria-hidden="true" />}
      </Link>
    );
  };

  return (
    <section className={`ios-project-section${fullPage ? ' ios-project-section-page' : ''}${variant === 'new' ? ' is-new' : ''}`}>
      {hasHeader && (
        <div className="ios-project-header">
          <div>
            {title && <h2 className="ios-project-heading">{title}</h2>}
            {subtitle && <p className="ios-project-subtitle">{subtitle}</p>}
          </div>

          {showViewAll && (onOpenAll ? (
            <button type="button" onClick={onOpenAll} className="ios-project-view-all group cursor-pointer">
              <span>Tümünü Gör</span>
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <Link href={viewAllHref} className="ios-project-view-all group">
              <span>Tümünü Gör</span>
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      <div className="ios-project-list-glass">
        {displayList.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-6 text-center text-sm font-medium text-[#94A3B8]">
            Bu bölümde henüz proje bulunmuyor.
          </div>
        ) : (
          <div className="ios-project-grid">
            <div className="ios-project-column">
              {firstColumn.map((project, index) =>
                renderProjectRow(project, index, index === firstColumn.length - 1)
              )}
            </div>
            {secondColumn.length > 0 && (
              <div className="ios-project-column ios-project-column-secondary">
                {secondColumn.map((project, index) =>
                  renderProjectRow(project, index + splitIndex, index === secondColumn.length - 1)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
