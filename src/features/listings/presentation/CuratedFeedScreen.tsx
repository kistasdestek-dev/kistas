import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { breakpoints, kistasStyle, theme } from '../../../core/theme';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { CategoryService } from '../../categories/application/CategoryService';
import { Category } from '../../categories/domain/Category';
import { ListingService } from '../application/ListingService';
import { Listing, PlatformType } from '../domain/Listing';

export type CuratedMode = 'popular' | 'new';

export interface CuratedFeedScreenProps {
  mode: CuratedMode;
  initialCategoryId?: string | null;
  initialPlatform?: PlatformType | 'all';
  onBack: () => void;
  onSelectProject?: (project: Listing) => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

const NEO = kistasStyle.neumorphism;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PLATFORMS: ReadonlyArray<{ id: PlatformType | 'all'; label: string; icon: IoniconName }> = [
  { id: 'all', label: 'Tümü', icon: 'layers-outline' },
  { id: 'iOS', label: 'iOS', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
  { id: 'SaaS', label: 'SaaS', icon: 'cloud-outline' },
];

const rankGradients = (rank: number): [string, string] => {
  if (rank === 1) return ['#FFD700', '#F59E0B'];
  if (rank === 2) return ['#E2E8F0', '#94A3B8'];
  if (rank === 3) return ['#FED7AA', '#EA580C'];
  return ['#EAF2FF', '#3269C7'];
};

const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return 'Yeni';
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  if (Number.isNaN(created)) return 'Yeni';
  const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
  if (diffHours < 24) return 'Bugün';
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Dün';
  return `${diffDays} gün önce`;
};

export const CuratedFeedScreen: React.FC<CuratedFeedScreenProps> = ({
  mode,
  initialCategoryId = null,
  initialPlatform = 'all',
  onBack,
  onSelectProject,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenHowItWorks,
  onOpenBlog,
}) => {
  const { width } = useWindowDimensions();
  const isPopular = mode === 'popular';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategoryId);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>(initialPlatform);
  const [searchQuery, setSearchQuery] = useState('');

  const [projects, setProjects] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kategori Listesini Al
  useEffect(() => {
    let isMounted = true;
    CategoryService.getProjectCategories()
      .then((items) => {
        if (isMounted) setCategories(items);
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Projeleri Yükle
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = isPopular
        ? await ListingService.getPopularListings(100, selectedCategory)
        : await ListingService.getNewListings(selectedCategory, 100);

      setProjects(data);
    } catch {
      setError(
        isPopular
          ? 'Popüler projeler şu anda yüklenemedi.'
          : 'Yeni çıkan projeler şu anda yüklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isPopular, selectedCategory]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Arama ve Platform İstemci Filtresi
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((item) => {
      if (selectedPlatform !== 'all') {
        if (!item.platforms || !item.platforms.includes(selectedPlatform)) {
          return false;
        }
      }
      if (q) {
        const titleMatch = item.title.toLowerCase().includes(q);
        const taglineMatch = item.tagline?.toLowerCase().includes(q);
        const makerMatch = (item.seller?.fullName || item.developerName || '').toLowerCase().includes(q);
        if (!titleMatch && !taglineMatch && !makerMatch) {
          return false;
        }
      }
      return true;
    });
  }, [projects, searchQuery, selectedPlatform]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.id === selectedCategory),
    [categories, selectedCategory]
  );

  const columnCount = width <= breakpoints.phoneMax ? 1 : width <= breakpoints.tabletMax ? 2 : 3;
  const horizontalPadding = width <= breakpoints.phoneMax ? 16 : 28;
  const contentWidth = Math.min(width, 1440) - horizontalPadding * 2;
  const cardWidth = Math.max(280, (contentWidth - (columnCount - 1) * 16) / columnCount);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedCategory(null);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <KistasTopBrandBar onPress={onBack} style={styles.brandBar} />

      {/* Hero Başlık ve Aksiyon Satırı */}
      <View style={styles.heroRow}>
        <GlassIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Geri dön" />
        <View style={styles.heroCopy}>
          <View style={styles.badgeRow}>
            <View style={[styles.modeBadge, isPopular ? styles.popularBadge : styles.newBadge]}>
              <Ionicons
                name={isPopular ? 'flame' : 'sparkles'}
                size={13}
                color={isPopular ? '#EA580C' : '#2563EB'}
              />
              <Text style={[styles.modeBadgeText, isPopular ? styles.popularBadgeText : styles.newBadgeText]}>
                {isPopular ? 'HAFTALIK TREND' : 'YENİ KEŞİFLER'}
              </Text>
            </View>
            {activeCategoryObj ? (
              <View style={styles.categoryBadge}>
                <Ionicons name="folder-outline" size={12} color="#3269C7" />
                <Text style={styles.categoryBadgeText}>{activeCategoryObj.name}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>
            {activeCategoryObj
              ? `${activeCategoryObj.name} · ${isPopular ? 'Popüler' : 'Yeni Çıkanlar'}`
              : isPopular
              ? 'Popüler Projeler'
              : 'Yeni Çıkanlar'}
          </Text>
          <Text style={styles.subtitle}>
            {isPopular
              ? 'Son 7 günün doğrulanmış topluluk desteğine göre en çok öne çıkan projeleri.'
              : 'Topluluğa yeni katılan, ilk günlerindeki bağımsız ve yenilikçi projeler.'}
          </Text>
        </View>
      </View>

      {/* Kontrol Paneli: Canlı Arama ve Filtreler */}
      <View style={styles.controlsContainer}>
        {/* Canlı Arama Girdisi */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="#3269C7" style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`${isPopular ? 'Popüler' : 'Yeni'} projelerde veya geliştiricilerde ara...`}
            placeholderTextColor="#8292A8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.searchClearButton}
              accessibilityLabel="Aramayı temizle"
            >
              <Ionicons name="close-circle" size={16} color="#8292A8" />
            </Pressable>
          ) : null}
        </View>

        {/* Platform Seçim Hapları */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.platformScroll}
        >
          {PLATFORMS.map((plat) => {
            const isSelected = selectedPlatform === plat.id;
            return (
              <Pressable
                key={plat.id}
                onPress={() => setSelectedPlatform(plat.id)}
                style={({ pressed }) => [
                  styles.platformPill,
                  isSelected && styles.platformPillActive,
                  pressed && styles.platformPillPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${plat.label} platformunu filtrele`}
              >
                <Ionicons
                  name={plat.icon}
                  size={14}
                  color={isSelected ? '#1D4ED8' : '#64748B'}
                />
                <Text style={[styles.platformPillText, isSelected && styles.platformPillTextActive]}>
                  {plat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Kategori Seçim Hapları */}
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={({ pressed }) => [
                styles.categoryPill,
                selectedCategory === null && styles.categoryPillActive,
                pressed && styles.categoryPillPressed,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === null && styles.categoryPillTextActive,
                ]}
              >
                Tüm Kategoriler
              </Text>
            </Pressable>
            {categories.map((cat) => {
              const isCatSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(isCatSelected ? null : cat.id)}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    isCatSelected && styles.categoryPillActive,
                    pressed && styles.categoryPillPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.name} kategorisini filtrele`}
                >
                  <Text style={[styles.categoryPillText, isCatSelected && styles.categoryPillTextActive]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* Sonuç Sayacı */}
      <View style={styles.resultsMetaRow}>
        <Text style={styles.resultsCountText}>
          {isLoading ? 'Yükleniyor...' : `${filteredProjects.length} proje listeleniyor`}
        </Text>
        {searchQuery || selectedPlatform !== 'all' || selectedCategory !== null ? (
          <Pressable onPress={handleResetFilters} style={styles.resetFiltersButton}>
            <Ionicons name="refresh-outline" size={13} color="#2563EB" />
            <Text style={styles.resetFiltersText}>Filtreleri Temizle</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Proje Kartları Izgarası */}
      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#3269C7" />
          <Text style={styles.stateText}>
            {isPopular ? 'Popüler projeler hazırlanıyor…' : 'Yeni çıkan projeler hazırlanıyor…'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <GlassIconButton icon="refresh" onPress={() => void loadProjects()} accessibilityLabel="Tekrar dene" />
          <Text style={styles.stateTitle}>Veri yüklenemedi</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : filteredProjects.length === 0 ? (
        <View style={styles.stateCard}>
          <GlassIconButton icon="search-outline" accessibilityLabel="Sonuç bulunamadı" />
          <Text style={styles.stateTitle}>Eşleşen proje bulunamadı</Text>
          <Text style={styles.stateText}>
            Arama kriterlerinize veya seçilen filtrelere uyan proje bulunamadı.
          </Text>
          <Pressable onPress={handleResetFilters} style={styles.stateActionButton}>
            <Text style={styles.stateActionButtonText}>Filtreleri Sıfırla</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredProjects.map((project, index) => {
            const rank = index + 1;
            const rankColors = rankGradients(rank);
            const supportScore = isPopular
              ? project.weeklySupportCount || project.upvotesCount || 0
              : project.upvotesCount || 0;
            const relativeDate = formatRelativeTime(project.createdAt);

            return (
              <Pressable
                key={project.id}
                onPress={() => onSelectProject?.(project)}
                accessibilityRole="button"
                accessibilityLabel={`${project.title} projesini incele`}
                style={({ pressed }) => [
                  styles.card,
                  { width: cardWidth },
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Üst Satır: Rozetler ve Metrik */}
                <View style={styles.cardHeaderRow}>
                  {isPopular ? (
                    <LinearGradient colors={rankColors} style={styles.rankBadge}>
                      <Text style={styles.rankNumber}>{rank <= 3 ? `#${rank}` : `#${rank}`}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.freshnessBadge}>
                      <Ionicons name="sparkles" size={11} color="#2563EB" />
                      <Text style={styles.freshnessText}>{relativeDate}</Text>
                    </View>
                  )}

                  <View style={styles.supportBadge}>
                    <Ionicons name="arrow-up" size={12} color="#16A34A" />
                    <Text style={styles.supportScoreText}>{supportScore}</Text>
                  </View>
                </View>

                {/* Orta Satır: Logo ve Başlık Bilgisi */}
                <View style={styles.cardBodyRow}>
                  <View style={styles.logoContainer}>
                    {project.logoUrl ? (
                      <AutoTransparentLogo
                        src={project.logoUrl}
                        alt={`${project.title} logosu`}
                        style={styles.logoImage}
                      />
                    ) : (
                      <Text style={styles.logoFallback}>
                        {project.title.slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.projectTitle} numberOfLines={1}>
                      {project.title}
                    </Text>
                    <View style={styles.makerRow}>
                      <Text style={styles.makerName} numberOfLines={1}>
                        {project.seller?.fullName || project.developerName || 'Bağımsız Geliştirici'}
                      </Text>
                      {project.seller?.isVerified ? (
                        <Ionicons name="checkmark-circle" size={13} color="#2563EB" style={styles.verifiedIcon} />
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Açıklama / Tagline */}
                <Text style={styles.tagline} numberOfLines={2}>
                  {project.tagline || project.description || 'Açıklama belirtilmedi.'}
                </Text>

                {/* Alt Satır: Platform Etiketleri ve İncele Butonu */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.platformTagsRow}>
                    {(project.platforms || ['Web']).slice(0, 3).map((plat) => (
                      <View key={plat} style={styles.platformTag}>
                        <Text style={styles.platformTagText}>{plat}</Text>
                      </View>
                    ))}
                  </View>
                  <GlassIconButton
                    icon="arrow-forward"
                    size={34}
                    iconSize={15}
                    accessibilityLabel={`${project.title} detayına git`}
                  />
                </View>

                {/* İnce Cam Çerçeve Efekti */}
                <View pointerEvents="none" style={styles.cardInnerRim} />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Kıstas Sinematik Alt Bilgi */}
      <CinematicFooter
        onOpenAbout={onOpenAbout}
        onOpenPrivacy={onOpenPrivacy}
        onOpenSupport={onOpenSupport}
        onOpenHowItWorks={onOpenHowItWorks}
        onOpenBlog={onOpenBlog}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    paddingTop: 12,
    paddingBottom: 72,
  },
  brandBar: {
    paddingHorizontal: 0,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 18,
  },
  heroCopy: {
    flex: 1,
    marginLeft: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  popularBadge: {
    backgroundColor: 'rgba(254,243,199,0.7)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  popularBadgeText: {
    color: '#D97706',
  },
  newBadge: {
    backgroundColor: 'rgba(239,246,255,0.85)',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  newBadgeText: {
    color: '#2563EB',
  },
  modeBadgeText: {
    ...theme.typography.kistas,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(241,245,250,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
  },
  categoryBadgeText: {
    ...theme.typography.kistas,
    color: '#3269C7',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    ...theme.typography.kistas,
    marginTop: 2,
    color: NEO.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  subtitle: {
    ...theme.typography.kistas,
    marginTop: 6,
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  controlsContainer: {
    marginTop: 10,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.22)',
    shadowColor: NEO.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    ...theme.typography.kistas,
    flex: 1,
    fontSize: 13,
    color: NEO.ink,
    paddingVertical: Platform.OS === 'web' ? 10 : 6,
  },
  searchClearButton: {
    padding: 4,
  },
  platformScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  platformPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  platformPillPressed: {
    transform: [{ scale: 0.98 }],
  },
  platformPillText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  platformPillTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  categoryScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
  },
  categoryPillActive: {
    backgroundColor: '#3269C7',
    borderColor: '#3269C7',
  },
  categoryPillPressed: {
    transform: [{ scale: 0.97 }],
  },
  categoryPillText: {
    ...theme.typography.kistas,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  resultsCountText: {
    ...theme.typography.kistas,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  resetFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  resetFiltersText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
  },
  card: {
    minHeight: 180,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
    shadowColor: NEO.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rankBadge: {
    minWidth: 38,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  rankNumber: {
    ...theme.typography.kistas,
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  freshnessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.22)',
  },
  freshnessText: {
    ...theme.typography.kistas,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  supportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.22)',
  },
  supportScoreText: {
    ...theme.typography.kistas,
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  logoFallback: {
    ...theme.typography.kistas,
    fontSize: 15,
    fontWeight: '800',
    color: NEO.ink,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectTitle: {
    ...theme.typography.kistas,
    fontSize: 15,
    fontWeight: '800',
    color: NEO.ink,
  },
  makerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  makerName: {
    ...theme.typography.kistas,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  tagline: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#475569',
    marginBottom: 14,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  platformTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
  },
  platformTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  platformTagText: {
    ...theme.typography.kistas,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  cardInnerRim: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  stateCard: {
    minHeight: 220,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
    shadowColor: NEO.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
    marginVertical: 20,
  },
  stateTitle: {
    ...theme.typography.kistas,
    marginTop: 12,
    color: NEO.ink,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    ...theme.typography.kistas,
    marginTop: 7,
    maxWidth: 440,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateActionButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#3269C7',
  },
  stateActionButtonText: {
    ...theme.typography.kistas,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
