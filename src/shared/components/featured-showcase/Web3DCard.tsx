import React from 'react';
import { Listing } from '../../../features/listings/domain/Listing';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { getOptimizedImageUrl } from '../../../core/media/imageDelivery';

export interface Single3DCardProps {
  project: Listing;
  onPress?: () => void;
}

export const Web3DCard: React.FC<Single3DCardProps> = ({
  project,
  onPress,
}) => {
  const initials = project.title
    ? project.title.slice(0, 2).toUpperCase()
    : 'KT';

  const primaryPlatform = project.platforms?.[0] || 'App';
  const sourceImage = project.coverImageUrl || project.logoUrl;
  const previewImage = getOptimizedImageUrl(sourceImage, 640);
  const coverImageSet = sourceImage && previewImage !== sourceImage
    ? [320, 640].map((width) => `${getOptimizedImageUrl(sourceImage, width)} ${width}w`).join(', ')
    : undefined;
  return (
    <div className="crd-f3d-float">
      <div
        className="crd-f3d-card crd-f3d-card-today"
        onClick={onPress}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onPress?.();
        }}
        role="button"
        tabIndex={0}
      >
        {previewImage && <img src={previewImage} srcSet={coverImageSet} sizes="(max-width: 360px) 280px, 310px" alt="" aria-hidden="true" className="crd-f3d-today-cover" decoding="async" fetchPriority="high" />}
        <div className="crd-f3d-today-shade" aria-hidden="true" />
        <div className="crd-f3d-doodles" aria-hidden="true">
          <div className="crd-f3d-doodle-circle" />
          <div className="crd-f3d-doodle-capsule" />
          <div className="crd-f3d-doodle-icon" />
        </div>
        <div className="crd-f3d-grain" aria-hidden="true" />
        <div className="crd-f3d-glare" aria-hidden="true" />
        <div className="crd-f3d-content">
          {/* Top Preview Hero */}
          <div className="crd-f3d-hero-area crd-f3d-hero-area-media">
            <div className="crd-f3d-hero-halo" />
            <div className="crd-f3d-top-badge-left">
              <span className="crd-f3d-badge-dot" />
              ÖNE ÇIKAN
            </div>
            <div className="crd-f3d-top-badge">
              <span>↻ SAATLİK ROTASYON</span>
            </div>
            <div className="crd-f3d-preview-frame crd-f3d-preview-frame-media">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={project.title}
                  className="crd-f3d-preview-img"
                  decoding="async"
                  loading="lazy"
                />
              ) : (
                <div className="crd-f3d-preview-mockup">
                  <span className="crd-f3d-preview-mockup-icon">📱</span>
                  <span className="crd-f3d-preview-mockup-text">{primaryPlatform}</span>
                </div>
              )}
            </div>
          </div>

          {/* Middle Editorial Typography */}
          <div className="crd-f3d-editorial">
            <span className="crd-f3d-eyebrow">HAYDİ BAŞLAYALIM</span>
            <h3 className="crd-f3d-title-hero">{project.title}</h3>
            <p className="crd-f3d-tagline-hero">
              {project.tagline || project.description}
            </p>
          </div>

          {/* Bottom Inset Dock */}
          <div className="crd-f3d-app-dock">
            <div className="crd-f3d-dock-left">
              <div className={`crd-f3d-dock-logo${project.logoUrl ? ' crd-f3d-dock-logo-uploaded' : ''}`}>
                {project.logoUrl ? (
                  <AutoTransparentLogo
                    src={project.logoUrl}
                    alt={project.title}
                    className="crd-f3d-dock-logo-img"
                  />
                ) : (
                  <span className="crd-f3d-dock-logo-init">{initials}</span>
                )}
              </div>
              <div className="crd-f3d-dock-info">
                <div className="crd-f3d-dock-title">{project.title}</div>
                <div className="crd-f3d-dock-sub">
                  {project.developerName || project.seller?.fullName
                    ? `Geliştiren: ${project.developerName || project.seller?.fullName}`
                    : primaryPlatform}
                </div>
              </div>
            </div>
            <div className="crd-f3d-dock-right">
              <button
                type="button"
                className="crd-f3d-dock-cta"
                onClick={(e) => {
                  e.stopPropagation();
                  onPress?.();
                }}
              >
                Projeyi İncele
              </button>
              <span className="crd-f3d-dock-micro">
                ◉ {project.viewCount} · ▲ {project.upvotesCount}
              </span>
            </div>
          </div>
        </div>
        <div className="crd-f3d-edge" aria-hidden="true" />
      </div>
    </div>
  );
};
