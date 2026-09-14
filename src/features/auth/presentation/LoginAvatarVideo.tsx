import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { KistasLogo } from '../../../shared/components/KistasLogo';

export interface LoginAvatarVideoProps {
  size?: number;
}

export const LoginAvatarVideo: React.FC<LoginAvatarVideoProps> = ({ size }) => {
  const { width } = useWindowDimensions();
  const isPhone = width <= 767;
  const avatarSize = size ?? (isPhone ? 120 : 136);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Kıstas Avatar"
    >
      <View
        style={[
          styles.inner,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      >
        <KistasLogo size={avatarSize * 0.44} glow />
      </View>
    </View>
  );
};

export default LoginAvatarVideo;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8FD',
  },
});
