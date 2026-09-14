import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { breakpoints, kistasStyle, theme } from '../../../core/theme';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { CategoryService } from '../../categories/application/CategoryService';
import { Category } from '../../categories/domain/Category';
import { ListingService } from '../application/ListingService';
import { Listing, PlatformType } from '../domain/Listing';

interface ShowcaseLeadersScreenProps {
  categoryId?: string | null;
  platform?: PlatformType | 'all';
  onBack: () => void;
  onSelectProject?: (project: Listing) => void;
}

const NEO = kistasStyle.neumorphism;
const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900';

const rankColors = (rank: number): [string, string] => {
  if (rank === 1) return ['#FFD76A', '#D99B19'];
  if (rank === 2) return ['#E8EEF6', '#98A8BC'];
  if (rank === 3) return ['#E9B17B', '#A8642E'];
  return ['#EAF2FF', '#3269C7'];
};

const platformLabel = (platform: PlatformType | 'all'): string =>
  platform === 'all' ? 'Tüm platformlar' : platform;

export const ShowcaseLeadersScreen: React.FC<ShowcaseLeadersScreenProps> = ({
  categoryId = null,
  platform = 'all',
  onBack,
  onSelectProject,
}) => {
  const { width } = useWindowDimensions();
  const [projects, setProjects] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [leaders, categoryItems] = await Promise.all([
        ListingService.getWeeklyShowcaseListings(null, true),
        CategoryService.getProjectCategories(),
      ]);
      setProjects(leaders);
      setCategories(categoryItems);
    } catch {
      setError('Vitrin liderleri şu anda yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const categoryName = useMemo(
    () => categories.find((category) => category.id === categoryId)?.name || 'Tüm kategoriler',
    [categories, categoryId],
  );

  const filteredProjects = useMemo(() => projects
    .map((project) => ({
      ...project,
      showcaseCategoryName: categories.find(
        (category) => category.id === project.showcaseCategoryId,
      )?.name || project.showcaseCategoryName,
    }))
    .filter((project) => !categoryId || project.showcaseCategoryId === categoryId)
    .filter((project) => platform === 'all' || project.platforms?.includes(platform)),
  [categories, categoryId, platform, projects]);

  const columnCount = width <= breakpoints.phoneMax ? 1 : width <= breakpoints.tabletMax ? 2 : 3;
  const horizontalPadding = width <= breakpoints.phoneMax ? 16 : 28;
  const contentWidth = Math.min(width, 1440) - (horizontalPadding * 2);
  const cardWidth = Math.max(280, (contentWidth - ((columnCount - 1) * 18)) / columnCount);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <KistasTopBrandBar onPress={onBack} style={styles.brandBar} />

      <View style={styles.heroRow}>
        <GlassIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Keşfet'e dön" />
        <View style={styles.heroCopy}>
          <Text style={styles.title}>Günün Vitrini</Text>
          <Text style={styles.subtitle}>Her kategorinin topluluk tarafından seçilen liderleri.</Text>
        </View>
      </View>

      <View style={styles.filterRow} accessibilityLabel="Sabit vitrin filtreleri">
        <View style={styles.filterChip}>
          <Ionicons name="grid-outline" size={15} color="#3269C7" />
          <Text style={styles.filterText}>{categoryName}</Text>
          <Ionicons name="lock-closed-outline" size={12} color="#8292A8" />
        </View>
        <View style={styles.filterChip}>
          <Ionicons name="phone-portrait-outline" size={15} color="#3269C7" />
          <Text style={styles.filterText}>{platformLabel(platform)}</Text>
          <Ionicons name="lock-closed-outline" size={12} color="#8292A8" />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color="#3269C7" />
          <Text style={styles.stateText}>Liderler hazırlanıyor…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <GlassIconButton icon="refresh" onPress={() => void load()} accessibilityLabel="Tekrar dene" />
          <Text style={styles.stateTitle}>Vitrine ulaşamadık</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : filteredProjects.length === 0 ? (
        <View style={styles.stateCard}>
          <GlassIconButton icon="trophy-outline" accessibilityLabel="Henüz lider yok" />
          <Text style={styles.stateTitle}>Bu filtrede lider henüz belli değil</Text>
          <Text style={styles.stateText}>En az bir doğrulanmış destek alan kategori lideri burada yerini alacak.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredProjects.map((project) => {
            const rank = project.showcaseGlobalRank || 0;
            const colors = rankColors(rank);
            const cover = project.coverImageUrl || project.logoUrl || IMAGE_FALLBACK;
            return (
              <Pressable
                key={project.id}
                onPress={() => onSelectProject?.(project)}
                accessibilityRole="button"
                accessibilityLabel={`${rank}. sıradaki ${project.title} projesini aç`}
                style={({ pressed }) => [
                  styles.card,
                  { width: cardWidth },
                  pressed && styles.cardPressed,
                ]}
              >
                <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
                <LinearGradient
                  colors={['rgba(241,245,250,0.02)', 'rgba(241,245,250,0.2)', '#F1F5FA']}
                  locations={[0.38, 0.64, 0.9]}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient colors={colors} style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>{rank}</Text>
                </LinearGradient>
                <View style={styles.categoryBadge}>
                  <Ionicons name="trophy-outline" size={12} color="#3269C7" />
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {(project.showcaseCategoryName || 'KATEGORİ').toLocaleUpperCase('tr-TR')} LİDERİ
                  </Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.statement} numberOfLines={2}>
                    {project.tagline || project.description}
                  </Text>
                  <BlurView intensity={Platform.OS === 'web' ? 72 : 58} tint="light" style={styles.glassDock}>
                    <View style={styles.logoWell}>
                      {project.logoUrl ? (
                        <AutoTransparentLogo src={project.logoUrl} alt={`${project.title} logosu`} style={styles.logo} />
                      ) : (
                        <Text style={styles.logoFallback}>{project.title.slice(0, 2).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={styles.projectCopy}>
                      <Text style={styles.projectTitle} numberOfLines={1}>{project.title}</Text>
                      <Text style={styles.maker} numberOfLines={1}>{project.seller?.fullName || 'Bağımsız geliştirici'}</Text>
                      <Text style={styles.support}>{project.weeklySupportCount || 0} haftalık destek</Text>
                    </View>
                    <GlassIconButton icon="arrow-forward" size={38} iconSize={17} accessibilityLabel={`${project.title} detayına git`} />
                  </BlurView>
                </View>
                <View pointerEvents="none" style={styles.innerRim} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingTop: 12, paddingBottom: 72 },
  brandBar: { paddingHorizontal: 0 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginBottom: 18 },
  heroCopy: { flex: 1, marginLeft: 16 },
  title: { ...theme.typography.kistas, marginTop: 4, color: NEO.ink, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1 },
  subtitle: { ...theme.typography.kistas, marginTop: 5, color: '#64748B', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  filterChip: { minHeight: 38, paddingHorizontal: 13, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F7FAFF', borderWidth: 1, borderColor: 'rgba(50,105,199,0.2)', shadowColor: NEO.shadow, shadowOffset: { width: 4, height: 5 }, shadowOpacity: 0.14, shadowRadius: 9, elevation: 2 },
  filterText: { ...theme.typography.kistas, color: NEO.ink, fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  card: { height: 448, borderRadius: 27, overflow: 'hidden', backgroundColor: NEO.surface, borderWidth: 1, borderColor: 'rgba(50,105,199,0.28)', shadowColor: NEO.shadow, shadowOffset: { width: 9, height: 12 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 7 },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.992 }] },
  cover: { width: '100%', height: '100%' },
  rankBadge: { position: 'absolute', top: 15, left: 15, width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)' },
  rankNumber: { ...theme.typography.kistas, color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  categoryBadge: { position: 'absolute', top: 20, left: 72, right: 15, minHeight: 34, paddingHorizontal: 11, borderRadius: 999, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,250,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  categoryText: { ...theme.typography.kistas, flex: 1, marginLeft: 5, color: NEO.ink, fontSize: 9, fontWeight: '800', letterSpacing: 0.65 },
  cardContent: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  statement: { ...theme.typography.kistas, marginBottom: 13, color: NEO.ink, fontSize: 23, lineHeight: 27, fontWeight: '800', letterSpacing: -0.55, textShadowColor: 'rgba(255,255,255,0.86)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  glassDock: { minHeight: 78, padding: 9, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,250,255,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  logoWell: { width: 58, height: 58, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.3)' },
  logo: { width: 54, height: 54 },
  logoFallback: { ...theme.typography.kistas, color: NEO.ink, fontSize: 18, fontWeight: '800' },
  projectCopy: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  projectTitle: { ...theme.typography.kistas, color: NEO.ink, fontSize: 16, fontWeight: '800' },
  maker: { ...theme.typography.kistas, marginTop: 2, color: '#64748B', fontSize: 10.5, fontWeight: '600' },
  support: { ...theme.typography.kistas, marginTop: 6, color: '#3269C7', fontSize: 9, fontWeight: '700' },
  innerRim: { position: 'absolute', top: 5, right: 5, bottom: 5, left: 5, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.56)' },
  stateCard: { minHeight: 190, padding: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: 'rgba(50,105,199,0.2)', shadowColor: NEO.shadow, shadowOffset: { width: 7, height: 9 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 4 },
  stateTitle: { ...theme.typography.kistas, marginTop: 12, color: NEO.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  stateText: { ...theme.typography.kistas, marginTop: 7, maxWidth: 440, color: '#64748B', fontSize: 11.5, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
});
