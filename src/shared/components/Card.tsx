import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { theme } from '../../core/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: theme.colors.glass.cardBg,
          borderWidth: 1,
          borderColor: theme.colors.glass.cardBorder,
        };
      case 'flat':
        return {
          backgroundColor: 'rgba(250,251,253,0.86)',
          borderWidth: 1,
          borderColor: 'rgba(50,105,199,0.11)',
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(250,251,253,0.86)',
          borderWidth: 1,
          borderColor: theme.colors.glass.cardBorder,
          ...theme.shadows.soft,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: theme.colors.glass.cardBg,
          borderWidth: 1,
          borderColor: theme.colors.glass.cardBorder,
          ...theme.shadows.card,
        };
    }
  };

  const combinedStyles = [styles.base, getVariantStyle(), style];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={combinedStyles}>
        <View pointerEvents="none" style={styles.ambientGlow} />
        <View pointerEvents="none" style={styles.innerHighlight} />
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={combinedStyles}>
      <View pointerEvents="none" style={styles.ambientGlow} />
      <View pointerEvents="none" style={styles.innerHighlight} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -105,
    right: -70,
    backgroundColor: 'rgba(50,105,199,0.16)',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.16)',
  },
});
