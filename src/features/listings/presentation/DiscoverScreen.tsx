import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActionSearchBar, calculateSearchRelevance } from '../../../shared/components/ActionSearchBar';
import { FeaturedBoostShowcase } from '../../../shared/components/FeaturedBoostShowcase';
import { TodayShowcaseRow } from '../../../shared/components/TodayShowcaseRow';
import { PopularProjectPager } from '../../../shared/components/PopularProjectPager';
import { DiscoveryRevealStatement } from '../../../shared/components/DiscoveryRevealStatement';
import { SponsorLogoMarquee } from '../../../shared/components/SponsorLogoMarquee';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { FooterSloganBanner } from '../../../shared/components/FooterSloganBanner';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { Listing, PlatformType } from '../domain/Listing';
import { ListingService } from '../application/ListingService';
import { selectStableRandomPreview } from '../application/showcasePreview';
import { CategoryService } from '../../categories/application/CategoryService';
import { Category } from '../../categories/domain/Category';
import { DynamicDiscoverFilters } from './DynamicDiscoverFilters';
import { breakpoints } from '../../../core/theme';

interface DiscoverScreenProps {
  onSelectListing?: (listing: Listing) => void;
  onOpenChatWithMaker?: (makerId: string, projectTitle: string) => void;
  initialCategoryId?: string | null;
  initialSearchQuery?: string;
  initialFeedSort?: FeedSortType;
  initialPlatform?: PlatformFilterType;
  onOpenBrowse?: () => void;
  onOpenCreditStore?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
  onScrollOffsetChange?: (offsetY: number) => void;
  onOpenShowcase?: (filters: {
    categoryId: string | null;
    platform: PlatformFilterType;
    searchQuery: string;
    feedSort: FeedSortType;
  }) => void;
  onOpenPopular?: (filters: {
    categoryId: string | null;
    platform: PlatformFilterType;
  }) => void;
  onOpenNew?: (filters: {
    categoryId: string | null;
    platform: PlatformFilterType;
  }) => void;
}

type FeedSortType = 'trending' | 'top_voted' | 'newest';
type PlatformFilterType = PlatformType | 'all';
const HOME_SPONSOR_LIMIT = 12;
const HOME_FEED_LIMIT = 12;

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  onSelectListing,
  onOpenChatWithMaker: _onOpenChatWithMaker,
  initialCategoryId,
  initialSearchQuery,
  initialFeedSort,
  initialPlatform,
  onOpenBrowse,
  onOpenCreditStore,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenHowItWorks,
  onOpenBlog,
  onScrollOffsetChange,
  onOpenShowcase,
  onOpenPopular,
  onOpenNew,
}) => {
  const { width: viewportWidth } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && viewportWidth > breakpoints.phoneMax;
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategoryId || null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilterType>(initialPlatform || 'all');
  const [feedSort, setFeedSort] = useState<FeedSortType>(initialFeedSort || 'trending');
  const [categories, setCategories] = useState<Category[]>([]);
  const [sponsoredProjects, setSponsoredProjects] = useState<Listing[]>([]);
  const [popularProjects, setPopularProjects] = useState<Listing[]>([]);
  const [newProjects, setNewProjects] = useState<Listing[]>([]);
  const [weeklyShowcaseProjects, setWeeklyShowcaseProjects] = useState<Listing[]>([]);
  const [showcasePreviewSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

  useEffect(() => {
    let isMounted = true;
    CategoryService.getProjectCategories()
      .then((items) => {
        if (!isMounted) return;
        setCategories(items);
        setSelectedCategory((current) => {
          if (!current || items.some((item) => item.id === current)) return current;
          return null;
        });
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Preset Senkronizasyonu
  useEffect(() => {
    if (initialCategoryId !== undefined) {
      setSelectedCategory(initialCategoryId);
    }
  }, [initialCategoryId]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialFeedSort !== undefined) {
      setFeedSort(initialFeedSort);
    }
  }, [initialFeedSort]);

  useEffect(() => {
    if (initialPlatform !== undefined) {
      setSelectedPlatform(initialPlatform);
    }
  }, [initialPlatform]);

  useEffect(() => {
    let isMounted = true;
    const categoryId = selectedCategory;
    void ListingService.getSponsoredListings(categoryId, HOME_SPONSOR_LIMIT).then((items) => {
      if (!isMounted) return;
      setSponsoredProjects(items);
    });

    void ListingService.getWeeklyShowcaseListings(categoryId).then((items) => {
      if (!isMounted) return;
      setWeeklyShowcaseProjects(items);
    });

    void Promise.all([
      ListingService.getPopularListings(HOME_FEED_LIMIT, categoryId),
      ListingService.getNewListings(categoryId, HOME_FEED_LIMIT),
    ]).then(([popularData, newData]) => {
      if (!isMounted) return;
      setPopularProjects(popularData);
      setNewProjects(newData);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextRotation = () => {
      const nextHourDelay = 60 * 60 * 1000 - (Date.now() % (60 * 60 * 1000)) + 1000;
      refreshTimer = setTimeout(async () => {
        const nextSponsors = await ListingService.getSponsoredListings(selectedCategory, HOME_SPONSOR_LIMIT);
        if (!isMounted) return;
        setSponsoredProjects(nextSponsors);
        scheduleNextRotation();
      }, nextHourDelay);
    };

    scheduleNextRotation();
    return () => {
      isMounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [selectedCategory]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedPlatform('all');
    setFeedSort('trending');
  }, []);

  const handleBrandPress = useCallback(() => {
    handleClearFilters();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [handleClearFilters]);


  const filterForPresentation = useCallback((items: Listing[]) => {
    const q = searchQuery.trim();
    return items
      .map((item) => ({
        item,
        score: q ? calculateSearchRelevance(item, q) : 1,
      }))
      .filter(({ item, score }) => {
        if (q && score <= 0) return false;
        if (selectedCategory && item.showcaseCategoryId !== selectedCategory && item.categoryId !== selectedCategory) {
          return false;
        }
        if (selectedPlatform !== 'all') {
          if (!item.platforms || !item.platforms.includes(selectedPlatform)) return false;
        }
        return true;
      })
      .sort((a, b) => (q ? b.score - a.score : 0))
      .map(({ item }) => item);
  }, [searchQuery, selectedCategory, selectedPlatform]);

  const filteredPopularProjects = useMemo(
    () => filterForPresentation(popularProjects),
    [filterForPresentation, popularProjects]
  );
  const filteredNewProjects = useMemo(
    () => filterForPresentation(newProjects),
    [filterForPresentation, newProjects]
  );
  const filteredWeeklyShowcaseProjects = useMemo(() => {
    const filtered = filterForPresentation(weeklyShowcaseProjects.map((project) => ({
      ...project,
      showcaseCategoryName: categories.find(
        (category) => category.id === project.showcaseCategoryId
      )?.name,
    })));
    const previewLimit = viewportWidth <= breakpoints.phoneMax
      ? 3
      : viewportWidth <= breakpoints.tabletMax ? 4 : 6;
    return selectStableRandomPreview(filtered, previewLimit, showcasePreviewSeed);
  }, [categories, filterForPresentation, showcasePreviewSeed, viewportWidth, weeklyShowcaseProjects]);

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory);
  }, [categories, selectedCategory]);

  const categoryBoostedProjects = useMemo(() => {
    return filterForPresentation(sponsoredProjects);
  }, [filterForPresentation, sponsoredProjects]);

  const allDiscoverProjects = useMemo(() => {
    const map = new Map<string, Listing>();
    sponsoredProjects.forEach((p) => map.set(p.id, p));
    weeklyShowcaseProjects.forEach((p) => map.set(p.id, p));
    popularProjects.forEach((p) => map.set(p.id, p));
    newProjects.forEach((p) => map.set(p.id, p));
    return Array.from(map.values()).map((project) => ({
      ...project,
      showcaseCategoryName: categories.find(
        (category) => category.id === project.showcaseCategoryId
      )?.name || project.showcaseCategoryName,
    }));
  }, [categories, sponsoredProjects, weeklyShowcaseProjects, popularProjects, newProjects]);

  const renderListHeader = useCallback(() => (
    <View style={[styles.headerContainer, isWideWeb && styles.headerContainerWeb]}>
      <LinearGradient
        colors={Platform.OS === 'web' ? ['transparent', 'transparent'] : ['#F8F9FB', '#F8F9FB', '#F8F9FB']}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' as any }]}
      />
      <View pointerEvents="none" style={[styles.headerSpecular, { pointerEvents: 'none' as any }]} />

      {/* 1. PREMİUM MARKA ÜST BAŞLIĞI (BÜYÜTÜLMÜŞ KISTAS LOGO + LOGOTYPE) */}
      <KistasTopBrandBar onPress={handleBrandPress} />

      <View style={[styles.heroHeaderRow, isWideWeb && styles.heroHeaderRowWeb]}>
        {/* 3. ARAMA ALANI (21st.dev ActionSearchBar - 5 Vitrin Projesi & Canlı Arama) */}
        <View style={[styles.searchSection, isWideWeb && styles.searchSectionWeb]}>
          <ActionSearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            projects={allDiscoverProjects}
            onSelectProject={onSelectListing}
            placeholder="Uygulama, proje veya geliştirici ara"
          />
        </View>
      </View>

      <DynamicDiscoverFilters
        categories={categories}
        selectedCategoryId={selectedCategory}
        selectedPlatform={selectedPlatform}
        selectedSort={feedSort}
        onSelectCategory={setSelectedCategory}
        onSelectPlatform={setSelectedPlatform}
        onSelectSort={setFeedSort}
        onOpenBrowse={onOpenBrowse}
      />

      <DiscoveryRevealStatement />

      <SponsorLogoMarquee
        projects={sponsoredProjects}
        onOpenCreditStore={onOpenCreditStore}
      />

      {/* 6.5 SPONSORLU VİTRİN: KATEGORİSİNDE ÖNE ÇIKANLAR (3D FLOATING CARDS) */}
      <FeaturedBoostShowcase
        projects={categoryBoostedProjects}
        selectedCategoryName={selectedCategoryObj?.name}
        onSelectProject={onSelectListing}
        onOpenCreditStore={onOpenCreditStore}
      />

      {/* 7. KISTAS SEÇKİSİ: GÜNÜN VİTRİNİ (4'LÜ YAN YANA IMAGES BADGE KARTLARI) */}
      <TodayShowcaseRow
        projects={filteredWeeklyShowcaseProjects}
        onSelectProject={onSelectListing}
        title="Günün Vitrini"
        subtitle="Topluluk desteğiyle öne çıkan seçkin projeler"
        onOpenAll={() => onOpenShowcase?.({
          categoryId: selectedCategory,
          platform: selectedPlatform,
          searchQuery,
          feedSort,
        })}
      />

      {feedSort !== 'newest' ? (
        <PopularProjectPager
          title={selectedCategoryObj ? `${selectedCategoryObj.name} · Popüler` : 'Popüler'}
          subtitle="Kalıcı topluluk desteğine göre sıralama"
          projects={filteredPopularProjects}
          metric="lifetime"
          onSelectProject={onSelectListing}
          onOpenBrowse={onOpenBrowse}
          onOpenAll={onOpenPopular ? () => onOpenPopular({
            categoryId: selectedCategory,
            platform: selectedPlatform,
          }) : undefined}
        />
      ) : null}

      {feedSort !== 'top_voted' ? (
        <PopularProjectPager
          title={selectedCategoryObj ? `${selectedCategoryObj.name} · Yeni` : 'Yeni Çıkanlar'}
          subtitle="İlk 30 günündeki bağımsız projeler"
          projects={filteredNewProjects}
          metric="lifetime"
          onSelectProject={onSelectListing}
          onOpenBrowse={onOpenBrowse}
          onOpenAll={onOpenNew ? () => onOpenNew({
            categoryId: selectedCategory,
            platform: selectedPlatform,
          }) : undefined}
        />
      ) : null}
    </View>
  ), [
    isSearchFocused,
    searchQuery,
    feedSort,
    selectedCategory,
    categories,
    selectedPlatform,
    filteredPopularProjects,
    filteredNewProjects,
    filteredWeeklyShowcaseProjects,
    onOpenBrowse,
    categoryBoostedProjects,
    selectedCategoryObj,
    onSelectListing,
    onOpenCreditStore,
    sponsoredProjects,
    isWideWeb,
    handleBrandPress,
    onOpenShowcase,
    onOpenPopular,
    onOpenNew,
  ]);

  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="search-outline" size={36} color="#686474" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Proje bulunamadı</Text>
        <Text style={styles.emptySubtitle}>
          Aramanızı veya seçili filtreleri değiştirebilirsiniz.
        </Text>
        <TouchableOpacity
          style={styles.clearFilterBtn}
          onPress={handleClearFilters}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Filtreleri temizle"
        >
          <Text style={styles.clearFilterBtnText}>Filtreleri Temizle</Text>
        </TouchableOpacity>
      </View>
    );
  }, [handleClearFilters]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        decelerationRate={0.99}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
      >
        {renderListHeader()}
        {(feedSort === 'top_voted' && filteredPopularProjects.length === 0)
          || (feedSort === 'newest' && filteredNewProjects.length === 0)
          || (feedSort === 'trending'
            && filteredPopularProjects.length === 0
            && filteredNewProjects.length === 0)
          ? renderEmptyComponent()
          : null}
        <FooterSloganBanner onPress={onOpenBrowse} />
        <CinematicFooter onOpenAbout={onOpenAbout} onOpenHowItWorks={onOpenHowItWorks} onOpenPrivacy={onOpenPrivacy} onOpenSupport={onOpenSupport} onOpenBlog={onOpenBlog} />
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
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1000,
  },
  heroHeaderRow: {
    position: 'relative',
    zIndex: 99999,
  },
  heroHeaderRowWeb: {
    paddingHorizontal: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 28,
    position: 'relative',
    zIndex: 99999,
  },
  heroIntro: {},
  heroIntroWeb: {
    flex: 1,
    minWidth: 0,
  },
  headerSpecular: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.14)',
    zIndex: 0,
  },
  topBrandBar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.75)',
    position: 'relative',
    zIndex: 10,
  },
  topBrandBarWeb: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginBottom: 22,
  },
  brandIdentityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brandLogoPlate: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(37, 84, 199, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px -4px rgba(37, 84, 199, 0.15), 0 2px 5px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#2554C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 4,
      },
    }),
  },
  brandLogoPlateWeb: {
    width: 62,
    height: 62,
    borderRadius: 18,
  },
  brandLogoImg: {
    width: 38,
    height: 38,
  },
  brandLogoImgWeb: {
    width: 44,
    height: 44,
  },
  brandMetaCol: {
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#1A1826',
    lineHeight: 30,
  },
  brandNameWeb: {
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
    letterSpacing: -0.1,
  },
  searchSection: {
    marginHorizontal: 16,
    marginBottom: 10,
    position: 'relative',
    zIndex: 99999,
  },
  searchSectionWeb: {
    width: 460,
    maxWidth: '44%',
    marginHorizontal: 0,
    marginBottom: 0,
    position: 'relative',
    zIndex: 99999,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    position: 'relative',
    zIndex: 1,
  },
  segmentedControlWeb: {
    width: 520,
    maxWidth: '55%',
    marginBottom: 14,
    position: 'relative',
    zIndex: 1,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  segmentTabActive: {
    backgroundColor: 'transparent',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 2,
  },
  segmentGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 9,
  },
  segmentTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#686474',
  },
  segmentTabTextActive: {
    color: '#25364E',
    fontWeight: '700',
  },
  categoriesSection: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 1,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 7,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 35,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(50,105,199,0.24)',
    borderColor: 'rgba(50,105,199,0.32)',
  },
  categoryChipIcon: {
    marginRight: 5,
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#25364E',
  },
  categoryChipTextActive: {
    color: '#25364E',
    fontWeight: '700',
  },
  browseShortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 35,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(50,105,199,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.32)',
  },
  browseShortcutText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#25364E',
  },
  browseShortcutChevron: {
    marginLeft: 3,
  },
  platformSection: {
    marginBottom: 10,
    position: 'relative',
    zIndex: 1,
  },
  platformScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 29,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  platformChipActive: {
    backgroundColor: 'rgba(50,105,199,0.22)',
    borderColor: 'rgba(50,105,199,0.32)',
  },
  platformChipIcon: {
    marginRight: 4,
  },
  platformChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#25364E',
  },
  platformChipTextActive: {
    color: '#25364E',
    fontWeight: '700',
  },
  popularSection: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(250,251,253,0.92)' : 'transparent',
    marginTop: 8,
    marginBottom: 8,
  },
  popularSectionWeb: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.11)',
    boxShadow: '0 18px 46px rgba(255,255,255,0.18)' as any,
    overflow: 'hidden',
  },
  popularHeader: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  popularHeadingCopy: {
    flexShrink: 1,
  },
  popularTitle: {
    color: '#25364E',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  popularSubtitle: {
    color: '#686474',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 1,
  },
  popularPagerContent: {
    paddingLeft: 16,
    paddingRight: 28,
    gap: 14,
  },
  popularPage: {
    backgroundColor: 'transparent',
  },
  popularRow: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  popularMainAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularLogoShell: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  popularLogoPlaceholder: {
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(50,105,199,0.24)',
  },
  popularLogo: {
    width: '100%',
    height: '100%',
  },
  popularLogoInitials: {
    color: '#25364E',
    fontSize: 22,
    fontWeight: '700',
  },
  popularCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
    marginRight: 9,
  },
  popularProjectTitle: {
    color: '#25364E',
    fontSize: 16.5,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  popularProjectTagline: {
    color: '#686474',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 3,
  },
  popularTrailing: {
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularSupportButton: {
    minWidth: 80,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FB',
  },
  popularSupportButtonActive: {
    backgroundColor: 'rgba(50,105,199,0.22)',
  },
  popularSupportButtonLocked: {
    backgroundColor: 'rgba(50,105,199,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.28)',
    opacity: 0.82,
  },
  popularSupportText: {
    color: '#25364E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  popularSupportTextActive: {
    color: '#25364E',
  },
  popularSupportCount: {
    color: '#686474',
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 5,
  },
  popularSeparator: {
    position: 'absolute',
    left: 89,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(142,142,147,0.24)',
  },
  /* APP STORE TARZI SATIR ELEMANI */
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12.5,
    color: Platform.OS === 'web' ? '#5c576b' : '#686474',
    marginTop: 10,
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
    color: Platform.OS === 'web' ? '#3f3b4c' : '#25364E',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: Platform.OS === 'web' ? '#5c576b' : '#686474',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearFilterBtn: {
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
  },
  clearFilterBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#25364E',
  },
  listFooter: {
    height: 124,
  },
});
