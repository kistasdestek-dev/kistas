'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Globe, Smartphone, Laptop, Cloud, ArrowRight, ChevronUp } from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import type { DiscoveryCard } from '@kistas/shared';

export interface TodayShowcaseRowProps {
  projects: DiscoveryCard[];
  title?: string;
  subtitle?: string;
  onOpenAll?: () => void;
  showEmptyState?: boolean;
}

const formatCount = (count?: number): string => {
  const safe = count ?? 0;
  if (safe >= 1000) return `${(safe / 1000).toFixed(1).replace('.0', '')}B`;
  return String(safe);
};

const getPlatformIcon = (platform?: string) => {
  if (platform === 'iOS' || platform === 'macOS') return Laptop;
  if (platform === 'Android') return Smartphone;
  if (platform === 'SaaS') return Cloud;
  return Globe;
};

export const TodayShowcaseRow: React.FC<TodayShowcaseRowProps> = ({
  projects,
  title = 'Günün Vitrini',
  subtitle = 'Dünün kategori liderleri · Her saat adil rotasyon',
  onOpenAll,
  showEmptyState = false,
}) => {
  if ((!projects || projects.length === 0) && !showEmptyState) return null;

  return (
    <section className="mx-auto my-10 w-full max-w-[1320px] px-4 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs font-medium text-[#94A3B8]">
              {subtitle}
            </p>
          )}
        </div>

        {onOpenAll ? (
          <button
            type="button"
            onClick={onOpenAll}
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1 text-xs font-semibold text-[#60A5FA] shadow-xs transition-all hover:border-white/25 hover:bg-white/10 hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Tümünü Gör</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <Link
            href="/popular"
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1 text-xs font-semibold text-[#60A5FA] shadow-xs transition-all hover:border-white/25 hover:bg-white/10 hover:-translate-y-0.5"
          >
            <span>Tümünü Gör</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Horizontal Scroll Cards */}
      {projects.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.035] px-6 text-center text-sm font-medium text-[#94A3B8] backdrop-blur-xl">
          Bu vitrinde henüz proje bulunmuyor.
        </div>
      ) : (
      <div className="day-showcase-track mobile-scroll-x">
        {projects.map((project) => {
          const coverImage =
            project.images?.[0]?.image_url ||
            project.logo_url ||
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900';
          const platform = project.platforms?.[0] || 'Web';
          const PlatformIcon = getPlatformIcon(platform);
          const initials = project.title ? project.title.slice(0, 2).toUpperCase() : 'KT';

          return (
            <Link
              key={project.id}
              href={`/listings/${project.id}`}
              className="day-showcase-card mobile-scroll-item"
              aria-label={`${project.title} proje detayını aç`}
            >
              <img
                src={coverImage}
                alt=""
                aria-hidden="true"
                className="day-showcase-cover"
                loading="lazy"
              />
              <div className="day-showcase-shade" aria-hidden="true" />
              <div className="day-showcase-ambient" aria-hidden="true" />
              <div className="day-showcase-rim" aria-hidden="true" />

              <div className="day-showcase-content">
                <div className="day-showcase-topline">
                  <span className="day-showcase-leader-badge">
                    <Trophy size={12} aria-hidden="true" />
                    <span>GÜNÜN LİDERİ</span>
                  </span>
                  <span className="day-showcase-platform-badge">
                    <PlatformIcon size={12} aria-hidden="true" />
                    <span>{platform}</span>
                  </span>
                </div>
                <div className="day-showcase-editorial">
                  <h3 className="day-showcase-title">{project.title}</h3>
                  <p className="day-showcase-tagline">
                    {project.tagline || project.description || 'Bağımsız dijital proje'}
                  </p>
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
                  <span className="day-showcase-dock-support">
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
