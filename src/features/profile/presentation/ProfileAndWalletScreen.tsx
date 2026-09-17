import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfile } from '../../auth/domain/User';
import { useAuth, useAuthActions, useChatUnreadCount, useWallet } from '../../../core/state';
import { KistasLogo } from '../../../shared/components/KistasLogo';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { SITE_ORIGIN } from '../../../core/config/siteUrls';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { ProfileService, isReservedBrandName } from '../application/ProfileService';
import { Listing } from '../../listings/domain/Listing';
import { ListingService } from '../../listings/application/ListingService';
import { NotificationItem } from '../../notifications/domain/Notification';
import { NotificationService } from '../../notifications/application/NotificationService';
import { CreditService, CreditTransaction } from '../../credits/application/CreditService';
import { R2StorageService } from '../../../core/storage/R2StorageService';
import { SmoothTypewriter } from '../../../shared/components/SmoothTypewriter';
import { profileStyles as styles, PROFILE_NEO } from './ProfileAndWalletScreen.styles';

interface ProfileAndWalletScreenProps {
  profile?: UserProfile | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onNavigateToCredits?: () => void;
  onOpenVisibilityManagement?: (project?: Listing) => void;
  onOpenAccountSecurity?: () => void;
  onNavigateToLaunch?: () => void;
  onOpenMessages?: () => void;
  onOpenSupport?: () => void;
  onOpenAdminDashboard?: () => void;
  onSelectProject?: (project: Listing) => void;
  onEditProject?: (project: Listing) => void;
  onScrollOffsetChange?: (offsetY: number) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ActionRowProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  badge?: string;
  destructive?: boolean;
  onPress: () => void;
}

const PROFILE_GRADIENT = [PROFILE_NEO.surface, '#EAF1FA'] as const;

const hasUploadedAvatar = (url?: string | null): url is string =>
  Boolean(url && /(?:\/|%2f)avatars(?:\/|%2f)/i.test(url));

const ActionRow: React.FC<ActionRowProps> = React.memo(({
  icon,
  title,
  subtitle,
  badge,
  destructive = false,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.72}
    onPress={onPress}
    style={styles.actionRow}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <GlassIconButton icon={icon} size={38} iconSize={19} />
    <View style={styles.actionCopy}>
      <View style={styles.actionTitleRow}>
        <Text style={[styles.actionTitle, destructive && styles.actionTitleDanger]}>{title}</Text>
        {badge ? (
          <View style={[styles.actionBadge, badge === 'Doğrulandı' && styles.actionBadgeVerified]}>
            <Text style={[styles.actionBadgeText, badge === 'Doğrulandı' && styles.actionBadgeTextVerified]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.actionSubtitle, destructive && styles.actionSubtitleDanger]}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={destructive ? '#9b3c27' : '#3269C7'} />
  </TouchableOpacity>
));

const formatRelativeTime = (isoString: string): string => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(isoString));
};

const formatCreditTransactionDate = (isoString: string): string =>
  new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));

const formatPaidAmount = (amountMinor?: number, currency = 'TRY'): string | null => {
  if (amountMinor === undefined) return null;
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toLocaleString('tr-TR')} ${currency}`;
  }
};

const getCreditTransactionTitle = (type: CreditTransaction['type']): string => {
  if (type === 'purchase') return 'Kredi yüklemesi';
  if (type === 'spend_boost') return 'Vitrin kullanımı';
  if (type === 'reward') return 'Kredi ödülü';
  return 'Kredi iadesi';
};

const getCreditTransactionIcon = (type: CreditTransaction['type']): IoniconName => {
  if (type === 'purchase') return 'add-circle-outline';
  if (type === 'spend_boost') return 'megaphone-outline';
  if (type === 'reward') return 'gift-outline';
  return 'return-up-back-outline';
};

export const ProfileAndWalletScreen: React.FC<ProfileAndWalletScreenProps> = ({
  profile: propProfile,
  onOpenAuth,
  onSignOut,
  onNavigateToCredits,
  onOpenVisibilityManagement,
  onOpenAccountSecurity,
  onNavigateToLaunch,
  onOpenMessages,
  onOpenSupport,
  onOpenAdminDashboard,
  onSelectProject,
  onEditProject,
  onScrollOffsetChange,
}) => {
  const { profile: authProfile } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 1100;
  const isMobile = width < 680;
  const { signOut, refreshProfile } = useAuthActions();
  const { credits } = useWallet();
  const unreadMessagesCount = useChatUnreadCount();
  const [selectedBadgeType, setSelectedBadgeType] = useState<'markdown' | 'html'>('markdown');
  const [isBadgeCodeModalOpen, setIsBadgeCodeModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lansmanlarım ve Projelerim Takip Durumları
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [listingFilter, setListingFilter] = useState<'all' | 'pending' | 'revision' | 'active' | 'banned'>('all');
  const [supportedCount, setSupportedCount] = useState<number>(0);

  // Bildirimler Sistemi Durumları
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const [isDeletingAllNotifications, setIsDeletingAllNotifications] = useState(false);

  // Kredi cüzdanı hareketleri
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [isCreditHistoryOpen, setIsCreditHistoryOpen] = useState(false);
  const [isLoadingCreditHistory, setIsLoadingCreditHistory] = useState(false);
  const [creditHistoryError, setCreditHistoryError] = useState('');

  // Oturum kapatma onay modalı
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profile = propProfile !== undefined ? propProfile : authProfile;
  const isGuest = !profile;
  const fullName = profile?.fullName || 'Misafir Kullanıcı';
  const boostCredits = credits ?? profile?.boostCredits ?? 0;

  const loadUserData = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingListings(true);
    setIsLoadingNotifications(true);
    try {
      const [userListings, notifs, unreadCount, userSupported] = await Promise.all([
        ListingService.getUserListings(profile.id),
        NotificationService.getNotifications(50),
        NotificationService.getUnreadCount(),
        ListingService.getUserSupportedCount(profile.id),
      ]);
      setMyListings(userListings);
      setNotifications(notifs);
      setUnreadNotificationsCount(unreadCount);
      setSupportedCount(userSupported);
    } catch (err) {
      console.error('loadUserData error:', err);
    } finally {
      setIsLoadingListings(false);
      setIsLoadingNotifications(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const filteredListings = useMemo(() => {
    return myListings.filter((item) => {
      if (listingFilter === 'pending') return item.status === 'draft';
      if (listingFilter === 'revision') return item.status === 'inactive';
      if (listingFilter === 'active') return item.status === 'active';
      if (listingFilter === 'banned') return item.status === 'banned';
      return true;
    });
  }, [myListings, listingFilter]);

  const pendingCount = useMemo(() => myListings.filter((i) => i.status === 'draft').length, [myListings]);
  const revisionCount = useMemo(() => myListings.filter((i) => i.status === 'inactive').length, [myListings]);
  const activeCount = useMemo(() => myListings.filter((i) => i.status === 'active').length, [myListings]);
  const bannedCount = useMemo(() => myListings.filter((i) => i.status === 'banned').length, [myListings]);
  const totalUpvotesReceived = useMemo(() => {
    return myListings.reduce((sum, item) => sum + (Number(item.upvotesCount) || 0), 0);
  }, [myListings]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, notifFilter]);

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'launch_approved':
        return 'rocket-outline';
      case 'upvote':
        return 'arrow-up-circle-outline';
      case 'review':
        return 'chatbubble-ellipses-outline';
      case 'message':
        return 'mail-outline';
      case 'revision_requested':
        return 'construct-outline';
      case 'credit_purchase':
        return 'sparkles-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'launch_approved':
        return '#187657';
      case 'upvote':
        return '#3269C7';
      case 'review':
        return '#936413';
      case 'message':
        return '#3269C7';
      case 'revision_requested':
        return '#B98916';
      case 'credit_purchase':
        return '#187657';
      default:
        return '#3269C7';
    }
  };

  const formatNotificationTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMin < 1) return 'Az önce';
      if (diffMin < 60) return `${diffMin}d önce`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}s önce`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}g önce`;
      return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(d);
    } catch {
      return '';
    }
  };

  const handleDeleteProject = (project: Listing) => {
    setDeleteTarget(project);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    const res = await ListingService.deleteUserListing(deleteTarget.id);
    setIsDeleting(false);
    if (!res.success) {
      Alert.alert('Hata', res.error || 'Proje silinemedi.');
      return;
    }
    setDeleteTarget(null);
    await loadUserData();
  };

  const handleMarkAllNotificationsRead = async () => {
    await NotificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationsCount(0);
  };

  const handleConfirmDeleteAll = async () => {
    if (notifications.length === 0) {
      setIsConfirmingDeleteAll(false);
      return;
    }

    setIsDeletingAllNotifications(true);
    const prevNotifs = notifications;
    const prevUnread = unreadNotificationsCount;
    // İyimser anında temizleme
    setNotifications([]);
    setUnreadNotificationsCount(0);

    const ok = await NotificationService.deleteAllNotifications();
    if (!ok) {
      setNotifications(prevNotifs);
      setUnreadNotificationsCount(prevUnread);
    }
    setIsDeletingAllNotifications(false);
    setIsConfirmingDeleteAll(false);
  };

  const handleDeleteSingleNotification = async (notifId: string) => {
    const target = notifications.find((n) => n.id === notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    if (target && !target.isRead) {
      setUnreadNotificationsCount((c) => Math.max(0, c - 1));
    }
    await NotificationService.deleteNotification(notifId);
  };

  const handleNotificationPress = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await NotificationService.markAsRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
      setUnreadNotificationsCount((c) => Math.max(0, c - 1));
    }

    if (notif.type === 'revision_requested' && notif.data?.listing_id && onEditProject) {
      setIsNotificationsModalOpen(false);
      const localListing = myListings.find((item) => item.id === notif.data?.listing_id);
      if (localListing) {
        onEditProject(localListing);
        return;
      }
      const found = await ListingService.getListingById(notif.data.listing_id);
      if (found) onEditProject(found);
    } else if (notif.data?.listing_id && onSelectProject) {
      setIsNotificationsModalOpen(false);
      try {
        const found = await ListingService.getListingById(notif.data.listing_id);
        if (found) onSelectProject(found);
      } catch (e) {
        console.error('Proje detayı açılamadı', e);
      }
    } else if (notif.type === 'message' && onOpenMessages) {
      setIsNotificationsModalOpen(false);
      onOpenMessages();
    }
  };

  const openEditor = () => {
    setDraftName(profile?.fullName || '');
    setDraftBio(profile?.bio || '');
    setDraftAvatarUrl(profile?.avatarUrl || '');
    setSaveError('');
    setEditing(true);
  };
  const pickAvatar = async () => {
    if (isUploadingAvatar || saving) return;
    const files = await R2StorageService.pickImage(false);
    if (!files?.[0]) return;
    setIsUploadingAvatar(true);
    setSaveError('');
    const result = await R2StorageService.uploadFile(files[0], 'avatars');
    setIsUploadingAvatar(false);
    if (!result.success || !result.url) {
      setSaveError(result.error || 'Profil fotoğrafı yüklenemedi.');
      return;
    }
    setDraftAvatarUrl(result.url);
  };
  const saveProfile = async () => {
    if (saving || isUploadingAvatar) return;
    const trimmedName = draftName.trim();
    if (!trimmedName) { setSaveError('Ad ve soyad alanı boş bırakılamaz.'); return; }
    if (!isAdmin && isReservedBrandName(trimmedName)) {
      setSaveError('‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.');
      return;
    }
    setSaving(true);
    try {
      const result = await ProfileService.updateProfile({ fullName: trimmedName, bio: draftBio.trim(), avatarUrl: draftAvatarUrl });
      if (!result.success) { setSaveError(result.error || 'Profil kaydedilemedi.'); return; }
      await refreshProfile();
      setEditing(false);
    } finally { setSaving(false); }
  };
  const badgeMarkdownCode = `[![Featured on Kıstas](${SITE_ORIGIN}/badges/featured-dark.svg)](${SITE_ORIGIN})`;
  const badgeHtmlCode = `<a href="${SITE_ORIGIN}" target="_blank" rel="noopener noreferrer"><img src="${SITE_ORIGIN}/badges/featured-dark.svg" alt="Featured on Kıstas" style="height: 54px;" /></a>`;

  const selectedBadgeCode = selectedBadgeType === 'markdown' ? badgeMarkdownCode : badgeHtmlCode;

  const handleSignOut = () => {
    setIsSignOutModalOpen(true);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      if (onSignOut) {
        onSignOut();
        return;
      }
      await signOut();
    } finally {
      setIsSigningOut(false);
      setIsSignOutModalOpen(false);
    }
  };

  const loadCreditHistory = async () => {
    setIsLoadingCreditHistory(true);
    setCreditHistoryError('');
    try {
      setCreditTransactions(await CreditService.getMyCreditTransactions(100));
    } catch (error) {
      console.error('Kredi hareketleri yüklenemedi:', error);
      setCreditHistoryError('Kredi hareketleri şu anda yüklenemedi. Lütfen yeniden deneyin.');
    } finally {
      setIsLoadingCreditHistory(false);
    }
  };

  const openCreditHistory = () => {
    setIsCreditHistoryOpen(true);
    void loadCreditHistory();
  };

  if (isGuest) {
    return (
      <View style={styles.guestRoot}>
        <KistasTopBrandBar style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }} />
        <LinearGradient colors={PROFILE_GRADIENT} style={styles.guestCard}>
          <View style={styles.guestLogoPlate}>
            <KistasLogo size={58} showWordmark={false} />
          </View>
          <Text style={styles.guestEyebrow}>KISTAS MEMBER</Text>
          <Text style={styles.guestTitle}>Üreticiler için özel alan.</Text>
          <Text style={styles.guestSubtitle}>
            Projelerinizi yayınlayın, vitrinde öne çıkarın ve toplulukla doğrudan bağlantı kurun.
          </Text>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onOpenAuth}
            style={styles.guestButton}
            accessibilityRole="button"
            accessibilityLabel="Giriş yap veya kayıt ol"
          >
            <Text style={styles.guestButtonText}>Giriş Yap veya Kayıt Ol</Text>
            <Ionicons name="arrow-forward" size={17} color="#25364E" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const isAdmin = profile.role === 'admin';
  const location = [profile.city, profile.district].filter(Boolean).join(', ');

  return (
    <ScrollView
      style={styles.container}
      decelerationRate={0.99}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
      onMomentumScrollEnd={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
      onScrollToTop={() => onScrollOffsetChange?.(0)}
      scrollEventThrottle={32}
    >
      <KistasTopBrandBar style={styles.brandBar} />
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageEyebrow}>SANA AİT ALAN</Text>
          <Text style={styles.pageTitle}>Profil</Text>
        </View>
        <View style={styles.headerButtonsRow}>
          <GlassIconButton
            icon={unreadNotificationsCount > 0 ? 'notifications' : 'notifications-outline'}
            active={unreadNotificationsCount > 0}
            badge={unreadNotificationsCount > 0 ? (unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount) : undefined}
            onPress={() => setIsNotificationsModalOpen(true)}
            accessibilityLabel="Bildirimler"
          />
          <GlassIconButton icon="create-outline" onPress={openEditor} accessibilityLabel="Profili düzenle" />
        </View>
      </View>

      <View style={[styles.profileColumns, wide && styles.profileColumnsWide]}>
        <View style={styles.profileMain}>
          <View style={styles.identityCard}>
            <View style={styles.identityTopRow}>
              <View style={styles.avatarFrame}>
                {hasUploadedAvatar(profile.avatarUrl) ? (
                  <Image source={{ uri: profile.avatarUrl }} resizeMode="cover" style={styles.avatarImage} />
                ) : (
                  <KistasLogo size={46} showWordmark={false} style={styles.profileBrandMark} />
                )}
              </View>
              <View style={styles.identityCopy}>
                <View style={styles.nameRow}>
                  <Text style={[styles.fullName, width < 360 && styles.fullNameCompact]}>{fullName}</Text>
                  {profile.isVerified || isAdmin ? <MaterialIcons name="verified" size={18} color="#3269C7" /> : null}
                </View>
                <Text style={styles.memberRole}>{isAdmin ? 'Kıstas yönetim ekibi' : 'Kıstas topluluğu'}</Text>
                {location ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={13} color="#64748B" />
                    <Text style={styles.locationText}>{location}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{isLoadingListings ? '—' : myListings.length}</Text>
                <Text style={styles.statLabel}>Lansmanlar</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{isLoadingListings ? '—' : totalUpvotesReceived.toLocaleString('tr-TR')}</Text>
                <Text style={styles.statLabel}>Alınan destek</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{isLoadingListings ? '—' : supportedCount.toLocaleString('tr-TR')}</Text>
                <Text style={styles.statLabel}>Destekledikleri</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.profileAside, wide && styles.profileAsideWide]}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <View style={styles.walletHeading}>
                <GlassIconButton icon="wallet-outline" size={38} iconSize={18} />
                <Text style={styles.walletEyebrow}>KISTAS CÜZDAN</Text>
              </View>
              <Text style={styles.walletCaption}>Kullanılabilir bakiye</Text>
            </View>
            <View style={styles.walletBalanceRow}>
              <View style={[styles.creditRow, boostCredits.toLocaleString('tr-TR').length > 6 && styles.creditRowLarge]}>
                <Text style={[styles.creditValue, boostCredits.toLocaleString('tr-TR').length > 6 && styles.creditValueCompact]}>{boostCredits.toLocaleString('tr-TR')}</Text>
                <Text style={styles.creditUnit}>kredi</Text>
              </View>
              <View style={styles.walletActions}>
                <TouchableOpacity activeOpacity={0.72} onPress={openCreditHistory} style={styles.creditHistoryButton} accessibilityRole="button" accessibilityLabel="Kredi hareketlerini aç">
                  <Text style={styles.creditHistoryButtonText}>Hareketler</Text>
                  <GlassIconButton icon="receipt-outline" size={30} iconSize={16} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.72} onPress={onNavigateToCredits} style={styles.creditButton} accessibilityRole="button" accessibilityLabel="Kredi mağazasını aç">
                  <Text style={styles.creditButtonText}>Kredi al</Text>
                  <GlassIconButton icon="add" size={30} iconSize={18} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.primaryActions}>
            <TouchableOpacity activeOpacity={0.72} onPress={onNavigateToLaunch} style={[styles.primaryAction, styles.launchAction]} accessibilityRole="button" accessibilityLabel="Yeni lansman oluştur">
              <GlassIconButton icon="rocket-outline" size={36} iconSize={18} />
              <Text style={styles.primaryActionTitle}>Yeni lansman</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.72} onPress={onOpenMessages} style={styles.primaryAction} accessibilityRole="button" accessibilityLabel="Mesajlar">
              <GlassIconButton icon="chatbubble-ellipses-outline" size={36} iconSize={18} badge={unreadMessagesCount > 0 ? (unreadMessagesCount > 9 ? '9+' : unreadMessagesCount) : undefined} />
              <Text style={styles.primaryActionTitle}>Mesajlar</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.72} onPress={onOpenSupport} style={styles.primaryAction} accessibilityRole="button" accessibilityLabel="Kıstas desteğe ulaş">
              <GlassIconButton icon="headset-outline" size={36} iconSize={18} />
              <Text style={styles.primaryActionTitle}>Destek</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.profileColumns, styles.profileDetails, wide && styles.profileColumnsWide]}>
      <View style={styles.profileMain}>
        {/* Lansmanlarım & Projelerim Takip Bölümü */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.groupTitleInline}>Lansmanlarım</Text>
          </View>
        </View>

        {/* Durum Takip Barı (Segmented Filter Bar) */}
        <ScrollView horizontal style={styles.statusScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRail}>
          {([
            ['all', `Tümü (${myListings.length})`],
            ['pending', `İncelemede (${pendingCount})`],
            ['revision', `Düzeltme (${revisionCount})`],
            ['active', `Yayında (${activeCount})`],
            ['banned', `Askıda (${bannedCount})`],
          ] as const).map(([key, label]) => {
            const selected = listingFilter === key;
            const isPendingTab = key === 'pending' && pendingCount > 0;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.statusFilterBtn,
                  selected && styles.statusFilterBtnActive,
                  isPendingTab && !selected && styles.statusFilterBtnPending,
                ]}
                onPress={() => setListingFilter(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                activeOpacity={0.72}
              >
                <Text
                  style={[
                    styles.statusFilterBtnText,
                    selected && styles.statusFilterBtnTextActive,
                    isPendingTab && !selected && { color: '#936413' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoadingListings ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#3269C7" />
            <Text style={styles.loadingBoxText}>Lansmanlarınız yükleniyor…</Text>
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyListingsBox}>
            <View style={styles.emptyListingsIcon}>
              <Ionicons name="rocket-outline" size={24} color="#3269C7" />
            </View>
            <Text style={styles.emptyListingsTitle}>
              {listingFilter === 'pending'
                ? 'Şu anda onay bekleyen bir projeniz yok.'
                : listingFilter === 'revision'
                  ? 'Düzeltme bekleyen bir projeniz yok.'
                : listingFilter === 'active'
                  ? 'Şu anda vitrinde yayında olan bir projeniz yok.'
                  : listingFilter === 'banned'
                    ? 'Askıya alınan herhangi bir projeniz yok.'
                    : 'Henüz sisteme kayıtlı bir lansmanınız yok.'}
            </Text>
            <Text style={styles.emptyListingsSub}>
              Yeni projenizi Kıstas vitrinine taşımak için lansman oluşturup yönetici onayına gönderebilirsiniz.
            </Text>
            {onNavigateToLaunch ? (
              <TouchableOpacity
                style={styles.emptyLaunchBtn}
                onPress={onNavigateToLaunch}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={16} color={PROFILE_NEO.ink} />
                <Text style={styles.emptyLaunchBtnText}>İlk Lansmanını Yap</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filteredListings.map((item) => {
            const isPending = item.status === 'draft';
            const isRevision = item.status === 'inactive';
            const isActive = item.status === 'active';
            const isBanned = item.status === 'banned';

            return (
              <View key={item.id} style={styles.myListingCard}>
                <View style={styles.myListingHeader}>
                  {item.logoUrl ? (
                    <AutoTransparentLogo
                      src={item.logoUrl}
                      alt={`${item.title} logosu`}
                      style={styles.myListingLogo}
                    />
                  ) : (
                    <View style={styles.myListingLogoFallback}>
                      <Text style={styles.myListingLogoFallbackText}>{item.title.slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.myListingCopy}>
                    <Text style={styles.myListingTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.myListingTagline} numberOfLines={1}>{item.tagline || 'Dijital proje'}</Text>
                    <Text style={styles.myListingDate}>
                      {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))}
                    </Text>
                  </View>
                  <View style={[
                    styles.trackerBadgePill,
                    isPending ? styles.trackerBadgePillPending : isRevision ? styles.trackerBadgePillRevision : isActive ? styles.trackerBadgePillActive : styles.trackerBadgePillBanned,
                  ]}>
                    <View style={[
                      styles.trackerDot,
                      isPending ? styles.trackerDotPending : isRevision ? styles.trackerDotRevision : isActive ? styles.trackerDotActive : styles.trackerDotBanned,
                    ]} />
                    <Text style={[
                      styles.trackerBadgePillText,
                      isPending ? styles.trackerBadgePillTextPending : isRevision ? styles.trackerBadgePillTextRevision : isActive ? styles.trackerBadgePillTextActive : styles.trackerBadgePillTextBanned,
                    ]}>
                      {isPending ? 'İncelemede' : isRevision ? 'Düzeltme İstendi' : isActive ? 'Yayında' : 'Askıda'}
                    </Text>
                  </View>
                </View>

                {isRevision && item.reviewFeedback ? (
                  <View style={styles.revisionNotice}>
                    <View style={styles.revisionNoticeIcon}>
                      <Ionicons name="construct-outline" size={16} color="#936413" />
                    </View>
                    <View style={styles.revisionNoticeCopy}>
                      <Text style={styles.revisionNoticeTitle}>Yönetici notu</Text>
                      <Text style={styles.revisionNoticeText}>{item.reviewFeedback}</Text>
                      <Text style={styles.revisionNoticeHint}>Düzenlemeleri tamamlayıp projeyi yeniden incelemeye gönderin.</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.myListingControls}>
                  <View style={[styles.myListingActions, isMobile && styles.myListingActionsMobile]}>
                  {onEditProject ? (
                    <TouchableOpacity
                      style={[styles.myListingBtnSecondary, isMobile && styles.myListingBtnMobile]}
                      onPress={() => onEditProject(item)}
                      accessibilityRole="button"
                      activeOpacity={0.8}
                    >
                      <GlassIconButton icon="create-outline" iconColor="#3269C7" size={isMobile ? 26 : 30} iconSize={isMobile ? 13 : 15} />
                      <Text style={styles.myListingBtnSecondaryText}>{isRevision ? 'Düzelt ve Gönder' : 'Düzenle'}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isActive && onSelectProject ? (
                    <TouchableOpacity
                      style={[styles.myListingBtnPrimary, isMobile && styles.myListingBtnMobile]}
                      onPress={() => onSelectProject(item)}
                      accessibilityRole="button"
                      activeOpacity={0.8}
                    >
                      <GlassIconButton icon="eye-outline" iconColor="#3269C7" size={isMobile ? 26 : 30} iconSize={isMobile ? 13 : 15} />
                      <Text style={styles.myListingBtnPrimaryText}>Vitrinde Gör</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isActive && onOpenVisibilityManagement ? (
                    <TouchableOpacity
                      style={[styles.myListingBtnSponsor, isMobile && styles.myListingBtnMobile]}
                      onPress={() => onOpenVisibilityManagement(item)}
                      accessibilityRole="button"
                      activeOpacity={0.82}
                    >
                    <GlassIconButton icon="sparkles" iconColor="#B98916" size={isMobile ? 26 : 30} iconSize={isMobile ? 13 : 15} />
                      <Text style={styles.myListingBtnSponsorText}>Sponsor Yap</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.myListingBtnDanger, isMobile && styles.myListingBtnMobile]}
                    onPress={() => handleDeleteProject(item)}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    <GlassIconButton icon="trash-outline" iconColor="#ba0816" size={isMobile ? 26 : 30} iconSize={isMobile ? 13 : 15} />
                    <Text style={styles.myListingBtnDangerText}>Sil</Text>
                  </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}


      </View>
      <View style={[styles.profileAside, wide && styles.profileAsideWide]}>
        <Text style={[styles.groupTitle, wide && styles.groupTitleWide]}>Hesap ve araçlar</Text>
        <View style={styles.actionGroup}>
          {isAdmin && onOpenAdminDashboard ? (
            <>
              <ActionRow icon="shield-outline" title="Yönetim Merkezi" subtitle="Yönetim panelini aç" onPress={onOpenAdminDashboard} />
              <View style={styles.rowDivider} />
            </>
          ) : null}
          <ActionRow
            icon="analytics-outline"
            title="Vitrin Yönetimi"
            subtitle="Kıstas Vitrin Kredilerini ve sponsor seçeneklerini yönet"
            onPress={() => onOpenVisibilityManagement?.()}
          />
          <View style={styles.rowDivider} />
          <ActionRow
            icon="shield-checkmark-outline"
            title="Hesap güvenliği"
            subtitle="Kimlik, oturum ve doğrulama ayarları"
            badge={profile.isVerified ? 'Doğrulandı' : undefined}
            onPress={() => onOpenAccountSecurity?.()}
          />
          <View style={styles.rowDivider} />
          <ActionRow
            icon="notifications-outline"
            title="Bildirimler"
            subtitle="Lansman, destek, yorum ve mesaj hareketleri"
            badge={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} yeni` : undefined}
            onPress={() => setIsNotificationsModalOpen(true)}
          />
          <View style={styles.rowDivider} />
          <ActionRow
            icon="log-out-outline"
            title="Oturumu Kapat"
            subtitle="Bu cihazdaki güvenli oturumu sonlandır"
            destructive
            onPress={handleSignOut}
          />
        </View>

      <View style={styles.badgeStudio}>
        <View style={styles.badgeStudioHeader}>
          <GlassIconButton icon="code-slash" size={40} iconSize={19} />
          <View style={styles.badgeStudioCopy}>
            <Text style={styles.badgeStudioEyebrow}>GELİŞTİRİCİ ARACI</Text>
            <Text style={styles.badgeStudioTitle}>Featured on Kıstas</Text>
          </View>
        </View>
        <Text style={styles.badgeStudioDescription}>
          Ürün sayfanıza güven rozeti ekleyin ve topluluğunuzdan doğrudan destek alın.
        </Text>

        <View style={styles.badgePreview}>
          <KistasLogo size={28} showWordmark={false} />
          <View style={styles.badgePreviewDivider} />
          <View>
            <Text style={styles.badgePreviewTop}>Featured on</Text>
            <Text style={styles.badgePreviewBrand}>Kıstas</Text>
          </View>
          <View style={styles.badgePreviewRank}>
            <View pointerEvents="none" style={styles.badgePreviewRankAccent} />
            <View style={styles.badgePreviewRankIcon}>
              <Ionicons name="ribbon-outline" size={14} color="#8A6414" />
            </View>
            <View>
              <Text style={styles.badgePreviewRankEyebrow}>KISTAS’IN YILDIZI</Text>
            </View>
          </View>
        </View>

        <View style={styles.codeTabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedBadgeType('markdown')}
            style={[styles.codeTab, selectedBadgeType === 'markdown' && styles.codeTabActive]}
          >
            <Text style={[styles.codeTabText, selectedBadgeType === 'markdown' && styles.codeTabTextActive]}>
              Markdown
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedBadgeType('html')}
            style={[styles.codeTab, selectedBadgeType === 'html' && styles.codeTabActive]}
          >
            <Text style={[styles.codeTabText, selectedBadgeType === 'html' && styles.codeTabTextActive]}>
              HTML
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setIsBadgeCodeModalOpen(true)}
          style={styles.copyButton}
          accessibilityRole="button"
          accessibilityLabel="Rozet kodunu görüntüle"
        >
          <Ionicons name="copy-outline" size={16} color="#25364E" />
          <Text style={styles.copyButtonText}>Rozet Kodunu Görüntüle</Text>
        </TouchableOpacity>
      </View>

      </View>
      </View>

      <View style={styles.bottomSpacer} />
      <Modal
        visible={isBadgeCodeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBadgeCodeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={82} tint="light" style={styles.badgeCodeModal}>
            <LinearGradient
              colors={['rgba(255,255,255,0.98)', 'rgba(242,247,255,0.98)']}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.badgeCodeModalSurface}
            >
              <View style={styles.badgeCodeModalHeader}>
                <GlassIconButton icon="code-slash" size={44} iconSize={20} />
                <View style={styles.badgeCodeModalCopy}>
                  <Text style={styles.badgeCodeModalTitle}>Rozet Kodu</Text>
                  <Text style={styles.badgeCodeModalSubtitle}>
                    Kodu ürün sayfanıza veya GitHub deponuza ekleyin.
                  </Text>
                </View>
                <GlassIconButton
                  icon="close"
                  size={38}
                  iconSize={19}
                  onPress={() => setIsBadgeCodeModalOpen(false)}
                  accessibilityLabel="Kapat"
                />
              </View>
              <View style={styles.badgeCodeBox}>
                <Text selectable style={styles.badgeCodeText}>{selectedBadgeCode}</Text>
              </View>
              <Text style={styles.badgeCodeHint}>Kodu seçerek kopyalayabilirsiniz.</Text>
              <TouchableOpacity
                style={styles.badgeCodeCloseButton}
                onPress={() => setIsBadgeCodeModalOpen(false)}
                activeOpacity={0.76}
              >
                <Text style={styles.badgeCodeCloseButtonText}>Kapat</Text>
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => { if (!saving) setEditing(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.editorOverlay}>
          <View style={styles.editor}>
            <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorForm} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>Profili düzenle</Text>
              <GlassIconButton icon="close" size={40} accessibilityLabel="Kapat" disabled={saving || isUploadingAvatar} onPress={() => setEditing(false)} />
            </View>
            <View style={styles.editorAvatarRow}>
              <TouchableOpacity
                style={styles.editorAvatar}
                onPress={pickAvatar}
                disabled={saving || isUploadingAvatar}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Profil fotoğrafını değiştir"
              >
                {hasUploadedAvatar(draftAvatarUrl) ? (
                  <Image source={{ uri: draftAvatarUrl }} style={styles.editorAvatarImage} />
                ) : (
                  <KistasLogo size={42} showWordmark={false} />
                )}
                <View style={styles.editorCameraBadge}>
                  {isUploadingAvatar ? <ActivityIndicator size="small" color="#25364E" /> : <Ionicons name="camera" size={14} color="#25364E" />}
                </View>
              </TouchableOpacity>
              <View style={styles.editorAvatarCopy}>
                <Text style={styles.editorAvatarTitle}>Profil fotoğrafı</Text>
                <Text style={styles.editorAvatarSubtitle}>Kare bir PNG, JPG veya WEBP görsel seç.</Text>
                <TouchableOpacity onPress={pickAvatar} disabled={saving || isUploadingAvatar} style={styles.editorAvatarButton} activeOpacity={0.75}>
                  <Text style={styles.editorAvatarButtonText}>{isUploadingAvatar ? 'Yükleniyor...' : 'Fotoğrafı Değiştir'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.editorLabel}>Ad ve soyad</Text>
            <TextInput
              value={draftName}
              onChangeText={(val) => {
                setDraftName(val);
                if (saveError) setSaveError('');
              }}
              maxLength={100}
              editable={!saving}
              accessibilityLabel="Ad ve soyad"
              style={[styles.editorInput, (!isAdmin && isReservedBrandName(draftName)) && { borderColor: '#ba0816' }]}
            />
            {!isAdmin && isReservedBrandName(draftName) ? (
              <Text accessibilityRole="alert" style={{ color: '#ba0816', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                ‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.
              </Text>
            ) : null}
            <Text style={styles.editorLabel}>Hakkımda</Text>
            <TextInput value={draftBio} onChangeText={setDraftBio} maxLength={500} editable={!saving} multiline accessibilityLabel="Hakkımda" style={[styles.editorInput, { minHeight: 100, textAlignVertical: 'top' }]} />
            {saveError ? <Text accessibilityRole="alert" style={{ color: '#a06969', marginTop: 12 }}>{saveError}</Text> : null}
            <TouchableOpacity accessibilityRole="button" disabled={saving || isUploadingAvatar || (!isAdmin && isReservedBrandName(draftName))} onPress={saveProfile} style={[styles.editorSave, (saving || isUploadingAvatar || (!isAdmin && isReservedBrandName(draftName))) && styles.editorSaveDisabled]}><Ionicons name="checkmark" size={18} color="#25364E" /><Text style={styles.editorSaveText}>{saving ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={Boolean(deleteTarget)} transparent animationType="fade" onRequestClose={() => { if (!isDeleting) setDeleteTarget(null); }}>
        <View style={styles.editorOverlay}>
          <BlurView intensity={34} tint="light" style={styles.deleteModal}>
            <View style={styles.deleteModalIcon}><Ionicons name="trash-outline" size={25} color="#9b3c27" /></View>
            <Text style={styles.deleteModalEyebrow}>KALICI İŞLEM</Text>
            <Text style={styles.deleteModalTitle}>Projeyi sil?</Text>
            <Text style={styles.deleteModalText}>{deleteTarget ? `“${deleteTarget.title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ''}</Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity style={styles.deleteCancelButton} disabled={isDeleting} onPress={() => setDeleteTarget(null)} activeOpacity={0.75}><Text style={styles.deleteCancelText}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmButton} disabled={isDeleting} onPress={confirmDeleteProject} activeOpacity={0.75}>
                {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
                <Text style={styles.deleteConfirmText}>{isDeleting ? 'Siliniyor' : 'Kalıcı Olarak Sil'}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
      <Modal
        visible={isCreditHistoryOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreditHistoryOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.creditHistoryModal}>
            <View style={styles.notifModalHeader}>
              <View style={styles.notifModalTitleRow}>
                <GlassIconButton icon="receipt-outline" size={42} iconSize={19} accessibilityLabel="Kredi hareketleri" />
                <View>
                  <Text style={styles.notifModalEyebrow}>KISTAS CÜZDANI</Text>
                  <Text style={styles.notifModalTitle}>Kredi Hareketleri</Text>
                </View>
              </View>
              <GlassIconButton icon="close" size={40} iconSize={19} onPress={() => setIsCreditHistoryOpen(false)} accessibilityLabel="Kapat" />
            </View>

            <View style={styles.creditHistorySummary}>
              <View>
                <Text style={styles.creditHistorySummaryLabel}>GÜNCEL BAKİYE</Text>
                <Text style={styles.creditHistorySummaryValue}>{boostCredits.toLocaleString('tr-TR')} kredi</Text>
              </View>
              <Text style={styles.creditHistorySummaryCount}>Son {creditTransactions.length} işlem</Text>
            </View>

            <ScrollView decelerationRate={0.99} style={styles.creditHistoryList} contentContainerStyle={styles.creditHistoryListContent} showsVerticalScrollIndicator={false}>
              {isLoadingCreditHistory ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#3269C7" />
                  <Text style={styles.loadingBoxText}>Kredi hareketleri yükleniyor…</Text>
                </View>
              ) : creditHistoryError ? (
                <View style={styles.creditHistoryStateBox}>
                  <Ionicons name="cloud-offline-outline" size={30} color="#9b3c27" />
                  <Text style={styles.creditHistoryStateTitle}>{creditHistoryError}</Text>
                  <TouchableOpacity style={styles.creditHistoryRetryButton} onPress={() => void loadCreditHistory()} activeOpacity={0.72}>
                    <Text style={styles.creditHistoryRetryText}>Tekrar dene</Text>
                  </TouchableOpacity>
                </View>
              ) : creditTransactions.length === 0 ? (
                <View style={styles.creditHistoryStateBox}>
                  <GlassIconButton icon="receipt-outline" size={56} iconSize={25} />
                  <Text style={styles.creditHistoryStateTitle}>Henüz kredi hareketiniz bulunmuyor.</Text>
                </View>
              ) : (
                creditTransactions.map((transaction) => {
                  const paidAmount = formatPaidAmount(transaction.metadata.amountMinor, transaction.metadata.currency);
                  const isCreditIn = transaction.amount >= 0;
                  const destination = transaction.type === 'purchase'
                    ? 'Shopier üzerinden güvenli kredi alımı'
                    : transaction.metadata.listingTitle
                      ? `${transaction.metadata.listingTitle} · ${transaction.metadata.scope === 'category' ? 'Kategori vitrini' : 'Keşfet vitrini'}${transaction.metadata.durationHours ? ` · ${transaction.metadata.durationHours} saat` : ''}`
                      : transaction.description;

                  return (
                    <View key={transaction.id} style={styles.creditTransactionItem}>
                      <View style={[styles.creditTransactionIcon, isCreditIn ? styles.creditTransactionIconIn : styles.creditTransactionIconOut]}>
                        <Ionicons name={getCreditTransactionIcon(transaction.type)} size={20} color={isCreditIn ? '#187657' : '#936413'} />
                      </View>
                      <View style={styles.creditTransactionCopy}>
                        <View style={styles.creditTransactionTopRow}>
                          <Text style={styles.creditTransactionTitle}>{getCreditTransactionTitle(transaction.type)}</Text>
                          <Text style={[styles.creditTransactionAmount, isCreditIn ? styles.creditTransactionAmountIn : styles.creditTransactionAmountOut]}>
                            {isCreditIn ? '+' : '−'}{Math.abs(transaction.amount).toLocaleString('tr-TR')} kredi
                          </Text>
                        </View>
                        <Text style={styles.creditTransactionDate}>{formatCreditTransactionDate(transaction.createdAt)}</Text>
                        <Text style={styles.creditTransactionDestination}>{destination}</Text>
                        <View style={styles.creditTransactionDetails}>
                          {paidAmount ? <Text style={styles.creditTransactionDetail}>Ödenen: {paidAmount}</Text> : null}
                          <Text style={styles.creditTransactionDetail}>İşlem sonrası: {transaction.balanceAfter.toLocaleString('tr-TR')} kredi</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Notifications Modal */}
      <Modal
        visible={isNotificationsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsNotificationsModalOpen(false);
          setIsConfirmingDeleteAll(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsModal}>
            <View style={styles.notifModalHeader}>
              <View style={styles.notifModalTitleRow}>
                <GlassIconButton icon="notifications" size={42} iconSize={19} accessibilityLabel="Bildirimler" />
                <View>
                  <Text style={styles.notifModalEyebrow}>KISTAS AKIŞI</Text>
                  <Text style={styles.notifModalTitle}>Bildirimler</Text>
                </View>
                {unreadNotificationsCount > 0 ? (
                  <View style={styles.notifCountPill}>
                    <Text style={styles.notifCountPillText}>{unreadNotificationsCount} yeni</Text>
                  </View>
                ) : null}
              </View>
              <GlassIconButton
                icon="close"
                size={40}
                iconSize={19}
                onPress={() => {
                  setIsNotificationsModalOpen(false);
                  setIsConfirmingDeleteAll(false);
                }}
                accessibilityLabel="Kapat"
              />
            </View>

            <View style={styles.notifSubHeader}>
              <View style={styles.notifTabs}>
                <TouchableOpacity
                  style={[styles.notifTab, notifFilter === 'all' && styles.notifTabActive]}
                  onPress={() => {
                    setNotifFilter('all');
                    setIsConfirmingDeleteAll(false);
                  }}
                >
                  <Text style={[styles.notifTabText, notifFilter === 'all' && styles.notifTabTextActive]}>
                    Tümü ({notifications.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.notifTab, notifFilter === 'unread' && styles.notifTabActive]}
                  onPress={() => {
                    setNotifFilter('unread');
                    setIsConfirmingDeleteAll(false);
                  }}
                >
                  <Text style={[styles.notifTabText, notifFilter === 'unread' && styles.notifTabTextActive]}>
                    Okunmamış ({unreadNotificationsCount})
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.notifSubActions}>
                {unreadNotificationsCount > 0 ? (
                  <TouchableOpacity
                    style={styles.markAllReadBtn}
                    onPress={handleMarkAllNotificationsRead}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-done" size={14} color="#3269C7" />
                    <Text style={styles.markAllReadText}>Okundu Say</Text>
                  </TouchableOpacity>
                ) : null}

                {notifications.length > 0 ? (
                  <TouchableOpacity
                    style={styles.deleteAllNotifsBtn}
                    onPress={() => setIsConfirmingDeleteAll(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={13} color="#ba0816" />
                    <Text style={styles.deleteAllNotifsText}>Tümünü Sil</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <ScrollView decelerationRate={0.99} style={styles.notifList} showsVerticalScrollIndicator={false}>
              {isLoadingNotifications ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#3269C7" />
                  <Text style={styles.loadingBoxText}>Bildirimler yükleniyor…</Text>
                </View>
              ) : filteredNotifications.length === 0 ? (
                <View style={styles.notifEmptyBox}>
                  <View style={styles.notifEmptyIcon}>
                    <Ionicons name="notifications-off-outline" size={30} color="#3269C7" />
                  </View>
                  <Text style={styles.notifEmptyTitle}>
                    {notifFilter === 'unread' ? 'Okunmamış bildiriminiz yok' : 'Henüz bildiriminiz bulunmuyor'}
                  </Text>
                </View>
              ) : (
                filteredNotifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.notifIconBox}>
                      <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={20}
                        color={getNotificationColor(item.type)}
                      />
                    </View>
                    <View style={styles.notifCopy}>
                      <View style={styles.notifItemTopRow}>
                        <Text style={styles.notifItemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.notifItemTime}>{formatNotificationTime(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.notifItemBody}>{item.body}</Text>
                    </View>
                    <View style={styles.notifItemRight}>
                      {!item.isRead ? <View style={styles.notifUnreadDot} /> : <View style={{ width: 7, height: 7 }} />}
                      <TouchableOpacity
                        style={styles.notifItemDeleteBtn}
                        onPress={(e: any) => {
                          if (e && typeof e.stopPropagation === 'function') {
                            e.stopPropagation();
                          }
                          handleDeleteSingleNotification(item.id);
                        }}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Bildirimi sil"
                      >
                        <Ionicons name="trash-outline" size={13} color="#9aa4b2" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isConfirmingDeleteAll}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeletingAllNotifications) setIsConfirmingDeleteAll(false);
        }}
      >
        <View style={styles.notifConfirmOverlay}>
          <BlurView intensity={82} tint="light" style={styles.notifConfirmCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.98)', 'rgba(245,249,255,0.98)']}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.notifConfirmSurface}
            >
              <GlassIconButton icon="trash-outline" iconColor="#ba0816" iconSize={22} size={50} />
              <Text style={styles.notifConfirmTitle}>Tüm bildirimler silinsin mi?</Text>
              <View style={styles.notifConfirmActions}>
                <TouchableOpacity
                  style={styles.notifConfirmCancelButton}
                  disabled={isDeletingAllNotifications}
                  onPress={() => setIsConfirmingDeleteAll(false)}
                  activeOpacity={0.72}
                >
                  <Text style={styles.notifConfirmCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notifConfirmDeleteButton}
                  disabled={isDeletingAllNotifications}
                  onPress={handleConfirmDeleteAll}
                  activeOpacity={0.78}
                >
                  {isDeletingAllNotifications ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.notifConfirmDeleteText}>
                    {isDeletingAllNotifications ? 'Siliniyor' : 'Tümünü Sil'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>

      {/* Oturum Kapatma Onay Modalı (Smooth Typewriter Efektli) */}
      <Modal
        visible={isSignOutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSigningOut) setIsSignOutModalOpen(false);
        }}
      >
        <View style={styles.notifConfirmOverlay}>
          <BlurView intensity={88} tint="light" style={styles.notifConfirmCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.98)', 'rgba(245,249,255,0.98)']}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.notifConfirmSurface}
            >
              <GlassIconButton
                icon="log-out-outline"
                iconColor="#ba0816"
                iconSize={24}
                size={54}
              />
              <Text style={styles.notifConfirmTitle}>Oturumu Kapat</Text>

              <View style={styles.signOutConfirmSubtitleBox}>
                <SmoothTypewriter
                  words={[
                    { text: 'Kıstas hesabınızdan' },
                    { text: 'ayrılmak', color: '#ba0816' },
                    { text: 'istediğinize emin misiniz?' },
                  ]}
                  speed={40}
                  cursorColor="#ba0816"
                  style={styles.signOutConfirmSubtitle}
                />
              </View>

              <View style={styles.notifConfirmActions}>
                <TouchableOpacity
                  style={styles.notifConfirmCancelButton}
                  disabled={isSigningOut}
                  onPress={() => setIsSignOutModalOpen(false)}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel="Vazgeç"
                >
                  <Text style={styles.notifConfirmCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.signOutButton}
                  disabled={isSigningOut}
                  onPress={confirmSignOut}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel="Oturumu Kapat"
                >
                  {isSigningOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.signOutButtonText}>
                    {isSigningOut ? 'Çıkış Yapılıyor...' : 'Oturumu Kapat'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>
    </ScrollView>
  );
};
