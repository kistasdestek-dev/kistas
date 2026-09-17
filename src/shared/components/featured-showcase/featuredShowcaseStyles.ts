import { StyleSheet, Dimensions } from 'react-native';

export const F3D_STYLE_ID = 'kistas-crd-f3d-styles';

export const F3D_CSS = `
.crd-f3d-stage {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 20px 24px 20px;
  perspective: 1200px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: none;
  -ms-overflow-style: none;
  gap: 20px;
}
.crd-f3d-stage::-webkit-scrollbar {
  display: none;
}

.crd-f3d-float {
  flex: 0 0 auto;
}

.crd-f3d-card {
  position: relative;
  width: 274px;
  height: 385px;
  border-radius: 22px;
  overflow: hidden;
  clip-path: inset(0 round 22px);
  -webkit-clip-path: inset(0 round 22px);
  transform-style: preserve-3d;
  background: #0C171D;
  box-shadow:
     0 28px 60px -20px rgba(0,0,0,.82),
     0 8px 22px -12px rgba(0,0,0, .7);
  cursor: pointer;
  user-select: none;
  isolation: isolate;
}
.crd-f3d-card:focus-visible {
  outline: 2px solid rgba(96,158,255,.9);
  outline-offset: 4px;
}

/* Background gradient art with subtle ambient illustrations */
.crd-f3d-art {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  transform: translateZ(-36px) scale(1.06);
  background:
     radial-gradient(65% 55% at 50% 18%, rgba(109,228,255,0.32), transparent 70%),
     radial-gradient(60% 50% at 85% 30%, rgba(109,228,255,0.3), transparent 65%),
     radial-gradient(70% 60% at 20% 85%, rgba(9,22,29,0.86), transparent 70%),
     linear-gradient(165deg, #0C171D 0%, #0C171D 100%);
  pointer-events: none;
}

/* Subtle ambient doodles in background */
.crd-f3d-doodles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.18;
  transform: translateZ(-28px);
}
.crd-f3d-doodle-circle {
  position: absolute;
  top: 14px;
  left: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px dashed rgba(109,228,255,0.32);
}
.crd-f3d-doodle-capsule {
  position: absolute;
  top: 96px;
  left: 12px;
  width: 48px;
  height: 18px;
  border-radius: 999px;
  border: 1.5px solid rgba(109,228,255,0.32);
}
.crd-f3d-doodle-icon {
  position: absolute;
  top: 22px;
  right: 16px;
  width: 24px;
  height: 34px;
  border-radius: 8px;
  border: 1.5px solid rgba(109,228,255,0.32);
}

/* Fine grain for texture */
.crd-f3d-grain {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  transform: translateZ(-22px);
  opacity: .07;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
}

/* Moving glare tracking pointer */
.crd-f3d-glare {
  position: absolute;
  inset: 0;
  transform: translateZ(64px);
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: .32;
  background: radial-gradient(220px 220px at 50% 50%,
     rgba(109,228,255,0.32), rgba(109,228,255,0) 60%);
}

.crd-f3d-content {
  position: absolute;
  inset: 0;
  padding: 14px 14px 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: translateZ(46px);
  transform-style: preserve-3d;
  box-sizing: border-box;
}

/* Top Preview Hero Section */
.crd-f3d-hero-area {
  position: relative;
  width: 100%;
  height: 122px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateZ(32px);
}

.crd-f3d-hero-halo {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(109,228,255,0.32) 0%, transparent 70%);
  pointer-events: none;
}

.crd-f3d-preview-frame {
  width: 154px;
  height: 106px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 24px -6px rgba(0,0,0, 0.6);
  border: 1px solid rgba(109,228,255,0.2);
  background: rgba(9,22,29,0.86);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.crd-f3d-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.crd-f3d-hero-area-media {
  height: 194px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding-top: 28px;
}

.crd-f3d-preview-frame-media {
  width: 100%;
  height: 166px;
  box-sizing: border-box;
  flex-shrink: 0;
  border-radius: 15px;
  box-shadow:
    0 18px 32px -12px rgba(0,0,0,.82),
    0 0 0 1px rgba(109,228,255,.08);
}

.crd-f3d-preview-frame-media .crd-f3d-preview-img {
  object-fit: contain;
  object-position: center;
  display: block;
}

.crd-f3d-preview-mockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.crd-f3d-preview-mockup-icon {
  font-size: 32px;
}

.crd-f3d-preview-mockup-text {
  font-size: 10px;
  font-weight: 700;
  color: #A7BDC7;
  letter-spacing: 0.5px;
}

.crd-f3d-top-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 750;
  color: #EAF7FB;
  background: rgba(109,228,255,0.2);
  border: 1px solid rgba(109,228,255,0.32);
  backdrop-filter: blur(6px);
  z-index: 5;
}

.crd-f3d-top-badge-left {
  position: absolute;
  top: 2px;
  left: 2px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 8.5px;
  font-weight: 750;
  letter-spacing: 0.5px;
  color: #EAF7FB;
  background: rgba(109,228,255,0.12);
  border: 1px solid rgba(109,228,255,0.2);
  backdrop-filter: blur(6px);
  z-index: 5;
}

.crd-f3d-badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #123C49;
  box-shadow: 0 0 6px rgba(0,0,0, .9);
}

/* Middle Editorial Typography */
.crd-f3d-editorial {
  margin-top: 6px;
  margin-bottom: 8px;
  transform: translateZ(38px);
}

.crd-f3d-eyebrow {
  font-size: 9.5px;
  font-weight:700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #EAF7FB;
  display: block;
  margin-bottom: 3px;
}

.crd-f3d-title-hero {
  margin: 0 0 3px;
  font-size: 18px;
  font-weight:700;
  line-height: 1.18;
  letter-spacing: -0.2px;
  color: #EAF7FB;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 12px rgba(0,0,0,.6);
}

.crd-f3d-tagline-hero {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.35;
  color: #A7BDC7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Bottom App Store Inset Dock */
.crd-f3d-app-dock {
  background: rgba(9,22,29,0.86);
  border: 1px solid rgba(109,228,255,0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 15px;
  padding: 7px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transform: translateZ(44px);
  box-shadow: 0 6px 16px -4px rgba(0,0,0, 0.4);
}

.crd-f3d-dock-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.crd-f3d-dock-logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: transparent;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.crd-f3d-dock-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
}

.crd-f3d-dock-logo-uploaded {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.crd-f3d-dock-logo-init {
  font-size: 15px;
  font-weight:700;
  color: #EAF7FB;
  background: rgba(9,22,29,0.9);
  border: 1px solid rgba(109,228,255,0.16);
  border-radius: 10px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crd-f3d-dock-info {
  flex: 1;
  min-width: 0;
}

.crd-f3d-dock-title {
  font-size: 12px;
  font-weight: 750;
  color: #EAF7FB;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.crd-f3d-dock-sub {
  font-size: 9.5px;
  color: #A7BDC7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1.5px;
}

.crd-f3d-dock-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.crd-f3d-dock-cta {
  background: #123C49;
  color: #EAF7FB;
  border: 0;
  border-radius: 999px;
  padding: 5.5px 12px;
  font-size: 10.5px;
  font-weight: 750;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(0,0,0, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.crd-f3d-dock-micro {
  font-size: 8px;
  color: #A7BDC7;
  margin-top: 2px;
  letter-spacing: 0.2px;
}

.crd-f3d-edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  transform: translateZ(1px);
  box-shadow:
     inset 0 0 0 1px rgba(0,0,0,.12),
     inset 0 1px 0 rgba(0,0,0,.22);
}

.crd-f3d-card-today { width: 310px; height: 420px; }
.crd-f3d-today-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 35%; }
.crd-f3d-today-atmosphere {
  position: absolute; inset: -24px; width: calc(100% + 48px); height: calc(100% + 48px);
  object-fit: cover; filter: blur(24px); opacity: .65; pointer-events: none;
}
.crd-f3d-today-shade {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.3), transparent 30%, rgba(0,0,0,.12) 45%, rgba(0,0,0,.78) 75%, rgba(0,0,0,.9));
  pointer-events: none;
}
.crd-f3d-card-today .crd-f3d-hero-area-media { height: 195px; padding-top: 30px; }
.crd-f3d-card-today .crd-f3d-top-badge, .crd-f3d-card-today .crd-f3d-top-badge-left { font-size: 8px; background: rgba(0,0,0,.22); border-color: rgba(255,255,255,.22); }
.crd-f3d-card-today .crd-f3d-hero-halo, .crd-f3d-card-today .crd-f3d-doodles { display: none; }
.crd-f3d-card-today .crd-f3d-preview-frame-media {
  display: none;
}
.crd-f3d-card-today .crd-f3d-preview-img { filter: drop-shadow(0 8px 12px rgba(0,0,0,.22)); }
.crd-f3d-card-today .crd-f3d-editorial { margin: auto 4px 18px; }
.crd-f3d-card-today .crd-f3d-title-hero { font-size: 23px; letter-spacing: 0; }
.crd-f3d-card-today .crd-f3d-eyebrow { font-size: 9px; letter-spacing: 0; }
.crd-f3d-card-today .crd-f3d-app-dock {
  margin: 0 -14px -12px; padding: 12px 16px; border-radius: 0; border: 0;
  border-top: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.08);
}
@media (max-width: 360px) { .crd-f3d-card-today { width: 280px; } }
`;

export const sectionStyles = StyleSheet.create({
  showcaseSection: {
    marginVertical: 12,
  },
  nativeScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
});

export const nativeCardStyles = StyleSheet.create({
  pressTarget: { flex: 1 },
  todayCard: { width: Math.min(310, Dimensions.get('window').width - 40), height: 420 },
  todayAtmosphere: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  todayHero: { height: 195, paddingTop: 30 },
  todayMedia: { display: 'none' },
  cardContainer: {
    width: 274,
    height: 385,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
  cardGradient: {
    flex: 1,
    padding: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    position: 'relative',
    justifyContent: 'space-between',
  },
  heroArea: {
    width: '100%',
    height: 122,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroAreaMedia: {
    height: 194,
    flexShrink: 0,
    paddingTop: 28,
  },
  topBadgeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(50,105,199,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
    zIndex: 5,
  },
  topBadgeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(50,105,199,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.32)',
    zIndex: 5,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EAF2FC',
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: 0.5,
  },
  creditsText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#25364E',
  },
  previewFrame: {
    width: 154,
    height: 106,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
    backgroundColor: 'rgba(250,251,253,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFrameMedia: {
    width: '100%',
    height: 166,
    flexShrink: 0,
    borderRadius: 15,
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 20,
    elevation: 8,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  mockupCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mockupIcon: {
    fontSize: 32,
  },
  mockupText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#686474',
    letterSpacing: 0.5,
  },
  editorialSection: {
    marginVertical: 6,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#25364E',
    marginBottom: 3,
  },
  titleHero: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    color: '#25364E',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  taglineHero: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#686474',
  },
  appDock: {
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    borderRadius: 15,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  dockLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLogoImg: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  dockLogoUploaded: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'visible',
  },
  dockLogoInit: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25364E',
    backgroundColor: 'rgba(250,251,253,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
    borderRadius: 10,
    width: '100%',
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 40,
  },
  dockInfo: {
    flex: 1,
    minWidth: 0,
  },
  dockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#25364E',
  },
  dockSub: {
    fontSize: 9.5,
    color: '#686474',
    marginTop: 1.5,
  },
  dockRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtn: {
    backgroundColor: '#EAF2FC',
    borderRadius: 999,
    paddingVertical: 5.5,
    paddingHorizontal: 12,
  },
  ctaText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#25364E',
  },
  dockMicro: {
    fontSize: 8,
    color: '#686474',
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
