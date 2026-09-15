import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface KistasLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

const logoSource = require('../../../assets/kistas-logo-transparent.png');

export const KistasLogo: React.FC<KistasLogoProps> = ({
  size = 36,
  showWordmark = true,
  wordmarkColor = '#25364E',
  glow = false,
  style,
}) => (
  <View
    style={[styles.container, style]}
    accessible
    accessibilityRole="image"
    accessibilityLabel="Kıstas"
  >
    <Image
      source={logoSource}
      resizeMode="contain"
      style={[
        styles.mark,
        { width: size, height: size },
        showWordmark && styles.markWithWordmark,
        glow && styles.markGlow,
      ]}
    />
    {showWordmark ? (
      <Text
        style={[
          styles.wordmark,
          {
            color: wordmarkColor,
            fontSize: Math.round(size * 0.76),
            lineHeight: Math.round(size * 0.9),
          },
        ]}
      >
        Kıstas
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {},
  markWithWordmark: {
    marginRight: 8,
  },
  markGlow: {
    shadowColor: '#112532',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.6,
  },
});
