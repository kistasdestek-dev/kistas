'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Spotlight } from './Spotlight';

interface SplineSceneRobotProps {
  title?: string;
  accentTitle?: string;
  className?: string;
}

const SPLINE_SCENE_URL = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';

export const SplineSceneRobot: React.FC<SplineSceneRobotProps> = ({
  title = 'Keşfetmek kolay.',
  accentTitle = 'Büyümek mümkün.',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let appInstance: { dispose?: () => void } | null = null;

    const loadSpline = async () => {
      try {
        const { Application } = await import('@splinetool/runtime');
        if (isCancelled || !canvasRef.current) return;

        const app = new Application(canvasRef.current);
        appInstance = app;

        await app.load(SPLINE_SCENE_URL);

        if (!isCancelled) {
          // Spline canvas'a ilk frame'i çizdikten sonra alttan süzülme animasyonunu tetikle
          setTimeout(() => {
            if (!isCancelled) {
              setIsLoaded(true);
            }
          }, 80);
        }
      } catch (err) {
        console.warn('[SplineSceneRobot] 3D sahnesi yüklenirken hata:', err);
        if (!isCancelled) {
          setHasError(true);
        }
      }
    };

    const timer = setTimeout(() => {
      loadSpline();
    }, 50);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      try {
        if (appInstance && typeof appInstance.dispose === 'function') {
          appInstance.dispose();
        }
      } catch {
        // silent cleanup
      }
    };
  }, []);

  // Fare tekerleğiyle sayfanın doğal kaymasını koru (wheel hijack engeli)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stopWheelHijack = (e: WheelEvent) => {
      e.stopPropagation();
    };
    el.addEventListener('wheel', stopWheelHijack, { capture: true, passive: true });
    return () => {
      el.removeEventListener('wheel', stopWheelHijack, { capture: true });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/10 bg-[#060A12] shadow-[0_30px_80px_-15px_rgba(2,6,23,0.85),inset_0_1px_0_rgba(255,255,255,0.14)] ${className}`}
    >
      <style jsx>{`
        @keyframes k-spotlight {
          0% {
            opacity: 0;
            transform: translate(-72%, -62%) scale(0.6);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -40%) scale(1);
          }
        }
        @keyframes k-pedestal-flare {
          0% {
            opacity: 0;
            transform: scaleX(0.4) translateY(40px);
          }
          40% {
            opacity: 0.9;
            transform: scaleX(1.1) translateY(0);
          }
          100% {
            opacity: 0.65;
            transform: scaleX(1) translateY(0);
          }
        }
        @keyframes k-scan-beam {
          0% {
            bottom: -10%;
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            bottom: 110%;
            opacity: 0;
          }
        }
        .animate-spotlight-custom {
          animation: k-spotlight 2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }
        .animate-pedestal {
          animation: k-pedestal-flare 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scan {
          animation: k-scan-beam 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }
      `}</style>

      {/* Sinematik Üst Spotlight Işık Huzmesi */}
      <Spotlight
        className="-top-40 left-0 md:left-48 md:-top-24 animate-spotlight-custom"
        fill="#93C5FD"
      />

      {/* Arka Plan Ambiansı & Izgara */}
      <div
        className="pointer-events-none absolute -top-32 -left-20 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-10 h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row items-stretch w-full min-h-[460px] sm:min-h-[500px] md:min-h-[520px]">
        {/* Sol Tipografi ve Başlık Alanı - Mobilde ortalı, desktopta sola yaslı */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 md:px-12 md:py-16 lg:px-16 z-20 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.16]">
            <span className="block bg-gradient-to-b from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              {title}
            </span>
            <span className="block mt-2 sm:mt-3 bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(96,165,250,0.5)]">
              {accentTitle}
            </span>
          </h1>
        </div>

        {/* Sağ 3D Robot Alanı - Mobilde yüksekliği ayarlı, alttan yükselen deneyim */}
        <div className="flex-1 relative w-full h-[280px] sm:h-[360px] md:h-auto min-h-[280px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
          {/* 1. ALTTAN YÜKSELEN ZEMİN IŞIĞI (PEDESTAL FLARE) - Robot yükselirken altından yayılır */}
          {isLoaded && (
            <>
              {/* Zemin Kaide Işıması */}
              <div
                className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 h-24 w-4/5 max-w-md rounded-full bg-gradient-to-t from-blue-500/30 via-cyan-400/25 to-transparent blur-2xl animate-pedestal"
                aria-hidden="true"
              />
              {/* Fütüristik Yatay Tarama Çizgisi (Alttan yukarı süzülen ince lazer ışığı) */}
              <div
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 h-[2px] w-3/4 max-w-sm rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.9)] animate-scan"
                aria-hidden="true"
              />
            </>
          )}

          {/* 2. HATA DURUMU FALLBACK */}
          {hasError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <div className="h-32 w-32 rounded-full bg-radial from-blue-500/30 via-indigo-600/20 to-transparent blur-xl" />
              <span className="mt-4 text-xs font-semibold text-neutral-300">
                Kıstas 3D Deneyimi (Alternatif Görünüm Aktif)
              </span>
            </div>
          )}

          {/* 3. 3D ROBOT CANVAS (Loading yok; doğrudan Alttan Yukarı Doğru Sinematik Yükselme) */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block outline-none touch-pan-y"
            style={{
              width: '100%',
              height: '100%',
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded
                ? 'translateY(0) scale(1)'
                : 'translateY(110px) scale(0.88)',
              filter: isLoaded ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 1.3s cubic-bezier(0.16, 1, 0.3, 1), transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), filter 1.3s ease-out',
              pointerEvents: isLoaded ? 'auto' : 'none',
              willChange: 'transform, opacity, filter',
            }}
          />
        </div>
      </div>
    </div>
  );
};
