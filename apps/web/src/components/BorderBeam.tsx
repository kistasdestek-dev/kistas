'use client';

import React, { useEffect } from 'react';

const BORDER_BEAM_STYLES = `
@keyframes border-beam-spin {
  from {
    --angle: 0deg;
  }
  to {
    --angle: 360deg;
  }
}

@property --angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.kistas-border-beam {
  animation: border-beam-spin var(--duration, 12s) linear infinite;
  animation-delay: var(--delay, 0s);
  background: conic-gradient(
    from var(--angle, 0deg) at 50% 50%,
    transparent 0%,
    transparent 60%,
    var(--color-from, #3269C7) 85%,
    var(--color-to, #9c40ff) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: var(--border-width, 1.5px);
}
`;

function useGlobalStyles(css: string, id: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [css, id]);
}

export interface BorderBeamProps {
  children?: React.ReactNode;
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  colorVariant?: 'gold' | 'emerald' | 'kistas' | 'violet';
  borderWidth?: number;
  borderRadius?: number;
}

export function BorderBeam({
  children,
  className = '',
  size = 200,
  duration = 10,
  delay = 0,
  colorFrom,
  colorTo,
  colorVariant = 'kistas',
  borderWidth = 1.5,
  borderRadius = 20,
}: BorderBeamProps) {
  useGlobalStyles(BORDER_BEAM_STYLES, 'kistas-border-beam-styles');

  const activeColorFrom =
    colorFrom ??
    (colorVariant === 'gold'
      ? '#d49b28'
      : colorVariant === 'emerald'
        ? '#0fa336'
        : colorVariant === 'kistas'
          ? '#2997ff'
          : '#ffaa40');

  const activeColorTo =
    colorTo ??
    (colorVariant === 'gold'
      ? '#fadb70'
      : colorVariant === 'emerald'
        ? '#3269C7'
        : colorVariant === 'kistas'
          ? '#9c40ff'
          : '#3269C7');

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`}
      style={
        {
          borderRadius: borderRadius ? `${borderRadius}px` : 'inherit',
          '--size': `${size}px`,
          '--duration': `${duration}s`,
          '--delay': `-${delay}s`,
          '--color-from': activeColorFrom,
          '--color-to': activeColorTo,
          '--border-width': `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="kistas-border-beam absolute inset-0"
        style={{
          borderRadius: borderRadius ? `${borderRadius}px` : 'inherit',
        }}
      />
      {children}
    </div>
  );
}
