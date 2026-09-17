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
import { GlassIconButton } from './GlassIconButton';
import { CategoryStarsBanner } from './CategoryStarsBanner';

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
  const makerName = project.developerName || project.seller?.fullName || 'Bağımsız geliştirici';
  const initials = project.title.slice(0, 2).toUpperCase();
  const isPremium = !!project.isWeeklyWinner;
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
          colors={['rgba(241,245,250,0)', 'rgba(241,245,250,0.40)', 'rgba(241,245,250,0.88)', '#F1F5FA']}
          locations={[0.20, 0.46, 0.70, 0.92]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardTopRow}>
          <View style={[styles.rankBadge, styles.rankBadgeFirst]}>
            <Ionicons name="trophy-outline" size={12} color="#3269C7" />
            <Text style={[styles.rankText, styles.rankTextFirst]} numberOfLines={1}>
              {(project.showcaseCategoryName || 'KATEGORİ').toLocaleUpperCase('tr-TR')} LİDERİ
            </Text>
          </View>

          <View style={styles.platformBadge}>
            <Ionicons name={getPlatformIcon(platform)} size={13} color="#3269C7" />
            <Text style={styles.platformText}>{platform || 'Dijital'}</Text>
          </View>
        </View>
        <View style={styles.viewBadge}>
          <Ionicons name="eye-outline" size={13} color="#25364E" />
          <Text style={styles.viewBadgeText}>{formatSupportCount(project.viewCount)}</Text>
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
            <View style={styles.projectMetaRow}>
              <Ionicons name="chevron-up" size={11} color="#3269C7" />
              <Text style={styles.projectMetaText}>
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
    () => (projects || []).filter((p) => (p.weeklySupportCount ?? 0) > 0 || (p.upvotesCount ?? 0) > 0),
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

        <View style={styles.headerActions}>
          {onOpenCreditStore ? (
            <CategoryStarsBanner
              words={['Kategorinin Yıldızları', 'Vitrinde Yerinizi Alın', 'Projenizi Parlatın', 'Kıstas Vitrini']}
              onPress={onOpenCreditStore}
            />
          ) : null}
        </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 18,
    gap: CARD_GAP,
  },
  cardStage: {
    borderRadius: 26,
    shadowColor: NEO.shadow,
    shadowOffset: { width: 8, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 7,
  },
  cardStagePremium: {
    shadowColor: '#3269C7',
    shadowOpacity: 0.16,
  },
  card: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: NEO.surface,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
  },
  cardPremium: { borderColor: 'rgba(50,105,199,0.3)' },
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
    backgroundColor: 'rgba(247,250,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  rankBadgeFirst: {
    backgroundColor: 'rgba(247,250,255,0.94)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
  rankText: {
    ...theme.typography.kistas,
    marginLeft: 5,
    color: NEO.ink,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.75,
  },
  rankTextFirst: {
    color: NEO.ink,
  },
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
  platformText: {
    ...theme.typography.kistas,
    marginLeft: 5,
    color: NEO.ink,
    fontSize: 9,
    fontWeight: '700',
  },
  viewBadge: {
    position: 'absolute',
    top: 52,
    right: 14,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(247,250,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  viewBadgeText: {
    ...theme.typography.kistas,
    color: NEO.ink,
    fontSize: 10,
    fontWeight: '700',
  },
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
    fontSize: 17.5,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.35,
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
  },
  logoWell: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  logoInitials: {
    ...theme.typography.kistas,
    color: NEO.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  projectTitle: {
    ...theme.typography.kistas,
    color: NEO.ink,
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  makerName: {
    ...theme.typography.kistas,
    marginTop: 2,
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  projectMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectMetaText: {
    ...theme.typography.kistas,
    marginLeft: 2,
    color: '#3269C7',
    fontSize: 8.5,
    fontWeight: '700',
  },
  openButton: {
    marginLeft: 8,
    flexShrink: 0,
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
    borderColor: 'rgba(50,105,199,0.2)',
  },
});
