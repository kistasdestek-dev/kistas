import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, useWindowDimensions, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { PlatformType } from '../domain/Listing';
import { breakpoints } from '../../../core/theme';
import { getCategory3DIcon } from './category3dIcons';
import { browseStyles as styles, BROWSE_LAYOUT, CATEGORY_CARD_TINTS } from './BrowseScreen.styles';

export interface BrowseScreenProps {
  onSelectCategory: (categoryId: string) => void;
  onOpenTopVoted?: () => void;
  onOpenNewest?: () => void;
  onSelectPlatform?: (platform: PlatformType | 'all') => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
  onScrollOffsetChange?: (offsetY: number) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
export type CategorySegment = 'games' | 'apps';

export interface BrowseCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: IoniconName;
  group: CategorySegment;
  gradient: readonly [string, string, string];
}

// Kategori detay sayfasının renkleri ve yönlendirme kimlikleri korunur.
export const GAMES_CATEGORIES: BrowseCategoryItem[] = [
  {
    id: 'game-family',
    name: 'Aile',
    slug: 'game-family',
    icon: 'people-outline',
    group: 'games',
    gradient: ['#116871', '#188B91', '#103F56'],
  },
  {
    id: 'game-action',
    name: 'Aksiyon',
    slug: 'game-action',
    icon: 'flash-outline',
    group: 'games',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
  {
    id: 'game-casual',
    name: 'Basit Eğlence',
    slug: 'game-casual',
    icon: 'happy-outline',
    group: 'games',
    gradient: ['#514194', '#8060C5', '#352967'],
  },
  {
    id: 'game-puzzle',
    name: 'Bulmaca',
    slug: 'game-puzzle',
    icon: 'extension-puzzle-outline',
    group: 'games',
    gradient: ['#235D89', '#398EB5', '#193B62'],
  },
  {
    id: 'game-card',
    name: 'Kart',
    slug: 'game-card',
    icon: 'albums-outline',
    group: 'games',
    gradient: ['#933D69', '#C45C85', '#64284C'],
  },
  {
    id: 'game-word',
    name: 'Kelime',
    slug: 'game-word',
    icon: 'text-outline',
    group: 'games',
    gradient: ['#116871', '#188B91', '#103F56'],
  },
  {
    id: 'game-adventure',
    name: 'Macera',
    slug: 'game-adventure',
    icon: 'compass-outline',
    group: 'games',
    gradient: ['#713E85', '#A069AE', '#472C63'],
  },
  {
    id: 'game-board',
    name: 'Masa',
    slug: 'game-board',
    icon: 'grid-outline',
    group: 'games',
    gradient: ['#235D89', '#398EB5', '#193B62'],
  },
  {
    id: 'game-music',
    name: 'Müzik',
    slug: 'game-music',
    icon: 'musical-notes-outline',
    group: 'games',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
  {
    id: 'game-rpg',
    name: 'RYO',
    slug: 'game-rpg',
    icon: 'shield-outline',
    group: 'games',
    gradient: ['#396850', '#65956B', '#254D42'],
  },
  {
    id: 'game-simulation',
    name: 'Simülasyon',
    slug: 'game-simulation',
    icon: 'planet-outline',
    group: 'games',
    gradient: ['#933D69', '#C45C85', '#64284C'],
  },
  {
    id: 'game-trivia',
    name: 'Soru Cevap',
    slug: 'game-trivia',
    icon: 'help-circle-outline',
    group: 'games',
    gradient: ['#3D5092', '#637DB8', '#293668'],
  },
  {
    id: 'game-sports',
    name: 'Spor',
    slug: 'game-sports',
    icon: 'football-outline',
    group: 'games',
    gradient: ['#514194', '#8060C5', '#352967'],
  },
  {
    id: 'game-strategy',
    name: 'Strateji',
    slug: 'game-strategy',
    icon: 'cube-outline',
    group: 'games',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
  {
    id: 'game-racing',
    name: 'Yarış',
    slug: 'game-racing',
    icon: 'speedometer-outline',
    group: 'games',
    gradient: ['#116871', '#188B91', '#103F56'],
  },
];


export const APPS_CATEGORIES: BrowseCategoryItem[] = [
  {
    id: 'app-shopping',
    name: 'Alışveriş',
    slug: 'app-shopping',
    icon: 'bag-handle-outline',
    group: 'apps',
    gradient: ['#514194', '#8060C5', '#352967'],
  },
  {
    id: 'app-magazines',
    name: 'Dergi ve Gazete',
    slug: 'app-magazines',
    icon: 'newspaper-outline',
    group: 'apps',
    gradient: ['#116871', '#188B91', '#103F56'],
  },
  {
    id: 'app-education',
    name: 'Eğitim',
    slug: 'app-education',
    icon: 'school-outline',
    group: 'apps',
    gradient: ['#933D69', '#C45C85', '#64284C'],
  },
  {
    id: 'app-entertainment',
    name: 'Eğlence',
    slug: 'app-entertainment',
    icon: 'film-outline',
    group: 'apps',
    gradient: ['#235D89', '#398EB5', '#193B62'],
  },
  {
    id: 'app-finance',
    name: 'Finans',
    slug: 'app-finance',
    icon: 'wallet-outline',
    group: 'apps',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
  {
    id: 'app-photo-video',
    name: 'Fotoğraf ve Video',
    slug: 'app-photo-video',
    icon: 'camera-outline',
    group: 'apps',
    gradient: ['#396850', '#65956B', '#254D42'],
  },
  {
    id: 'app-devtools',
    name: 'Geliştirici Araçları',
    slug: 'app-devtools',
    icon: 'code-slash-outline',
    group: 'apps',
    gradient: ['#713E85', '#A069AE', '#472C63'],
  },
  {
    id: 'app-design',
    name: 'Grafik ve Tasarım',
    slug: 'app-design',
    icon: 'color-palette-outline',
    group: 'apps',
    gradient: ['#235D89', '#398EB5', '#193B62'],
  },
  {
    id: 'app-news',
    name: 'Haberler',
    slug: 'app-news',
    icon: 'megaphone-outline',
    group: 'apps',
    gradient: ['#933D69', '#C45C85', '#64284C'],
  },
  {
    id: 'app-weather',
    name: 'Hava Durumu',
    slug: 'app-weather',
    icon: 'partly-sunny-outline',
    group: 'apps',
    gradient: ['#514194', '#8060C5', '#352967'],
  },
  {
    id: 'app-business',
    name: 'İş',
    slug: 'app-business',
    icon: 'briefcase-outline',
    group: 'apps',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
  {
    id: 'app-books',
    name: 'Kitaplar',
    slug: 'app-books',
    icon: 'book-outline',
    group: 'apps',
    gradient: ['#116871', '#188B91', '#103F56'],
  },
  {
    id: 'app-music',
    name: 'Müzik',
    slug: 'app-music',
    icon: 'headset-outline',
    group: 'apps',
    gradient: ['#713E85', '#A069AE', '#472C63'],
  },
  {
    id: 'app-navigation',
    name: 'Navigasyon',
    slug: 'app-navigation',
    icon: 'navigate-outline',
    group: 'apps',
    gradient: ['#933D69', '#C45C85', '#64284C'],
  },
  {
    id: 'app-reference',
    name: 'Referans',
    slug: 'app-reference',
    icon: 'library-outline',
    group: 'apps',
    gradient: ['#396850', '#65956B', '#254D42'],
  },
  {
    id: 'app-health-fitness',
    name: 'Sağlık ve Fitness',
    slug: 'app-health-fitness',
    icon: 'heart-outline',
    group: 'apps',
    gradient: ['#3D5092', '#637DB8', '#293668'],
  },
  {
    id: 'app-travel',
    name: 'Seyahat',
    slug: 'app-travel',
    icon: 'airplane-outline',
    group: 'apps',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
  {
    id: 'app-social',
    name: 'Sosyal Ağ',
    slug: 'app-social',
    icon: 'chatbubbles-outline',
    group: 'apps',
    gradient: ['#713E85', '#A069AE', '#472C63'],
  },
  {
    id: 'app-sports',
    name: 'Spor',
    slug: 'app-sports',
    icon: 'trophy-outline',
    group: 'apps',
    gradient: ['#933D69', '#C45C85', '#64284C'],
  },
  {
    id: 'app-utilities',
    name: 'Yardımcılar',
    slug: 'app-utilities',
    icon: 'build-outline',
    group: 'apps',
    gradient: ['#116871', '#188B91', '#103F56'],
  },
  {
    id: 'app-lifestyle',
    name: 'Yaşam Tarzı',
    slug: 'app-lifestyle',
    icon: 'sparkles-outline',
    group: 'apps',
    gradient: ['#235D89', '#398EB5', '#193B62'],
  },
  {
    id: 'app-food-drink',
    name: 'Yiyecek ve İçecek',
    slug: 'app-food-drink',
    icon: 'restaurant-outline',
    group: 'apps',
    gradient: ['#514194', '#8060C5', '#352967'],
  },
  {
    id: 'app-productivity',
    name: 'Üretkenlik',
    slug: 'app-productivity',
    icon: 'checkbox-outline',
    group: 'apps',
    gradient: ['#9B503F', '#C67955', '#68392F'],
  },
];

export const ALL_CATEGORIES: BrowseCategoryItem[] = [...GAMES_CATEGORIES, ...APPS_CATEGORIES];

const PLATFORM_OPTIONS: ReadonlyArray<{ id: PlatformType; label: string; icon: IoniconName }> = [
  { id: 'iOS', label: 'iOS', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
  { id: 'SaaS', label: 'SaaS', icon: 'cloud-outline' },
];

const BrowseScreenComponent: React.FC<BrowseScreenProps> = ({
  onSelectCategory,
  onSelectPlatform,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenHowItWorks,
  onOpenBlog,
  onScrollOffsetChange,
}) => {
  const { width } = useWindowDimensions();
  const columnCount = width > breakpoints.tabletMax ? 4 : width > breakpoints.phoneMax ? 3 : 2;
  const contentWidth = Math.min(width, BROWSE_LAYOUT.maxWidth) - BROWSE_LAYOUT.padding * 2;
  const cardWidth = (contentWidth - BROWSE_LAYOUT.gap * (columnCount - 1)) / columnCount;
  const [activeSegment, setActiveSegment] = useState<CategorySegment>('games');
  const categories = activeSegment === 'games' ? GAMES_CATEGORIES : APPS_CATEGORIES;

  const renderCategoryCard = useCallback(({ item }: { item: BrowseCategoryItem }) => {
    const icon3d = getCategory3DIcon(item.id) || getCategory3DIcon(item.slug);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.categoryCard,
          pressed && styles.categoryCardPressed,
          { width: cardWidth, height: Math.min(128, Math.max(104, cardWidth * 0.56)) },
        ]}
        onPress={() => onSelectCategory(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} kategorisine göz at`}
      >
        <LinearGradient
          pointerEvents="none"
          colors={CATEGORY_CARD_TINTS[item.gradient[0]] ?? CATEGORY_CARD_TINTS.fallback}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 0.94, y: 1 }}
          style={styles.cardGradient}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.04)', 'rgba(23,56,102,0.18)']}
          locations={[0, 0.48, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardSheen}
        />
        <View style={styles.cardTopRow}>
          <View style={styles.artworkPlate}>
            {icon3d ? (
              <Image source={icon3d} style={styles.category3dIcon} resizeMode="contain" accessible={false} />
            ) : (
              <GlassIconButton icon={item.icon} size={48} iconSize={25} />
            )}
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
      </Pressable>
    );
  }, [cardWidth, onSelectCategory]);

  return (
    <View style={styles.container}>
      <FlatList<BrowseCategoryItem>
        style={styles.list}
        decelerationRate={0.99}
        key={`browse-grid-${columnCount}`}
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryCard}
        numColumns={columnCount}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <>
            <KistasTopBrandBar style={styles.brandBar} />
            <View style={styles.pageHeader}>
              <Text style={styles.pageEyebrow}>İLGİ ALANINI KEŞFET</Text>
              <Text style={styles.pageTitle}>Göz At</Text>
              <Text style={styles.pageDescription}>Bir kategori seç, yeni fikirlerle tanış.</Text>
            </View>

            <View style={styles.segmentContainer} accessibilityRole="tablist" accessibilityLabel="Kategori türü">
              {([
                { id: 'games', label: 'Oyunlar', icon: 'game-controller-outline', count: GAMES_CATEGORIES.length },
                { id: 'apps', label: 'Uygulamalar', icon: 'apps-outline', count: APPS_CATEGORIES.length },
              ] as const).map((segment) => {
                const selected = activeSegment === segment.id;
                return (
                  <Pressable
                    key={segment.id}
                    onPress={() => setActiveSegment(segment.id)}
                    accessibilityRole="tab"
                    accessibilityLabel={segment.label}
                    accessibilityState={{ selected }}
                    aria-selected={selected}
                    style={({ pressed }) => [
                      styles.segmentTab,
                      selected && styles.segmentTabActive,
                      pressed && styles.controlPressed,
                    ]}
                  >
                    <Ionicons name={segment.icon} size={17} color={selected ? '#3269C7' : '#65748A'} />
                    <Text style={[styles.segmentTabText, selected && styles.segmentTabTextActive]}>
                      {segment.label}
                    </Text>
                    <View style={[styles.segmentBadge, selected && styles.segmentBadgeActive]}>
                      <Text style={[styles.segmentBadgeText, selected && styles.segmentBadgeTextActive]}>
                        {segment.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {activeSegment === 'games' ? 'Oyun kategorileri' : 'Uygulama kategorileri'}
              </Text>
              <Text style={styles.sectionCount}>{categories.length} kategori</Text>
            </View>
          </>
        }
        ListFooterComponent={
          <View style={styles.footerBlock}>
            <View style={styles.platformSection}>
              <Text style={styles.platformSectionTitle} accessibilityRole="header">Platforma göre keşfet</Text>
              <View style={styles.platformOptions}>
                {PLATFORM_OPTIONS.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelectPlatform?.(item.id)}
                    disabled={!onSelectPlatform}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label} projelerine göz at`}
                    accessibilityState={{ disabled: !onSelectPlatform }}
                    style={({ pressed }) => [styles.platformButton, pressed && styles.controlPressed]}
                  >
                    <GlassIconButton icon={item.icon} size={30} iconSize={16} />
                    <Text style={styles.platformLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <CinematicFooter
              compact
              onOpenAbout={onOpenAbout}
              onOpenHowItWorks={onOpenHowItWorks}
              onOpenPrivacy={onOpenPrivacy}
              onOpenSupport={onOpenSupport}
              onOpenBlog={onOpenBlog}
            />
            <View style={styles.bottomSpacer} />
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={24}
        maxToRenderPerBatch={24}
        updateCellsBatchingPeriod={32}
        windowSize={5}
        removeClippedSubviews={false}
        onScroll={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
        onScrollToTop={() => onScrollOffsetChange?.(0)}
        scrollEventThrottle={32}
      />
    </View>
  );
};

export const BrowseScreen = React.memo(BrowseScreenComponent);
