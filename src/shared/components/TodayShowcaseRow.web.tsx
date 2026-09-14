import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { breakpoints, kistasStyle, theme } from '../../core/theme';
import { Listing, PlatformType } from '../../features/listings/domain/Listing';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { GlassIconButton } from './GlassIconButton';

export interface TodayShowcaseRowProps {
  projects: Listing[];
  onSelectProject?: (project: Listing) => void;
  onOpenCreditStore?: () => void;
  title?: string;
  subtitle?: string;
  onOpenAll?: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900';
const NEO = kistasStyle.neumorphism;

const getPlatformIcon = (platform?: PlatformType): IoniconName => {
  if (platform === 'iOS' || platform === 'macOS') return 'logo-apple';
  if (platform === 'Android') return 'logo-android';
  if (platform === 'Web') return 'globe-outline';
  if (platform === 'SaaS') return 'cloud-outline';
  return 'apps-outline';
};

const formatSupportCount = (count?: number): string => {
  const safeCount = count ?? 0;
  if (safeCount >= 1000) return `${(safeCount / 1000).toFixed(1).replace('.0', '')}B`;
  return String(safeCount);
};

export const TodayShowcaseRow: React.FC<TodayShowcaseRowProps> = ({
  projects,
  onSelectProject,
  onOpenCreditStore,
  title = 'Günün Vitrini',
  subtitle,
  onOpenAll,
}) => {
  const { width } = useWindowDimensions();
  // Kural: Henüz hiç destek almamış (0 oy) projeler vitrin lideri olarak sergilenemez
  const featuredProjects = useMemo(
    () => (projects || []).filter((p) => (p.weeklySupportCount ?? 0) > 0 || (p.upvotesCount ?? 0) > 0),
    [projects]
  );
  const isPhone = width <= breakpoints.phoneMax;
  const cardWidth = isPhone ? Math.min(Math.max(width - 70, 252), 292) : 326;
  const cardHeight = isPhone ? 386 : 404;

  if (featuredProjects.length === 0) return null;

  return (
    <View style={[styles.section, !isPhone && styles.sectionWide]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerCopy}
          activeOpacity={onOpenAll ? 0.72 : 1}
          disabled={!onOpenAll}
          onPress={onOpenAll}
          accessibilityRole={onOpenAll ? 'button' : undefined}
          accessibilityLabel={onOpenAll ? 'Tüm vitrin liderlerini aç' : undefined}
        >
          <Text style={[styles.sectionTitle, !isPhone && styles.sectionTitleWide]}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </TouchableOpacity>

        {onOpenAll ? (
          <GlassIconButton
            icon="arrow-forward"
            iconSize={18}
            size={42}
            onPress={onOpenAll}
            accessibilityLabel="Tüm vitrin liderlerini aç"
          />
        ) : onOpenCreditStore ? (
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={onOpenCreditStore}
            style={styles.showcaseCta}
            accessibilityRole="button"
            accessibilityLabel="Projeyi premium vitrine çıkar"
          >
            <Ionicons name="sparkles" size={14} color="#3269C7" />
            <Text style={styles.showcaseCtaText}>Vitrine Çık</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {featuredProjects.map((project) => {
          const coverImage = project.coverImageUrl || project.logoUrl || IMAGE_FALLBACK;
          const makerName = project.seller?.fullName || 'Bağımsız geliştirici';
          const initials = project.title.slice(0, 2).toUpperCase();
          const platform = project.platforms?.[0];

          return (
            <Pressable
              key={`today-web-${project.id}`}
              onPress={() => onSelectProject?.(project)}
              accessibilityRole="button"
              accessibilityLabel={`${project.title} proje detayını aç`}
              style={({ pressed }) => [
                styles.cardStage,
                { width: cardWidth, height: cardHeight },
                project.isWeeklyWinner && styles.cardStagePremium,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.mediaFrame}>
                <Image source={{ uri: coverImage }} resizeMode="cover" style={styles.coverImage} />
                <LinearGradient
                  colors={['rgba(241,245,250,0)', 'rgba(241,245,250,0.08)', 'rgba(241,245,250,0.76)', '#F1F5FA']}
                  locations={[0.34, 0.54, 0.76, 0.94]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardTopRow}>
                  <View style={styles.leaderBadge}>
                    <Ionicons name="trophy-outline" size={12} color="#3269C7" />
                    <Text style={styles.leaderText} numberOfLines={1}>
                      {(project.showcaseCategoryName || 'KATEGORİ').toLocaleUpperCase('tr-TR')} LİDERİ
                    </Text>
                  </View>
                  <View style={styles.platformBadge}>
                    <Ionicons name={getPlatformIcon(platform)} size={13} color="#3269C7" />
                    <Text style={styles.platformText}>{platform || 'Dijital'}</Text>
                  </View>
                </View>
                <View style={styles.mediaSignature}>
                  <View style={styles.signatureDot} />
                  <Text style={styles.signatureText}>{project.isWeeklyWinner ? 'HAFTANIN KAZANANI' : 'TOPLULUK SEÇİMİ'}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.heroStatement} numberOfLines={2}>
                  {project.tagline || project.description || project.title}
                </Text>

                <BlurView intensity={68} tint="light" style={styles.productDock}>
                  <View style={styles.logoWell}>
                    {project.logoUrl ? (
                      <AutoTransparentLogo
                        src={project.logoUrl}
                        alt={`${project.title} logosu`}
                        style={styles.logoImage}
                      />
                    ) : (
                      <Text style={styles.logoInitials}>{initials}</Text>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.projectTitle} numberOfLines={1}>{project.title}</Text>
                    <Text style={styles.makerName} numberOfLines={1}>{makerName}</Text>
                    <View style={styles.supportRow}>
                      <Ionicons name="chevron-up" size={11} color="#3269C7" />
                      <Text style={styles.supportMeta} numberOfLines={1}>
                        {formatSupportCount(project.weeklySupportCount)} haftalık destek
                      </Text>
                    </View>
                  </View>
                  <GlassIconButton
                    icon="arrow-forward"
                    iconSize={17}
                    size={38}
                    accessibilityLabel={`${project.title} detayına git`}
                    style={styles.openButton}
                  />
                </BlurView>
              </View>
              <View pointerEvents="none" style={styles.cardRim} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24, marginBottom: 22 },
  sectionWide: { marginHorizontal: 16 },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  sectionTitle: {
    ...theme.typography.kistas,
    color: NEO.ink,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  sectionTitleWide: { fontSize: 30, lineHeight: 36 },
  sectionSubtitle: {
    ...theme.typography.kistas,
    marginTop: 3,
    color: '#64748B',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  showcaseCta: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: NEO.border,
    boxShadow: '-4px -4px 10px rgba(255,255,255,0.92), 5px 6px 12px rgba(130,146,168,0.2)' as any,
  },
  showcaseCtaText: { ...theme.typography.kistas, marginLeft: 6, color: NEO.ink, fontSize: 10.5, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 18, gap: 18 },
  cardStage: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: NEO.surface,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
    boxShadow: '-9px -9px 22px rgba(255,255,255,0.92), 11px 13px 27px rgba(130,146,168,0.25)' as any,
    outlineStyle: 'none' as any,
  },
  cardStagePremium: { borderColor: 'rgba(50,105,199,0.3)' },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.988 }] },
  mediaFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: NEO.global,
  },
  coverImage: { width: '100%', height: '100%' },
  cardTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaderBadge: {
    minHeight: 30,
    maxWidth: '67%',
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,250,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  leaderText: { ...theme.typography.kistas, marginLeft: 5, color: NEO.ink, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.65 },
  platformBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,250,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  platformText: { ...theme.typography.kistas, marginLeft: 5, color: NEO.ink, fontSize: 9, fontWeight: '700' },
  mediaSignature: {
    position: 'absolute',
    left: 12,
    bottom: 150,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6, backgroundColor: '#70B9FF' },
  signatureText: { ...theme.typography.kistas, color: NEO.ink, fontSize: 8.5, fontWeight: '800', letterSpacing: 1.05 },
  cardBody: {
    flex: 1,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingTop: 228,
    paddingBottom: 14,
    justifyContent: 'flex-end',
    gap: 12,
  },
  heroStatement: {
    ...theme.typography.kistas,
    color: NEO.ink,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.45,
    textShadowColor: 'rgba(255,255,255,0.82)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  productDock: {
    minHeight: 70,
    padding: 8,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(247,250,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    boxShadow: '0 8px 22px rgba(10,30,62,0.2), inset 0 1px 0 rgba(255,255,255,0.82)' as any,
  },
  logoWell: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  logoImage: { width: 48, height: 48 },
  logoInitials: { ...theme.typography.kistas, color: NEO.ink, fontSize: 18, fontWeight: '800' },
  productInfo: { flex: 1, minWidth: 0, marginLeft: 9 },
  projectTitle: { ...theme.typography.kistas, color: NEO.ink, fontSize: 14.5, lineHeight: 18, fontWeight: '800' },
  makerName: { ...theme.typography.kistas, marginTop: 2, color: '#64748B', fontSize: 10, fontWeight: '600' },
  supportRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center' },
  supportMeta: { ...theme.typography.kistas, marginLeft: 2, color: '#3269C7', fontSize: 8.5, fontWeight: '700' },
  openButton: { marginLeft: 8, flexShrink: 0 },
  cardRim: {
    position: 'absolute',
    top: 5,
    right: 5,
    bottom: 5,
    left: 5,
    zIndex: 4,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.72)' as any,
  },
});
