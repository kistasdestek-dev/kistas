'use client';

import React from 'react';
import Link from 'next/link';
import { KistasLogo } from './KistasLogo';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { CategoryStarsBanner } from './CategoryStarsBanner';
import { type Listing } from '@kistas/shared';
import { ShinyButton } from './ui/shiny-button';

export interface FeaturedBoostShowcaseProps {
  projects?: Listing[];
  selectedCategoryName?: string;
  onOpenCreditStore?: () => void;
}

const getCleanDeveloperName = (fullName?: string | null): string => {
  if (!fullName) return 'Geliştirici Ekip';
  return fullName.replace(/\s*\([^)]*\)/g, '').trim();
};

export const FeaturedBoostShowcase: React.FC<FeaturedBoostShowcaseProps> = ({
  projects = [],
  selectedCategoryName,
  onOpenCreditStore,
}) => {
  const displayItems = projects.slice(0, 3);

  return (
    <section className="relative mx-auto my-8 w-full max-w-[1320px] px-4 sm:px-6">
      {/* 1. Clean Header Row with Category Banner */}
      <div className="mb-4 flex flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <div className="shiny-cta shiny-cta--sponsored min-w-0 flex-1 sm:flex-none">
          <span className="block truncate whitespace-nowrap uppercase tracking-wider">
            {selectedCategoryName ? `${selectedCategoryName} · SPONSORLU` : 'SPONSORLU'}
          </span>
        </div>

        <div className="flex shrink-0 items-center">
          <CategoryStarsBanner
            size="md"
            words={['Yıldız Projeler', 'Vitrinde Yer Al', 'Projeni Parlat', 'Kıstas Vitrini']}
            onClick={onOpenCreditStore}
          />
        </div>
      </div>

      {/* 2. 3D Cards Showcase Stage */}
      <div className="crd-f3d-stage">
        {displayItems.map((project) => {
          const coverImage =
            project.images?.[0]?.image_url ||
            project.logo_url ||
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
          const developerName = getCleanDeveloperName(
            project.developer_name ||
            (project as any).developerName ||
            project.seller?.full_name ||
            'Kıstas Projesi'
          );
          const initials = project.title ? project.title.slice(0, 2).toUpperCase() : 'KT';
          const logo = project.logo_url || (project.images && project.images[0]?.image_url);

          return (
            <div key={project.id} className="crd-f3d-float">
              <Link
                href={`/listings/${project.id}`}
                className="crd-f3d-card crd-f3d-card-today"
              >
                {/* Background Cover Image with Editorial Shade */}
                <img
                  src={coverImage}
                  alt={project.title}
                  className="crd-f3d-today-cover"
                />
                <div className="crd-f3d-today-shade" aria-hidden="true" />
                <div className="crd-f3d-glare" aria-hidden="true" />

                {/* Card Content */}
                <div className="crd-f3d-content">
                  {/* Middle Editorial Typography - Clean & Cinematic */}
                  <div className="crd-f3d-editorial">
                    <h3 className="crd-f3d-title-hero">{project.title}</h3>
                    {Boolean(project.tagline || project.description) && (
                      <p className="crd-f3d-tagline-hero">
                        {project.tagline || project.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Inset Dock */}
                  <div className="crd-f3d-app-dock">
                    <div className="crd-f3d-dock-left">
                      <div className="crd-f3d-dock-logo">
                        {logo ? (
                          <AutoTransparentLogo
                            src={logo}
                            alt={project.title}
                            className="crd-f3d-dock-logo-img"
                          />
                        ) : (
                          <div className="crd-f3d-dock-logo-fallback">
                            <span className="crd-f3d-dock-logo-init">{initials}</span>
                          </div>
                        )}
                      </div>
                      <div className="crd-f3d-dock-info">
                        <div className="crd-f3d-dock-title">{project.title}</div>
                        <div className="crd-f3d-dock-sub" title={developerName}>
                          {developerName}
                        </div>
                      </div>
                    </div>

                    <div className="crd-f3d-dock-right">
                      <span className="crd-f3d-glass-pill">
                        İncele
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}

        {/* 3. Authentic Call-to-Action Promo Card */}
        <div className="crd-f3d-float">
          <div className="crd-f3d-card is-light-promo">
            {/* Ambient Aurora & Orbit */}
            <div className="crd-f3d-promo-aurora" aria-hidden="true" />
            <div className="crd-f3d-promo-orbit" aria-hidden="true" />
            <div className="crd-f3d-glare" aria-hidden="true" />

            <div className="crd-f3d-content crd-f3d-promo-content">
              {/* Top Status Row - Clean & Symmetrical */}
              <div className="crd-f3d-hero-area">
                <div className="crd-f3d-top-badge-left">
                  SPONSORLU VİTRİN
                </div>
                <div className="crd-f3d-top-badge">
                  <span>↻ ADİL ROTASYON</span>
                </div>
              </div>

              {/* Center Hero Identity */}
              <div className="crd-f3d-promo-hero">
                <div className="crd-f3d-promo-logo">
                  <KistasLogo size={54} showWordmark={false} glow />
                </div>
                <div className="crd-f3d-promo-copy">
                  <h3 className="crd-f3d-promo-title">İyi fikirler görünür olmayı hak eder.</h3>
                  <p className="crd-f3d-promo-tagline">
                    Projeni doğru kitleyle buluştur, vitrindeki yerini hemen ayırt.
                  </p>
                </div>
              </div>

              {/* Bottom Inset CTA Dock */}
              <div className="crd-f3d-promo-dock">
                <ShinyButton href="/create-listing" className="w-full">
                  Vitrinde Yerini Al
                </ShinyButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
