import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActionSearchBar, calculateSearchRelevance } from '../../../shared/components/ActionSearchBar';
import { LogoLoop } from '../../../shared/components/LogoLoop';
import { FeaturedBoostShowcase } from '../../../shared/components/FeaturedBoostShowcase';
import { TodayShowcaseRow } from '../../../shared/components/TodayShowcaseRow';
import { PopularProjectPager } from '../../../shared/components/PopularProjectPager';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { Listing, PlatformType, isListingSponsored } from '../domain/Listing';
import { ListingService } from '../application/ListingService';
import { CategoryService, Category } from '../../categories/application/CategoryService';
import { getCategory3DIcon } from './category3dIcons';
import { ALL_CATEGORIES, BrowseCategoryItem } from './BrowseScreen';
import { breakpoints } from '../../../core/theme';

export interface CategoryScreenProps {
  categoryId: string;
  onBack: () => void;
  onSelectProject?: (project: Listing) => void;
  onOpenSponsorManagement?: (listingId?: string) => void;
  onOpenCreditStore?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
  onScrollOffsetChange?: (offsetY: number) => void;
}

type FeedSortType = 'trending' | 'top_voted' | 'newest';
type PlatformFilterType = PlatformType | 'all';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PLATFORM_FILTERS: ReadonlyArray<{ id: PlatformFilterType; label: string; icon: IoniconName }> = [
  { id: 'all', label: 'Tümü', icon: 'layers-outline' },
  { id: 'iOS', label: 'iOS', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
  { id: 'SaaS', label: 'SaaS', icon: 'cloud-outline' },
];

export const CategoryScreen: React.FC<CategoryScreenProps> = ({
  categoryId,
  onBack,
  onSelectProject,
  onOpenSponsorManagement,
  onOpenCreditStore,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenHowItWorks,
  onOpenBlog,
  onScrollOffsetChange,
}) => {
  const { width: viewportWidth } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && viewportWidth > breakpoints.phoneMax;

  // Kategori Bilgisi
  const categoryMeta: BrowseCategoryItem | undefined = useMemo(() => {
    return ALL_CATEGORIES.find((c: BrowseCategoryItem) => c.id === categoryId || c.slug === categoryId);
  }, [categoryId]);

  const [categoryInfo, setCategoryInfo] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedSort, setFeedSort] = useState<FeedSortType>('trending');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilterType>('all');

  // Projeler
  const [sponsoredProjects, setSponsoredProjects] = useState<Listing[]>([]);
  const [popularProjects, setPopularProjects] = useState<Listing[]>([]);
  const [newProjects, setNewProjects] = useState<Listing[]>([]);
  const [showcaseProjects, setShowcaseProjects] = useState<Listing[]>([]);
  const [upvotedMap, setUpvotedMap] = useState<Record<string, boolean>>({});

  const icon3d = getCategory3DIcon(categoryId) || (categoryMeta?.slug ? getCategory3DIcon(categoryMeta.slug) : null);
  const categoryTitle = categoryMeta?.name || categoryInfo?.name || 'Kategori';
  const categoryGradient = categoryMeta?.gradient || ['#1E293B', '#334155', '#475569'];

  // Veri Yükleme
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      CategoryService.getProjectCategories(),
      ListingService.getCategorySponsoredListings(categoryId),
      ListingService.getCategoryListings(categoryId, 'popular', 'all', 50),
      ListingService.getCategoryListings(categoryId, 'newest', 'all', 50),
      ListingService.getWeeklyShowcaseListings(categoryId),
      ListingService.getUserUpvotedProjectIds(),
    ])
      .then(([cats, sponsored, popular, newest, weeklyShowcase, userUpvotedIds]) => {
        if (!isMounted) return;
        const found = cats.find((c: Category) => c.id === categoryId || c.slug === categoryId);
        if (found) setCategoryInfo(found);

        setSponsoredProjects(sponsored);
        setPopularProjects(popular);
        // Sadece doğrulanmış topluluk desteği (>0) olan projeler kategori vitrininde lider gösterilebilir
        const qualifiedShowcase = (weeklyShowcase || []).filter(
          (p) => (p.weeklySupportCount ?? 0) > 0 || (p.upvotesCount ?? 0) > 0
        );
        setShowcaseProjects(qualifiedShowcase);

        const initUpvoted: Record<string, boolean> = {};
        userUpvotedIds.forEach((id) => {
          initUpvoted[id] = true;
        });
        setUpvotedMap(initUpvoted);
      })
      .catch((err) => {
        console.warn('Kategori verisi yükleme hatası:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  const handleToggleUpvote = useCallback(async (projectId: string) => {
    const project = popularProjects.find((item) => item.id === projectId)
      || newProjects.find((item) => item.id === projectId);
    if (!project || isListingSponsored(project)) {
      Alert.alert('Sponsorlu Proje', 'Sponsorlu projelerde destek geçici olarak kapalıdır.');
      return;
    }

    const isCurrentlyUpvoted = !!upvotedMap[projectId];
    if (isCurrentlyUpvoted) {
      Alert.alert('Bilgi', 'Bu projeyi zaten desteklediniz. Kıstas kuralları gereği destek geri alınamaz.');
      return;
    }

    // İyimser UI Güncellemesi (Tek yönlü kalıcı destek)
    setUpvotedMap((prev) => ({ ...prev, [projectId]: true }));

    const updateSupport = (items: Listing[], rollback = false): Listing[] =>
      items.map((item) => {
        if (item.id !== projectId) return item;
        if (rollback) return {
          ...item,
          upvotesCount: project.upvotesCount,
          weeklySupportCount: project.weeklySupportCount,
        };
        const delta = 1;
        return {
          ...item,
          upvotesCount: item.upvotesCount + delta,
          weeklySupportCount: item.weeklySupportCount === undefined
            ? undefined
            : item.weeklySupportCount + delta,
        };
      });

    setPopularProjects((prev) => updateSupport(prev));
    setNewProjects((prev) => updateSupport(prev));
    setShowcaseProjects((prev) => prev.map((item) => item.id === projectId ? {
      ...item,
      upvotesCount: item.upvotesCount + 1,
      weeklySupportCount: (item.weeklySupportCount || 0) + 1,
    } : item));

    const res = await ListingService.toggleUpvote(projectId);
    if (!res.success) {
      if (res.code === 'SUPPORT_ALREADY_GIVEN') {
        setUpvotedMap((prev) => ({ ...prev, [projectId]: true }));
        Alert.alert('Bilgi', 'Bu projeyi zaten desteklediniz. Kıstas kuralları gereği destek geri alınamaz.');
      } else {
        setUpvotedMap((prev) => ({ ...prev, [projectId]: isCurrentlyUpvoted }));
        setPopularProjects((prev) => updateSupport(prev, true));
        setNewProjects((prev) => updateSupport(prev, true));
        setShowcaseProjects((prev) => prev.map((item) => item.id === projectId ? {
          ...item,
          upvotesCount: Math.max(0, item.upvotesCount - 1),
          weeklySupportCount: Math.max(0, (item.weeklySupportCount || 0) - 1),
        } : item));
        Alert.alert('Destek Güncellenemedi', res.error || 'İşlem tamamlanamadı.');
      }
    } else if (res.success && res.upvotes_count !== undefined) {
      const exactSupportCount = Number(res.upvotes_count);
      setPopularProjects((prev) => prev.map((item) =>
        item.id === projectId
          ? { ...item, upvotesCount: exactSupportCount, likesCount: exactSupportCount }
          : item
      ));
      setNewProjects((prev) => prev.map((item) =>
        item.id === projectId
          ? { ...item, upvotesCount: exactSupportCount, likesCount: exactSupportCount }
          : item
      ));
      const nextShowcase = await ListingService.getWeeklyShowcaseListings(categoryId);
      setShowcaseProjects(nextShowcase);
    }
  }, [newProjects, popularProjects, upvotedMap]);

  const filterForPresentation = useCallback((items: Listing[]) => {
    const q = searchQuery.trim();
    return items
      .map((item) => ({
        item,
        score: q ? calculateSearchRelevance(item, q) : 1,
      }))
      .filter(({ item, score }) => {
        if (q && score <= 0) return false;
        if (selectedPlatform !== 'all') {
          if (!item.platforms || !item.platforms.includes(selectedPlatform)) return false;
        }
        return true;
      })
      .sort((a, b) => (q ? b.score - a.score : 0))
      .map(({ item }) => item);
  }, [searchQuery, selectedPlatform]);

  const filteredPopularProjects = useMemo(
    () => filterForPresentation(popularProjects),
    [filterForPresentation, popularProjects]
  );
  const filteredNewProjects = useMemo(
    () => filterForPresentation(newProjects),
    [filterForPresentation, newProjects]
  );
  const filteredShowcaseProjects = useMemo(
    () => filterForPresentation(showcaseProjects),
    [filterForPresentation, showcaseProjects]
  );

  const allCategoryProjects = useMemo(() => {
    const map = new Map<string, Listing>();
    sponsoredProjects.forEach((p) => map.set(p.id, p));
    showcaseProjects.forEach((p) => map.set(p.id, p));
    popularProjects.forEach((p) => map.set(p.id, p));
    newProjects.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [sponsoredProjects, showcaseProjects, popularProjects, newProjects]);

  const handleOpenSponsor = () => {
    if (onOpenSponsorManagement) {
      onOpenSponsorManagement();
    } else if (onOpenCreditStore) {
      onOpenCreditStore();
    }
  };

  const renderHeader = useCallback(() => (
    <View style={[styles.headerContainer, isWideWeb && styles.headerContainerWeb]}>
      {/* 0. MARKA ÜST BAŞLIĞI */}
      <KistasTopBrandBar onPress={onBack} />

      {/* 1. GERİ DÖN NAVİGASYONU */}
      <View style={styles.topNavRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityLabel="Kategorilere geri dön"
        >
          <Ionicons name="chevron-back" size={20} color="#252333" />
          <Text style={styles.backButtonText}>Kategorilere Dön</Text>
        </TouchableOpacity>
      </View>

      {/* 2. KATEGORİ HERO BAŞLIĞI & BAĞIMSIZ VİTRİN (0 PROJE BUTONU) */}
      <View style={[styles.categoryHeroCard, isWideWeb && styles.categoryHeroCardWeb]}>
        <LinearGradient
          colors={[...categoryGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.52)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{categoryTitle}</Text>
          <Text style={styles.heroSubtitle}>
            {categoryTitle} alanında bağımsız geliştiricilerin ve topluluğun en çok desteklediği dijital projeler.
          </Text>
        </View>

        {/* SAĞ TARAF: BÜYÜK SERBEST SÜZÜLEN 3D İKON */}
        {icon3d ? (
          <View pointerEvents="none" style={[styles.heroIconWrap, isWideWeb && styles.heroIconWrapWeb]}>
            <Image source={icon3d} style={[styles.heroIconImage, isWideWeb && styles.heroIconImageWeb]} resizeMode="contain" />
          </View>
        ) : null}
      </View>

      {/* 3. ARAMA ALANI (ActionSearchBar - Kategoriye Özel) */}
      <View style={[styles.searchSection, isWideWeb && styles.searchSectionWeb]}>
        <ActionSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          projects={allCategoryProjects}
          onSelectProject={onSelectProject}
          placeholder={`${categoryTitle} içinde ara...`}
        />
      </View>

      {/* 4. KEŞİF SIRALAMA SEKMELERİ (SEGMENTED CONTROL - KEŞFET İLE BİREBİR AYNI) */}
      <View style={[styles.segmentedControl, isWideWeb && styles.segmentedControlWeb]}>
        {(
          [
            { id: 'trending', label: 'Öne Çıkan' },
            { id: 'top_voted', label: 'En Çok Desteklenen' },
            { id: 'newest', label: 'Yeni' },
          ] as const
        ).map((tab) => {
          const isSelected = feedSort === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.segmentTab, isSelected && styles.segmentTabActive]}
              onPress={() => setFeedSort(tab.id)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#EAF2FC', '#EAF2FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentGradient}
                />
              ) : null}
              <Text
                style={[
                  styles.segmentTabText,
                  isSelected && styles.segmentTabTextActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. PLATFORM FİLTRELERİ (LOGO LOOP INFINITE MARQUEE - KEŞFET İLE BİREBİR AYNI) */}
      <View style={styles.platformSection}>
        <LogoLoop
          items={PLATFORM_FILTERS}
          selectedId={selectedPlatform}
          onItemPress={(plt) => setSelectedPlatform(plt.id as PlatformFilterType)}
          speed={22}
          accentColor="#252333"
        />
      </View>

      {/* 6. SPONSORLU VİTRİN: KATEGORİDE ÖNE ÇIKANLAR (Varsa 3D Floating Kartlar) */}
      {sponsoredProjects.length > 0 ? (
        <FeaturedBoostShowcase
          projects={filterForPresentation(sponsoredProjects)}
          selectedCategoryName={categoryTitle}
          onSelectProject={onSelectProject}
          onOpenCreditStore={handleOpenSponsor}
        />
      ) : null}

      {/* 7. KATEGORİ VİTRİNİ LİDERLERİ (TODAYSHOWCASEROW - KEŞFET İLE BİREBİR AYNI KART DÜZENİ) */}
      <TodayShowcaseRow
        projects={filteredShowcaseProjects}
        onSelectProject={onSelectProject}
        onOpenCreditStore={handleOpenSponsor}
        title={`${categoryTitle} Vitrini`}
        subtitle="Bu kategorinin öne çıkan liderleri"
      />

      {/* 8. POPÜLER SEKMESİ PAGER (KEŞFET İLE BİREBİR AYNI 3'LÜ YATAY SAYFALAMA) */}
      {feedSort !== 'newest' ? (
        <PopularProjectPager
          title={`${categoryTitle} · Popüler`}
          subtitle="Son 7 günün doğrulanmış topluluk desteği"
          projects={filteredPopularProjects}
          metric="weekly"
          onSelectProject={onSelectProject}
        />
      ) : null}

      {/* 9. YENİ ÇIKANLAR PAGER (KEŞFET İLE BİREBİR AYNI) */}
      {feedSort !== 'top_voted' ? (
        <PopularProjectPager
          title={`${categoryTitle} · Yeni Çıkanlar`}
          subtitle="İlk 7 günündeki bağımsız projeler"
          projects={filteredNewProjects}
          metric="lifetime"
          onSelectProject={onSelectProject}
        />
      ) : null}
    </View>
  ), [
    isWideWeb,
    onBack,
    categoryGradient,
    allCategoryProjects,
    categoryTitle,
    sponsoredProjects,
    icon3d,
    searchQuery,
    feedSort,
    selectedPlatform,
    filteredShowcaseProjects,
    filteredPopularProjects,
    filteredNewProjects,
    upvotedMap,
    handleToggleUpvote,
    onSelectProject,
    filterForPresentation,
    handleOpenSponsor,
  ]);

  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="search-outline" size={36} color="#686474" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Proje bulunamadı</Text>
        <Text style={styles.emptySubtitle}>
          {categoryTitle} kategorisindeki aramanızı veya platform filtrelerini değiştirebilirsiniz.
        </Text>
      </View>
    );
  }, [categoryTitle]);

  const isListEmpty =
    (feedSort === 'top_voted' && filteredPopularProjects.length === 0) ||
    (feedSort === 'newest' && filteredNewProjects.length === 0) ||
    (feedSort === 'trending' && filteredPopularProjects.length === 0 && filteredNewProjects.length === 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        decelerationRate={0.99}
        keyboardShouldPersistTaps="handled"
        onScroll={
          onScrollOffsetChange
            ? (e) => onScrollOffsetChange(e.nativeEvent.contentOffset.y)
            : undefined
        }
        scrollEventThrottle={32}
      >
        {renderHeader()}
        {isListEmpty ? renderEmptyComponent() : null}
        <CinematicFooter
          onOpenAbout={onOpenAbout}
          onOpenHowItWorks={onOpenHowItWorks}
          onOpenPrivacy={onOpenPrivacy}
          onOpenSupport={onOpenSupport}
          onOpenBlog={onOpenBlog}
        />
        <View style={styles.listFooter} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(250,251,253,0.86)',
    paddingTop: Platform.OS === 'ios' ? 14 : 14,
    paddingBottom: 8,
    position: 'relative',
    zIndex: 1000,
  },
  headerContainerWeb: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingTop: 18,
    paddingBottom: 28,
  },
  topNavRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(250,251,253,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
  },
  backButtonText: {
    color: '#252333',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryHeroCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 140,
    paddingVertical: 24,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    boxShadow: '0 12px 34px rgba(0,0,0,0.14)' as any,
  },
  categoryHeroCardWeb: {
    minHeight: 154,
    paddingVertical: 28,
    paddingHorizontal: 28,
  },
  heroContent: {
    maxWidth: '72%',
    zIndex: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 6,
    maxWidth: 520,
  },
  heroIconWrap: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -44 }],
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroIconWrapWeb: {
    right: 36,
    top: '50%',
    transform: [{ translateY: -55 }],
    width: 110,
    height: 110,
  },
  heroIconImage: {
    width: '100%',
    height: '100%',
  },
  heroIconImageWeb: {
    width: '100%',
    height: '100%',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  searchSectionWeb: {
    paddingHorizontal: 16,
    maxWidth: 1320,
    alignSelf: 'center',
    width: '100%',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(50,105,199,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  segmentedControlWeb: {
    maxWidth: 1320,
    alignSelf: 'center',
    width: '100%',
    marginHorizontal: 0,
    paddingHorizontal: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    overflow: 'hidden',
    position: 'relative',
  },
  segmentTabActive: {
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
    boxShadow: '0 2px 8px rgba(50,105,199,0.12)' as any,
  },
  segmentGradient: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
  },
  segmentTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#686474',
  },
  segmentTabTextActive: {
    color: '#252333',
    fontWeight: '900',
  },
  platformSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  emptyBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#252333',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#686474',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 380,
  },
  listFooter: {
    height: Platform.OS === 'ios' ? 96 : 84,
  },
});
