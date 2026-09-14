import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { MagneticScrambleText } from './MagneticScrambleText';

interface AuthSuccessOverlayProps {
  onFinish: () => void;
}

export const AuthSuccessOverlay: React.FC<AuthSuccessOverlayProps> = ({ onFinish }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const ringScale = useRef(new Animated.Value(0.74)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          stiffness: 190,
          damping: 18,
          mass: 0.78,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.52,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1050),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 360,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1.035,
          duration: 360,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinishRef.current();
    });
    return () => animation.stop();
  }, [cardScale, opacity, ringOpacity, ringScale]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel="Güvenli giriş başarılı"
    >
      <View style={styles.ambientBlue} />
      <View style={styles.ambientViolet} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.successRing,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
        <LinearGradient
          colors={['rgba(50,105,199,0.12)', 'rgba(250,251,253,0.86)', 'rgba(250,251,253,0.92)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardHighlight} />

        <View style={styles.lockBadge}>
          <LinearGradient
            colors={['#EAF2FC', '#EAF2FC', '#EAF2FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockBadgeGradient}
          >
            <Ionicons name="shield-checkmark" size={23} color="#252333" />
          </LinearGradient>
        </View>

        <MagneticScrambleText
          text="UNLOCKED"
          status="güvenli giriş başarılı"
          busyStatus="verifying access"
          fontSize={27}
          startDelay={90}
          compact
        />

        <View style={styles.sessionRow}>
          <View style={styles.sessionDot} />
          <Text style={styles.sessionText}>OTURUM DOĞRULANDI</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,251,253,0.88)',
    overflow: 'hidden',
  },
  ambientBlue: {
    position: 'absolute',
    width: 320,
    height: 320,
    left: -170,
    bottom: -130,
    borderRadius: 160,
    backgroundColor: 'rgba(50,105,199,0.16)',
    shadowColor: '#252333',
    shadowOpacity: 0.36,
    shadowRadius: 72,
  },
  ambientViolet: {
    position: 'absolute',
    width: 340,
    height: 340,
    right: -190,
    top: -150,
    borderRadius: 170,
    backgroundColor: 'rgba(50,105,199,0.18)',
    shadowColor: '#252333',
    shadowOpacity: 0.42,
    shadowRadius: 78,
  },
  successRing: {
    position: 'absolute',
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.36)',
    backgroundColor: 'rgba(50,105,199,0.06)',
  },
  card: {
    width: '86%',
    maxWidth: 350,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.23)',
    overflow: 'hidden',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.08,
    shadowRadius: 38,
    elevation: 20,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.28)',
  },
  lockBadge: {
    width: 50,
    height: 50,
    marginBottom: 14,
    borderRadius: 17,
    padding: 1,
    backgroundColor: 'rgba(50,105,199,0.16)',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  lockBadgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  sessionRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(50,105,199,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
  },
  sessionDot: {
    width: 5,
    height: 5,
    marginRight: 7,
    borderRadius: 3,
    backgroundColor: '#EAF2FC',
    shadowColor: '#252333',
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  sessionText: {
    color: '#252333',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 1.15,
  },
});
