import React from 'react';
import { Listing } from '../../../features/listings/domain/Listing';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { BorderBeam } from '../BorderBeam';
import { KistasLogo } from '../KistasLogo';
import { getOptimizedImageUrl } from '../../../core/media/imageDelivery';

export interface Single3DCardProps {
  project?: Listing;
  isPromo?: boolean;
  onPress?: () => void;
  onOpenCreditStore?: () => void;
}

export const Web3DCard: React.FC<Single3DCardProps> = ({
  project,
  isPromo = false,
  onPress,
  onOpenCreditStore,
}) => {
  if (isPromo || !project) {
    return (
      <div className="crd-f3d-float">
        <div
          className="crd-f3d-card is-light-promo"
          onClick={onOpenCreditStore}
          role="button"
          tabIndex={0}
        >
          <div className="crd-f3d-promo-aurora" aria-hidden="true" />
          <div className="crd-f3d-promo-orbit" aria-hidden="true" />
          <div className="crd-f3d-glare" aria-hidden="true" />
          <div className="crd-f3d-content crd-f3d-promo-content">
            <div className="crd-f3d-promo-status-row">
              <div className="crd-f3d-promo-status">
                <span className="crd-f3d-promo-status-dot" />
                VİTRİNDE YERİN HAZIR
              </div>
              <span className="crd-f3d-promo-rotation">↻ ADİL ROTASYON</span>
            </div>

            <div className="crd-f3d-promo-hero">
              <div className="crd-f3d-promo-logo">
                <KistasLogo
                  size={54}
                  showWordmark={false}
                  glow
                  style={{ transform: [{ translateX: -3 }, { translateY: 2 }] }}
                />
              </div>
              <span className="crd-f3d-promo-eyebrow">KISTAS VİTRİNİ</span>
              <h3 className="crd-f3d-promo-title">İyi fikirler görünür olmayı hak eder.</h3>
              <p className="crd-f3d-promo-tagline">
                Projeni doğru kitleyle buluştur, vitrindeki yerini ayır.
              </p>
            </div>

            <BorderBeam
              size={200}
              duration={12}
              colorVariant="kistas"
              borderWidth={1.5}
              borderRadius={16}
            >
              <button
                type="button"
                className="crd-f3d-promo-cta"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenCreditStore?.();
                }}
              >
                <span>
                  <small>SPONSORLU VİTRİN</small>
                  <strong>Vitrinde Yerini Al</strong>
                </span>
                <span className="crd-f3d-promo-cta-arrow">→</span>
              </button>
            </BorderBeam>
          </div>
          <div className="crd-f3d-edge" aria-hidden="true" />
        </div>
      </div>
    );
  }

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
                  {project.seller?.fullName ? `Geliştiren: ${project.seller.fullName}` : primaryPlatform}
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
                ▲ {project.upvotesCount} Oy
              </span>
            </div>
          </div>
        </div>
        <div className="crd-f3d-edge" aria-hidden="true" />
      </div>
    </div>
  );
};
