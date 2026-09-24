'use client';

import React, { useMemo } from 'react';
import type { Listing } from '@kistas/shared';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface SponsorLogoMarqueeProps {
  projects?: Listing[];
}

const getInitials = (title?: string) => {
  if (!title) return 'KT';
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase('tr-TR');
};

export const SponsorLogoMarquee: React.FC<SponsorLogoMarqueeProps> = ({
  projects = [],
}) => {
  const sponsors = useMemo(() => {
    const unique = new Map<string, Listing>();
    projects.forEach((project) => {
      if (project.is_boosted || (project.upvote_count && project.upvote_count > 5)) {
        unique.set(project.id, project);
      }
    });

    // If boosted/popular filter yielded too few, backfill with initial listings
    if (unique.size < 4) {
      projects.forEach((p) => unique.set(p.id, p));
    }

    return Array.from(unique.values()).slice(0, 14);
  }, [projects]);

  const displaySponsors = useMemo(() => {
    if (sponsors.length === 0) return [];
    const minimumItems = 8;
    return Array.from(
      { length: Math.max(1, Math.ceil(minimumItems / sponsors.length)) },
      () => sponsors
    ).flat();
  }, [sponsors]);

  const duration = Math.max(20, (displaySponsors.length * 176) / 28);
  const mobileDuration = Math.max(18, (displaySponsors.length * 150) / 28);

  if (displaySponsors.length === 0) return null;

  return (
    <section className="ksm" aria-label="Kıstas sponsor logoları">
      <div className="ksm-viewport">
        <div
          className="ksm-track"
          style={
            {
              '--ksm-duration': `${duration}s`,
              '--ksm-mobile-duration': `${mobileDuration}s`,
            } as React.CSSProperties
          }
        >
          {[0, 1].map((copy) => (
            <div className="ksm-rail" key={copy} aria-hidden={copy === 1}>
              {displaySponsors.map((project, index) => {
                const logo =
                  project.logo_url ||
                  (project.images && project.images[0]?.image_url);

                return (
                  <span className="ksm-item" key={`${copy}-${project.id}-${index}`}>
                    <span className="ksm-logo">
                      {logo ? (
                        <AutoTransparentLogo
                          src={logo}
                          alt={copy === 0 ? `${project.title} logosu` : ''}
                          draggable={false}
                        />
                      ) : (
                        getInitials(project.title)
                      )}
                    </span>
                    <span className="ksm-name">{project.title}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
