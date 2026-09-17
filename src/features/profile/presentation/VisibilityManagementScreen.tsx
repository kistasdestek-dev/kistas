import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useWallet, useWalletActions } from '../../../core/state';
import { Listing, isListingSponsored, isListingCategorySponsored, isListingGlobalSponsored } from '../../listings/domain/Listing';
import { ListingService } from '../../listings/application/ListingService';
import { BoostPackage, BoostScope, CreditService } from '../../credits/application/CreditService';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { BorderBeam } from '../../../shared/components/BorderBeam';
import { kistasStyle } from '../../../core/theme';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';

interface VisibilityManagementScreenProps {
  initialListingId?: string | null;
  onBack: () => void;
  onOpenCreditStore: () => void;
}

const packageDuration = (hours: number) => hours === 24 ? '1 gün' : `${hours / 24} gün`;

const UI_FONT_FAMILY = Platform.select({
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  ios: 'System',
  android: 'sans-serif',
});

const packageHighlight = (hours: number) => {
  if (hours === 72) return 'En çok tercih edilen';
  if (hours === 168) return 'En avantajlı';
  return 'Hızlı başlangıç';
};

const formatExpiry = (value?: string | null): string => {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const VisibilityManagementScreen: React.FC<VisibilityManagementScreenProps> = ({
  initialListingId,
  onBack,
  onOpenCreditStore,
}) => {
  const { profile } = useAuth();
  const { credits, isUpdating } = useWallet();
  const { boostListingScoped, refreshCredits } = useWalletActions();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedScope, setSelectedScope] = useState<BoostScope>('category');
  const packages = useMemo(() => CreditService.getBoostPackages(selectedScope), [selectedScope]);
  const [selectedPackage, setSelectedPackage] = useState<BoostPackage>(CreditService.getCategoryBoostPackages()[0]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [spentCredits, setSpentCredits] = useState<number | null>(null);
  const initialSelectionHandledRef = useRef(false);

  const loadListings = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [userListings, visibilityCreditsSpent] = await Promise.all([
      ListingService.getUserListings(profile.id),
      CreditService.getVisibilityCreditsSpent().catch(() => null),
    ]);
    setListings(userListings);
    setSpentCredits(visibilityCreditsSpent);
    if (initialListingId && !initialSelectionHandledRef.current) {
      initialSelectionHandledRef.current = true;
      const initialListing = userListings.find((item) => item.id === initialListingId);
      if (initialListing?.status === 'active') {
        setSelectedListing(initialListing);
        setSelectedPackage(CreditService.getCategoryBoostPackages()[0]);
        setError('');
        void refreshCredits();
      }
    }
    setLoading(false);
  }, [initialListingId, profile?.id, refreshCredits]);

  useEffect(() => { loadListings(); }, [loadListings]);

  const activeListings = useMemo(() => listings.filter((item) => item.status === 'active'), [listings]);
  const sponsoredCount = useMemo(() => listings.filter((item) => isListingSponsored(item)).length, [listings]);
  const nextExpiry = useMemo(() => {
    const expiryDates = listings.flatMap((item) => [item.boostedUntil, item.categoryBoostedUntil])
      .filter((value): value is string => Boolean(value) && Date.parse(value as string) > Date.now())
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    return expiryDates[0] || null;
  }, [listings]);
  const hasEnoughCredits = credits >= selectedPackage.creditCost;

  const openManager = (listing: Listing, defaultScope: BoostScope = 'category') => {
    setSelectedListing(listing);
    setSelectedScope(defaultScope);
    setSelectedPackage(CreditService.getBoostPackages(defaultScope)[0]);
    setError('');
    void refreshCredits();
  };

  const changeScope = (scope: BoostScope) => {
    setSelectedScope(scope);
    setSelectedPackage(CreditService.getBoostPackages(scope)[0]);
    setError('');
  };

  const closeManager = () => {
    if (isUpdating) return;
    setSelectedListing(null);
    setError('');
  };

  const handleBoost = async () => {
    if (!selectedListing || isUpdating) return;
    const latestCredits = await refreshCredits();
    if (latestCredits < selectedPackage.creditCost) {
      setSelectedListing(null);
      onOpenCreditStore();
      return;
    }

    setError('');
    const result = await boostListingScoped(
      selectedListing.id,
      selectedScope,
      selectedPackage.durationHours,
      selectedPackage.creditCost
    );
    if (!result.success) {
      setError(result.error || 'Sponsor işlemi tamamlanamadı.');
      return;
    }

    const scopeLabel = selectedScope === 'global' ? 'Genel Keşfet Vitrini' : 'Kategori Vitrini';
    setSelectedListing(null);
    setSuccessMessage(`“${selectedListing.title}” için ${scopeLabel} (${packageDuration(selectedPackage.durationHours)}) sponsorluğu etkinleştirildi.`);
    await loadListings();
  };

  return (
    <View style={styles.root}>
      <ScrollView decelerationRate={0.99} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <GlassIconButton icon="chevron-back" size={43} iconSize={21} onPress={onBack} accessibilityLabel="Profile dön" />
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Vitrin Yönetimi</Text>
          </View>
        </View>

        <LinearGradient colors={['#173866', '#285EA5', '#397FC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
          <View pointerEvents="none" style={styles.summaryGlowLarge} />
          <View pointerEvents="none" style={styles.summaryGlowSmall} />
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Projelerini daha görünür yap.</Text>
              <Text style={styles.summaryDescription}>Kredilerini kullanarak doğru kullanıcıların karşısına daha sık çık.</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balance}>{credits.toLocaleString('tr-TR')}</Text>
                <Text style={styles.balanceUnit}>kredi</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.storeButton} onPress={onOpenCreditStore} activeOpacity={0.76}>
              <Text style={styles.storeButtonText}>Kredi Mağazası</Text>
              <Ionicons name="arrow-forward" size={16} color="#285EA5" />
            </TouchableOpacity>
          </View>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <GlassIconButton icon="rocket-outline" size={31} iconSize={15} />
              <View style={styles.metricCopy}><Text style={styles.metricValue}>{activeListings.length}</Text><Text style={styles.metricLabel} numberOfLines={2}>Yayındaki proje</Text></View>
            </View>
            <View style={styles.metric}>
              <GlassIconButton icon="sparkles-outline" size={31} iconSize={15} />
              <View style={styles.metricCopy}><Text style={styles.metricValue}>{sponsoredCount}</Text><Text style={styles.metricLabel} numberOfLines={2}>Öne çıkan proje</Text></View>
            </View>
            <View style={styles.metric}>
              <GlassIconButton icon="analytics-outline" size={31} iconSize={15} />
              <View style={styles.metricCopy}><Text style={styles.metricValue}>{spentCredits === null ? '—' : spentCredits.toLocaleString('tr-TR')}</Text><Text style={styles.metricLabel} numberOfLines={2}>Harcanan kredi</Text></View>
            </View>
          </View>
          {nextExpiry ? (
            <View style={styles.expirySummary}>
              <GlassIconButton icon="time-outline" size={29} iconSize={14} />
              <Text style={styles.expirySummaryText}>En yakın vitrin bitişi: <Text style={styles.expirySummaryStrong}>{formatExpiry(nextExpiry)}</Text></Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>PROJELERİN</Text>
            <Text style={styles.sectionTitle}>Görünürlüğü yönet</Text>
            <Text style={styles.sectionDescription}>Öne çıkarmak veya süresini uzatmak istediğin projeyi seç.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color="#3269C7" /><Text style={styles.loadingText}>Projeler hazırlanıyor</Text></View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyBox}><Ionicons name="rocket-outline" size={28} color="#3269C7" /><Text style={styles.emptyTitle}>Henüz yönetilecek proje yok</Text><Text style={styles.emptyText}>Lansmanın onaylandığında görünürlük ayarlarını burada yönetebilirsin.</Text></View>
        ) : listings.map((listing) => {
          const active = listing.status === 'active';
          const globalSponsored = isListingGlobalSponsored(listing);
          const categorySponsored = isListingCategorySponsored(listing);
          const anySponsored = globalSponsored || categorySponsored;
          return (
            <View key={listing.id} style={[styles.projectCard, anySponsored && styles.projectCardSponsored]}>
              <View style={styles.projectHeader}>
                {listing.logoUrl ? <AutoTransparentLogo src={listing.logoUrl} style={styles.projectLogo} /> : <View style={styles.projectLogoFallback}><Text style={styles.projectLogoText}>{listing.title.slice(0, 2).toUpperCase()}</Text></View>}
                <View style={styles.projectCopy}>
                  <Text style={styles.projectTitle} numberOfLines={1}>{listing.title}</Text>
                  <Text style={styles.projectTagline} numberOfLines={1}>{listing.tagline || 'Dijital proje'}</Text>
                </View>
                <View style={[styles.statusBadge, anySponsored ? styles.statusBadgeSponsored : active ? styles.statusBadgeActive : styles.statusBadgePending]}>
                  <Text style={[styles.statusText, anySponsored ? styles.statusTextSponsored : active ? styles.statusTextActive : styles.statusTextPending]}>{anySponsored ? 'Sponsorlu' : active ? 'Yayında' : 'İncelemede'}</Text>
                </View>
              </View>

              {active && !anySponsored ? (
                <View style={styles.projectOpportunity}>
                  <View style={styles.projectOpportunityIcon}><Ionicons name="trending-up" size={15} color="#285EA5" /></View>
                  <Text style={styles.projectOpportunityText}>Kategori vitrini veya Genel Keşfet ile daha fazla kullanıcıya ulaş.</Text>
                </View>
              ) : null}

              {globalSponsored ? (
                <View style={styles.sponsorInfo}>
                  <GlassIconButton icon="compass" size={30} iconSize={15} />
                  <View style={{ flex: 1 }}><Text style={styles.sponsorInfoLabel}>Genel Keşfet Vitrini Aktif (Amiral Gemisi)</Text><Text style={styles.sponsorInfoValue}>{formatExpiry(listing.boostedUntil)} tarihine kadar</Text></View>
                </View>
              ) : null}

              {categorySponsored ? (
                <View style={[styles.sponsorInfo, { marginTop: globalSponsored ? 6 : 12, backgroundColor: kistasStyle.neumorphism.category }]}>
                  <GlassIconButton icon="grid" iconColor="#187657" size={30} iconSize={15} />
                  <View style={{ flex: 1 }}><Text style={[styles.sponsorInfoLabel, { color: '#187657' }]}>Kategori Vitrini Aktif ({listing.showcaseCategoryName || 'Kategori'})</Text><Text style={styles.sponsorInfoValue}>{formatExpiry(listing.categoryBoostedUntil)} tarihine kadar</Text></View>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.manageButton, !active && styles.manageButtonDisabled]}
                disabled={!active}
                onPress={() => openManager(listing, 'category')}
                activeOpacity={0.76}
              >
                <Text style={[styles.manageButtonText, !active && styles.manageButtonTextDisabled]}>{active ? (anySponsored ? 'Görünürlüğü Uzat' : 'Vitrinde Öne Çıkar') : 'Onay sonrası kullanılabilir'}</Text>
                {active ? <Ionicons name="arrow-forward" size={16} color="#FFFFFF" /> : null}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={Boolean(selectedListing)} transparent animationType="fade" onRequestClose={closeManager}>
        <View style={styles.modalBackdrop}>
          <View style={styles.packageModal}>
            <LinearGradient
              colors={selectedScope === 'global' ? ['#183B6B', '#3269C7'] : ['#cfeeff', '#a9dcf7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHero}
            >
              <View pointerEvents="none" style={styles.modalHeroGlow} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeroCopy}>
                  <Text style={[styles.modalEyebrow, selectedScope === 'category' && styles.modalEyebrowCategory]}>VİTRİNDE ÖNE ÇIKAR</Text>
                  <Text style={[styles.modalTitle, selectedScope === 'category' && styles.modalTitleCategory]}>{selectedListing?.title}</Text>
                  <Text style={[styles.modalSubtitle, selectedScope === 'category' && styles.modalSubtitleCategory]}>Doğru vitrini ve süreyi seçerek daha fazla kullanıcıya ulaş.</Text>
                </View>
                <GlassIconButton icon="close" size={38} iconSize={20} onPress={closeManager} disabled={isUpdating} accessibilityLabel="Pencereyi kapat" />
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionLabel}>GÖRÜNÜRLÜK ALANI</Text>
              <View style={styles.scopeSelector}>
              <TouchableOpacity
                style={[styles.scopeTab, selectedScope === 'category' && styles.scopeTabActive]}
                onPress={() => changeScope('category')}
                activeOpacity={0.8}
              >
                <GlassIconButton icon="grid-outline" size={32} iconSize={16} active={selectedScope === 'category'} />
                <View style={styles.scopeTabCopy}>
                  <Text style={[styles.scopeTabText, selectedScope === 'category' && styles.scopeTabTextActive]}>Kategori Vitrini</Text>
                  <Text style={styles.scopeTabSub}>İlgili kullanıcıları hedefle</Text>
                </View>
                {selectedScope === 'category' ? <Ionicons name="checkmark-circle" size={17} color="#3269C7" /> : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeTab, selectedScope === 'global' && styles.scopeTabActiveGlobal]}
                onPress={() => changeScope('global')}
                activeOpacity={0.8}
              >
                <GlassIconButton icon="compass-outline" size={32} iconSize={16} active={selectedScope === 'global'} />
                <View style={styles.scopeTabCopy}>
                  <Text style={[styles.scopeTabText, selectedScope === 'global' && styles.scopeTabTextActiveGlobal]}>Genel Keşfet</Text>
                  <Text style={styles.scopeTabSub}>Platform genelinde erişim</Text>
                </View>
                {selectedScope === 'global' ? <Ionicons name="checkmark-circle" size={17} color="#3269C7" /> : null}
              </TouchableOpacity>
              </View>

              <View style={styles.modalDescriptionCard}>
                <GlassIconButton icon={selectedScope === 'global' ? 'compass' : 'locate'} size={34} iconSize={17} active />
                <Text style={styles.modalDescription}>
                  {selectedScope === 'global'
                    ? 'Ana keşfet alanında dönüşümlü olarak görünür, platform genelindeki kullanıcılara ulaşırsın.'
                    : 'Projen kendi kategorisinde öne çıkar ve ilgili ürünleri arayan kullanıcılara doğrudan ulaşır.'}
                </Text>
              </View>

              <Text style={[styles.modalSectionLabel, styles.packageSectionLabel]}>SÜRE SEÇ</Text>
              <View style={styles.packageList}>
                {packages.map((item) => {
                  const selected = item.id === selectedPackage.id;
                  return (
                    <TouchableOpacity key={item.id} style={[styles.packageOption, selected && (selectedScope === 'global' ? styles.packageOptionSelected : styles.packageOptionSelectedCategory)]} onPress={() => setSelectedPackage(item)} activeOpacity={0.76}>
                      <View style={[styles.packageRadio, selected && styles.packageRadioSelectedGlobal]}>
                        {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                      </View>
                      <View style={styles.packageCopy}>
                        <View style={styles.packageTitleRow}>
                          <Text style={[styles.packageDuration, selected && styles.packageDurationSelected]}>{packageDuration(item.durationHours)}</Text>
                          <Text style={[styles.packageHighlight, item.durationHours === 72 && styles.packageHighlightPopular, item.durationHours === 168 && styles.packageHighlightValue]}>{packageHighlight(item.durationHours)}</Text>
                        </View>
                        <Text style={styles.packageCaption} numberOfLines={2}>{item.description}</Text>
                      </View>
                      <View style={[styles.packageCost, selected && styles.packageCostSelected]}>
                        <Text style={[styles.packageCostText, selected && (selectedScope === 'global' ? styles.packageCostTextSelected : styles.packageCostTextSelectedCategory)]}>{item.creditCost}</Text>
                        <Text style={styles.packageCostUnit}>kredi</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.balanceNotice}>
                <View><Text style={styles.balanceNoticeLabel}>Mevcut bakiye</Text><Text style={styles.balanceNoticeValue}>{credits.toLocaleString('tr-TR')} kredi</Text></View>
                <Ionicons name="arrow-forward" size={15} color="#8995A8" />
                <View style={styles.balanceAfter}><Text style={styles.balanceNoticeLabel}>İşlem sonrası</Text><Text style={styles.balanceNoticeValue}>{Math.max(credits - selectedPackage.creditCost, 0).toLocaleString('tr-TR')} kredi</Text></View>
              </View>
              {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
              <View style={styles.confirmBeamWrap}>
                <BorderBeam colorVariant="kistas" duration={8} size={180} borderWidth={1.6} borderRadius={14}>
                  <TouchableOpacity style={[styles.confirmButton, !hasEnoughCredits && styles.creditButton, selectedScope === 'category' && hasEnoughCredits && styles.confirmButtonCategory]} onPress={handleBoost} disabled={isUpdating} activeOpacity={0.78}>
                    {isUpdating ? <ActivityIndicator size="small" color={kistasStyle.neumorphism.ink} /> : null}
                    <Text style={styles.confirmButtonText}>{isUpdating ? 'İşleniyor' : hasEnoughCredits ? `Projeyi Öne Çıkar · ${selectedPackage.creditCost} Kredi` : 'Kredi Mağazasına Git'}</Text>
                  </TouchableOpacity>
                </BorderBeam>
              </View>
              <Text style={styles.confirmCaption}>{hasEnoughCredits ? 'Seçtiğin süre hemen başlar ve bakiyenden tek seferde düşülür.' : 'Devam etmek için kredi bakiyeni yükselt.'}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(successMessage)} transparent animationType="fade" onRequestClose={() => setSuccessMessage('')}>
        <View style={styles.modalBackdrop}>
          <BlurView intensity={36} tint="light" style={styles.successModal}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={27} color="#FAFBFD" /></View>
            <Text style={styles.successEyebrow}>İŞLEM BAŞARILI</Text>
            <Text style={styles.successTitle}>Vitrine eklendi</Text>
            <Text style={styles.successText}>{successMessage}</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => setSuccessMessage('')}><Text style={styles.successButtonText}>Tamam</Text></TouchableOpacity>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5FA' },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 58 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 19 },
  headerCopy: { flex: 1, marginLeft: 12 },
  title: { color: '#25364E', fontSize: 24, fontWeight: '700', letterSpacing: -0.35, marginTop: 2, fontFamily: UI_FONT_FAMILY },
  summary: { position: 'relative', overflow: 'hidden', borderRadius: 23, paddingHorizontal: 24, paddingTop: 23, paddingBottom: 20, borderWidth: 1, borderColor: '#295F9F', shadowColor: '#173866', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.17, shadowRadius: 24, elevation: 7 },
  summaryGlowLarge: { position: 'absolute', width: 280, height: 280, borderRadius: 140, right: -74, top: -166, backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  summaryGlowSmall: { position: 'absolute', width: 145, height: 145, borderRadius: 73, left: '43%', bottom: -112, backgroundColor: 'rgba(95,220,201,0.15)' },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.35, fontFamily: UI_FONT_FAMILY },
  summaryDescription: { maxWidth: 500, color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 16, marginTop: 4, fontFamily: UI_FONT_FAMILY },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17 },
  balance: { color: '#FFFFFF', fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.55, fontFamily: UI_FONT_FAMILY },
  balanceUnit: { color: 'rgba(255,255,255,0.63)', fontSize: 11, fontWeight: '600', fontFamily: UI_FONT_FAMILY },
  storeButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', shadowColor: '#102B51', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 3 },
  storeButtonText: { color: '#285EA5', fontSize: 10.5, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 20 },
  metric: { flex: 1, minWidth: 0, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  metricCopy: { flex: 1, minWidth: 0 },
  metricValue: { color: '#FFFFFF', fontSize: 16, lineHeight: 19, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  metricLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 8.5, lineHeight: 11, marginTop: 2, fontFamily: UI_FONT_FAMILY },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 31, marginBottom: 14 },
  sectionEyebrow: { color: '#6D84A6', fontSize: 9, fontWeight: '700', letterSpacing: 0.75, fontFamily: UI_FONT_FAMILY },
  sectionTitle: { color: '#25364E', fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginTop: 4, fontFamily: UI_FONT_FAMILY },
  sectionDescription: { color: '#748096', fontSize: 10.5, lineHeight: 15, marginTop: 4, fontFamily: UI_FONT_FAMILY },
  expirySummary: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  expirySummaryText: { flex: 1, color: 'rgba(255,255,255,0.68)', fontSize: 9.5, fontFamily: UI_FONT_FAMILY },
  expirySummaryStrong: { color: '#FFFFFF', fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  projectCard: { padding: 17, marginBottom: 12, borderRadius: 18, backgroundColor: kistasStyle.neumorphism.surface, borderWidth: 1, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 6, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 5 },
  projectCardSponsored: { backgroundColor: '#F3F7FC', borderColor: kistasStyle.neumorphism.border, shadowOpacity: 0.2 },
  projectHeader: { flexDirection: 'row', alignItems: 'center' },
  projectLogo: { width: 54, height: 54, resizeMode: 'contain', backgroundColor: 'transparent' },
  projectLogoFallback: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#D5E1F3' },
  projectLogoText: { color: '#285EA5', fontSize: 13, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  projectCopy: { flex: 1, minWidth: 0, marginLeft: 13 },
  projectTitle: { color: '#25364E', fontSize: 15, fontWeight: '700', letterSpacing: -0.15, fontFamily: UI_FONT_FAMILY },
  projectTagline: { color: '#748096', fontSize: 10.5, marginTop: 3, fontFamily: UI_FONT_FAMILY },
  statusBadge: { marginLeft: 8, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  statusBadgeActive: { backgroundColor: 'rgba(24,118,87,0.09)', borderColor: 'rgba(24,118,87,0.22)' },
  statusBadgeSponsored: { backgroundColor: 'rgba(50,105,199,0.1)', borderColor: 'rgba(50,105,199,0.25)' },
  statusBadgePending: { backgroundColor: 'rgba(147,100,19,0.09)', borderColor: 'rgba(147,100,19,0.2)' },
  statusText: { fontSize: 9.5, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  statusTextActive: { color: '#187657' }, statusTextSponsored: { color: '#3269C7' }, statusTextPending: { color: '#936413' },
  sponsorInfo: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: '#EEF3F9', borderWidth: 1, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.1, shadowRadius: 7, elevation: 2 },
  sponsorInfoLabel: { color: '#25364E', fontSize: 10.5, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  sponsorInfoValue: { color: '#686474', fontSize: 9.5, marginTop: 2, fontFamily: UI_FONT_FAMILY },
  projectOpportunity: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#EEF3F9', borderWidth: 1, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.1, shadowRadius: 7, elevation: 2 },
  projectOpportunityIcon: { width: 29, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3EEFC' },
  projectOpportunityText: { flex: 1, color: '#60718A', fontSize: 10, lineHeight: 14.5, fontFamily: UI_FONT_FAMILY },
  manageButton: { minHeight: 46, marginTop: 13, paddingHorizontal: 14, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0FA336', borderWidth: 1, borderColor: '#12b33c', shadowColor: '#0FA336', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4 },
  manageButtonDisabled: { backgroundColor: '#F0F3F7', borderColor: '#E0E5EC', shadowOpacity: 0, elevation: 0 },
  manageButtonText: { flex: 1, color: '#FFFFFF', fontSize: 11.5, fontWeight: '700', textAlign: 'center', fontFamily: UI_FONT_FAMILY },
  manageButtonTextDisabled: { color: '#7A8799' },
  loadingBox: { alignItems: 'center', gap: 9, paddingVertical: 38 }, loadingText: { color: '#686474', fontSize: 11 },
  emptyBox: { alignItems: 'center', padding: 30, borderRadius: 9, backgroundColor: 'rgba(250,251,253,0.75)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.1)' },
  emptyTitle: { color: '#25364E', fontSize: 14, fontWeight: '700', marginTop: 10 }, emptyText: { color: '#686474', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(25,35,52,0.46)' },
  packageModal: { width: '100%', maxWidth: 480, maxHeight: '94%', overflow: 'hidden', borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.74)', shadowColor: '#15243A', shadowOffset: { width: 0, height: 22 }, shadowOpacity: 0.24, shadowRadius: 42, elevation: 24 },
  modalHero: { overflow: 'hidden', paddingHorizontal: 21, paddingTop: 20, paddingBottom: 21 },
  modalHeroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -62, top: -108, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  modalBodyScroll: { flexShrink: 1 },
  modalBody: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeroCopy: { flex: 1, minWidth: 0, paddingRight: 14 },
  modalEyebrow: { color: 'rgba(255,255,255,0.68)', fontSize: 9, fontWeight: '700', letterSpacing: 0.75, fontFamily: UI_FONT_FAMILY },
  modalEyebrowCategory: { color: '#56728D' },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.35, marginTop: 5, fontFamily: UI_FONT_FAMILY },
  modalTitleCategory: { color: '#173866' },
  modalSubtitle: { maxWidth: 335, color: 'rgba(255,255,255,0.72)', fontSize: 11, lineHeight: 16, marginTop: 5, fontFamily: UI_FONT_FAMILY },
  modalSubtitleCategory: { color: '#52718D' },
  modalSectionLabel: { color: '#71819A', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.7, fontFamily: UI_FONT_FAMILY },
  modalDescriptionCard: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, backgroundColor: '#F5F8FC', borderWidth: 1, borderColor: '#E2E8F1' },
  modalDescription: { flex: 1, color: '#5E6C80', fontSize: 10.5, lineHeight: 15.5, fontFamily: UI_FONT_FAMILY },
  packageSectionLabel: { marginTop: 17 },
  packageList: { gap: 9, marginTop: 9 },
  packageOption: { minHeight: 76, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: kistasStyle.neumorphism.surface, borderWidth: 1, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 3 },
  packageOptionSelected: { backgroundColor: kistasStyle.neumorphism.global, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.17, shadowRadius: 10, elevation: 4 },
  packageRadio: { width: 22, height: 22, flexShrink: 0, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#C8D1DD' },
  packageRadioSelectedGlobal: { backgroundColor: '#3269C7', borderColor: '#3269C7' },
  packageCopy: { flex: 1, minWidth: 0, marginLeft: 10, marginRight: 8 },
  packageTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  packageDuration: { color: '#25364E', fontSize: 14, fontWeight: '700', letterSpacing: -0.15, fontFamily: UI_FONT_FAMILY },
  packageDurationSelected: { color: '#25364E' },
  packageHighlight: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', color: '#69758A', backgroundColor: '#EEF1F5', fontSize: 7.5, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  packageHighlightPopular: { color: '#8A5C0E', backgroundColor: '#FFF2CF' },
  packageHighlightValue: { color: '#18705A', backgroundColor: '#E3F4ED' },
  packageCaption: { color: '#6E7A8D', fontSize: 9.5, lineHeight: 13.5, marginTop: 4, fontFamily: UI_FONT_FAMILY },
  packageCost: { minWidth: 72, minHeight: 42, paddingHorizontal: 8, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#EEF3F9', borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#8A99AC', shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.12, shadowRadius: 7, elevation: 2 },
  packageCostSelected: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7E1EE' },
  packageCostText: { color: '#4B576A', fontSize: 14, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  packageCostUnit: { color: '#8994A5', fontSize: 7.5, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  packageCostTextSelected: { color: '#3269C7' },
  balanceNotice: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, backgroundColor: '#F6F8FB', borderWidth: 1, borderColor: '#E3E8EF' },
  balanceAfter: { alignItems: 'flex-end' },
  balanceNoticeLabel: { color: '#7B8799', fontSize: 8.5, fontWeight: '600', fontFamily: UI_FONT_FAMILY },
  balanceNoticeValue: { color: '#25364E', fontSize: 11.5, fontWeight: '700', marginTop: 3, fontFamily: UI_FONT_FAMILY },
  errorText: { color: '#a06969', fontSize: 10.5, lineHeight: 15, marginTop: 10 },
  scopeSelector: { flexDirection: 'row', gap: 9, marginTop: 9 },
  scopeTab: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9, paddingVertical: 9, borderRadius: 13, backgroundColor: kistasStyle.neumorphism.surface, borderWidth: 1, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
  scopeTabCopy: { flex: 1, minWidth: 0 },
  scopeTabActive: { backgroundColor: kistasStyle.neumorphism.category, borderColor: kistasStyle.neumorphism.border },
  scopeTabActiveGlobal: { backgroundColor: kistasStyle.neumorphism.global, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.17, shadowRadius: 10, elevation: 4 },
  scopeTabText: { color: '#596578', fontSize: 10.5, lineHeight: 14, fontWeight: '700', fontFamily: UI_FONT_FAMILY },
  scopeTabTextActive: { color: '#285EA5' },
  scopeTabTextActiveGlobal: { color: '#3269C7' },
  scopeTabSub: { color: '#7E899A', fontSize: 8, lineHeight: 11, marginTop: 2, fontFamily: UI_FONT_FAMILY },
  packageOptionSelectedCategory: { backgroundColor: kistasStyle.neumorphism.category, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.17, shadowRadius: 10, elevation: 4 },
  packageCostTextSelectedCategory: { color: '#285EA5' },
  confirmBeamWrap: { marginTop: 12, borderRadius: 14, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: 5, height: 7 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
  confirmButton: { minHeight: 50, paddingHorizontal: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: kistasStyle.neumorphism.global, borderWidth: 1, borderColor: kistasStyle.neumorphism.border, shadowColor: kistasStyle.neumorphism.shadow, shadowOffset: { width: -2, height: -2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  confirmButtonCategory: { backgroundColor: kistasStyle.neumorphism.category },
  creditButton: { backgroundColor: kistasStyle.neumorphism.global },
  confirmButtonText: { flex: 1, color: kistasStyle.neumorphism.ink, fontSize: 12, fontWeight: '700', textAlign: 'center', fontFamily: UI_FONT_FAMILY },
  confirmCaption: { color: '#8A95A5', fontSize: 8.5, lineHeight: 12.5, textAlign: 'center', marginTop: 8, fontFamily: UI_FONT_FAMILY },
  successModal: { width: '100%', maxWidth: 370, alignItems: 'center', overflow: 'hidden', padding: 24, borderRadius: 12, backgroundColor: 'rgba(250,251,253,0.8)', borderWidth: 1, borderColor: 'rgba(24,118,87,0.34)' },
  successIcon: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#187657' },
  successEyebrow: { color: '#187657', fontSize: 8.5, fontWeight: '700', marginTop: 14 }, successTitle: { color: '#25364E', fontSize: 20, fontWeight: '700', marginTop: 5 }, successText: { color: '#686474', fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  successButton: { width: '100%', minHeight: 43, alignItems: 'center', justifyContent: 'center', marginTop: 19, borderRadius: 8, backgroundColor: 'rgba(24,118,87,0.14)', borderWidth: 1, borderColor: 'rgba(24,118,87,0.28)' }, successButtonText: { color: '#25364E', fontSize: 11.5, fontWeight: '700' },
});
