import React, { useEffect, useRef } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../core/theme';
import { KistasLogo } from './KistasLogo';
import { MagneticScrambleText } from './MagneticScrambleText';

interface KistasLaunchScreenProps {
  onFinish: () => void;
}

export const KistasLaunchScreen: React.FC<KistasLaunchScreenProps> = ({ onFinish }) => {
  const logoReveal = useRef(new Animated.Value(0)).current;
  const wordmarkReveal = useRef(new Animated.Value(0)).current;
  const taglineReveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.18, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    const entrance = Animated.sequence([
      Animated.delay(160),
      Animated.spring(logoReveal, { toValue: 1, friction: 7, tension: 58, useNativeDriver: true }),
      Animated.delay(90),
      Animated.parallel([
        Animated.timing(wordmarkReveal, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(180),
          Animated.timing(taglineReveal, { toValue: 1, duration: 440, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(820),
      Animated.timing(exit, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);

    pulseAnimation.start();
    entrance.start(({ finished }) => {
      pulseAnimation.stop();
      if (finished) onFinish();
    });
    return () => { pulseAnimation.stop(); entrance.stop(); };
  }, [exit, logoReveal, onFinish, pulse, taglineReveal, wordmarkReveal]);

  const logoScale = logoReveal.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const logoTranslateY = logoReveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const wordmarkTranslateY = wordmarkReveal.interpolate({ inputRange: [0, 1], outputRange: [15, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.13] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.06] });
  const logoBreathScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.035] });
  const logoBreathRotate = pulse.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1deg'] });
  const auraScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.18] });
  const sparkOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.38, 1] });
  const sparkLift = pulse.interpolate({ inputRange: [0, 1], outputRange: [3, -5] });
  const screenOpacity = exit.interpolate({ inputRange: [0, 0.62, 1], outputRange: [1, 0.94, 0] });
  const screenScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity, transform: [{ scale: screenScale }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.backgroundOrbTop} />
        <View style={styles.backgroundOrbBottom} />
        <View style={styles.gridHorizontal} />
        <View style={styles.gridVertical} />

        <View style={styles.centerStage}>
          <Animated.View style={[styles.haloOuter, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
          <Animated.View style={[styles.haloInner, { opacity: logoReveal, transform: [{ scale: logoScale }] }]} />

          <Animated.View style={[styles.logoStage, { opacity: logoReveal, transform: [{ translateY: logoTranslateY }, { scale: logoScale }] }]}>
            <Animated.View style={[styles.logoGlass, { transform: [{ scale: logoBreathScale }, { rotate: logoBreathRotate }] }]}>
              <Animated.View style={[styles.logoAura, { opacity: pulseOpacity, transform: [{ scale: auraScale }] }]} />
              <KistasLogo size={92} showWordmark={false} glow />
            </Animated.View>
            <Animated.View style={[styles.spark, styles.sparkTop, { opacity: sparkOpacity, transform: [{ translateY: sparkLift }, { rotate: '45deg' }] }]} />
            <Animated.View style={[styles.spark, styles.sparkRight, { opacity: sparkOpacity, transform: [{ translateY: sparkLift }, { rotate: '45deg' }] }]} />
            <Animated.View style={[styles.sparkSmall, styles.sparkBottom, { opacity: sparkOpacity, transform: [{ translateY: sparkLift }] }]} />
          </Animated.View>

          <Animated.View style={[styles.wordmarkStage, { opacity: wordmarkReveal, transform: [{ translateY: wordmarkTranslateY }] }]}>
            <MagneticScrambleText
              text="KISTAS"
              status="identity locked"
              busyStatus="decoding identity"
              fontSize={36}
              startDelay={720}
              compact
            />
          </Animated.View>
          <Animated.View style={[styles.brandRule, { opacity: taglineReveal }]}>
            <View style={styles.ruleLine} /><View style={styles.ruleDiamond} /><View style={styles.ruleLine} />
          </Animated.View>
          <Animated.Text style={[styles.tagline, { opacity: taglineReveal }]}>GÜVENLE AL · KOLAYCA SAT</Animated.Text>
        </View>

        <Animated.View style={[styles.securityBadge, { opacity: taglineReveal }]}>
          <View style={styles.securityDot} />
          <Text style={styles.securityText}>GÜVENLİ HAVUZ KORUMASI</Text>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, backgroundColor: '#F8F9FB' },
  safeArea: { flex: 1, overflow: 'hidden' },
  backgroundOrbTop: { position: 'absolute', width: 360, height: 360, top: -190, right: -150, borderRadius: 180, backgroundColor: 'rgba(50,105,199,0.2)', shadowColor: '#252333', shadowOpacity: 0.36, shadowRadius: 80 },
  backgroundOrbBottom: { position: 'absolute', width: 320, height: 320, bottom: -190, left: -160, borderRadius: 160, backgroundColor: 'rgba(50,105,199,0.14)', shadowColor: '#252333', shadowOpacity: 0.24, shadowRadius: 70 },
  gridHorizontal: { position: 'absolute', left: 28, right: 28, top: '50%', height: 1, backgroundColor: 'rgba(50,105,199,0.04)' },
  gridVertical: { position: 'absolute', top: 70, bottom: 70, left: '50%', width: 1, backgroundColor: 'rgba(50,105,199,0.04)' },
  centerStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 28 },
  haloOuter: { position: 'absolute', width: 270, height: 270, borderRadius: 135, borderWidth: 1, borderColor: 'rgba(50,105,199,0.28)', backgroundColor: 'rgba(50,105,199,0.08)' },
  haloInner: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: 'rgba(50,105,199,0.18)', backgroundColor: 'rgba(50,105,199,0.06)', shadowColor: '#252333', shadowOpacity: 0.08, shadowRadius: 38, elevation: 12 },
  logoStage: { alignItems: 'center', justifyContent: 'center' },
  logoGlass: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', borderRadius: 42, backgroundColor: 'rgba(50,105,199,0.04)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.2)', shadowColor: '#252333', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 14 },
  logoAura: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(50,105,199,0.25)', shadowColor: '#252333', shadowOpacity: 0.08, shadowRadius: 24 },
  spark: { position: 'absolute', width: 7, height: 7, borderRadius: 2, backgroundColor: '#EAF2FC', shadowColor: '#252333', shadowOpacity: 0.08, shadowRadius: 9 },
  sparkSmall: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#EAF2FC', shadowColor: '#252333', shadowOpacity: 0.08, shadowRadius: 7 },
  sparkTop: { top: -4, right: 4 },
  sparkRight: { top: 38, right: -12, width: 4, height: 4 },
  sparkBottom: { bottom: 4, left: -7 },
  wordmarkStage: { marginTop: 16 },
  brandRule: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  ruleLine: { width: 34, height: 1, backgroundColor: 'rgba(50,105,199,0.22)' },
  ruleDiamond: { width: 5, height: 5, marginHorizontal: 9, backgroundColor: '#EAF2FC', transform: [{ rotate: '45deg' }] },
  tagline: { color: '#686474', fontSize: 8, letterSpacing: 2, fontWeight: theme.typography.weights.heavy, marginTop: 12 },
  securityBadge: { position: 'absolute', bottom: 28, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.full, backgroundColor: 'rgba(250,251,253,0.86)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.08)' },
  securityDot: { width: 5, height: 5, borderRadius: 3, marginRight: 7, backgroundColor: '#EAF2FC', shadowColor: '#252333', shadowOpacity: 0.08, shadowRadius: 6 },
  securityText: { color: '#252333', fontSize: 7, letterSpacing: 1.1, fontWeight: theme.typography.weights.heavy },
});
