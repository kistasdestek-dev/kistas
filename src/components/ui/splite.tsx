import React, { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

function Spotlight({ className = '', fill = 'white' }: { className?: string; fill?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute z-[1] h-[169%] w-[138%] lg:w-[84%] opacity-0 animate-spotlight ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill || 'white'}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
        </filter>
      </defs>
    </svg>
  );
}

export interface SplineSceneProps {
  scene: string;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SplineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Spline 3D sahnesi yuklenirken hata yakalandi:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, rgba(96,165,250,0.7), rgba(37,99,235,0.2) 65%, transparent 100%)',
              filter: 'drop-shadow(0 0 35px rgba(59,130,246,0.4))',
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Sayfa geçişi ve DOM layout tamamlandıktan hemen sonra 3D motoru başlat
    const timer = setTimeout(() => {
      setMounted(true);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Fare tekerleği 3D tuvalin üzerindeyken sayfanın doğal kaymasını koru
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
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <SplineErrorBoundary>
        {!mounted ? (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
            }}
          >
            <span className="loader" />
          </div>
        ) : (
          <Suspense
            fallback={
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 400,
                }}
              >
                <span className="loader" />
              </div>
            }
          >
            <Spline
              scene={scene}
              style={{ width: '100%', height: '100%' }}
            />
          </Suspense>
        )}
      </SplineErrorBoundary>
    </div>
  );
}



export interface SplineSceneBasicProps {
  title?: string;
  accentTitle?: string;
  className?: string;
}

export function SplineSceneBasic({
  title = 'Keşfetmek kolay.',
  accentTitle = 'Büyümek mümkün.',
  className,
}: SplineSceneBasicProps = {}) {
  return (
    <div
      className={`k-card w-full h-[500px] bg-black/[0.96] relative overflow-hidden ${className ?? ''}`}
      style={{
        width: '100%',
        minHeight: 500,
        height: 500,
        backgroundColor: 'rgba(0, 0, 0, 0.96)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />

      <div className="flex h-full" style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* Left content */}
        <div
          className="flex-1 p-8 relative z-10 flex flex-col justify-center"
          style={{
            flex: 1,
            padding: '40px 48px',
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <h1
            className="k-3d-title khiw-3d-title text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400"
            style={{
              fontSize: 'clamp(36px, 5vw, 54px)',
              fontWeight: 800,
              letterSpacing: '-0.012em',
              lineHeight: 1.18,
              margin: 0,
            }}
          >
            <span
              style={{
                display: 'block',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #D4D4D4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                letterSpacing: '-0.012em',
              }}
            >
              {title}
            </span>
            <span
              className="k-3d-title-accent khiw-3d-title-accent"
              style={{
                display: 'block',
                marginTop: 12,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #BAE6FD 18%, #60A5FA 42%, #2563EB 72%, #93C5FD 90%, #FFFFFF 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                filter: 'drop-shadow(0 0 16px rgba(96, 165, 250, 0.6)) drop-shadow(0 0 35px rgba(37, 99, 235, 0.35)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))',
                letterSpacing: '-0.012em',
              }}
            >
              {accentTitle}
            </span>
          </h1>
        </div>

        {/* Right content */}
        <div
          className="flex-1 relative"
          style={{
            flex: 1,
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
