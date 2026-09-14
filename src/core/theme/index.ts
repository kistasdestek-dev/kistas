import { colors } from './colors';
import { typography, spacing, radius, shadows } from './spacing';
import { breakpoints, responsiveLayout } from './responsive';
import { kistasStyle } from './kistasStyle';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  breakpoints,
  responsiveLayout,
  kistasStyle,
};

export type Theme = typeof theme;
export { breakpoints, getViewportClass, responsiveLayout } from './responsive';
export type { ViewportClass } from './responsive';
export { kistasStyle } from './kistasStyle';
export type { KistasStyleTokens } from './kistasStyle';
