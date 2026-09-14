/** Kıstas Stil: yumuşak neomorphism yüzeyler, cam-mavi ikonlar ve hareketli vurgu çerçevesi. */
export const kistasStyle = {
  neumorphism: {
    surface: '#F1F5FA',
    category: '#cfeeff',
    global: '#DCEAFF',
    border: '#FFFFFF',
    shadow: '#8292A8',
    ink: '#173866',
  },
  borderBeam: {
    from: '#3269C7',
    to: '#9c40ff',
  },
} as const;

export type KistasStyleTokens = typeof kistasStyle;
