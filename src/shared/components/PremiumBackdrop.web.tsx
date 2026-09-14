import React from 'react';
import { AmbientGlowBackground } from '@/components/ui/background-components';
import { colors } from '@/core/theme/colors';
export type PremiumBackdropVariant = 'discover' | 'browse' | 'create' | 'messages' | 'credits' | 'profile' | 'detail';
export const PremiumBackdrop = React.memo((_props: { variant?: PremiumBackdropVariant }) => (
  <div aria-hidden="true" data-testid="light-backdrop"
    style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: colors.brand.canvas }}>
    <AmbientGlowBackground />
  </div>
));
