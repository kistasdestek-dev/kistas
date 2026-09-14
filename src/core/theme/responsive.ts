export const breakpoints = {
  phoneMax: 767,
  tabletMax: 1199,
} as const;

export type ViewportClass = 'phone' | 'tablet' | 'desktop';

export const getViewportClass = (width: number): ViewportClass => {
  if (width <= breakpoints.phoneMax) return 'phone';
  if (width <= breakpoints.tabletMax) return 'tablet';
  return 'desktop';
};

export const responsiveLayout = {
  phone: {
    contentMaxWidth: 767,
    horizontalGutter: 16,
    columnCount: 2,
  },
  tablet: {
    contentMaxWidth: 1080,
    horizontalGutter: 28,
    columnCount: 3,
  },
  desktop: {
    contentMaxWidth: 1440,
    horizontalGutter: 40,
    columnCount: 4,
  },
} as const;
