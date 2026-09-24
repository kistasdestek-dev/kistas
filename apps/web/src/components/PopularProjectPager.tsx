'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronRight, ArrowRight, Lock } from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import type { Listing } from '@kistas/shared';

export interface PopularProjectPagerProps {
  title: string;
  subtitle?: string;
  projects: Listing[];
  metric?: 'weekly' | 'lifetime';
  viewAllHref?: string;
  onOpenAll?: () => void;
  showEmptyState?: boolean;
}

export const PopularProjectPager: React.FC<PopularProjectPagerProps> = ({
  title,
  subtitle,
  projects,
  metric: _metric = 'lifetime',
  viewAllHref = '/popular',
  onOpenAll,
  showEmptyState = false,
}) => {
  if ((!projects || projects.length === 0) && !showEmptyState) return null;

  const displayList = projects.slice(0, 6);
  const firstCol = displayList.slice(0, 3);
  const secondCol = displayList.slice(3, 6);

  const getRankBadge = (rank: number) => {
    return (
      <span className={`ios-project-rank ios-project-rank-${Math.min(rank, 4)}`}>
        {rank}
      </span>
    );
  };

  const renderProjectRow = (project: Listing, index: number, isLast: boolean) => {
    const isLocked = project.is_boosted;
    const supportText = isLocked ? 'Sponsorlu' : `${project.upvote_count || 0}`;
    const initials = project.title ? project.title.slice(0, 2).toUpperCase() : 'KT';
    return (
      <Link
        key={project.id}
        href={`/listings/${project.id}`}
        className="ios-project-row group"
      >
        <div className="ios-project-main">
          {getRankBadge(index + 1)}

          <div className="ios-project-icon">
            {project.logo_url ? (
              <AutoTransparentLogo
                src={project.logo_url}
                alt={project.title}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="ios-project-initials">{initials}</span>
            )}
          </div>

          <div className="ios-project-copy">
            <h4 className="ios-project-title">{project.title}</h4>
            <p className="ios-project-description">
              {project.tagline || project.description || 'Bağımsız dijital proje'}
            </p>
          </div>
        </div>

        <div className="ios-project-trailing">
          <div
            className={`ios-project-support${isLocked ? ' ios-project-support-locked' : ''}`}
          >
            {isLocked ? <Lock size={11} /> : <ChevronUp size={13} />}
            <span>{supportText}</span>
          </div>

          <ChevronRight size={17} className="ios-project-chevron" />
        </div>

        {!isLast && <div className="ios-project-separator" />}
      </Link>
    );
  };

  return (
    <section className="ios-project-section">
      <div className="ios-project-header">
        <div>
          <h2 className="ios-project-heading">{title}</h2>
          {subtitle && (
            <p className="ios-project-subtitle">{subtitle}</p>
          )}
        </div>

        {onOpenAll ? (
          <button
            type="button"
            onClick={onOpenAll}
            className="ios-project-view-all group cursor-pointer"
          >
            <span>Tümünü Gör</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <Link
            href={viewAllHref}
            className="ios-project-view-all group"
          >
            <span>Tümünü Gör</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="ios-project-list-glass">
        {displayList.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-6 text-center text-sm font-medium text-[#94A3B8]">
            Bu bölümde henüz proje bulunmuyor.
          </div>
        ) : (
        <div className="ios-project-grid">
          <div className="ios-project-column">
            {firstCol.map((project, idx) =>
              renderProjectRow(project, idx, idx === firstCol.length - 1)
            )}
          </div>
          {secondCol.length > 0 && (
            <div className="ios-project-column ios-project-column-secondary">
              {secondCol.map((project, idx) =>
                renderProjectRow(project, idx + 3, idx === secondCol.length - 1)
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
};
