import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { breakpoints } from '../../core/theme';

export interface LogoLoopItem {
  id: string;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
}

export interface LogoLoopProps<T extends LogoLoopItem = LogoLoopItem> {
  items: ReadonlyArray<T>;
  onItemPress?: (item: T) => void;
  selectedId?: string | null;
  speed?: number;
  pauseOnHover?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  accentColor?: string;
  testID?: string;
}

export const LogoLoop = <T extends LogoLoopItem = LogoLoopItem>({
  items,
  onItemPress,
  selectedId,
  containerStyle,
  accentColor = '#EAF2FC',
  testID,
}: LogoLoopProps<T>): React.ReactElement => {
  const { width } = useWindowDimensions();
  const isPhone = width <= breakpoints.phoneMax;

  const chips = items.map((item) => {
    const isSelected = selectedId !== undefined ? selectedId === item.id : !!item.active;
    return (
      <Pressable
        key={item.id}
        onPress={() => onItemPress?.(item)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        style={({ pressed }) => [
          styles.chip,
          isSelected && [styles.chipActive, { borderColor: accentColor }],
          pressed && styles.chipPressed,
        ]}
      >
        {isSelected ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(50,105,199,0.32)', 'rgba(50,105,199,0.13)']}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {item.icon ? (
          <Ionicons
            name={item.icon}
            size={14}
            color={isSelected ? '#252333' : '#686474'}
            style={styles.icon}
          />
        ) : null}
        <Text style={[styles.label, isSelected && styles.labelActive]}>{item.label}</Text>
      </Pressable>
    );
  });

  if (isPhone) {
    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phoneTrack}
        >
          {chips}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.wideTrack, containerStyle]} testID={testID}>
      {chips}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  phoneTrack: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 10,
  },
  wideTrack: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.09)',
    outlineStyle: 'none' as any,
  },
  chipActive: {
    backgroundColor: '#F8F9FB',
    boxShadow: '0 6px 18px rgba(255,255,255,0.16)' as any,
  },
  chipPressed: {
    opacity: 0.72,
  },
  icon: {
    marginRight: 7,
  },
  label: {
    color: '#686474',
    fontSize: 12.5,
    fontWeight: '600',
  },
  labelActive: {
    color: '#252333',
    fontWeight: '700',
  },
});
