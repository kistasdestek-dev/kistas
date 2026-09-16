import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  onOpenFaq?: () => void;
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

/** Kullanıcının belirlediği ilk 3 sıralama renkleri ve tipografi kontrastları */
const getRankConfig = (rank: number) => {
  if (rank === 1) {
    return {
      backgroundColor: '#0e5b9b',
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.85)',
    };
  }
  if (rank === 2) {
    return {
      backgroundColor: '#394d45',
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.85)',
    };
  }
  if (rank === 3) {
    return {
      backgroundColor: '#fff200',
      textColor: '#173866',
      borderColor: 'rgba(255, 255, 255, 0.95)',
    };
  }
  return null;
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
  onOpenFaq,
  onOpenHowItWorks,
  onOpenBlog,
}) => {
  const { width } = useWindowDimensions();
  const isPopular = mode === 'popular';
  const isPhone = width <= breakpoints.phoneMax;

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>(initialPlatform);

  const [projects, setProjects] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kategori Bilgisi
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
        ? await ListingService.getPopularListings(100, initialCategoryId)
        : await ListingService.getNewListings(initialCategoryId, 100);

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
  }, [initialCategoryId, isPopular]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Platform Filtresi
  const filteredProjects = useMemo(() => {
    return projects.filter((item) => {
      if (selectedPlatform !== 'all') {
        if (!item.platforms || !item.platforms.includes(selectedPlatform)) {
          return false;
        }
      }
      return true;
    });
  }, [projects, selectedPlatform]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.id === initialCategoryId),
    [categories, initialCategoryId]
  );

  const columnCount = isPhone ? 1 : width <= breakpoints.tabletMax ? 2 : 3;
  const horizontalPadding = isPhone ? 16 : 28;
  const contentWidth = Math.min(width, 1440) - horizontalPadding * 2;
  const cardWidth = isPhone ? '100%' : Math.max(280, (contentWidth - (columnCount - 1) * 18) / columnCount);

  const handleResetPlatform = () => {
    setSelectedPlatform('all');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <KistasTopBrandBar onPress={onBack} style={styles.brandBar} />

      {/* Hero Başlık ve Kıstas Geri İkonu */}
      <View style={styles.heroRow}>
        <GlassIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Geri dön" />
        <View style={styles.heroCopy}>
          {/* Özel Kıstas Neumorphic Eyebrow Kapsülü */}
          <View style={styles.eyebrowContainer}>
            <View style={styles.eyebrowCapsule}>
              <LinearGradient
                colors={isPopular ? ['#FF8A00', '#EA580C'] : ['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.eyebrowIconWell}
              >
                <Ionicons
                  name={isPopular ? 'flame' : 'sparkles'}
                  size={12}
                  color="#FFFFFF"
                />
              </LinearGradient>
              <Text style={styles.eyebrowTitle}>
                {isPopular ? 'KALICI TOPLULUK SIRALAMASI' : 'YENİ KEŞİFLER RADARI'}
              </Text>
            </View>

            {activeCategoryObj ? (
              <View style={styles.categoryBadge}>
                <Ionicons name="folder-outline" size={12} color="#3269C7" />
                <Text style={styles.categoryBadgeText}>{activeCategoryObj.name}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, isPhone && styles.titleMobile]}>
            {activeCategoryObj
              ? `${activeCategoryObj.name} · ${isPopular ? 'Popüler' : 'Yeni Çıkanlar'}`
              : isPopular
              ? 'Popüler Projeler'
              : 'Yeni Çıkanlar'}
          </Text>
          <Text style={[styles.subtitle, isPhone && styles.subtitleMobile]}>
            {isPopular
              ? 'Toplam kalıcı topluluk desteğine göre en çok öne çıkan projeleri.'
              : 'Topluluğa son 30 günde katılan bağımsız ve yenilikçi projeler.'}
          </Text>
        </View>
      </View>

      {/* Sade ve Neumorphic Platform Filtre Çubuğu */}
      <View style={styles.filterSection}>
        <View style={styles.platformInsetTrack}>
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
                    color={isSelected ? NEO.ink : '#65748A'}
                  />
                  <Text style={[styles.platformPillText, isSelected && styles.platformPillTextActive]}>
                    {plat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Sade Sonuç Sayacı */}
      <View style={styles.resultsMetaRow}>
        <Text style={styles.resultsCountText}>
          {isLoading ? 'Yükleniyor...' : `${filteredProjects.length} proje listeleniyor`}
        </Text>
        {selectedPlatform !== 'all' ? (
          <Pressable onPress={handleResetPlatform} style={styles.resetFiltersButton}>
            <Ionicons name="refresh-outline" size={13} color="#3269C7" />
            <Text style={styles.resetFiltersText}>Filtreyi Sıfırla</Text>
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
          <GlassIconButton icon="layers-outline" accessibilityLabel="Sonuç bulunamadı" />
          <Text style={styles.stateTitle}>Bu platformda proje bulunamadı</Text>
          <Text style={styles.stateText}>
            Seçilen platform kriterine uyan proje henüz eklenmedi.
          </Text>
          <Pressable onPress={handleResetPlatform} style={styles.stateActionButton}>
            <Text style={styles.stateActionButtonText}>Filtreyi Sıfırla</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.grid, isPhone && styles.gridMobile]}>
          {filteredProjects.map((project, index) => {
            const rank = index + 1;
            const rankConfig = getRankConfig(rank);
            const supportScore = project.upvotesCount || 0;
            const relativeDate = formatRelativeTime(project.createdAt);

            return (
              <Pressable
                key={project.id}
                onPress={() => onSelectProject?.(project)}
                accessibilityRole="button"
                accessibilityLabel={`${project.title} projesini incele`}
                style={({ pressed }) => [
                  styles.card,
                  isPhone && styles.cardMobile,
                  { width: cardWidth as any },
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Sol üstten hafif mavi, ortada saf beyaz, sağ altta hafif yeşil pürüzsüz ambiyans geçişi */}
                {Platform.OS === 'web' ? (
                  <View pointerEvents="none" style={styles.cardWebAurora} />
                ) : (
                  <LinearGradient
                    colors={['#F5F8FD', '#FFFFFF', '#F6FAF8']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View pointerEvents="none" style={styles.cardSpecularTop} />

                {/* 1. Kısım: Üst Başlık (Sıralama Rozeti ve Destek Skoru) */}
                <View style={styles.cardHeaderRow}>
                  {isPopular ? (
                    rankConfig ? (
                      <View
                        style={[
                          styles.topRankBadge,
                          {
                            backgroundColor: rankConfig.backgroundColor,
                            borderColor: rankConfig.borderColor,
                          },
                        ]}
                      >
                        <Text style={[styles.topRankText, { color: rankConfig.textColor }]}>
                          {rank}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.rankBadgeInset}>
                        <Text style={styles.rankNumberInset}>{rank}</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.freshnessBadge}>
                      <Ionicons name="sparkles" size={12} color="#2563EB" />
                      <Text style={styles.freshnessText}>{relativeDate}</Text>
                    </View>
                  )}

                  <View style={styles.supportBadge}>
                    <Ionicons name="arrow-up" size={13} color="#0FA336" />
                    <Text style={styles.supportScoreText}>{supportScore}</Text>
                  </View>
                </View>

                {/* 2. Kısım: Kimlik Alanı (Logo Yuvası, Proje Adı, Geliştirici) */}
                <View style={[styles.cardBodyRow, isPhone && styles.cardBodyRowMobile]}>
                  <View style={[styles.logoWell, isPhone && styles.logoWellMobile]}>
                    {project.logoUrl ? (
                      <AutoTransparentLogo
                        src={project.logoUrl}
                        alt={`${project.title} logosu`}
                        style={isPhone ? styles.logoImageMobile : styles.logoImage}
                      />
                    ) : (
                      <Text style={styles.logoFallback}>
                        {project.title.slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.projectTitle, isPhone && styles.projectTitleMobile]} numberOfLines={1}>
                      {project.title}
                    </Text>
                    <View style={styles.makerRow}>
                      <Text style={styles.makerName} numberOfLines={1}>
                        {project.seller?.fullName || project.developerName || 'Bağımsız Geliştirici'}
                      </Text>
                      {project.seller?.isVerified ? (
                        <Ionicons name="checkmark-circle" size={13} color="#3269C7" style={styles.verifiedIcon} />
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* 3. Kısım: Açıklama / Tagline Metni */}
                <Text style={[styles.tagline, isPhone && styles.taglineMobile]} numberOfLines={2}>
                  {project.tagline || project.description || 'Açıklama belirtilmedi.'}
                </Text>

                {/* 4. Kısım: Alt Satır (Hafif çizgiyle ayrılmış Platform Etiketleri ve İncele Butonu) */}
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
                    size={36}
                    iconSize={16}
                    accessibilityLabel={`${project.title} detayına git`}
                  />
                </View>

                {/* Kıstas İnce Beyaz Işıklandırma Kenarlığı (Inner Rim) */}
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
        onOpenFaq={onOpenFaq}
        onOpenHowItWorks={onOpenHowItWorks}
        onOpenBlog={onOpenBlog}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NEO.surface,
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
    marginBottom: 20,
  },
  heroCopy: {
    flex: 1,
    marginLeft: 16,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  eyebrowCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5FA',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      web: {
        boxShadow: '-3px -3px 8px rgba(255,255,255,0.95), 3px 3px 9px rgba(130,146,168,0.18)',
      },
      default: {
        shadowColor: NEO.shadow,
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  eyebrowIconWell: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  eyebrowTitle: {
    ...theme.typography.kistas,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: NEO.ink,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EAF0F7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
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
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -1.1,
  },
  titleMobile: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  subtitle: {
    ...theme.typography.kistas,
    marginTop: 6,
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  subtitleMobile: {
    fontSize: 12,
    lineHeight: 17,
  },
  filterSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  platformInsetTrack: {
    backgroundColor: '#EAF0F7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18,
    padding: 5,
    ...Platform.select({
      web: {
        boxShadow: 'inset 2px 2px 6px rgba(130,146,168,0.15), inset -2px -2px 6px rgba(255,255,255,0.94)',
      },
    }),
  },
  platformScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  platformPillActive: {
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: NEO.border,
    ...Platform.select({
      web: {
        boxShadow: '-3px -3px 8px rgba(255,255,255,0.95), 3px 3px 8px rgba(130,146,168,0.18)',
      },
      default: {
        shadowColor: NEO.shadow,
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  platformPillPressed: {
    opacity: 0.8,
  },
  platformPillText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#65748A',
  },
  platformPillTextActive: {
    color: NEO.ink,
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
    color: '#65748A',
  },
  resetFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#EAF0F7',
  },
  resetFiltersText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3269C7',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'flex-start',
  },
  gridMobile: {
    gap: 16,
  },
  card: {
    minHeight: 206,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE7F2',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        background: 'linear-gradient(155deg, #FFFFFF 0%, #FAFCFE 55%, #F4F8FC 100%)' as any,
        boxShadow: '0 16px 36px -16px rgba(34,72,120,.14), 0 4px 12px -6px rgba(34,72,120,.08), inset 0 1px 0 rgba(255,255,255,0.95)',
      },
      default: {
        shadowColor: '#224878',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  cardMobile: {
    minHeight: 216,
    padding: 16,
    borderRadius: 22,
    marginBottom: 2,
  },
  cardWebAurora: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...Platform.select({
      web: {
        background: 'radial-gradient(circle at 8% 6%, rgba(73, 135, 223, 0.09) 0%, rgba(73, 135, 223, 0.02) 26%, transparent 48%), radial-gradient(circle at 94% 94%, rgba(35, 146, 132, 0.07) 0%, rgba(35, 146, 132, 0.02) 26%, transparent 48%)' as any,
        pointerEvents: 'none' as any,
      },
    }),
  },
  cardSpecularTop: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    height: 1,
    ...Platform.select({
      web: {
        background: 'linear-gradient(90deg, transparent, rgba(66, 126, 211, 0.35), transparent)' as any,
      },
      default: {
        backgroundColor: 'rgba(66, 126, 211, 0.30)',
      },
    }),
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topRankBadge: {
    minWidth: 32,
    height: 27,
    paddingHorizontal: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  topRankText: {
    ...theme.typography.kistas,
    fontSize: 12.5,
    fontWeight: '700',
  },
  rankBadgeInset: {
    minWidth: 32,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0F7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      web: {
        boxShadow: 'inset 1px 1px 3px rgba(130,146,168,0.14), inset -1px -1px 3px rgba(255,255,255,0.85)',
      },
    }),
  },
  rankNumberInset: {
    ...theme.typography.kistas,
    color: '#3269C7',
    fontSize: 11.5,
    fontWeight: '700',
  },
  freshnessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#EAF0F7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      web: {
        boxShadow: 'inset 1px 1px 3px rgba(130,146,168,0.12), inset -1px -1px 3px rgba(255,255,255,0.85)',
      },
    }),
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
    gap: 4,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 163, 54, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(15, 163, 54, 0.22)',
  },
  supportScoreText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0FA336',
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBodyRowMobile: {
    marginBottom: 10,
  },
  logoWell: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
  },
  logoWellMobile: {
    width: 46,
    height: 46,
  },
  logoImage: {
    width: 50,
    height: 50,
    ...Platform.select({
      web: {
        objectFit: 'contain' as any,
      },
    }),
  },
  logoImageMobile: {
    width: 44,
    height: 44,
    ...Platform.select({
      web: {
        objectFit: 'contain' as any,
      },
    }),
  },
  logoFallback: {
    ...theme.typography.kistas,
    fontSize: 16,
    fontWeight: '700',
    color: NEO.ink,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  projectTitle: {
    ...theme.typography.kistas,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: -0.15,
  },
  projectTitleMobile: {
    fontSize: 15,
    lineHeight: 20,
  },
  makerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  makerName: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  tagline: {
    ...theme.typography.kistas,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#5C6C84',
    marginBottom: 16,
  },
  taglineMobile: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 227, 242, 0.7)',
  },
  platformTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    flex: 1,
    marginRight: 10,
    overflow: 'hidden',
  },
  platformTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(69, 120, 190, 0.16)',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(42, 79, 130, 0.05)',
      },
    }),
  },
  platformTagText: {
    ...theme.typography.kistas,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#47658E',
  },
  cardInnerRim: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  stateCard: {
    minHeight: 220,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEO.surface,
    borderWidth: 1,
    borderColor: NEO.border,
    marginVertical: 20,
    ...Platform.select({
      web: {
        boxShadow: '-7px -7px 18px rgba(255,255,255,0.94), 8px 9px 22px rgba(130,146,168,0.22)',
      },
      default: {
        shadowColor: NEO.shadow,
        shadowOffset: { width: 7, height: 9 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 5,
      },
    }),
  },
  stateTitle: {
    ...theme.typography.kistas,
    marginTop: 12,
    color: NEO.ink,
    fontSize: 17,
    fontWeight: '700',
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
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#3269C7',
  },
  stateActionButtonText: {
    ...theme.typography.kistas,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
