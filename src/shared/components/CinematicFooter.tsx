import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../core/theme';
import { KistasLogo } from './KistasLogo';

export interface CinematicFooterProps {
  compact?: boolean;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

type FooterLink = { title: string; action: () => void };

export const CinematicFooter: React.FC<CinematicFooterProps> = ({ compact = false, onOpenAbout, onOpenPrivacy, onOpenFaq, onOpenHowItWorks, onOpenBlog }) => {
  const reveals = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const glowPulse = useRef(new Animated.Value(0.48)).current;

  useEffect(() => {
    let active = true;
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        reveals.forEach((value) => value.setValue(1));
        glowPulse.setValue(0.62);
        return;
      }
      Animated.stagger(100, reveals.map((value) => Animated.timing(value, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }))).start();
      pulseAnimation = Animated.loop(Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.9, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.48, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      pulseAnimation.start();
    });
    return () => { active = false; pulseAnimation?.stop(); };
  }, [glowPulse, reveals]);

  const sections = useMemo(() => [
    { label: 'Kıstas', links: [
      ...(onOpenAbout ? [{ title: 'Hakkımızda', action: onOpenAbout }] : []),
      ...(onOpenHowItWorks ? [{ title: 'Nasıl Çalışır?', action: onOpenHowItWorks }] : []),
    ] },
    { label: 'Kaynaklar', links: [
      ...(onOpenBlog ? [{ title: 'Blog', action: onOpenBlog }] : []),
      ...(onOpenFaq ? [{ title: 'SSS', action: onOpenFaq }] : []),
      ...(onOpenPrivacy ? [{ title: 'KVKK ve Gizlilik', action: onOpenPrivacy }] : []),
    ] },
  ].filter((section) => section.links.length > 0), [onOpenAbout, onOpenBlog, onOpenFaq, onOpenHowItWorks, onOpenPrivacy]);

  const revealStyle = (index: number) => ({
    opacity: reveals[index],
    transform: [{ translateY: reveals[index].interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
  });

  return (
    <View style={[styles.footer, compact && styles.compact]} accessibilityRole="summary">
      <Animated.View style={[styles.glowWrap, { opacity: glowPulse }]} pointerEvents="none">
        <LinearGradient colors={['rgba(1,49,150,0.08)', 'rgba(248,250,253,0)']} style={styles.topLight} />
        <View style={styles.glowLine} />
      </Animated.View>
      <Animated.View style={[styles.brand, revealStyle(0)]}>
        <KistasLogo size={34} showWordmark glow />
        <Text style={styles.tagline}>Bağımsız dijital projelerin keşfedildiği, desteklendiği ve büyüdüğü topluluk vitrini.</Text>
      </Animated.View>
      <View style={styles.sections}>
        {sections.map((section, sectionIndex) => (
          <Animated.View key={section.label} style={[styles.section, revealStyle(Math.min(sectionIndex + 1, 2))]}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            {section.links.map((link: FooterLink) => (
              <Pressable key={link.title} onPress={link.action} style={({ pressed }) => [styles.link, pressed && styles.linkPressed]} accessibilityRole="button">
                <Text style={styles.linkText}>{link.title}</Text>
              </Pressable>
            ))}
          </Animated.View>
        ))}
        <Animated.View style={[styles.section, revealStyle(3)]}>
          <Text style={styles.sectionTitle}>Keşfet</Text>
          {['Dijital projeler', 'Popüler projeler', 'Yeni çıkanlar'].map((label) => (
            <View style={styles.discoveryItem} key={label}><View style={styles.discoveryDot} /><Text style={styles.discoveryText}>{label}</Text></View>
          ))}
        </Animated.View>
      </View>
      <Animated.View style={[styles.bottom, revealStyle(3)]}>
        <Text style={styles.copyright}>© {new Date().getFullYear()} Kıstas · Tüm hakları saklıdır.</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: { position: 'relative', overflow: 'hidden', width: '100%', marginTop: 48, paddingTop: 40, paddingHorizontal: 22, backgroundColor: '#F8FAFD', borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(1,49,150,0.12)', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  compact: { marginTop: 36, paddingTop: 34 },
  glowWrap: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 116 },
  topLight: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  glowLine: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(1,49,150,0.42)', shadowColor: '#013196', shadowOpacity: 0.16, shadowRadius: 7, elevation: 1 },
  brand: { alignItems: 'flex-start', marginBottom: 34 },
  tagline: { maxWidth: 310, marginTop: 15, color: '#64748B', fontSize: 13, lineHeight: 21, fontWeight: '500' },
  sections: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 30 },
  section: { width: '46%' },
  sectionTitle: { ...theme.typography.kistas, marginBottom: 11, color: '#25364E', fontSize: 13, fontWeight: '700', letterSpacing: -0.18 },
  link: { minHeight: 34, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  linkPressed: { opacity: 0.58 },
  linkText: { ...theme.typography.kistas, color: '#5F7088', fontSize: 13 },
  discoveryItem: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 },
  discoveryDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#013196' },
  discoveryText: { ...theme.typography.kistas, color: '#5F7088', fontSize: 13 },
  bottom: { marginTop: 28, paddingVertical: 22, borderTopWidth: 1, borderTopColor: 'rgba(1,49,150,0.1)' },
  copyright: { ...theme.typography.kistas, color: '#64748B', fontSize: 10.5 },
});
