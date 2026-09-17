import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ParsDevstateLogoProps {
  size?: number;
}

/** Platform-neutral rendition of the supplied Pars DevState wordmark. */
export function ParsDevstateLogo({ size = 16 }: ParsDevstateLogoProps) {
  const barWidth = Math.max(2, Math.round(size * 0.09));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Pars DevState" style={styles.container}>
      <Text style={[styles.pars, { fontSize: size, lineHeight: Math.round(size * 1.1) }]}>PARS</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bars}>
        {[0.42, 0.82, 0.56, 1].map((height, index) => (
          <View key={index} style={[styles.bar, index % 2 === 0 ? styles.redBar : styles.inkBar, { width: barWidth, height: Math.round(size * height) }]} />
        ))}
      </View>
      <Text style={[styles.devstate, { fontSize: size, lineHeight: Math.round(size * 1.1) }]}>DEVSTATE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  pars: { color: '#B91C1C', fontWeight: '700', letterSpacing: 1.1 },
  devstate: { color: '#25364E', fontWeight: '700', letterSpacing: 0.25 },
  bars: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 2, marginHorizontal: 7 },
  bar: { borderRadius: 99 },
  redBar: { backgroundColor: '#B91C1C' },
  inkBar: { backgroundColor: '#25364E' },
});
