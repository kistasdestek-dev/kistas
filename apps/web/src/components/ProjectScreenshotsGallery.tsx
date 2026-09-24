'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ListingImage } from '@kistas/shared';
import { GlassIconButton } from './GlassIconButton';

export interface ScreenshotItem {
  id: string;
  url: string;
}

export interface ProjectScreenshotsGalleryProps {
  projectTitle: string;
  images?: Array<ListingImage | { id?: string; imageUrl?: string; image_url?: string; displayOrder?: number; sort_order?: number }>;
  coverImageUrl?: string | null;
}

function toSafeHttpsUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('//')) return null;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const getCircularOffset = (index: number, activeIndex: number, total: number): number => {
  let offset = index - activeIndex;
  const midpoint = total / 2;
  if (offset > midpoint) offset -= total;
  if (offset < -midpoint) offset += total;
  return offset;
};

export const ProjectScreenshotsGallery: React.FC<ProjectScreenshotsGalleryProps> = ({
  projectTitle,
  images,
  coverImageUrl,
}) => {
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [screenshotAspectRatios, setScreenshotAspectRatios] = useState<Record<string, number>>({});
  const [windowDimensions, setWindowDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Touch Swipe tracking for mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  // Resize listener
  useEffect(() => {
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ekran Görüntüleri Listesi (Sadece Vitrin Görselleri - Logo Kesinlikle Dahil Edilmez)
  const screenshotItems = useMemo<ScreenshotItem[]>(() => {
    const list: ScreenshotItem[] = [];
    const seenUrls = new Set<string>();

    if (images && images.length > 0) {
      const sorted = [...images].sort((a, b) => {
        const orderA = (a as any).display_order ?? (a as any).displayOrder ?? (a as ListingImage).sort_order ?? 0;
        const orderB = (b as any).display_order ?? (b as any).displayOrder ?? (b as ListingImage).sort_order ?? 0;
        return orderA - orderB;
      });

      for (const img of sorted) {
        const rawUrl = (img as any).imageUrl || (img as any).image_url;
        const safeUrl = toSafeHttpsUrl(rawUrl);
        if (safeUrl && !seenUrls.has(safeUrl)) {
          seenUrls.add(safeUrl);
          list.push({ id: img.id || `img-${list.length}`, url: safeUrl });
        }
      }
    }

    // Yalnızca hiçbir ekran görüntüsü yoksa ve harici coverUrl verildiyse yedek olarak al
    if (list.length === 0 && coverImageUrl) {
      const safeCover = toSafeHttpsUrl(coverImageUrl);
      if (safeCover) {
        list.push({ id: 'cover-1', url: safeCover });
      }
    }

    return list;
  }, [images, coverImageUrl]);

  const total = screenshotItems.length;
  const isLightboxVisible = selectedScreenshotIndex !== null;
  const windowWidth = windowDimensions.width;
  const windowHeight = windowDimensions.height;
  const isCompactHero = windowWidth <= 700;

  useEffect(() => {
    document.body.classList.toggle('k-lightbox-open', isLightboxVisible);
    return () => document.body.classList.remove('k-lightbox-open');
  }, [isLightboxVisible]);

  useEffect(() => {
    if (!isLightboxVisible) setDragOffsetY(0);
  }, [isLightboxVisible]);

  // Cache image aspect ratio
  const cacheScreenshotAspectRatio = useCallback((url: string, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const aspectRatio = width / height;
    setScreenshotAspectRatios((current) => (
      current[url] === aspectRatio ? current : { ...current, [url]: aspectRatio }
    ));
  }, []);

  // Preload and measure image dimensions
  useEffect(() => {
    let isActive = true;
    screenshotItems.forEach((item) => {
      const img = new window.Image();
      img.src = item.url;
      img.onload = () => {
        if (isActive && img.naturalWidth && img.naturalHeight) {
          cacheScreenshotAspectRatio(item.url, img.naturalWidth, img.naturalHeight);
        }
      };
    });
    return () => {
      isActive = false;
    };
  }, [cacheScreenshotAspectRatio, screenshotItems]);

  const openScreenshot = useCallback((index: number) => {
    if (!screenshotItems[index]) return;
    setSelectedScreenshotIndex(index);
  }, [screenshotItems]);

  const closeScreenshot = useCallback(() => {
    setSelectedScreenshotIndex(null);
  }, []);

  const showAdjacentScreenshot = useCallback((direction: -1 | 1) => {
    if (total < 2) return;
    setSelectedScreenshotIndex((current) => {
      if (current === null) return null;
      return (current + direction + total) % total;
    });
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    if (!isLightboxVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeScreenshot();
      if (e.key === 'ArrowRight') showAdjacentScreenshot(1);
      if (e.key === 'ArrowLeft') showAdjacentScreenshot(-1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxVisible, closeScreenshot, showAdjacentScreenshot]);

  // 4s Auto-advance timer (when not hovered)
  useEffect(() => {
    if (!isLightboxVisible || total < 2 || isHovered) return;
    const timer = setInterval(() => {
      showAdjacentScreenshot(1);
    }, 4000);
    return () => clearInterval(timer);
  }, [isLightboxVisible, total, isHovered, showAdjacentScreenshot]);

  // Touch Swipe for mobile lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchEndXRef.current = null;
    touchStartYRef.current = touch.clientY;
    touchEndYRef.current = null;
    setDragOffsetY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;

    if (isCompactHero && startX !== null && startY !== null) {
      const dx = startX - touch.clientX;
      const dy = touch.clientY - startY;

      if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        touchEndXRef.current = null;
        touchEndYRef.current = touch.clientY;
        setDragOffsetY(dy);
        return;
      }
    }

    touchEndXRef.current = touch.clientX;
    touchEndYRef.current = null;
    setDragOffsetY(0);
  };

  const handleTouchEnd = () => {
    const startY = touchStartYRef.current;
    const endY = touchEndYRef.current;

    if (isCompactHero && startY !== null && endY !== null) {
      const dismissDistance = endY - startY;
      if (dismissDistance > 120) {
        closeScreenshot();
      } else {
        setDragOffsetY(0);
      }
    } else if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      if (distance > 50) {
        showAdjacentScreenshot(1);
      } else if (distance < -50) {
        showAdjacentScreenshot(-1);
      }
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
    touchStartYRef.current = null;
    touchEndYRef.current = null;
  };

  // Responsive dynamic screenshot sizing (Dikey 9:16 ve Yatay 16:9 vitrin görsellerine tam uyum)
  const isLandscapeProject = useMemo(() => {
    const ratios = Object.values(screenshotAspectRatios);
    if (ratios.length > 0) {
      return ratios.some((r) => r >= 1.05);
    }
    return false;
  }, [screenshotAspectRatios]);

  const lightboxMaxWidth = Math.min(Math.round(windowWidth * (isCompactHero ? 0.98 : 0.75)), 880);
  const lightboxMaxHeight = Math.max(160, Math.round(windowHeight * (isCompactHero ? 0.86 : 0.75)));
  const lightboxCardSpacing = Math.round(lightboxMaxWidth * (isCompactHero ? 0.92 : 0.82));

  const getLightboxCardSize = (url: string) => {
    const ratio = screenshotAspectRatios[url] || (isLandscapeProject ? 1.77 : 0.56);
    const isImgLandscape = ratio >= 1.05;

    if (isImgLandscape) {
      let width = Math.min(Math.round(windowWidth * (isCompactHero ? 0.98 : 0.75)), 880);
      let height = Math.round(width / ratio);
      if (height > lightboxMaxHeight) {
        height = lightboxMaxHeight;
        width = Math.round(height * ratio);
      }
      return { width, height };
    } else {
      let height = lightboxMaxHeight;
      let width = Math.round(height * ratio);
      const maxWidth = Math.round(windowWidth * (isCompactHero ? 0.96 : 0.45));
      if (width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / ratio);
      }
      return { width, height };
    }
  };

  const shouldCenterScreenshots = !isCompactHero && screenshotItems.length <= 2;

  if (screenshotItems.length === 0) return null;

  return (
    <>
      {/* 6. APP STORE TARZI EKRAN GÖRÜNTÜLERİ (ÖNİZLEME BÖLÜMÜ) */}
      <section className="my-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] py-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300">
        <h2 className="text-[24px] leading-[29px] sm:text-[28px] sm:leading-[34px] font-bold text-white tracking-tight mb-[18px] sm:mb-[22px] px-6 sm:px-8">
          Önizleme
        </h2>

        <div
          className={`flex items-start gap-4 overflow-x-auto px-6 sm:px-8 pb-3 scrollbar-none mobile-scroll-x select-none ${
            isLandscapeProject
              ? 'min-h-[210px] sm:min-h-[275px]'
              : 'min-h-[390px] sm:min-h-[500px]'
          } ${shouldCenterScreenshots ? 'justify-center' : ''}`}
        >
          {screenshotItems.map((item, index) => {
            const ratio = screenshotAspectRatios[item.url];

            return (
              <div
                key={item.id}
                onClick={() => openScreenshot(index)}
                style={ratio ? { aspectRatio: String(ratio) } : undefined}
                className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-[20px] sm:rounded-[26px] bg-transparent shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-[0.99] ${
                  isLandscapeProject
                    ? 'h-[210px] sm:h-[275px]'
                    : 'h-[390px] sm:h-[500px]'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`${projectTitle} ekran görüntüsü ${index + 1} büyüt`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openScreenshot(index);
                  }
                }}
              >
                { }
                <img
                  src={item.url}
                  alt={`${projectTitle} önizleme ${index + 1}`}
                  className="h-full w-auto max-w-none object-contain select-none rounded-[20px] sm:rounded-[26px]"
                  loading="eager"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      cacheScreenshotAspectRatio(item.url, img.naturalWidth, img.naturalHeight);
                    }
                  }}
                />

              </div>
            );
          })}
        </div>
      </section>

      {/* FULLSCREEN LIGHTBOX MODAL (LUXURY OBSIDIAN DARK) */}
      {isLightboxVisible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center select-none touch-none animate-in fade-in duration-200 ${
            isCompactHero ? 'p-0' : 'p-5'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={`${projectTitle} ekran görüntüleri galerisi`}
        >
          {/* Karanlık Cam Zemin */}
          <div
            className="fixed inset-0 k-lightbox-site-backdrop cursor-pointer"
            onClick={closeScreenshot}
            aria-hidden="true"
          />

          {/* Lightbox Panel */}
          <div
            className={`k-modal-glass-card k-lightbox-glass-panel relative flex flex-col overflow-hidden z-10 transition-all duration-300 ${
              isCompactHero
                ? 'h-full w-full max-h-full !rounded-none !border-none !shadow-none'
                : 'h-[88%] max-h-[900px] w-full max-w-[1240px] !rounded-[24px]'
            }`}
            style={isCompactHero ? {
              transform: `translateY(${dragOffsetY}px)`,
              opacity: Math.max(0.4, 1 - dragOffsetY / 400),
              transition: dragOffsetY > 0
                ? 'none'
                : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out',
            } : undefined}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Ortam Işıması Sol Üst */}
            <div
              className="pointer-events-none absolute -top-36 -left-40 h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-3xl"
              aria-hidden="true"
            />

            {/* Ortam Işıması Sağ Alt */}
            <div
              className="pointer-events-none absolute -bottom-44 -right-44 h-[440px] w-[440px] rounded-full bg-emerald-600/08 blur-3xl"
              aria-hidden="true"
            />

            {/* Lightbox Header */}
            <div
              className={`absolute z-30 flex items-center justify-between pointer-events-none ${
                isCompactHero ? 'top-10 left-5 right-5' : 'top-3.5 left-4 right-3.5'
              }`}
            >
              {!isCompactHero ? (
                <div>
                  <h3 className="text-[15px] font-bold text-white tracking-tight leading-tight mb-0.5">
                    {projectTitle}
                  </h3>
                  <p className="text-[12px] font-bold text-[#94A3B8] tracking-wider">
                    {selectedScreenshotIndex !== null ? `${selectedScreenshotIndex + 1} / ${total}` : ''}
                  </p>
                </div>
              ) : (
                <div className="rounded-full border border-white/15 bg-black/60 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">
                  {selectedScreenshotIndex !== null ? `${selectedScreenshotIndex + 1} / ${total}` : ''}
                </div>
              )}

              <GlassIconButton
                icon={X}
                size={38}
                iconSize={18}
                onClick={closeScreenshot}
                title="Kapat"
                ariaLabel="Görseli kapat"
                className="pointer-events-auto"
              />
            </div>

            {/* 3D Karusel Sahnesi (Carousel Stage) */}
            <div
              className="relative flex-1 w-full flex items-center justify-center overflow-hidden touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {selectedScreenshotIndex !== null &&
                screenshotItems.map((item, index) => {
                  const offset = getCircularOffset(index, selectedScreenshotIndex, total);
                  const isCenter = offset === 0;
                  const isAdjacent = Math.abs(offset) === 1;
                  const cardSize = getLightboxCardSize(item.url);

                  // 3D Karusel Ölçeklendirme ve Opaklık
                  const scale = isCenter ? 1 : isAdjacent ? 0.96 : 0.92;
                  const opacity = isCenter ? 1 : isAdjacent ? 0.75 : 0;
                  const zIndex = isCenter ? 10 : isAdjacent ? 5 : 1;
                  const translateX = offset * lightboxCardSpacing;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (offset === -1) showAdjacentScreenshot(-1);
                        if (offset === 1) showAdjacentScreenshot(1);
                      }}
                      style={{
                        width: cardSize.width,
                        height: cardSize.height,
                        zIndex,
                        opacity,
                        transform: `translate3d(${translateX}px, 0, 0) scale(${scale})`,
                        pointerEvents: isCenter ? 'auto' : isAdjacent ? 'auto' : 'none',
                      }}
                      className={`absolute overflow-hidden rounded-[26px] sm:rounded-[30px] bg-transparent border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isAdjacent ? 'cursor-pointer hover:opacity-100' : ''
                      }`}
                    >
                      { }
                      <img
                        src={item.url}
                        alt={`${projectTitle} ekran görüntüsü ${index + 1}`}
                        className="h-full w-full object-contain select-none"
                      />
                    </div>
                  );
                })}
            </div>

            {/* Dairesel Gezinme Butonları (Masaüstü) */}
            {total > 1 && !isCompactHero && (
              <>
                <button
                  type="button"
                  onClick={() => showAdjacentScreenshot(-1)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/10 border border-white/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all hover:bg-white/20 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Önceki görsel (←)"
                  aria-label="Önceki görsel"
                >
                  <ChevronLeft size={24} className="text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => showAdjacentScreenshot(1)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/10 border border-white/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all hover:bg-white/20 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Sonraki görsel (→)"
                  aria-label="Sonraki görsel"
                >
                  <ChevronRight size={24} className="text-white" />
                </button>
              </>
            )}

            {/* Mobilde Alt Gezinme Göstergeleri */}
            {total > 1 && isCompactHero && (
              <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => showAdjacentScreenshot(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white shadow-md border border-white/20 active:scale-95 backdrop-blur-md"
                  aria-label="Önceki görsel"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => showAdjacentScreenshot(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white shadow-md border border-white/20 active:scale-95 backdrop-blur-md"
                  aria-label="Sonraki görsel"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
