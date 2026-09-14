import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';
import type { BorderBeamProps } from './BorderBeam';

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

export function BorderBeam({
  children,
  className,
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom,
  colorTo,
  colorVariant = 'kistas',
  borderWidth = 1.5,
  borderRadius = 18,
  squircle = false,
}: BorderBeamProps) {
  useGlobalStyles(BORDER_BEAM_STYLES, 'border-beam-styles');

  const squircleStyle = squircle
    ? ({ cornerShape: 'squircle' } as React.CSSProperties)
    : {};

  const activeColorFrom =
    colorFrom ??
    (colorVariant === 'gold'
      ? '#a06707'
      : colorVariant === 'emerald'
        ? '#187657'
        : colorVariant === 'kistas'
          ? '#394D45'
          : '#ffaa40');

  const activeColorTo =
    colorTo ??
    (colorVariant === 'gold'
      ? '#a09757'
      : colorVariant === 'emerald'
        ? '#3269C7'
        : colorVariant === 'kistas'
          ? '#91B3A6'
          : '#9c40ff');

  const overlayElement = (
    <div
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', className)}
      style={
        {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 25,
          borderRadius: borderRadius ? `${borderRadius}px` : 'inherit',
          overflow: 'hidden',
          '--size': typeof size === 'number' ? size : 200,
          '--duration': `${duration}s`,
          '--delay': `-${delay}s`,
          '--color-from': activeColorFrom,
          '--color-to': activeColorTo,
          '--border-width': `${borderWidth}px`,
          ...squircleStyle,
        } as React.CSSProperties
      }
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={
          {
            position: 'absolute',
            inset: 0,
            borderRadius: borderRadius ? `${borderRadius}px` : 'inherit',
            padding: `var(--border-width, ${borderWidth}px)`,
            background: `
            linear-gradient(
              var(--angle, 0deg),
              transparent 0%,
              transparent 35%,
              var(--color-from, ${activeColorFrom}) 50%,
              var(--color-to, ${activeColorTo}) 65%,
              transparent 80%,
              transparent 100%
            )
          `,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            animation: `border-beam-spin var(--duration, ${duration}s) linear infinite var(--delay, -${delay}s)`,
            ...squircleStyle,
          } as React.CSSProperties
        }
      />
    </div>
  );

  if (children) {
    return (
      <div
        className={cn('kbb relative isolate inline-flex box-border', className)}
        style={{
          position: 'relative',
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
          width: '100%',
        }}
      >
        <div className="relative z-10 w-full h-full rounded-[inherit]">{children}</div>
        {overlayElement}
      </div>
    );
  }

  return overlayElement;
}

export default BorderBeam;
