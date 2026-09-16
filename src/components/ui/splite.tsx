'use client';

import React, { Suspense, lazy } from 'react';
import { Card } from './card';
import { Spotlight } from './spotlight';

const Spline = lazy(() => import('@splinetool/react-spline'));

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
  return (
    <SplineErrorBoundary>
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
          className={className}
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
    </SplineErrorBoundary>
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
    <Card className={`w-full h-[500px] bg-black/[0.96] relative overflow-hidden ${className ?? ''}`}>
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
    </Card>
  );
}
