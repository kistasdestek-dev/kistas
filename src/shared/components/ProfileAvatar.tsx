import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { usesKistasDefaultAvatar } from '../../core/brandAssets';
import { KistasLogo } from './KistasLogo';

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  size?: number;
  logoSize?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  size = 40,
  logoSize = Math.round(size * 0.82),
  style,
  imageStyle,
}) => (
  <View
    style={[styles.container, { width: size, height: size }, style]}
    accessible
    accessibilityRole="image"
    accessibilityLabel="Profil fotoğrafı"
  >
    {usesKistasDefaultAvatar(avatarUrl) ? (
      <KistasLogo size={logoSize} showWordmark={false} />
    ) : (
      <Image
        source={{ uri: avatarUrl as string }}
        resizeMode="cover"
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }, imageStyle]}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
