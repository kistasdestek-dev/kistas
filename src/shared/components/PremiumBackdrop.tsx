import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AmbientGlowBackground } from '@/components/ui/background-components';
import { colors } from '@/core/theme/colors';

export type PremiumBackdropVariant = 'discover' | 'browse' | 'create' | 'messages' | 'credits' | 'profile' | 'detail';

export const PremiumBackdrop = React.memo((_props: { variant?: PremiumBackdropVariant }) => (
  <View pointerEvents="none" accessibilityElementsHidden style={styles.canvas}>
    <AmbientGlowBackground />
  </View>
));

const styles = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: colors.brand.canvas },
});
