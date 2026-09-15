import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Listing } from '../../features/listings/domain/Listing';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface SponsorLogoMarqueeProps {
  projects: Listing[];
  onOpenCreditStore?: () => void;
  label?: string;
  emptyMessage?: string;
}

const ITEM_WIDTH = 168;

const getInitials = (title: string) => title
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0))
  .join('')
  .toLocaleUpperCase('tr-TR');

export const SponsorLogoMarquee = React.memo<SponsorLogoMarqueeProps>(({ projects, onOpenCreditStore, label = 'VİTRİNİ DESTEKLEYENLER', emptyMessage = 'Bu alandaki ilk görünürlük hikâyesi seninki olabilir.' }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const sponsors = useMemo(() => Array.from(new Map(projects.map((project) => [project.id, project])).values()).slice(0, 12), [projects]);
  const displaySponsors = useMemo(() => {
    if (sponsors.length === 0) return [];
    return Array.from({ length: Math.max(1, Math.ceil(8 / sponsors.length)) }, () => sponsors).flat();
  }, [sponsors]);

  useEffect(() => {
    if (displaySponsors.length === 0) return;
    const distance = displaySponsors.length * ITEM_WIDTH;
    const animation = Animated.loop(Animated.timing(translateX, {
      toValue: -distance,
      duration: distance / 24 * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    }));
    animation.start();
    return () => {
      animation.stop();
      translateX.setValue(0);
    };
  }, [displaySponsors.length, translateX]);

  return (
    <View style={styles.container} accessibilityLabel="Kıstas sponsorları">
      <View style={styles.header}>
        <View style={styles.labelRow}><View style={styles.dot} /><Text style={styles.label}>{label}</Text></View>
      </View>
      {displaySponsors.length > 0 ? (
        <View style={styles.viewport} pointerEvents="none">
          <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
            {[...displaySponsors, ...displaySponsors].map((project, index) => (
              <View style={styles.item} key={`${project.id}-${index}`}>
                <View style={[styles.logo, project.logoUrl ? styles.uploadedLogo : null]}>
                  {project.logoUrl ? <AutoTransparentLogo src={project.logoUrl} style={styles.logoImage} /> : <Text style={styles.initials}>{getInitials(project.title)}</Text>}
                </View>
                <Text style={styles.name} numberOfLines={1}>{project.title}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          {onOpenCreditStore ? (
            <TouchableOpacity style={styles.cta} onPress={onOpenCreditStore} accessibilityRole="button">
              <Text style={styles.ctaText}>Vitrinde yer al</Text><Ionicons name="arrow-forward" size={13} color="#25364E" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 24, paddingVertical: 16, overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(50,105,199,0.13)', backgroundColor: 'rgba(250,251,253,0.22)' },
  header: { paddingHorizontal: 16, marginBottom: 9 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3269C7' },
  label: { color: '#25364E', fontSize: 11, fontWeight: '600', letterSpacing: 0 },
  viewport: { overflow: 'hidden' },
  track: { flexDirection: 'row', width: 'auto' },
  item: { width: ITEM_WIDTH, flexShrink: 0, height: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  logoImage: { width: '100%', height: '100%' },
  uploadedLogo: { backgroundColor: 'transparent', borderRadius: 0, overflow: 'visible' },
  initials: { color: '#3269C7', fontSize: 10, fontWeight: '700' },
  name: { flex: 1, color: '#25364E', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  emptyText: { color: '#3269C7', fontSize: 11, textAlign: 'center' },
  cta: { minHeight: 34, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(50,105,199,0.20)', borderRadius: 8, backgroundColor: 'rgba(50,105,199,0.08)' },
  ctaText: { color: '#25364E', fontSize: 10, fontWeight: '700' },
});
