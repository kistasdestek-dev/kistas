import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme/colors';
export interface AmbientGlowBackgroundProps { className?: string; }
export const AmbientGlowBackground: React.FC<AmbientGlowBackgroundProps> = () => (
  <View pointerEvents="none" accessibilityElementsHidden style={styles.background} />
);
export const Component = AmbientGlowBackground;
export default AmbientGlowBackground;
const styles = StyleSheet.create({ background: { ...StyleSheet.absoluteFill, backgroundColor: colors.brand.canvas } });
