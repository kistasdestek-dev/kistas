import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { isListingSponsored, Listing, PlatformType, PricingModel } from '../domain/Listing';
import { ListingService } from '../application/ListingService';
import { CategoryService } from '../../categories/application/CategoryService';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { BorderBeam } from '../../../shared/components/BorderBeam';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { UserProfile } from '../../auth/domain/User';
import { openSafeExternalUrl } from '../../../core/security/ExternalUrl';
import { DescriptionRichText } from './DescriptionRichText';
import { ProjectScreenshotsGallery } from './ProjectScreenshotsGallery';
import { ProjectCommentsSection } from './ProjectCommentsSection';
import { theme } from '../../../core/theme';
import { trackEvent } from '../../../core/analytics/analytics';

const APP_STORE_BADGE = require('../../../../assets/store-badges/app-store.png');
const GOOGLE_PLAY_BADGE = require('../../../../assets/store-badges/google-play.png');
const KISTAS_BADGE_LOGO = require('../../../../assets/kistas-logo-transparent.png');

export interface ProjectDetailScreenProps {
  project: Listing;
  onBack: () => void;
  onOpenChat?: (makerId: string, projectTitle: string) => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
  currentUser?: UserProfile | null;
  onRequireAuth?: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const getPlatformIonicon = (plt: PlatformType): IoniconName => {
  switch (plt) {
    case 'iOS':
      return 'logo-apple';
    case 'Android':
      return 'logo-android';
    case 'Web':
      return 'globe-outline';
    case 'macOS':
      return 'desktop-outline';
    case 'SaaS':
      return 'cloud-outline';
    default:
      return 'apps-outline';
  }
};

const formatPricingModel = (model?: PricingModel): string => {
  switch (model) {
    case 'free':
      return 'Ücretsiz';
    case 'paid':
      return 'Ücretli';
    case 'subscription':
      return 'Abonelik';
    case 'freemium':
    default:
      return 'Freemium';
  }
};

const getCleanDeveloperName = (fullName?: string): string => {
  if (!fullName) return 'Geliştirici';
  return fullName.replace(/\s*\([^)]*\)/g, '').trim();
};

export const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({
  project,
  onBack,
  onOpenChat,
  onOpenAbout,
  onOpenPrivacy,
  onOpenFaq,
  onOpenHowItWorks,
  onOpenBlog,
  currentUser,
  onRequireAuth,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Açıklama alanı genişletme/daraltma
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);

  // İyimser Upvote Durumu
  const [upvotesCount, setUpvotesCount] = useState<number>(project.upvotesCount || 0);
  const [viewCount, setViewCount] = useState<number>(project.viewCount || 0);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(!!project.hasUpvoted);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const isSupportLocked = isListingSponsored(project);

  const detailScrollRef = useRef<ScrollView>(null);
  const storeActionsOffsetRef = useRef(0);

  // Görüntülenme Sayısını Artırma (Sessizce ve Güvenli)
  useEffect(() => {
    let isMounted = true;
    void ListingService.recordView(project.id).then((nextViewCount) => {
      if (isMounted && nextViewCount !== null) {
        setViewCount(nextViewCount);
      }
    }).catch(() => {
      // Sessiz başarısızlık: Arayüz akışı bozulmaz
    });
    return () => {
      isMounted = false;
    };
  }, [project.id]);

  // Kategori Adını Çözümleme
  const categoryName = useMemo(() => {
    if (!project.categoryId) return null;
    const defaultCats = CategoryService.getDefaultCategories();
    const found = defaultCats.find((c) => c.id === project.categoryId);
    return found ? found.name : null;
  }, [project.categoryId]);

  // Akıllı URL Çözümleme
  const primaryUrl = useMemo(() => {
    if (Platform.OS === 'ios') {
      return project.appStoreUrl || project.webUrl || project.playStoreUrl;
    }
    if (Platform.OS === 'android') {
      return project.playStoreUrl || project.webUrl || project.appStoreUrl;
    }
    return project.webUrl || project.appStoreUrl || project.playStoreUrl;
  }, [project]);

  const descriptionContent = useMemo(() => (
    project.description || project.tagline || 'Bu proje için henüz detaylı bir açıklama eklenmedi.'
  ).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), [project.description, project.tagline]);

  // Harici Bağlantı Açma (SEC-036 Güvenli Yönlendirme)
  const handleOpenUrl = useCallback((url?: string) => {
    if (!url) {
      Alert.alert('Bilgi', 'Bu bağlantı henüz tanımlanmamış.');
      return;
    }

    void openSafeExternalUrl(url).then((opened) => {
      if (!opened) {
        Alert.alert('Güvenli Olmayan veya Açılamayan Bağlantı', 'Yalnızca geçerli HTTPS bağlantıları güvenli sekmede açılabilir.');
      }
    });
  }, []);

  // Promosyon Kodu Açma
  const handlePromoAction = useCallback(() => {
    if (!project.promoCode) return;
    Alert.alert(
      'Promosyon Kodu',
      `Kıstas topluluğuna özel indirim kodu:\n\n"${project.promoCode}"\n\nKodu kullanarak projeyi mağazada veya web sitesinde açmak ister misiniz?`,
      [
        { text: 'Kapat', style: 'cancel' },
        {
          text: 'Projeyi Aç',
          onPress: () => handleOpenUrl(primaryUrl),
        },
      ]
    );
  }, [project.promoCode, primaryUrl, handleOpenUrl]);

  // Upvote / Destekleme İşlemi (Kalıcı Destek Kalkanı: Destek geri alınamaz)
  const handleToggleUpvote = useCallback(async () => {
    if (isVoting) return;
    if (hasUpvoted) {
      Alert.alert('Bilgi', 'Bu projeyi zaten desteklediniz. Kıstas kuralları gereği destek geri alınamaz.');
      return;
    }
    if (isSupportLocked) {
      Alert.alert('Destek Kapalı', 'Sponsorlu projeler destek oyu alamaz.');
      return;
    }

    const prevCount = upvotesCount;

    setIsVoting(true);
    setHasUpvoted(true);
    setUpvotesCount(prevCount + 1);

    try {
      const res = await ListingService.toggleUpvote(project.id);
      if (!res.success) {
        if (res.code === 'SUPPORT_ALREADY_GIVEN') {
          setHasUpvoted(true);
          if (res.upvotes_count !== undefined) {
            setUpvotesCount(Number(res.upvotes_count));
          }
          Alert.alert('Bilgi', 'Bu projeyi zaten desteklediniz. Kıstas kuralları gereği destek geri alınamaz.');
        } else {
          setHasUpvoted(false);
          setUpvotesCount(prevCount);
          Alert.alert('Hata', res.error || 'Destek oyu verilemedi.');
        }
      } else if (res.success && res.upvotes_count !== undefined) {
        setUpvotesCount(Number(res.upvotes_count));
        trackEvent('project_upvote', {
          project_id: project.id,
          project_title: project.title,
        });
      }
    } catch {
      setHasUpvoted(false);
      setUpvotesCount(prevCount);
      Alert.alert('Hata', 'Destek oyu verilemedi.');
    } finally {
      setIsVoting(false);
    }
  }, [isVoting, hasUpvoted, isSupportLocked, upvotesCount, project.id, project.title]);

  const isCompactHero = windowWidth <= 700;
  const initialLetter = (project.title || 'K').charAt(0).toUpperCase();
  const cleanMakerName = getCleanDeveloperName(project.developerName || project.seller?.fullName);
  const isMakerVerified = !project.isEditorial
    && Boolean(project.seller?.isVerified || project.status === 'active');
  const hasRatings =
    project.seller?.ratingCount && project.seller.ratingCount > 0;
  const hasStoreActions = Boolean(project.appStoreUrl || project.playStoreUrl || project.webUrl);

  const handleScrollToStoreActions = useCallback(() => {
    detailScrollRef.current?.scrollTo({
      y: Math.max(0, storeActionsOffsetRef.current - windowHeight * 0.4),
      animated: true,
    });
  }, [windowHeight]);

  const renderProjectAction = () => hasStoreActions ? (
    <GlassIconButton
      icon="download-outline"
      iconSize={24}
      size={46}
      onPress={handleScrollToStoreActions}
      accessibilityLabel="Bağlantılara git"
      accessibilityHint="Uygulama ve web bağlantılarına kaydırır"
    />
  ) : null;

  return (
    <View style={styles.rootContainer}>
      {/* Proje atmosferine gömülü sade geri dönüş kontrolü */}
      <View style={styles.stickyHeader} pointerEvents="box-none">
        <GlassIconButton
          icon="chevron-back"
          iconSize={20}
          size={38}
          onPress={onBack}
          accessibilityLabel="Keşfet ekranına dön"
        />
      </View>

      <ScrollView
        ref={detailScrollRef}
        style={styles.scrollArea}
        decelerationRate={0.99}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. APP STORE TARZI HERO ALANI */}
        <View style={[styles.heroSection, isCompactHero && styles.heroSectionCompact]}>
          {/* LOGO */}
          <View style={styles.heroLogoWrap}>
            {project.logoUrl ? (
              <AutoTransparentLogo
                src={project.logoUrl}
                style={styles.heroLogo}
                alt={`${project.title} uygulama logosu`}
              />
            ) : (
              <LinearGradient
                colors={['#EAF2FC', '#EAF2FC', '#3269C7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroLogoPlaceholder}
              >
                <View style={styles.logoSpecular} />
                <Text style={styles.heroLogoPlaceholderText}>{initialLetter}</Text>
              </LinearGradient>
            )}
          </View>

          {/* SAĞ BİLGİ ALANI */}
          <View
            style={[
              styles.heroInfoCol,
              !isCompactHero && styles.heroInfoColDesktop,
            ]}
          >
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {project.title}
              </Text>
            </View>

            {project.tagline ? (
              <Text style={styles.heroTagline} numberOfLines={2}>
                {project.tagline}
              </Text>
            ) : null}

            <View style={styles.heroDeveloperRow}>
              <Text style={styles.heroDeveloperName} numberOfLines={1}>
                {cleanMakerName}
              </Text>
              {isMakerVerified ? (
                <MaterialIcons
                  name="verified"
                  size={14}
                  color="#1D9BF0"
                  style={styles.verifiedIcon}
                />
              ) : null}
            </View>
          </View>
          <View
            style={isCompactHero ? styles.heroCompactAction : styles.heroDesktopAction}
          >
            {renderProjectAction()}
          </View>
        </View>

        {/* 4. APP STORE METADATA ŞERİDİ */}
        <View style={styles.metadataStrip}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.94)', 'rgba(239,245,242,0.90)', 'rgba(234,242,252,0.86)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metadataGradient}
          />
          <View style={styles.metadataHighlight} />
          <BorderBeam
            size={200}
            duration={12}
            delay={0}
            colorVariant="kistas"
            borderWidth={1.5}
            borderRadius={20}
          />
          {/* DESTEK */}
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>DESTEK</Text>
            <Text style={styles.metadataValue}>{upvotesCount}</Text>
          </View>

          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>GÖRÜNTÜLENME</Text>
            <Text style={styles.metadataValue}>{viewCount.toLocaleString('tr-TR')}</Text>
          </View>

          {/* PUAN VEYA YENİ GELİŞTİRİCİ */}
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>PUAN</Text>
            {hasRatings ? (
              <Text style={styles.metadataValue}>
                {(project.seller?.ratingAverage || 0).toFixed(1)}
              </Text>
            ) : (
              <Text style={styles.metadataValueNeutral}>Yeni</Text>
            )}
          </View>

          {/* PLATFORMLAR */}
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>PLATFORM</Text>
            <Text style={styles.metadataValueText} numberOfLines={1}>
              {project.platforms && project.platforms.length > 0
                ? project.platforms.join(' + ')
                : 'Dijital'}
            </Text>
          </View>

          {/* MODEL */}
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>MODEL</Text>
            <Text style={styles.metadataValueText} numberOfLines={1}>
              {formatPricingModel(project.pricingModel)}
            </Text>
          </View>
        </View>

        {/* 5. KISTAS DESTEKLEME AKSİYON BUTONU */}
        <View style={styles.supportSection}>
          <TouchableOpacity
            style={[
              styles.supportBtn,
              hasUpvoted ? styles.supportBtnActive : styles.supportBtnPassive,
              isSupportLocked && styles.supportBtnLocked,
            ]}
            onPress={handleToggleUpvote}
            activeOpacity={0.84}
            disabled={isVoting || isSupportLocked || hasUpvoted}
            accessibilityRole="button"
            accessibilityLabel={
              isSupportLocked
                ? 'Sponsorlu projede destek oyu kapalı'
                : hasUpvoted
                  ? `${project.title} projesini zaten desteklediniz`
                  : `${project.title} projesini destekle`
            }
            accessibilityHint={
              isSupportLocked
                ? 'Sponsorlu projeler destek oyu alamaz.'
                : hasUpvoted
                  ? 'Verilen destek geri alınamaz.'
                  : undefined
            }
            accessibilityState={{ selected: hasUpvoted, disabled: isSupportLocked || hasUpvoted }}
            {...(Platform.OS === 'web' && (isSupportLocked || hasUpvoted)
              ? ({ title: isSupportLocked ? 'Sponsorlu projeler destek oyu alamaz.' : 'Bu projeyi desteklediniz (Geri alınamaz).' } as object)
              : {})}
          >
            {!isSupportLocked ? (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={
                    hasUpvoted
                      ? ['#0c8a2d', '#0fa336']
                      : ['#12b33c', '#0fa336']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                />
                <View style={styles.buttonSpecular} />
              </>
            ) : (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={['#1c69d4', '#1557b0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                />
                <View style={styles.buttonSpecular} />
              </>
            )}
            {isSupportLocked ? (
              <>
                <Ionicons
                  name="lock-closed"
                  size={15}
                  color="#FFFFFF"
                  style={styles.supportIcon}
                />
                <Text style={[styles.supportBtnText, styles.supportBtnTextLocked]}>
                  Destek Oylamasına Kapalı
                </Text>
                <View style={[styles.supportCountBadge, styles.supportCountBadgeLocked]}>
                  <Text style={[styles.supportCountText, styles.supportCountTextLocked]}>
                    {upvotesCount}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color="#FFFFFF"
                  style={styles.supportIcon}
                />
                <Text
                  style={[
                    styles.supportBtnText,
                    hasUpvoted && styles.supportBtnTextActive,
                  ]}
                >
                  {hasUpvoted ? 'Desteklendi' : 'Bu Projeyi Destekle'}
                </Text>
                <View
                  style={[
                    styles.supportCountBadge,
                    hasUpvoted && styles.supportCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.supportCountText,
                      hasUpvoted && styles.supportCountTextActive,
                    ]}
                  >
                    {upvotesCount}
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {isSupportLocked ? (
            <View style={styles.supportLockedNotice}>
              <Text style={styles.supportLockedNoticeText}>
                Sponsorlu projeler destek oyu alamaz.
              </Text>
            </View>
          ) : null}
        </View>

        {/* 6. APP STORE TARZI EKRAN GÖRÜNTÜLERİ (ÖNİZLEME) */}
        <ProjectScreenshotsGallery
          projectTitle={project.title}
          images={project.images}
          coverImageUrl={project.coverImageUrl}
          windowWidth={windowWidth}
          windowHeight={windowHeight}
          isCompactHero={isCompactHero}
        />

        {/* 7. PROJE AÇIKLAMASI */}
        <View style={[
          styles.descriptionSection,
          isCompactHero && styles.descriptionSectionCompact,
        ]}>
          <Text style={styles.descriptionHeading}>Hakkında</Text>
          <DescriptionRichText
            content={descriptionContent}
            numberOfLines={isDescExpanded ? undefined : 4}
          />
          {descriptionContent.length > 180 ? (
            <TouchableOpacity
              onPress={() => setIsDescExpanded(!isDescExpanded)}
              style={styles.expandToggleBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isDescExpanded ? 'Daha az göster' : 'Daha fazla göster'}
            >
              <Text style={styles.expandToggleText}>
                {isDescExpanded ? 'Daha az' : 'Daha fazla'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* PROJE YORUMLARI VE GELİŞTİRİCİ YANITLARI */}
        <ProjectCommentsSection
          projectId={project.id}
          projectTitle={project.title}
          sellerId={project.sellerId}
          isEditorial={project.isEditorial}
          developerName={project.developerName}
          seller={project.seller}
          currentUser={currentUser}
          onRequireAuth={onRequireAuth}
        />

        {/* 8. PLATFORMLAR VE MODEL */}
        <View style={styles.platformsSection}>
          <Text style={styles.sectionHeading}>Platformlar ve Model</Text>
          <View style={styles.platformsWrapRow}>
            {project.platforms?.map((plt) => (
              <View key={plt} style={styles.platformPill}>
                <Ionicons
                  name={getPlatformIonicon(plt)}
                  size={14}
                  color="#25364E"
                  style={styles.pillIcon}
                />
                <Text style={styles.platformPillText}>{plt}</Text>
              </View>
            ))}

            <View style={styles.pricingPill}>
              <Ionicons
                name="pricetag-outline"
                size={13}
                color="#25364E"
                style={styles.pillIcon}
              />
              <Text style={styles.pricingPillText}>
                {formatPricingModel(project.pricingModel)}
              </Text>
            </View>

            {project.price && project.price > 0 ? (
              <View style={styles.pricingPill}>
                <Text style={styles.pricingPillText}>₺{project.price}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 9. PROMOSYON KODU */}
        {project.promoCode ? (
          <View style={styles.promoSection}>
            <View style={styles.promoCard}>
              <View style={styles.promoHeader}>
                <Ionicons
                  name="ticket-outline"
                  size={18}
                  color="#25364E"
                  style={styles.promoHeaderIcon}
                />
                <Text style={styles.promoTitle}>Kıstas topluluğuna özel</Text>
              </View>
              <Text style={styles.promoSub}>
                İndirim kodunu kullanarak projeyi avantajlı deneyimleyin:
              </Text>
              <View style={styles.promoCodeRow}>
                <View style={styles.promoBox}>
                  <Text style={styles.promoCodeText}>{project.promoCode}</Text>
                </View>
                <TouchableOpacity
                  style={styles.promoActionBtn}
                  onPress={handlePromoAction}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Promosyon kodunu kullan"
                >
                  <Text style={styles.promoActionBtnText}>Kodu Al</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {/* 10. GELİŞTİRİCİ KARTI */}
        <View style={styles.developerSection}>
          <Text style={styles.sectionHeading}>Geliştirici</Text>
          <View style={styles.developerCard}>
            <View style={styles.developerAvatarBox}>
              <ProfileAvatar
                avatarUrl={project.isEditorial ? project.logoUrl : project.seller?.avatarUrl}
                size={44}
                logoSize={37}
              />
            </View>

            <View style={styles.developerDetailsCol}>
              <View style={styles.developerNameRow}>
                <Text style={styles.developerCardName} numberOfLines={1}>
                  {cleanMakerName}
                </Text>
                {isMakerVerified ? (
                  <MaterialIcons
                    name="verified"
                    size={15}
                    color="#1D9BF0"
                    style={styles.verifiedIcon}
                  />
                ) : null}
              </View>

              {project.isEditorial ? (
                <View
                  style={styles.developerVerificationRow}
                  accessibilityLabel="Kıstas Doğrulanmış Geliştirici"
                >
                  <Text style={[styles.developerCardSub, styles.developerVerificationText]}>
                    Kıstas Doğrulanmış Geliştirici
                  </Text>
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color="#1D9BF0"
                    style={styles.verifiedIcon}
                  />
                </View>
              ) : (
                <Text style={styles.developerCardSub}>
                  {hasRatings
                    ? `${(project.seller?.ratingAverage || 0).toFixed(1)} Puan (${project.seller?.ratingCount} değerlendirme)`
                    : 'Kıstas Doğrulanmış Geliştirici'}
                </Text>
              )}
            </View>

            {onOpenChat && !project.isEditorial ? (
              <TouchableOpacity
                style={styles.messageMakerBtn}
                activeOpacity={0.8}
                onPress={() => onOpenChat(project.sellerId, project.title)}
                accessibilityRole="button"
                accessibilityLabel={`${cleanMakerName} ile sohbet et`}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={15}
                  color="#25364E"
                  style={styles.messageIcon}
                />
                <Text style={styles.messageMakerBtnText}>Mesaj Gönder</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 11. PROJE BİLGİLERİ */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionHeading}>Proje bilgileri</Text>
          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Geliştirici</Text>
              <Text style={styles.infoVal} numberOfLines={1}>
                {cleanMakerName}
              </Text>
            </View>

            {project.isEditorial ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Yayınlayan</Text>
                <Text style={styles.infoVal}>Kıstas Editör</Text>
              </View>
            ) : null}

            {categoryName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Kategori</Text>
                <Text style={styles.infoVal} numberOfLines={1}>
                  {categoryName}
                </Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Fiyatlandırma</Text>
              <Text style={styles.infoVal}>
                {formatPricingModel(project.pricingModel)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Platformlar</Text>
              <Text style={styles.infoVal} numberOfLines={1}>
                {project.platforms && project.platforms.length > 0
                  ? project.platforms.join(', ')
                  : 'Belirtilmemiş'}
              </Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoKey}>Son Güncelleme</Text>
              <Text style={styles.infoVal}>
                {new Date(project.updatedAt || project.createdAt).toLocaleDateString(
                  'tr-TR'
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* 12. HARİCİ MAĞAZA BAĞLANTILARI */}
        <View style={[
          styles.storeActionsSection,
          !isCompactHero && styles.storeActionsSectionDesktop,
        ]}
          onLayout={(event) => {
            storeActionsOffsetRef.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.storeButtonsCol}>
            {project.appStoreUrl ? (
              <TouchableOpacity
                style={styles.storeBadgeButton}
                activeOpacity={0.88}
                onPress={() => handleOpenUrl(project.appStoreUrl)}
                accessibilityRole="button"
                accessibilityLabel="App Store'da Aç"
              >
                <Image source={APP_STORE_BADGE} resizeMode="contain" style={styles.appStoreBadgeImage} />
              </TouchableOpacity>
            ) : null}

            {project.playStoreUrl ? (
              <TouchableOpacity
                style={styles.storeBadgeButton}
                activeOpacity={0.88}
                onPress={() => handleOpenUrl(project.playStoreUrl)}
                accessibilityRole="button"
                accessibilityLabel="Google Play'de Aç"
              >
                <Image source={GOOGLE_PLAY_BADGE} resizeMode="contain" style={styles.googlePlayBadgeImage} />
              </TouchableOpacity>
            ) : null}

            {project.webUrl ? (
              <TouchableOpacity
                style={styles.webSiteBtn}
                activeOpacity={0.88}
                onPress={() => handleOpenUrl(project.webUrl)}
                accessibilityRole="button"
                accessibilityLabel="Web Sitesini Aç"
              >
                <LinearGradient
                  colors={['#090A0E', '#151923']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.webSiteBtnSurface}
                >
                  <Image source={KISTAS_BADGE_LOGO} resizeMode="contain" style={styles.webSiteLogo} />
                  <View style={styles.webSiteCopy}>
                    <Text style={styles.webSiteEyebrow}>WEB'DE</Text>
                    <Text style={styles.webSiteBtnText}>GÖRÜNTÜLE</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 13. GÜVEN NOTU */}
        <View style={styles.trustRow}>
          <Text style={styles.trustText}>
            Kıstas, projeleri keşfetmenizi ve geliştiricilerle doğrudan iletişim
            kurmanızı sağlar.
          </Text>
        </View>
        <CinematicFooter compact onOpenAbout={onOpenAbout} onOpenHowItWorks={onOpenHowItWorks} onOpenPrivacy={onOpenPrivacy} onOpenFaq={onOpenFaq} onOpenBlog={onOpenBlog} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F1F5FA',
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 66,
    paddingBottom: 22,
    position: 'relative',
  },
  heroSectionCompact: {
    alignItems: 'center',
  },
  heroLogoWrap: {
    width: 88,
    height: 88,
    marginRight: 18,
    position: 'relative',
  },
  heroLogo: {
    width: '100%',
    height: '100%',
  },
  heroLogoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  logoSpecular: {
    position: 'absolute',
    top: 4,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.32)',
  },
  heroLogoPlaceholderText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#25364E',
  },
  heroInfoCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  heroInfoColDesktop: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 180,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: -0.4,
    lineHeight: 25,
  },
  heroTagline: {
    fontSize: 12.5,
    color: '#686474',
    lineHeight: 16.5,
    marginTop: 2,
  },
  heroDeveloperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 0,
  },
  heroDeveloperName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#25364E',
  },
  verifiedIcon: {
    marginLeft: 3,
  },
  heroDesktopAction: {
    alignSelf: 'center',
    marginLeft: 8,
  },
  heroCompactAction: {
    flexShrink: 0,
    justifyContent: 'center',
    marginLeft: 10,
  },
  metadataStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF3F7',
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    paddingVertical: 8,
    paddingHorizontal: 7,
    marginTop: 4,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#8292A8',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: '-5px -5px 13px rgba(255,255,255,0.84), 6px 8px 18px rgba(130,146,168,0.14)',
      },
    }),
  },
  metadataGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  metadataHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(50,105,199,0.16)',
  },
  metadataItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    ...Platform.select({
      web: {
        boxShadow: 'inset 2px 2px 5px rgba(130,146,168,0.08), inset -2px -2px 5px rgba(255,255,255,0.72)',
      },
    }),
  },
  metadataLabel: {
    ...theme.typography.kistas,
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.65,
    marginBottom: 4,
  },
  metadataValue: {
    ...theme.typography.kistas,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    color: '#25364E',
  },
  metadataValueText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '700',
    color: '#25364E',
  },
  metadataValueNeutral: {
    ...theme.typography.kistas,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#394D45',
  },
  supportSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  supportBtnPassive: {
    backgroundColor: '#0fa336',
    borderWidth: 1,
    borderColor: 'rgba(15, 163, 54, 0.4)',
    boxShadow: '0 4px 14px rgba(15, 163, 54, 0.28)' as any,
  },
  supportBtnActive: {
    backgroundColor: '#0c8a2d',
    borderWidth: 1,
    borderColor: 'rgba(12, 138, 45, 0.5)',
    boxShadow: '0 4px 16px rgba(15, 163, 54, 0.36)' as any,
  },
  supportBtnLocked: {
    backgroundColor: '#1c69d4',
    borderWidth: 1,
    borderColor: 'rgba(28, 105, 212, 0.35)',
    boxShadow: '0 4px 14px rgba(28, 105, 212, 0.22)' as any,
  },
  buttonGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
  buttonSpecular: {
    position: 'absolute',
    top: 1,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  supportIcon: {
    marginRight: 8,
  },
  supportBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  supportBtnTextActive: {
    color: '#FFFFFF',
  },
  supportBtnTextLocked: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  supportCountBadgeLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  supportCountTextLocked: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  supportLockedNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(126, 126, 126, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(126, 126, 126, 0.15)',
  },
  supportLockedNoticeText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#7e7e7e',
    letterSpacing: -0.1,
  },
  supportCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  supportCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  supportCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportCountTextActive: {
    color: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: -0.2,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  descriptionSection: {
    width: '90%',
    maxWidth: 1040,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 28,
  },
  descriptionSectionCompact: {
    width: 'auto',
    marginRight: 16,
  },
  descriptionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  expandToggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 4,
  },
  expandToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3269C7',
  },
  platformsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  platformsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,251,253,0.86)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
  },
  pillIcon: {
    marginRight: 6,
  },
  platformPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25364E',
  },
  pricingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,251,253,0.86)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
  },
  pricingPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25364E',
  },
  promoSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  promoCard: {
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    padding: 16,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promoHeaderIcon: {
    marginRight: 6,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#25364E',
  },
  promoSub: {
    fontSize: 11.5,
    color: '#686474',
    marginBottom: 12,
  },
  promoCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  promoCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: 1,
    textAlign: 'center',
  },
  promoActionBtn: {
    backgroundColor: '#25364E',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  promoActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  developerSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  developerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    padding: 14,
  },
  developerAvatarBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  developerDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  developerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  developerCardName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#25364E',
  },
  developerCardSub: {
    fontSize: 11,
    color: '#686474',
    marginTop: 2,
  },
  developerVerificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  developerVerificationText: {
    marginTop: 0,
  },
  messageMakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
  },
  messageIcon: {
    marginRight: 4,
  },
  messageMakerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#25364E',
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  infoTable: {
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.08)',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoKey: {
    fontSize: 12.5,
    color: '#686474',
  },
  infoVal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#25364E',
    maxWidth: '65%',
    textAlign: 'right',
  },
  storeActionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  storeActionsSectionDesktop: {
    width: '100%',
    maxWidth: 660,
    alignSelf: 'center',
  },
  storeButtonsCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  storeBadgeButton: {
    width: 190,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 13,
  },
  appStoreBadgeImage: {
    width: 188,
    height: 73,
  },
  googlePlayBadgeImage: {
    width: 224,
    height: 224,
  },
  webSiteBtn: {
    width: 164,
    height: 50,
    overflow: 'hidden',
    borderRadius: 9,
  },
  webSiteBtnSurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  webSiteLogo: {
    width: 34,
    height: 34,
  },
  webSiteCopy: {
    flex: 1,
    marginLeft: 7,
  },
  webSiteEyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '600',
    letterSpacing: 0.45,
  },
  webSiteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  trustRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  trustText: {
    fontSize: 11,
    color: '#686474',
    textAlign: 'center',
    lineHeight: 16,
  },
});
