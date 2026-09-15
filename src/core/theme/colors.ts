/** White surfaces, ink typography and restrained logo-blue interaction accents. */
export const colors = {
  brand: { ink: '#25364E', canvas: '#F1F5FA', surface: '#F8F9FB', scrollProgress: '#013196' },
  primary: {
    DEFAULT: '#3269C7', light: '#3269C7', hover: '#2858AA', dark: '#EAF2FC',
    surface: 'rgba(50,105,199,0.12)', gradientStart: '#EAF2FC', gradientEnd: '#3269C7',
  },
  secondary: {
    DEFAULT: '#3269C7', light: '#FAFBFD', hover: '#2858AA', dark: '#FAFBFD',
    surface: 'rgba(50,105,199,0.10)',
  },
  mesh: {
    baseDeep: '#ffffff', baseMid: '#F8F9FB', baseVoid: '#ffffff',
    indigo: '#3269C7', azure: '#3269C7', violet: '#3269C7', cyan: '#3269C7',
    magenta: '#ad4689', cobalt: '#3269C7',
  },
  accent: {
    gold: '#936413', goldSurface: 'rgba(147,100,19,0.12)',
    purple: '#3269C7', purpleSurface: 'rgba(50,105,199,0.12)',
    cyan: '#3269C7', cyanSurface: 'rgba(50,105,199,0.12)',
    magenta: '#ad4689', magentaSurface: 'rgba(173,70,137,0.12)',
  },
  success: { DEFAULT: '#187657', light: '#E7F4ED', dark: '#11563F', surface: 'rgba(24,118,87,0.12)' },
  danger: { DEFAULT: '#bd354c', light: '#a06e6e', dark: '#a04049', surface: 'rgba(189,53,76,0.12)' },
  warning: { DEFAULT: '#936413', light: '#FAFBFD', dark: '#a07e3c', surface: 'rgba(147,100,19,0.12)' },
  neutral: {
    white: '#FFFFFF', 50: '#FAFAFC', 100: '#F3F5F8', 200: '#DFE4EB',
    300: '#777181', 400: '#686474', 500: '#686474', 600: '#5c576b',
    700: '#403b50', 800: '#302d40', 900: '#25364E', black: '#25364E',
  },
  glass: {
    cardBg: '#FFFFFF', cardBorder: '#DFE4EB',
    cardHighlight: 'rgba(50,105,199,0.18)', darkBg: 'rgba(250,251,253,0.94)',
    overlay: 'rgba(37,35,51,0.32)',
  },
  tags: {
    handDeliveryBg: 'rgba(24,118,87,0.12)', handDeliveryBorder: 'rgba(24,118,87,0.35)', handDeliveryText: '#187657',
    shippingBg: 'rgba(50,105,199,0.12)', shippingBorder: 'rgba(50,105,199,0.35)', shippingText: '#3269C7',
    hybridBg: 'rgba(50,105,199,0.12)', hybridBorder: 'rgba(50,105,199,0.35)', hybridText: '#3269C7',
  },
} as const;

export type ColorTokens = typeof colors;
