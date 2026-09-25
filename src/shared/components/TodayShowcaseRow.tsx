import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { kistasStyle, theme } from '../../core/theme';
import { Listing, PlatformType } from '../../features/listings/domain/Listing';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface TodayShowcaseRowProps {
  projects: Listing[];
  onSelectProject?: (project: Listing) => void;
  onOpenCreditStore?: () => void;
  title?: string;
  subtitle?: string;
  onOpenAll?: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ShowcaseCardProps {
  project: Listing;
  rank: number;
  width: number;
  height: number;
  onPress?: () => void;
  reduceMotion: boolean;
  scrollX: Animated.Value;
  snapInterval: number;
}

const CARD_GAP = 14;
const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900';
const NEO = kistasStyle.neumorphism;

const getPlatformIcon = (platform?: PlatformType): IoniconName => {
  switch (platform) {
    case 'iOS':
    case 'macOS':
      return 'logo-apple';
    case 'Android':
      return 'logo-android';
    case 'Web':
      return 'globe-outline';
    case 'SaaS':
      return 'cloud-outline';
    default:
      return 'apps-outline';
  }
};

const formatSupportCount = (count?: number): string => {
  const safeCount = count ?? 0;
  if (safeCount >= 1000) return `${(safeCount / 1000).toFixed(1).replace('.0', '')}B`;
  return String(safeCount);
};

const ShowcaseCard: React.FC<ShowcaseCardProps> = React.memo(({
  project,
  rank,
  width,
  height,
  onPress,
  reduceMotion,
  scrollX,
  snapInterval,
}) => {
  const coverImage = project.coverImageUrl || project.logoUrl || IMAGE_FALLBACK;
  const platform = project.platforms?.[0];
  const initials = project.title.slice(0, 2).toUpperCase();
  const isPremium = !!project.isDailyShowcaseWinner;
  const carouselInputRange = [
    (rank - 2) * snapInterval,
    (rank - 1) * snapInterval,
    rank * snapInterval,
  ];
  const pressProgress = useRef(new Animated.Value(0)).current;
  const entranceProgress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      entranceProgress.setValue(1);
      return undefined;
    }

    entranceProgress.setValue(0);

    const entranceAnimation = Animated.sequence([
      Animated.delay((rank - 1) * 70),
      Animated.timing(entranceProgress, {
        toValue: 1,
        duration: 460,
        useNativeDriver: true,
      }),
    ]);
    entranceAnimation.start();

    return () => {
      entranceAnimation.stop();
    };
  }, [entranceProgress, rank, reduceMotion]);

  const animatePress = (pressed: boolean) => {
    Animated.spring(pressProgress, {
      toValue: pressed ? 1 : 0,
      stiffness: 360,
      damping: 24,
      mass: 0.55,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        styles.cardStage,
        { width, height },
        isPremium && styles.cardStagePremium,
        {
          opacity: entranceProgress,
          transform: [
            { perspective: 900 },
            {
              rotateY: scrollX.interpolate({
                inputRange: carouselInputRange,
                outputRange: ['-4deg', '0deg', '4deg'],
                extrapolate: 'clamp',
              }),
            },
            {
              scale: scrollX.interpolate({
                inputRange: carouselInputRange,
                outputRange: [0.965, 1, 0.965],
                extrapolate: 'clamp',
              }),
            },
            { translateY: entranceProgress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { rotateX: pressProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-1.5deg'] }) },
            { rotateY: pressProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2.4deg'] }) },
            { scale: entranceProgress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            { scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
        style={[styles.card, isPremium && styles.cardPremium]}
        accessibilityRole="button"
        accessibilityLabel={`${project.title} proje detayını aç`}
      >
      <View style={styles.mediaFrame}>
        <Animated.Image
          source={{ uri: coverImage }}
          resizeMode="cover"
          style={[
            styles.coverImage,
            {
              transform: [{
                scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1.015, 1.045] }),
              }],
            },
          ]}
        />
        <LinearGradient
          colors={['rgba(2,8,23,0.42)', 'rgba(2,8,23,0.08)', 'rgba(5,13,29,0.58)', 'rgba(7,16,31,0.36)']}
          locations={[0, 0.34, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardTopRow}>
          <View style={[styles.rankBadge, styles.rankBadgeFirst]}>
            <Ionicons name="trophy-outline" size={12} color="#7DD3FC" />
            <Text style={[styles.rankText, styles.rankTextFirst]} numberOfLines={1}>
              {(project.showcaseCategoryName || 'KATEGORİ').toLocaleUpperCase('tr-TR')} LİDERİ
            </Text>
          </View>

          <View style={styles.platformBadge}>
            <Ionicons name={getPlatformIcon(platform)} size={13} color="#BFDBFE" />
            <Text style={styles.platformText}>{platform || 'Dijital'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.editorialTitle} numberOfLines={1}>{project.title}</Text>
        <Text style={styles.heroStatement} numberOfLines={2}>
          {project.tagline || project.description || project.title}
        </Text>

        <BlurView intensity={55} tint="dark" style={styles.productDock}>
          {project.logoUrl ? (
            <AutoTransparentLogo
              src={project.logoUrl}
              alt={`${project.title} logosu`}
              style={styles.logoImage}
            />
          ) : (
            <Text style={styles.logoInitials}>{initials}</Text>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.projectTitle} numberOfLines={1}>{project.title}</Text>
          </View>
          <View style={styles.dockSupport}>
            <Ionicons name="chevron-up" size={13} color="#7DD3FC" />
            <Text style={styles.dockSupportText}>{formatSupportCount(project.showcaseSupportCount)}</Text>
          </View>

        </BlurView>
      </View>
      <View pointerEvents="none" style={styles.cardRim} />
      </Pressable>
    </Animated.View>
  );
});

export const TodayShowcaseRow: React.FC<TodayShowcaseRowProps> = ({
  projects,
  onSelectProject,
  onOpenCreditStore,
  title = 'Günün Vitrini',
  subtitle,
  onOpenAll,
}) => {
  const { width: viewportWidth } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  // Kural: Henüz hiç destek almamış (0 oy) projeler vitrin lideri olarak sergilenemez
  const featuredProjects = useMemo(
    () => (projects || []).filter((p) => (p.showcaseSupportCount ?? 0) > 0),
    [projects]
  );
  const cardWidth = Math.min(Math.max(viewportWidth - 70, 252), 292);
  const cardHeight = 386;
  const snapInterval = cardWidth + CARD_GAP;
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (featuredProjects.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerCopy}
          activeOpacity={onOpenAll ? 0.72 : 1}
          disabled={!onOpenAll}
          onPress={onOpenAll}
          accessibilityRole={onOpenAll ? 'button' : undefined}
          accessibilityLabel={onOpenAll ? 'Tüm vitrin liderlerini aç' : undefined}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </TouchableOpacity>

        {onOpenAll ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenAll}
            style={styles.seeAllGlassButton}
            accessibilityRole="button"
            accessibilityLabel="Tüm vitrin liderlerini aç"
          >
            <Text style={styles.seeAllGlassButtonText}>Tümünü Gör</Text>
            <View style={styles.seeAllIconBadge}>
              <Ionicons name="arrow-forward" size={12} color="#2563EB" />
            </View>
          </TouchableOpacity>
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

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {featuredProjects.map((project, index) => (
          <ShowcaseCard
            key={`today-showcase-${project.id}`}
            project={project}
            rank={index + 1}
            width={cardWidth}
            height={cardHeight}
            onPress={() => onSelectProject?.(project)}
            reduceMotion={reduceMotion}
            scrollX={scrollX}
            snapInterval={snapInterval}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 22,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  sectionTitle: {
    ...theme.typography.kistas,
    color: NEO.ink,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  sectionSubtitle: {
    marginTop: 3,
    ...theme.typography.kistas,
    color: '#64748B',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  seeAllGlassButton: {
    minHeight: 34,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.18)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  seeAllGlassButtonText: {
    ...theme.typography.kistas,
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  seeAllIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  showcaseCta: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: NEO.border,
    shadowColor: NEO.shadow,
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  showcaseCtaText: {
    ...theme.typography.kistas,
    marginLeft: 6,
    color: NEO.ink,
    fontSize: 10.5,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 18,
    gap: CARD_GAP,
  },
  cardStage: {
    borderRadius: 26,
    shadowColor: '#020817',
    shadowOffset: { width: 8, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 7,
  },
  cardStagePremium: {
    shadowColor: '#2563EB',
    shadowOpacity: 0.28,
  },
  card: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#07101F',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.36)',
  },
  cardPremium: { borderColor: 'rgba(125,211,252,0.56)' },
  mediaFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#07101F',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  cardTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankBadge: {
    minHeight: 30,
    maxWidth: '67%',
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,15,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.3)',
  },
  rankBadgeFirst: {
    backgroundColor: 'rgba(5,15,32,0.78)',
    borderColor: 'rgba(147,197,253,0.3)',
  },
  rankText: {
    ...theme.typography.kistas,
    marginLeft: 5,
    color: '#BFDBFE',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.75,
  },
  rankTextFirst: {
    color: '#BFDBFE',
  },
  platformBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,15,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.3)',
  },
  platformText: {
    ...theme.typography.kistas,
    marginLeft: 5,
    color: '#DBEAFE',
    fontSize: 9,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingTop: 228,
    paddingBottom: 14,
    justifyContent: 'flex-end',
    gap: 6,
  },
  editorialTitle: {
    ...theme.typography.kistas,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroStatement: {
    ...theme.typography.kistas,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  productDock: {
    minHeight: 52,
    padding: 7,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  logoImage: {
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  logoInitials: {
    ...theme.typography.kistas,
    width: 36,
    textAlign: 'center',
    color: '#93C5FD',
    fontSize: 15,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  projectTitle: {
    ...theme.typography.kistas,
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dockSupport: {
    minWidth: 36,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dockSupportText: {
    ...theme.typography.kistas,
    marginLeft: 2,
    color: '#7DD3FC',
    fontSize: 11,
    fontWeight: '800',
  },
  cardRim: {
    position: 'absolute',
    top: 5,
    right: 5,
    bottom: 5,
    left: 5,
    zIndex: 4,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.18)',
  },
});
