export const typography = {
  kistas: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  sizes: {
    '2xs': 10,
    xs: 11.5,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 23,
    '2xl': 28,
    '3xl': 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
  lineHeights: {
    tight: 1.15,
    normal: 1.35,
    relaxed: 1.55,
  },
};

export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  '3xl': 40,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const shadows = {
  soft: {
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 2,
  },
  card: {
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 8,
  },
  floating: {
    shadowColor: '#677d6a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: '#a08d72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  modal: {
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};
