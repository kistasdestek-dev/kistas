'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Globe, Smartphone, Laptop, Cloud, ChevronUp, ArrowUpRight } from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { DiscoverySectionHeading } from './DiscoverySectionHeading';
import type { Category, DiscoveryCard } from '@kistas/shared';

export interface TodayShowcaseRowProps {
  projects: DiscoveryCard[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  layout?: 'rail' | 'grid';
  categories?: Category[];
  showEmptyState?: boolean;
}

const formatCount = (count?: number): string => {
  const safe = count ?? 0;
  if (safe >= 1000) return `${(safe / 1000).toFixed(1).replace('.0', '')}B`;
  return String(safe);
};

const getPlatformIcon = (platform?: string) => {
  if (platform === 'macOS') return Laptop;
  if (platform === 'Android' || platform === 'iOS') return Smartphone;
  if (platform === 'SaaS') return Cloud;
  return Globe;
};

export const TodayShowcaseRow: React.FC<TodayShowcaseRowProps> = ({
  projects,
  title = 'Günün Vitrini',
  subtitle = 'Topluluğun desteklediği projeler · Her saat adil rotasyon',
  viewAllHref = '/gunun-vitrini',
  layout = 'rail',
  categories = [],
  showEmptyState = false,
}) => {
  if ((!projects || projects.length === 0) && !showEmptyState) return null;

  return (
    <section className={layout === 'grid' ? 'w-full' : 'mx-auto my-10 w-full max-w-[1320px] px-4 sm:px-6'} aria-label={title}>
      {layout === 'rail' && <DiscoverySectionHeading title={title} subtitle={subtitle} href={viewAllHref} />}

      {projects.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.035] px-6 text-center text-sm font-medium text-[#94A3B8] backdrop-blur-xl">
          Bu vitrinde henüz proje bulunmuyor.
        </div>
      ) : (
      <div className={layout === 'grid' ? 'showcase-gallery-grid' : 'day-showcase-track mobile-scroll-x'}>
        {projects.map((project, index) => {
          const coverImage = project.images?.[0]?.image_url;
          const backdropImage = coverImage || project.logo_url;
          const platform = project.platforms?.[0] || 'Web';
          const PlatformIcon = getPlatformIcon(platform);
          const initials = project.title ? project.title.slice(0, 2).toUpperCase() : 'KT';
          const categoryName = categories.find(category => category.id === project.category_id)?.name;

          return (
            <Link
              key={project.id}
              href={`/listings/${project.id}`}
              className={`day-showcase-card ${layout === 'grid' ? 'showcase-gallery-card' : 'mobile-scroll-item'}`}
              aria-label={`${project.title} proje detayını aç`}
            >
              {backdropImage && <img
                src={backdropImage}
                alt=""
                aria-hidden="true"
                className={`day-showcase-cover${layout === 'grid' && !coverImage ? ' showcase-gallery-logo-backdrop' : ''}`}
                loading={layout === 'grid' && index === 0 ? 'eager' : 'lazy'}
                fetchPriority={layout === 'grid' && index === 0 ? 'high' : 'auto'}
              />}
              <div className="day-showcase-shade" aria-hidden="true" />
              <div className="day-showcase-ambient" aria-hidden="true" />
              <div className="day-showcase-rim" aria-hidden="true" />

              <div className="day-showcase-content">
                <div className="day-showcase-topline">
                  <span className="day-showcase-leader-badge">
                    <Sparkles size={12} aria-hidden="true" />
                    <span>{categoryName || 'VİTRİNDE'}</span>
                  </span>
                  <span className="day-showcase-platform-badge">
                    <PlatformIcon size={12} aria-hidden="true" />
                    <span>{platform}</span>
                  </span>
                </div>
                {layout === 'grid' && !coverImage && <div className="showcase-gallery-art" aria-hidden="true">
                  {project.logo_url ? <AutoTransparentLogo src={project.logo_url} className="showcase-gallery-art-logo" /> : <span>{initials}</span>}
                </div>}
                <div className="day-showcase-editorial">
                  <h3 className="day-showcase-title">{project.title}</h3>
                  <p className="day-showcase-tagline">
                    {project.tagline || project.description || 'Bağımsız dijital proje'}
                  </p>
                  {layout === 'grid' && <span className="showcase-gallery-cta">Projeyi keşfet <ArrowUpRight size={16} aria-hidden="true" /></span>}
                </div>

                <div className="day-showcase-dock">
                  <div className="day-showcase-product">
                    {project.logo_url ? (
                      <AutoTransparentLogo
                        src={project.logo_url}
                        alt={project.title}
                        className="day-showcase-logo-image"
                      />
                    ) : (
                      <span className="day-showcase-logo-fallback">{initials}</span>
                    )}
                    <div className="day-showcase-product-copy">
                      <span className="day-showcase-product-name">{project.title}</span>
                    </div>
                  </div>
                  <span className="day-showcase-dock-support" aria-label={`${project.upvote_count ?? 0} destek`}>
                    <ChevronUp size={13} aria-hidden="true" />
                    <span>{formatCount(project.upvote_count)}</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </section>
  );
};
