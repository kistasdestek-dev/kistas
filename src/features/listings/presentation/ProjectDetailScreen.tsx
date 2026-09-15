import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { isListingSponsored, Listing, PlatformType, PricingModel } from '../domain/Listing';
import { ListingService } from '../application/ListingService';
import { CategoryService } from '../../categories/application/CategoryService';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { MessageComposer } from '../../../shared/components/MessageComposer';
import { BorderBeam } from '../../../shared/components/BorderBeam';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { UserProfile } from '../../auth/domain/User';
import {
  ProjectComment,
  ProjectCommentService,
} from '../../reviews/application/ProjectCommentService';
import { toSafeHttpsUrl } from '../../../core/security/ExternalUrl';
import { DescriptionRichText } from './DescriptionRichText';
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
  onOpenSupport?: () => void;
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

const getCircularOffset = (index: number, activeIndex: number, total: number): number => {
  let offset = index - activeIndex;
  const midpoint = total / 2;
  if (offset > midpoint) offset -= total;
  if (offset < -midpoint) offset += total;
  return offset;
};

const getCarouselScale = (position: number): number => {
  const distance = Math.abs(position);
  if (distance < 0.5) return 1;
  if (distance < 1.5) return 0.96;
  return 0.92;
};

const getCarouselOpacity = (position: number): number => {
  const distance = Math.abs(position);
  if (distance < 0.5) return 1;
  if (distance < 1.5) return 0.82;
  return 0;
};

export const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({
  project,
  onBack,
  onOpenChat,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
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
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(!!project.hasUpvoted);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const isSupportLocked = isListingSponsored(project);

  // Veritabanından kullanıcının bu projeyi daha önce destekleyip desteklemediğini doğrula
  useEffect(() => {
    let isMounted = true;
    ListingService.hasUserUpvoted(project.id).then((alreadyVoted) => {
      if (isMounted && alreadyVoted) {
        setHasUpvoted(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [project.id]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<ProjectComment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [screenshotAspectRatios, setScreenshotAspectRatios] = useState<Record<string, number>>({});
  const lightboxProgress = useRef(new Animated.Value(0)).current;
  const carouselProgress = useRef(new Animated.Value(0)).current;
  const carouselAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const carouselAnimatingRef = useRef(false);
  const detailScrollRef = useRef<ScrollView>(null);
  const storeActionsOffsetRef = useRef(0);
  const [carouselDirection, setCarouselDirection] = useState<-1 | 0 | 1>(0);
  const isProjectOwner = currentUser?.id === project.sellerId && !project.isEditorial;
  const canCreateComment = !!currentUser?.isVerified;

  const loadComments = useCallback(async () => {
    try {
      setComments(await ProjectCommentService.getComments(project.id));
    } catch {
      // The rest of the project detail should remain usable if comments fail.
    } finally {
      setCommentsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    setCommentsLoading(true);
    void loadComments();
    const channel = ProjectCommentService.subscribe(project.id, () => void loadComments());
    return () => {
      void channel.unsubscribe();
    };
  }, [loadComments, project.id]);

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

  // Ekran Görüntüleri Listesi (Deduplicated)
  const screenshotItems = useMemo(() => {
    const list: Array<{ id: string; url: string }> = [];
    const seenUrls = new Set<string>();

    if (project.images && project.images.length > 0) {
      const sorted = [...project.images].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
      for (const img of sorted) {
        if (img.imageUrl && !seenUrls.has(img.imageUrl)) {
          seenUrls.add(img.imageUrl);
          list.push({ id: img.id || `img-${list.length}`, url: img.imageUrl });
        }
      }
    }

    if (list.length === 0 && project.coverImageUrl) {
      list.push({ id: 'cover-1', url: project.coverImageUrl });
    }

    return list;
  }, [project.images, project.coverImageUrl]);

  const descriptionContent = useMemo(() => (
    project.description || project.tagline || 'Bu proje için henüz detaylı bir açıklama eklenmedi.'
  ).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), [project.description, project.tagline]);

  const isLightboxVisible = selectedScreenshotIndex !== null;

  const cacheScreenshotAspectRatio = useCallback((url: string, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const aspectRatio = width / height;
    setScreenshotAspectRatios((current) => (
      current[url] === aspectRatio ? current : { ...current, [url]: aspectRatio }
    ));
  }, []);

  useEffect(() => {
    let isActive = true;
    screenshotItems.forEach((item) => {
      Image.getSize(
        item.url,
        (width, height) => {
          if (isActive) cacheScreenshotAspectRatio(item.url, width, height);
        },
        () => undefined,
      );
    });
    return () => {
      isActive = false;
    };
  }, [cacheScreenshotAspectRatio, screenshotItems]);

  const openScreenshot = useCallback((index: number) => {
    if (!screenshotItems[index]) return;
    carouselAnimationRef.current?.stop();
    carouselAnimatingRef.current = false;
    carouselProgress.setValue(0);
    setCarouselDirection(0);
    lightboxProgress.setValue(0);
    setSelectedScreenshotIndex(index);
  }, [carouselProgress, lightboxProgress, screenshotItems]);

  useEffect(() => {
    if (!isLightboxVisible) return undefined;

    const entranceAnimation = Animated.timing(lightboxProgress, {
      toValue: 1,
      duration: 240,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    entranceAnimation.start();

    return () => entranceAnimation.stop();
  }, [isLightboxVisible, lightboxProgress]);

  const closeScreenshot = useCallback(() => {
    if (!isLightboxVisible) return;
    carouselAnimationRef.current?.stop();
    carouselAnimatingRef.current = false;
    carouselProgress.setValue(0);
    setCarouselDirection(0);
    lightboxProgress.stopAnimation();
    Animated.timing(lightboxProgress, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) setSelectedScreenshotIndex(null);
    });
  }, [carouselProgress, isLightboxVisible, lightboxProgress]);

  const showAdjacentScreenshot = useCallback((direction: -1 | 1) => {
    if (carouselAnimatingRef.current || screenshotItems.length < 2) return;

    carouselAnimatingRef.current = true;
    carouselProgress.setValue(0);
    setCarouselDirection(direction);
  }, [carouselProgress, screenshotItems.length]);

  useEffect(() => {
    if (carouselDirection === 0) return undefined;
    const animation = Animated.timing(carouselProgress, {
      toValue: 1,
      duration: 480,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    carouselAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        setSelectedScreenshotIndex((current) => current === null
          ? null
          : (current + carouselDirection + screenshotItems.length) % screenshotItems.length);
        setCarouselDirection(0);
      } else {
        carouselProgress.setValue(0);
        setCarouselDirection(0);
      }
      carouselAnimatingRef.current = false;
      carouselAnimationRef.current = null;
    });

    return () => animation.stop();
  }, [carouselDirection, carouselProgress, screenshotItems.length]);

  useEffect(() => {
    if (!isLightboxVisible || screenshotItems.length < 2) return undefined;
    const timer = setInterval(() => showAdjacentScreenshot(1), 4000);
    return () => clearInterval(timer);
  }, [isLightboxVisible, selectedScreenshotIndex, screenshotItems.length, showAdjacentScreenshot]);

  const lightboxPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      windowWidth <= 700
      && Math.abs(gestureState.dx) > 10
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onMoveShouldSetPanResponderCapture: (_, gestureState) => (
      windowWidth <= 700
      && Math.abs(gestureState.dx) > 10
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gestureState) => {
      const isDeliberateSwipe = Math.abs(gestureState.dx) >= 48 || Math.abs(gestureState.vx) >= 0.45;
      if (!isDeliberateSwipe) return;
      showAdjacentScreenshot(gestureState.dx < 0 ? 1 : -1);
    },
  }), [showAdjacentScreenshot, windowWidth]);

  // Harici Bağlantı Açma
  const handleOpenUrl = useCallback((url?: string) => {
    if (!url) {
      Alert.alert('Bilgi', 'Bu bağlantı henüz tanımlanmamış.');
      return;
    }

    const safeUrl = toSafeHttpsUrl(url);
    if (!safeUrl) {
      Alert.alert('Güvenli Olmayan Bağlantı', 'Yalnızca geçerli HTTPS bağlantıları açılabilir.');
      return;
    }

    Linking.openURL(safeUrl).catch(() => {
      Alert.alert('Bağlantı Açılamadı', 'Lütfen daha sonra tekrar deneyin.');
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
  }, [isVoting, hasUpvoted, isSupportLocked, upvotesCount, project.id]);

  const handleSubmitComment = useCallback(async () => {
    const body = commentBody.trim();
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!canCreateComment) {
      Alert.alert('Hesap doğrulaması gerekli', 'Projelerde yorum yapmak için hesabınızı doğrulamalısınız.');
      return;
    }
    if (body.length < 2 || commentSubmitting) return;

    setCommentSubmitting(true);
    const result = await ProjectCommentService.createComment(project.id, body);
    setCommentSubmitting(false);
    if (!result.success) {
      Alert.alert('Yorum yayınlanamadı', result.error || 'Lütfen tekrar deneyin.');
      return;
    }
    setCommentBody('');
    await loadComments();
  }, [canCreateComment, commentBody, commentSubmitting, currentUser, loadComments, onRequireAuth, project.id]);

  const handleSubmitReply = useCallback(async () => {
    const body = replyBody.trim();
    if (!replyingTo || body.length < 2 || commentSubmitting) return;

    setCommentSubmitting(true);
    const result = await ProjectCommentService.createComment(project.id, body, replyingTo.id);
    setCommentSubmitting(false);
    if (!result.success) {
      Alert.alert('Yanıt yayınlanamadı', result.error || 'Lütfen tekrar deneyin.');
      return;
    }
    setReplyBody('');
    setReplyingTo(null);
    await loadComments();
  }, [commentSubmitting, loadComments, project.id, replyBody, replyingTo]);

  // Responsive screenshot sizing
  const screenshotWidth = Math.min(Math.round(windowWidth * 0.7), 300);
  const getScreenshotHeight = (url: string) => Math.round(
    screenshotWidth / (screenshotAspectRatios[url] || 0.8),
  );
  const isCompactHero = windowWidth <= 700;
  const lightboxMaxWidth = Math.min(Math.round(windowWidth * (isCompactHero ? 0.86 : 0.52)), 760);
  const lightboxMaxHeight = Math.max(160, Math.round(windowHeight * (isCompactHero ? 0.78 : 0.72)));
  const lightboxCardSpacing = Math.round(lightboxMaxWidth * (isCompactHero ? 0.92 : 0.82));
  const mobileSwipeStyle = Platform.OS === 'web' && isCompactHero
    ? ({ touchAction: 'pan-y' } as ViewStyle & { touchAction: 'pan-y' })
    : undefined;
  const getLightboxCardSize = (url: string) => {
    const aspectRatio = screenshotAspectRatios[url] || 0.8;
    let width = lightboxMaxWidth;
    let height = width / aspectRatio;
    if (height > lightboxMaxHeight) {
      height = lightboxMaxHeight;
      width = height * aspectRatio;
    }
    return { width: Math.round(width), height: Math.round(height) };
  };
  const shouldCenterScreenshots =
    Platform.OS === 'web' && windowWidth > 700 && screenshotItems.length <= 2;

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
        {screenshotItems.length > 0 ? (
          <View style={styles.previewSection}>
            <Text style={[
              styles.sectionHeading,
              styles.previewHeading,
              isCompactHero && styles.previewHeadingCompact,
            ]}>
              Önizleme
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={screenshotWidth + 12}
              decelerationRate="fast"
              contentContainerStyle={[
                styles.screenshotScrollContent,
                shouldCenterScreenshots && styles.screenshotScrollContentCentered,
              ]}
            >
              {screenshotItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => openScreenshot(index)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`${project.title} ekran görüntüsü ${index + 1} büyüt`}
                  style={[
                    styles.screenshotWrapper,
                    { width: screenshotWidth, height: getScreenshotHeight(item.url) },
                  ]}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.screenshotImage}
                    resizeMode="contain"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

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
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeadingRow}>
            <View>
              <Text style={styles.commentsTitle}>Yorumlar</Text>
            </View>
            <GlassIconButton
              icon="chatbubble-outline"
              iconSize={19}
              size={38}
              badge={comments.length}
              accessibilityLabel={`${comments.length} yorum`}
            />
          </View>

          {currentUser && canCreateComment ? (
            <View style={{ marginBottom: 16 }}>
              <MessageComposer value={commentBody} onChangeText={setCommentBody}
                onSend={() => { void handleSubmitComment(); }} busy={commentSubmitting}
                placeholder="Projeyle ilgili düşünceni paylaş..." label="Proje yorumu" sendLabel="Yorumu yayınla"
                leading={<ProfileAvatar avatarUrl={currentUser.avatarUrl} size={30} logoSize={26} />} />
            </View>
          ) : currentUser ? (
            <View style={styles.commentAccessRow}>
              <View style={styles.commentAccessIcon}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#3269C7" />
              </View>
              <View style={styles.commentAccessCopy}>
                <Text style={styles.commentAccessTitle}>Doğrulanmış üyeler yorum yapabilir</Text>
                <Text style={styles.commentAccessText}>
                  Hesap güvenliği bölümünden doğrulamanı tamamlayabilirsin.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.devDialogueChamber}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(250, 251, 253, 0.96)', 'rgba(242, 246, 254, 0.88)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.devDialogueGradient}
              />
              <View style={styles.devDialogueSpecular} />
              <BorderBeam
                size={200}
                duration={12}
                delay={0}
                colorVariant="kistas"
                borderWidth={1.5}
                borderRadius={18}
              />

              {/* 1. GELİŞTİRİCİ DİYALOG BALONU */}
              <View style={styles.devSpeechRow}>
                <View style={styles.devAvatarContainer}>
                  <ProfileAvatar avatarUrl={project.seller?.avatarUrl} size={40} logoSize={32} />
                  <View style={styles.devOnlinePulse} />
                </View>

                <View style={styles.devSpeechBubble}>
                  <View style={styles.devSpeechTail} />
                  <View style={styles.devSpeechHeader}>
                    <Text style={styles.devSpeechName} numberOfLines={1}>
                      {cleanMakerName}
                    </Text>
                    <View style={styles.devMakerBadge}>
                      <Text style={styles.devMakerBadgeText}>Geliştirici</Text>
                    </View>
                  </View>
                  <Text style={styles.devSpeechMessage}>
                    {project.isEditorial
                      ? '“Bu kayıt Kıstas editörleri tarafından resmi mağaza bilgileriyle hazırlandı.”'
                      : comments.length === 0
                      ? '“Teknik sorularınızı ve geliştirme önerilerinizi doğrudan geliştiriciye iletebilirsiniz.”'
                      : '“Proje hakkındaki teknik değerlendirmelerinizi ve geliştirme önerilerinizi toplulukla paylaşabilirsiniz.”'}
                  </Text>
                </View>
              </View>

              {/* 2. DİYALOG CEVAP DOKU */}
              <TouchableOpacity
                style={styles.devReplyDock}
                activeOpacity={0.88}
                onPress={onRequireAuth}
                accessibilityRole="button"
                accessibilityLabel="Yorum yapmak için giriş yap"
              >
                <View style={styles.devReplyInputRow}>
                  <Ionicons name="create-outline" size={17} color="#7A8799" />
                  <Text style={styles.devReplyPlaceholder} numberOfLines={1}>
                    {project.isEditorial ? 'Proje hakkında yorum yaz...' : `${cleanMakerName}'e doğrudan yanıt yaz...`}
                  </Text>
                </View>

                <View style={styles.devReplyCtaPill}>
                  <Text style={styles.devReplyCtaText}>Yorum Yap</Text>
                  <Ionicons name="arrow-forward" size={13} color="#3269C7" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {commentsLoading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#3269C7" />
            </View>
          ) : comments.length === 0 ? (
            currentUser ? (
              <View style={styles.commentsEmpty}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.96)', 'rgba(234,242,252,0.82)']}
                  start={{ x: 0.08, y: 0 }}
                  end={{ x: 0.92, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.commentsEmptyGlow} />

                <View style={styles.commentsEmptyHeader}>
                  <GlassIconButton
                    icon="chatbubble-ellipses-outline"
                    iconSize={18}
                    size={40}
                    accessibilityLabel="İlk yorum daveti"
                  />
                  <View style={styles.commentsEmptyHeading}>
                    <Text style={styles.commentsEmptyTitle}>İlk yorumu sen bırak</Text>
                  </View>
                </View>
              </View>
            ) : null
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentThread}>
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <ProfileAvatar avatarUrl={comment.author.avatarUrl} size={36} logoSize={30} />
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentMetaRow}>
                        <Text style={styles.commentAuthor} numberOfLines={1}>{comment.author.fullName}</Text>
                        {comment.author.isVerified || comment.authorId === project.sellerId ? <MaterialIcons name="verified" size={14} color="#1D9BF0" /> : null}
                        <Text style={styles.commentDate}>
                          {new Date(comment.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.body}</Text>
                      {isProjectOwner ? (
                        <TouchableOpacity
                          style={styles.replyAction}
                          onPress={() => {
                            setReplyingTo(comment);
                            setReplyBody('');
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Yoruma yanıt ver"
                        >
                          <Ionicons name="return-down-forward-outline" size={13} color="#3269C7" />
                          <Text style={styles.replyActionText}>Yanıtla</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {comment.replies.map((reply) => (
                    <View key={reply.id} style={styles.replyRow}>
                      <View style={styles.replyLine} />
                      <View style={styles.replyAvatar}>
                        <ProfileAvatar avatarUrl={reply.author.avatarUrl} size={28} logoSize={23} />
                      </View>
                      <View style={styles.commentContent}>
                        <View style={styles.commentMetaRow}>
                          <Text style={styles.commentAuthor} numberOfLines={1}>{reply.author.fullName}</Text>
                          <MaterialIcons name="verified" size={13} color="#1D9BF0" />
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>GELİŞTİRİCİ</Text>
                          </View>
                          <Text style={styles.commentDate}>
                            {new Date(reply.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{reply.body}</Text>
                      </View>
                    </View>
                  ))}

                  {replyingTo?.id === comment.id ? (
                    <View style={{ marginLeft: 20, marginTop: 12 }}>
                      <MessageComposer value={replyBody} onChangeText={setReplyBody}
                        onSend={() => { void handleSubmitReply(); }} busy={commentSubmitting} autoFocus
                        onCancel={() => setReplyingTo(null)} label="Geliştirici yanıtı" sendLabel="Yanıtı yayınla"
                        placeholder={`${comment.author.fullName} kullanıcısına yanıt ver...`} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 8. PLATFORMLAR VE MODEL */}
        <View style={styles.platformsSection}>
          <Text style={styles.sectionHeading}>Platformlar ve Model</Text>
          <View style={styles.platformsWrapRow}>
            {project.platforms?.map((plt) => (
              <View key={plt} style={styles.platformPill}>
                <Ionicons
                  name={getPlatformIonicon(plt)}
                  size={14}
                  color="#252333"
                  style={styles.pillIcon}
                />
                <Text style={styles.platformPillText}>{plt}</Text>
              </View>
            ))}

            <View style={styles.pricingPill}>
              <Ionicons
                name="pricetag-outline"
                size={13}
                color="#252333"
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
                  color="#252333"
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
                  color="#252333"
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
        <CinematicFooter compact onOpenAbout={onOpenAbout} onOpenHowItWorks={onOpenHowItWorks} onOpenPrivacy={onOpenPrivacy} onOpenSupport={onOpenSupport} onOpenBlog={onOpenBlog} />
      </ScrollView>

      <Modal
        visible={isLightboxVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeScreenshot}
      >
        <View
          style={[styles.lightboxRoot, isCompactHero && styles.lightboxRootCompact]}
          accessibilityViewIsModal
        >
          <Animated.View style={[styles.lightboxBackdrop, { opacity: lightboxProgress }]} />
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeScreenshot}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Görseli kapat"
          />

          <Animated.View
            style={[
              styles.lightboxPanel,
              isCompactHero && styles.lightboxPanelCompact,
              {
                opacity: lightboxProgress,
                transform: [
                  {
                    scale: lightboxProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.965, 1],
                    }),
                  },
                  {
                    translateY: lightboxProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F7F9FD', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.lightboxGlowLeft} pointerEvents="none" />
            <View style={styles.lightboxGlowRight} pointerEvents="none" />
            <View style={[styles.lightboxHeader, isCompactHero && styles.lightboxHeaderCompact]}>
              {isCompactHero ? <View /> : (
                <View>
                  <Text style={styles.lightboxTitle}>{project.title}</Text>
                  <Text style={styles.lightboxCounter}>
                    {selectedScreenshotIndex === null ? '' : `${selectedScreenshotIndex + 1} / ${screenshotItems.length}`}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={closeScreenshot}
                activeOpacity={0.75}
                style={styles.lightboxCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Görseli kapat"
              >
                <Ionicons name="close" size={isCompactHero ? 28 : 22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.lightboxStage, mobileSwipeStyle]}
              {...(isCompactHero ? lightboxPanResponder.panHandlers : {})}
            >
              {selectedScreenshotIndex === null ? null : screenshotItems.map((item, index) => {
                const startPosition = getCircularOffset(index, selectedScreenshotIndex, screenshotItems.length);
                const endPosition = startPosition - carouselDirection;
                const isCenter = startPosition === 0;
                const isIncomingCenter = carouselDirection !== 0 && startPosition === carouselDirection;
                const cardSize = getLightboxCardSize(item.url);

                return (
                  <Animated.View
                    key={item.id}
                    pointerEvents={isCenter && carouselDirection === 0 ? 'auto' : 'none'}
                    renderToHardwareTextureAndroid={carouselDirection !== 0}
                    shouldRasterizeIOS={carouselDirection !== 0}
                    style={[
                      styles.lightboxCarouselCard,
                      {
                        width: cardSize.width,
                        height: cardSize.height,
                        zIndex: isIncomingCenter ? 11 : isCenter ? 10 : Math.abs(startPosition) === 1 ? 5 : 1,
                        opacity: carouselProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [getCarouselOpacity(startPosition), getCarouselOpacity(endPosition)],
                        }),
                        transform: [
                          {
                            translateX: carouselProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [startPosition * lightboxCardSpacing, endPosition * lightboxCardSpacing],
                            }),
                          },
                          {
                            scale: carouselProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [getCarouselScale(startPosition), getCarouselScale(endPosition)],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item.url }}
                      resizeMode="contain"
                      fadeDuration={0}
                      style={styles.lightboxImage}
                      accessibilityRole="image"
                      accessibilityLabel={`${project.title} ekran görüntüsü ${index + 1}`}
                    />
                  </Animated.View>
                );
              })}
            </View>

            {screenshotItems.length > 1 && !isCompactHero ? (
              <>
                <TouchableOpacity
                  onPress={() => showAdjacentScreenshot(-1)}
                  activeOpacity={0.72}
                  style={[styles.lightboxNavButton, styles.lightboxNavButtonLeft]}
                  accessibilityRole="button"
                  accessibilityLabel="Önceki görsel"
                >
                  <Ionicons name="chevron-back" size={24} color="#252333" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showAdjacentScreenshot(1)}
                  activeOpacity={0.72}
                  style={[styles.lightboxNavButton, styles.lightboxNavButtonRight]}
                  accessibilityRole="button"
                  accessibilityLabel="Sonraki görsel"
                >
                  <Ionicons name="chevron-forward" size={24} color="#252333" />
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
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
    shadowColor: '#252333',
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
    fontWeight: '800',
    color: '#252333',
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
    fontWeight: '800',
    color: '#252333',
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
    color: '#252333',
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
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.65,
    marginBottom: 4,
  },
  metadataValue: {
    ...theme.typography.kistas,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
    color: '#252333',
  },
  metadataValueText: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
    color: '#252333',
  },
  metadataValueNeutral: {
    ...theme.typography.kistas,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '800',
    color: '#FFFFFF',
  },
  supportCountTextActive: {
    color: '#FFFFFF',
  },
  previewSection: {
    marginHorizontal: 16,
    marginBottom: 22,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  previewHeading: {
    marginBottom: 22,
    paddingHorizontal: 24,
    color: '#252333',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  previewHeadingCompact: {
    marginBottom: 18,
    paddingHorizontal: 20,
    fontSize: 26,
    lineHeight: 31,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#252333',
    letterSpacing: -0.2,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  screenshotScrollContent: {
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  screenshotScrollContentCentered: {
    minWidth: '100%',
    justifyContent: 'center',
  },
  screenshotWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  lightboxRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lightboxRootCompact: {
    padding: 0,
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(241,244,249,0.96)',
  },
  lightboxPanel: {
    width: '100%',
    maxWidth: 1240,
    height: '88%',
    maxHeight: 900,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 24,
  },
  lightboxPanelCompact: {
    height: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  lightboxHeader: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 14,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxHeaderCompact: {
    top: 42,
    left: 20,
    right: 20,
  },
  lightboxTitle: {
    color: '#252333',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  lightboxCounter: {
    color: '#7A8799',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lightboxCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252333',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  lightboxStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lightboxCarouselCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
    backfaceVisibility: 'hidden',
  },
  lightboxGlowLeft: {
    position: 'absolute',
    top: -140,
    left: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(50,105,199,0.06)',
  },
  lightboxGlowRight: {
    position: 'absolute',
    right: -170,
    bottom: -180,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(150,75,255,0.05)',
  },
  lightboxNavButton: {
    position: 'absolute',
    top: '50%',
    width: 46,
    height: 46,
    marginTop: -23,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
    zIndex: 20,
  },
  lightboxNavButtonLeft: { left: 14 },
  lightboxNavButtonRight: { right: 14 },
  descriptionSection: {
    width: '90%',
    maxWidth: 1040,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.1)',
  },
  descriptionSectionCompact: {
    width: 'auto',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
  },
  descriptionHeading: {
    marginBottom: 10,
    color: '#252333',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  expandToggleBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 3,
    paddingLeft: 12,
  },
  expandToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3269C7',
  },
  commentsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50,105,199,0.14)',
  },
  commentsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  commentsTitle: {
    color: '#252333',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: 0,
  },
  devDialogueChamber: {
    position: 'relative',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.22)',
    overflow: 'hidden',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  devDialogueGradient: {
    ...StyleSheet.absoluteFill,
  },
  devDialogueSpecular: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  devSpeechRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  devAvatarContainer: {
    position: 'relative',
    flexShrink: 0,
    marginTop: 2,
  },
  devOnlinePulse: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#187657',
    borderWidth: 2,
    borderColor: '#FAFBFD',
  },
  devSpeechBubble: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
    shadowColor: '#252333',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  devSpeechTail: {
    position: 'absolute',
    left: -7,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
    borderBottomWidth: 5,
    borderBottomColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'rgba(255,255,255,0.92)',
  },
  devSpeechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  devSpeechName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#252333',
  },
  devMakerBadge: {
    backgroundColor: 'rgba(50,105,199,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  devMakerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3269C7',
  },
  devSpeechMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#4B4858',
    fontStyle: 'italic',
  },

  devReplyDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(50,105,199,0.3)',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 0,
  },
  devReplyInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  devReplyPlaceholder: {
    flex: 1,
    fontSize: 12.5,
    color: '#7A8799',
    fontWeight: '500',
  },
  devReplyCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 2,
  },
  devReplyCtaText: {
    ...theme.typography.kistas,
    color: '#3269C7',
  },
  commentAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(250,251,253,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  commentAccessIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,105,199,0.09)',
  },
  commentAccessCopy: { flex: 1 },
  commentAccessTitle: { color: '#252333', fontSize: 12, fontWeight: '750' as any },
  commentAccessText: { color: '#3269C7', fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  commentsLoading: { height: 72, alignItems: 'center', justifyContent: 'center' },
  commentsEmpty: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 68,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
    backgroundColor: '#F1F5FA',
    shadowColor: '#8292A8',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: '-5px -5px 13px rgba(255,255,255,0.82), 6px 8px 17px rgba(130,146,168,0.14)',
      },
    }),
  },
  commentsEmptyGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    top: -48,
    right: -30,
    backgroundColor: 'rgba(50,105,199,0.10)',
  },
  commentsEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  commentsEmptyHeading: {
    flex: 1,
    minWidth: 0,
  },
  commentsEmptyTitle: {
    ...theme.typography.kistas,
    color: '#252333',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  commentsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(50,105,199,0.09)',
  },
  commentThread: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.09)',
  },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: { flex: 1, minWidth: 0 },
  commentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  commentAuthor: { color: '#252333', fontSize: 11.5, fontWeight: '800', maxWidth: '55%' },
  commentDate: { color: '#3269C7', fontSize: 9.5, marginLeft: 'auto' },
  commentText: { color: '#3f3b4c', fontSize: 12.5, lineHeight: 18.5, marginTop: 5 },
  replyAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7, paddingVertical: 2 },
  replyActionText: { color: '#3269C7', fontSize: 10.5, fontWeight: '800' },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 20,
    marginTop: 13,
    paddingLeft: 13,
    gap: 9,
    position: 'relative',
  },
  replyLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(50,105,199,0.2)',
  },
  replyAvatar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(50,105,199,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
  },
  ownerBadgeText: { color: '#3269C7', fontSize: 7, fontWeight: '900', letterSpacing: 0 },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    marginLeft: 20,
    marginTop: 12,
    paddingLeft: 12,
    paddingRight: 7,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(250,251,253,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
  },
  replyInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 90,
    color: '#252333',
    fontSize: 11.5,
    lineHeight: 17,
    paddingVertical: 8,
    outlineStyle: 'none',
  } as any,
  replyCancelBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  replySendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3269C7',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  pillIcon: {
    marginRight: 6,
  },
  platformPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#252333',
  },
  pricingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,251,253,0.86)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  pricingPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#252333',
  },
  promoSection: {
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  promoCard: {
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.28)',
    padding: 14,
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
    color: '#252333',
  },
  promoSub: {
    fontSize: 11.5,
    color: '#686474',
    lineHeight: 16,
    marginBottom: 10,
  },
  promoCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoBox: {
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
    marginRight: 8,
  },
  promoCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#252333',
    letterSpacing: 1,
  },
  promoActionBtn: {
    backgroundColor: '#EAF2FC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  promoActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FAFBFD',
  },
  developerSection: {
    paddingHorizontal: 16,
    marginBottom: 22,
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
    marginRight: 8,
  },
  developerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  developerCardName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#252333',
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
    color: '#252333',
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
    color: '#252333',
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
    fontWeight: '800',
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
