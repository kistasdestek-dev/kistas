import React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/core/theme/colors';
export interface AmbientGlowBackgroundProps { className?: string; }
export const AmbientGlowBackground: React.FC<AmbientGlowBackgroundProps> = ({ className }) => (
  <div aria-hidden="true" className={cn('kistas-light-background', className)}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: colors.brand.canvas }} />
);
export const Component = AmbientGlowBackground;
export default AmbientGlowBackground;
