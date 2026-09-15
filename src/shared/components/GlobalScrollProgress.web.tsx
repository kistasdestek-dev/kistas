import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../../core/theme';

interface GlobalScrollProgressProps {
  pageKey: string;
}

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));

const readDocumentProgress = () => {
  const scroller = document.scrollingElement || document.documentElement;
  const maximum = scroller.scrollHeight - scroller.clientHeight;
  return maximum > 1 ? clampProgress(scroller.scrollTop / maximum) : 0;
};

const readElementProgress = (element: HTMLElement) => {
  const maximum = element.scrollHeight - element.clientHeight;
  return maximum > 1 ? clampProgress(element.scrollTop / maximum) : null;
};

export const GlobalScrollProgress: React.FC<GlobalScrollProgressProps> = ({ pageKey }) => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
  }, [pageKey]);

  useEffect(() => {
    const updateProgress = (nextProgress: number) => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setProgress(nextProgress);
        frameRef.current = null;
      });
    };

    const handleScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const elementProgress = readElementProgress(target);
        if (elementProgress !== null) {
          updateProgress(elementProgress);
          return;
        }
      }
      updateProgress(readDocumentProgress());
    };

    const resetProgress = () => updateProgress(0);

    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('kistas:scroll-to-top', resetProgress);

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('kistas:scroll-to-top', resetProgress);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="global-scroll-progress"
      style={{
        position: 'fixed',
        zIndex: 2_147_483_647,
        top: 0,
        right: 0,
        left: 0,
        height: 4,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: theme.colors.brand.scrollProgress,
          transform: `scaleX(${progress})`,
          transformOrigin: 'left center',
          transition: 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      />
    </div>
  );
};
