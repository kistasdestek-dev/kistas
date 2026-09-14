import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  Text,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface GlassIconButtonProps {
  icon: IoniconName;
  iconColor?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  active?: boolean;
  badge?: number | string;
  disabled?: boolean;
  iconSize?: number;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  icon,
  iconColor = '#3269C7',
  accessibilityLabel,
  accessibilityHint,
  active = false,
  badge,
  disabled = false,
  iconSize = 20,
  onPress,
  size = 42,
  style,
}) => {
  const radius = size / 2;
  const shellStyle = [
    styles.shell,
    { width: size, height: size, borderRadius: radius },
    disabled && styles.disabled,
    style,
  ];
  const content = (
    <>
      <LinearGradient
        colors={active ? ['#EEF5FF', '#E3EFFF'] : ['#FFFFFF', '#EEF5FF']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.surface, { borderRadius: radius }]}
      >
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </LinearGradient>
      {badge !== undefined && badge !== null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={shellStyle}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      disabled={disabled}
      onPress={onPress}
      style={shellStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  surface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#3269C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
});
