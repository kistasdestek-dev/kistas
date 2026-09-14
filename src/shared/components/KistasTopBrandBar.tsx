import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { breakpoints } from '../../core/theme';

export interface KistasTopBrandBarProps {
  onPress?: () => void;
  tagline?: string;
  showTagline?: boolean;
  style?: StyleProp<ViewStyle>;
}

const logoSource = require('../../../assets/kistas-logo-transparent.png');

export const KistasTopBrandBar: React.FC<KistasTopBrandBarProps> = ({
  onPress,
  tagline = 'İyi fikirler görünür olmayı hak eder',
  showTagline = true,
  style,
}) => {
  const { width: viewportWidth } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && viewportWidth > breakpoints.phoneMax;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <View
      style={[
        styles.topBrandBar,
        isWideWeb && styles.topBrandBarWeb,
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.brandIdentityBlock}
        activeOpacity={0.82}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Kıstas Ana Sayfası"
      >
        <View style={[styles.brandLogoPlate, isWideWeb && styles.brandLogoPlateWeb]}>
          <Image
            source={logoSource}
            style={[styles.brandLogoImg, isWideWeb && styles.brandLogoImgWeb]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.brandMetaCol}>
          <Text style={[styles.brandName, isWideWeb && styles.brandNameWeb]}>Kıstas</Text>
          {showTagline && Boolean(tagline) ? (
            <Text style={styles.brandTagline}>{tagline}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  topBrandBar: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    zIndex: 10,
  },
  topBrandBarWeb: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    marginBottom: 14,
  },
  brandIdentityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brandLogoPlate: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(37, 84, 199, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px -4px rgba(37, 84, 199, 0.15), 0 2px 5px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#2554C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 4,
      },
    }),
  },
  brandLogoPlateWeb: {
    width: 62,
    height: 62,
    borderRadius: 18,
  },
  brandLogoImg: {
    width: 38,
    height: 38,
    transform: [{ translateX: -2 }, { translateY: 1 }],
  },
  brandLogoImgWeb: {
    width: 44,
    height: 44,
  },
  brandMetaCol: {
    justifyContent: 'center',
    minWidth: 0,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: '#1A1826',
    lineHeight: 29,
  },
  brandNameWeb: {
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 0,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
});
