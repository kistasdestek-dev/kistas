import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Platform,
  StyleProp,
  ViewStyle,
  Modal,
  Easing,
} from 'react-native';

const logoSource = require('../../../assets/kistas-logo-transparent.png');

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  submessage?: string;
  transparent?: boolean;
  blurIntensity?: number;
  useModal?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const OVL_STYLE_ID = 'kistas-loading-overlay-styles';

const OVL_CSS = `
.k-loading-overlay-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  pointer-events: none;
  user-select: none;
  touch-action: none;
}

.k-logo-loader-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  pointer-events: none;
}

.k-logo-aura {
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(50, 105, 199, 0.35) 0%, rgba(96, 165, 250, 0.14) 48%, transparent 72%);
  animation: kLogoAura 2.2s ease-in-out infinite alternate;
  pointer-events: none;
}

.k-logo-img {
  position: relative;
  width: 52px;
  height: 52px;
  object-fit: contain;
  animation: kLogoBreath 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate;
  filter: drop-shadow(0 4px 14px rgba(50, 105, 199, 0.38));
  pointer-events: none;
}

@keyframes kLogoBreath {
  0% { transform: scale(0.93); opacity: 0.88; }
  100% { transform: scale(1.07); opacity: 1; }
}

@keyframes kLogoAura {
  0% { transform: scale(0.75); opacity: 0.3; }
  100% { transform: scale(1.3); opacity: 0.85; }
}
`;

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  transparent = true,
  useModal = false,
  containerStyle,
  testID = 'loading-overlay',
}) => {
  const isWeb = Platform.OS === 'web';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.93)).current;
  const auraAnim = useRef(new Animated.Value(0.75)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  // Inject Web CSS once
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    if (!document.getElementById(OVL_STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = OVL_STYLE_ID;
      styleEl.textContent = OVL_CSS;
      document.head.appendChild(styleEl);
    }
  }, [isWeb]);

  // Entrance & Exit animation
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, fadeAnim]);

  // Native breathing animation loop
  useEffect(() => {
    if (isWeb) return;

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.07,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(auraAnim, {
            toValue: 1.3,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.93,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(auraAnim, {
            toValue: 0.75,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    breathLoop.start();
    return () => breathLoop.stop();
  }, [isWeb, pulseAnim, auraAnim]);

  if (!shouldRender) return null;

  if (isWeb) {
    return (
      <div
        className="k-loading-overlay-root"
        style={containerStyle as any}
        data-testid={testID}
      >
        <div className="k-logo-loader-wrap">
          <div className="k-logo-aura" />
          <img
            src={typeof logoSource === 'string' ? logoSource : logoSource?.uri || logoSource}
            alt="Kıstas"
            className="k-logo-img"
          />
        </div>
      </div>
    );
  }

  const content = (
    <Animated.View
      style={[
        styles.nativeOverlay,
        { opacity: fadeAnim },
        containerStyle,
      ]}
      testID={testID}
      pointerEvents="none"
    >
      <View style={styles.nativeWrap}>
        <Animated.View
          style={[
            styles.nativeAura,
            { transform: [{ scale: auraAnim }] },
          ]}
        />
        <Animated.Image
          source={logoSource}
          resizeMode="contain"
          style={[
            styles.nativeLogo,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      </View>
    </Animated.View>
  );

  if (useModal) {
    return (
      <Modal
        visible={visible}
        transparent={transparent}
        animationType="none"
        statusBarTranslucent
      >
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  nativeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  nativeWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nativeAura: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(50, 105, 199, 0.22)',
  },
  nativeLogo: {
    width: 52,
    height: 52,
  },
});
