import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

export interface AutoTransparentLogoProps {
  src: string;
  alt?: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  draggable?: boolean;
  decoding?: 'async' | 'sync' | 'auto';
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}

/**
 * AutoTransparentLogo (Native)
 * Safely renders the logo on iOS & Android with transparent background and containment.
 */
export const AutoTransparentLogo: React.FC<AutoTransparentLogoProps> = ({
  src,
  style,
}) => {
  return (
    <Image
      source={{ uri: src }}
      style={[styles.img, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  img: {
    backgroundColor: 'transparent',
  },
});
