import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { SponsorLogoMarquee } from '../../../shared/components/SponsorLogoMarquee';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { AdminService } from '../application/AdminService';
import {
  AdminListingFilter,
  AdminListingItem,
  AdminAccess,
  AdminPermission,
  AdminUserSummary,
  PlatformStats,
} from '../domain/AdminModels';
import { ProjectStatus } from '../../listings/domain/Listing';
import { ChatService } from '../../chat/application/ChatService';
import { Conversation } from '../../chat/domain/Chat';
import { BlogPost } from '../../blog/domain/BlogPost';
import { BlogService } from '../../blog/application/BlogService';
import { CategoryService, Category } from '../../categories/application/CategoryService';
import { ThreatIntelligenceView } from './ThreatIntelligenceView';
import { kistasStyle } from '../../../core/theme';
import { AdminBlogModal } from './modals/AdminBlogModal';
import { AdminSupportModals } from './modals/AdminSupportModals';
import { AdminPermissionModal } from './modals/AdminPermissionModal';
import { AdminProjectModals } from './modals/AdminProjectModals';

interface AdminDashboardScreenProps {
  onBack: () => void;
  onSelectProject?: (project: AdminListingItem) => void;
  onOpenConversation?: (conversation: Conversation) => void;
  onOpenBlog?: (slug?: string) => void;
}

type AdminTab = 'moderation' | 'support' | 'sponsors' | 'listings' | 'users' | 'blog' | 'analytics' | 'threat_intel';
type SponsorView = 'active' | 'all';
type SupportView = 'open' | 'closed';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Tone = 'neutral' | 'blue' | 'gold' | 'green' | 'red';
type SuccessDialog = { message: string; icon: IoniconName };

const KISTAS_LOGO = require('../../../../assets/kistas-logo-transparent.png');
const NEO = kistasStyle.neumorphism;

const FILTERS: Array<{ key: AdminListingFilter; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'pending', label: 'Bekleyen' },
  { key: 'revision', label: 'Düzeltmede' },
  { key: 'banned', label: 'Askıda' },
];

const TONES = {
  neutral: { fg: '#5c576b', bg: 'rgba(50,105,199,0.1)', border: 'rgba(50,105,199,0.18)' },
  blue: { fg: '#3269C7', bg: 'rgba(50,105,199,0.13)', border: 'rgba(50,105,199,0.3)' },
  gold: { fg: '#936413', bg: 'rgba(147,100,19,0.13)', border: 'rgba(147,100,19,0.3)' },
  green: { fg: '#187657', bg: 'rgba(24,118,87,0.12)', border: 'rgba(24,118,87,0.28)' },
  red: { fg: '#bd354c', bg: 'rgba(160,41,62,0.11)', border: 'rgba(160,41,62,0.28)' },
} as const;

const METRIC_SURFACES: Record<AdminTab, {
  gradient: readonly [string, string];
}> = {
  moderation: { gradient: ['#FFF9EE', '#FFFFFF'] },
  support: { gradient: ['#EFF7FF', '#FFFFFF'] },
  sponsors: { gradient: ['#F1F2FF', '#FFFFFF'] },
  listings: { gradient: ['#EFF5FF', '#FFFFFF'] },
  users: { gradient: ['#EFFAF6', '#FFFFFF'] },
  blog: { gradient: ['#F6F1FF', '#FFFFFF'] },
  analytics: { gradient: ['#F4F5F8', '#FFFFFF'] },
  threat_intel: { gradient: ['#FFF2F4', '#FFFFFF'] },
};

const ADMIN_PERMISSION_OPTIONS: Array<{
  key: AdminPermission;
  title: string;
  description: string;
  icon: IoniconName;
}> = [
  { key: 'community', title: 'Mesajlar ve Yorumlar', description: 'Destek görüşmeleri ve yorum moderasyonu', icon: 'chatbubbles-outline' },
  { key: 'launches', title: 'Lansman İnceleme', description: 'Projeleri onaylama ve düzeltme isteme', icon: 'rocket-outline' },
  { key: 'blog', title: 'Blog Yönetimi', description: 'Blog içeriklerini oluşturma ve düzenleme', icon: 'newspaper-outline' },
];

const canAccessAdminTab = (access: AdminAccess, tab: AdminTab): boolean => {
  if (access.isOwner) return true;
  if (tab === 'support' || tab === 'users') return access.permissions.includes('community');
  if (tab === 'moderation') return access.permissions.includes('launches');
  if (tab === 'blog') return access.permissions.includes('blog');
  if (tab === 'threat_intel') return access.isOwner;
  return false;
};

const formatNumber = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

const formatSponsorExpiry = (value?: string | null): string => {
  if (!value) return 'Süre tanımlı değil';
  return `Bitiş: ${new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`;
};

const formatCommentMuteExpiry = (value: string): string =>
  new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const initials = (name: string) =>
  name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const StatusPill = ({ label, tone, icon }: { label: string; tone: Tone; icon?: IoniconName }) => {
  const colors = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {icon ? <Ionicons name={icon} size={11} color={colors.fg} /> : null}
      <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
};

const ActionButton = ({
  label,
  icon,
  onPress,
  tone = 'neutral',
  selected = false,
}: {
  label: string;
  icon: IoniconName;
  onPress: () => void;
  tone?: Tone;
  selected?: boolean;
}) => {
  const colors = TONES[tone];
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { borderColor: colors.border },
        selected && styles.actionButtonSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <LinearGradient
        colors={['#FFFFFF', colors.bg]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionButtonSurface}
      >
        <View style={[styles.actionIconPlate, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Ionicons name={icon} size={14} color={colors.fg} />
        </View>
        <Text style={[styles.actionButtonText, { color: colors.fg }]}>{label}</Text>
        <View style={[styles.actionAccent, { backgroundColor: colors.fg }]} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onBack, onSelectProject, onOpenConversation, onOpenBlog }) => {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const [activeTab, setActiveTab] = useState<AdminTab>('sponsors');
  const [listings, setListings] = useState<AdminListingItem[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [threatCount, setThreatCount] = useState<number>(0);
  const [supportConversations, setSupportConversations] = useState<Conversation[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [deleteBlogTarget, setDeleteBlogTarget] = useState<BlogPost | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryModalTarget, setCategoryModalTarget] = useState<AdminListingItem | null>(null);
  const [supportModalTarget, setSupportModalTarget] = useState<AdminListingItem | null>(null);
  const [viewModalTarget, setViewModalTarget] = useState<AdminListingItem | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<AdminListingItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminListingItem | null>(null);

  const [supportCloseTarget, setSupportCloseTarget] = useState<Conversation | null>(null);
  const [supportClearTarget, setSupportClearTarget] = useState<Conversation | null>(null);

  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<AdminUserSummary | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [listingFilter, setListingFilter] = useState<AdminListingFilter>('all');
  const [sponsorView, setSponsorView] = useState<SponsorView>('active');
  const [supportView, setSupportView] = useState<SupportView>('open');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<SuccessDialog | null>(null);
  const dialogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successDialogProgress = useRef(new Animated.Value(0)).current;

  const showSuccessDialog = useCallback((message: string, icon: IoniconName) => {
    if (dialogTimer.current) clearTimeout(dialogTimer.current);
    setSuccessDialog({ message, icon });
    dialogTimer.current = setTimeout(() => setSuccessDialog(null), 3600);
  }, []);

  useEffect(() => () => {
    if (dialogTimer.current) clearTimeout(dialogTimer.current);
  }, []);

  useEffect(() => {
    if (!successDialog) {
      successDialogProgress.setValue(0);
      return undefined;
    }

    const animation = Animated.spring(successDialogProgress, {
      toValue: 1,
      stiffness: 310,
      damping: 24,
      mass: 0.72,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [successDialog, successDialogProgress]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const access = await AdminService.getCurrentAccess();
      if (!access.isAdmin) {
        throw new Error('Bu ekran için doğrulanmış yönetici yetkisi gerekli.');
      }
      setAdminAccess(access);
      const canManageCommunity = access.isOwner || access.permissions.includes('community');
      const canReviewLaunches = access.isOwner || access.permissions.includes('launches');
      const canManageBlog = access.isOwner || access.permissions.includes('blog');
      const [nextListings, nextUsers, nextStats, nextConversations, nextBlogPosts, nextCategories, nextThreatOverview] = await Promise.all([
        canReviewLaunches ? AdminService.getAllListings() : Promise.resolve([]),
        canManageCommunity ? AdminService.getAllUsers() : Promise.resolve([]),
        access.isOwner ? AdminService.getPlatformStats() : Promise.resolve(null),
        canManageCommunity ? ChatService.getAdminSupportConversations() : Promise.resolve([]),
        canManageBlog ? BlogService.getAllPostsAdmin() : Promise.resolve([]),
        canReviewLaunches ? CategoryService.getProjectCategories() : Promise.resolve([]),
        access.isOwner ? AdminService.getThreatIntelOverview() : Promise.resolve(null),
      ]);
      setListings(nextListings);
      setUsers(nextUsers);
      setStats(nextStats);
      setThreatCount(nextThreatOverview?.totalThreats ?? 0);
      setSupportConversations(nextConversations);
      setBlogPosts(nextBlogPosts);
      setCategories(nextCategories);
      const firstAllowedTab = (['moderation', 'support', 'blog'] as AdminTab[]).find((tab) => canAccessAdminTab(access, tab));
      if (firstAllowedTab) {
        setActiveTab((current) => canAccessAdminTab(access, current) ? current : firstAllowedTab);
      }
    } catch (error) {
      setListings([]);
      setUsers([]);
      setStats(null);
      setThreatCount(0);
      setSupportConversations([]);
      setBlogPosts([]);
      setCategories([]);
      setAdminAccess(null);
      setLoadError(error instanceof Error ? error.message : 'Yönetim verileri alınamadı.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!adminAccess || !canAccessAdminTab(adminAccess, 'support')) return undefined;
    return ChatService.subscribeToInbox(() => {
      void ChatService.getAdminSupportConversations().then(setSupportConversations);
    });
  }, [adminAccess]);

  const handleSponsorship = async (
    project: AdminListingItem,
    hours: 0 | 24 | 72 | 168
  ) => {
    const willSponsor = hours > 0;
    const result = await AdminService.setProjectSponsorship(project.id, hours);
    if (!result.success) {
      Alert.alert('İşlem tamamlanamadı', result.error || 'Vitrin Desteği süresi güncellenemedi.');
      return;
    }
    Alert.alert(
      willSponsor ? 'Vitrin Desteği güncellendi' : 'Vitrin Desteği sonlandırıldı',
      willSponsor
        ? `“${project.title}” projesine ${hours} saat Vitrin Desteği tanımlandı. Proje eşit rotasyona katılacak.`
        : `“${project.title}” projesinin Vitrin Desteği sonlandırıldı.`
    );
    loadData();
  };

  const handleUpdateStatus = async (project: AdminListingItem, status: ProjectStatus) => {
    const result = await AdminService.updateListingStatus(project.id, status);
    if (!result.success) {
      Alert.alert('Durum güncellenemedi', result.error || 'İşlem sunucuda tamamlanamadı.');
      return;
    }
    if (status === 'active') {
      showSuccessDialog(`“${project.title}” vitrine çıkarıldı.`, 'checkmark-circle-outline');
    } else if (status === 'banned') {
      showSuccessDialog(`“${project.title}” askıya alındı.`, 'pause-circle-outline');
    } else {
      showSuccessDialog(`“${project.title}” taslağa alındı.`, 'checkmark-circle-outline');
    }
    loadData();
  };

  const handleDeleteListing = (project: AdminListingItem) => {
    setDeleteTarget(project);
  };

  const openRevisionDialog = (project: AdminListingItem) => {
    setRevisionTarget(project);
  };

  const handleGrantCredits = async (user: AdminUserSummary, amount: number) => {
    const result = await AdminService.grantUserCredits(user.id, amount);
    if (!result.success) {
      Alert.alert('Kredi tanımlanamadı', result.error || 'İşlem sunucuda tamamlanamadı.');
      return;
    }
    Alert.alert('Kredi yüklendi', `“${user.fullName}” hesabına ${amount} kredi tanımlandı. Yeni bakiye: ${result.newCredits ?? 0}`);
    loadData();
  };

  const handleCommentMute = (user: AdminUserSummary) => {
    const isMuted = !!user.commentMutedUntil && Date.parse(user.commentMutedUntil) > Date.now();
    Alert.alert(
      isMuted ? 'Susturmayı kaldır' : 'Yorumları 3 gün kapat',
      isMuted
        ? `“${user.fullName}” yeniden yorum yapabilecek.`
        : `“${user.fullName}” 3 gün boyunca yorum ve yanıt paylaşamayacak.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: isMuted ? 'Susturmayı Kaldır' : '3 Gün Sustur',
          style: isMuted ? 'default' : 'destructive',
          onPress: async () => {
            const result = await AdminService.setUserCommentMute(user.id, !isMuted);
            if (!result.success) {
              Alert.alert('Yorum yetkisi güncellenemedi', result.error || 'İşlem sunucuda tamamlanamadı.');
              return;
            }
            showSuccessDialog(
              isMuted ? `“${user.fullName}” için susturma kaldırıldı.` : `“${user.fullName}” 3 gün süreyle susturuldu.`,
              isMuted ? 'volume-high-outline' : 'volume-mute-outline'
            );
            loadData();
          },
        },
      ]
    );
  };

  const openPermissionDialog = (user: AdminUserSummary) => {
    if (!adminAccess?.isOwner || user.isAdminOwner) return;
    setPermissionTarget(user);
  };

  const handleCloseSupportConversation = (conversation: Conversation) => {
    setSupportCloseTarget(conversation);
  };

  const handleClearSupportMessages = (conversation: Conversation) => {
    setSupportClearTarget(conversation);
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const handleOpenCategoryModal = (project: AdminListingItem) => {
    setCategoryModalTarget(project);
  };

  const handleOpenSupportModal = (project: AdminListingItem) => {
    setSupportModalTarget(project);
  };

  const handleOpenViewModal = (project: AdminListingItem) => {
    setViewModalTarget(project);
  };

  const renderCategoryBadge = (project: AdminListingItem) => {
    const cat = project.categoryId ? categoryMap.get(project.categoryId) : undefined;
    if (cat) {
      const isGame = cat.slug.startsWith('game-');
      return (
        <TouchableOpacity
          style={styles.categoryBadge}
          onPress={() => handleOpenCategoryModal(project)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Kategori: ${cat.name}. Değiştirmek için tıklayın.`}
        >
          <Ionicons name={isGame ? 'game-controller-outline' : 'grid-outline'} size={12} color="#3269C7" />
          <Text style={styles.categoryBadgeText} numberOfLines={1}>{cat.name}</Text>
          <Ionicons name="pencil-outline" size={10} color="#7b9ad6" />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.categoryBadge, styles.categoryBadgeWarning]}
        onPress={() => handleOpenCategoryModal(project)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Kategori atanmamış. Kategori seçmek için tıklayın."
      >
        <Ionicons name="alert-circle-outline" size={12} color="#936413" />
        <Text style={[styles.categoryBadgeText, styles.categoryBadgeTextWarning]} numberOfLines={1}>Kategori Yok</Text>
        <Ionicons name="add-outline" size={11} color="#936413" />
      </TouchableOpacity>
    );
  };

  const filteredListings = useMemo(() => listings.filter((item) => {
    if (listingFilter === 'sponsored' && !item.isBoosted) return false;
    if (listingFilter === 'active' && item.status !== 'active') return false;
    if (listingFilter === 'pending' && item.status !== 'draft') return false;
    if (listingFilter === 'revision' && item.status !== 'inactive') return false;
    if (listingFilter === 'banned' && item.status !== 'banned') return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return item.title.toLocaleLowerCase('tr-TR').includes(query)
      || (item.tagline || '').toLocaleLowerCase('tr-TR').includes(query)
      || (item.seller?.fullName || '').toLocaleLowerCase('tr-TR').includes(query)
      || (item.developerName || '').toLocaleLowerCase('tr-TR').includes(query);
  }), [listings, listingFilter, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return users.filter((user) => user.fullName.toLocaleLowerCase('tr-TR').includes(query)
      || (user.email || '').toLocaleLowerCase('tr-TR').includes(query));
  }, [users, searchQuery]);

  const filteredSupportConversations = useMemo(() => {
    const byStatus = supportConversations.filter((conversation) => supportView === 'closed' ? Boolean(conversation.closedAt) : !conversation.closedAt);
    if (!searchQuery.trim()) return byStatus;
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return byStatus.filter((conversation) => [
      conversation.otherParty?.fullName,
      conversation.lastMessage,
    ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(query));
  }, [supportConversations, searchQuery, supportView]);

  const openSupportCount = useMemo(() => supportConversations.filter((conversation) => !conversation.closedAt).length, [supportConversations]);
  const closedSupportCount = supportConversations.length - openSupportCount;

  const filteredBlogPosts = useMemo(() => {
    if (!searchQuery.trim()) return blogPosts;
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return blogPosts.filter((post) =>
      post.title.toLocaleLowerCase('tr-TR').includes(query) ||
      post.category.toLocaleLowerCase('tr-TR').includes(query) ||
      post.excerpt.toLocaleLowerCase('tr-TR').includes(query)
    );
  }, [blogPosts, searchQuery]);

  const handleOpenBlogModal = (postToEdit?: BlogPost) => {
    setEditingBlogPost(postToEdit || null);
    setIsBlogModalOpen(true);
  };

  const handleTogglePublishBlog = async (post: BlogPost) => {
    const nextState = !post.is_published;
    await BlogService.togglePublish(post.id, nextState);
    setBlogPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_published: nextState } : p)));
    showSuccessDialog(nextState ? 'Yazı yayına alındı.' : 'Yazı taslağa çekildi.', nextState ? 'eye-outline' : 'eye-off-outline');
  };

  const unreadSupportCount = useMemo(
    () => supportConversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [supportConversations],
  );

  const activeSponsors = useMemo(() => listings.filter((item) => item.isBoosted && item.status === 'active'), [listings]);
  const pendingListings = useMemo(() => listings.filter((item) => {
    if (item.status !== 'draft') return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return item.title.toLocaleLowerCase('tr-TR').includes(query)
      || (item.tagline || '').toLocaleLowerCase('tr-TR').includes(query)
      || (item.seller?.fullName || '').toLocaleLowerCase('tr-TR').includes(query)
      || (item.developerName || '').toLocaleLowerCase('tr-TR').includes(query);
  }), [listings, searchQuery]);
  const sponsorListings = useMemo(() => listings.filter((item) => {
    if (item.status !== 'active' && !item.isBoosted) return false;
    if (sponsorView === 'active' && !item.isBoosted) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return item.title.toLocaleLowerCase('tr-TR').includes(query)
      || (item.tagline || '').toLocaleLowerCase('tr-TR').includes(query)
      || (item.seller?.fullName || '').toLocaleLowerCase('tr-TR').includes(query)
      || (item.developerName || '').toLocaleLowerCase('tr-TR').includes(query);
  }), [listings, searchQuery, sponsorView]);

  const activeRatio = stats && stats.totalProjects > 0
    ? Math.min(100, Math.round((stats.activeProjects / stats.totalProjects) * 100)) : 0;
  const sponsorRatio = stats && stats.activeProjects > 0
    ? Math.min(100, Math.round((stats.sponsoredProjects / stats.activeProjects) * 100)) : 0;

  const projectIdentity = (project: AdminListingItem) => (
    <View style={styles.projectIdentity}>
      {project.logoUrl ? (
        <AutoTransparentLogo
          src={project.logoUrl}
          alt={`${project.title} logosu`}
          style={styles.projectLogo}
        />
      ) : (
        <LinearGradient colors={['#F8F9FB', '#F8F9FB']} style={styles.projectLogoFallback}>
          <Text style={styles.projectLogoFallbackText}>{project.title.slice(0, 2).toUpperCase()}</Text>
        </LinearGradient>
      )}
      <View style={styles.projectCopy}>
        <Text style={styles.projectTitle} numberOfLines={1}>{project.title}</Text>
        <Text style={styles.projectTagline} numberOfLines={1}>{project.tagline || 'Dijital proje'}</Text>
        <Text style={styles.projectOwner} numberOfLines={1}>
          {project.isEditorial
            ? `${project.developerName || 'Bilinmeyen geliştirici'} · Kıstas Editör`
            : project.seller?.fullName || 'Anonim geliştirici'}
        </Text>
      </View>
      {onSelectProject ? (
        <GlassIconButton
          icon="arrow-forward"
          size={38}
          iconSize={17}
          onPress={() => onSelectProject(project)}
          accessibilityLabel={`${project.title} detayını aç`}
          style={styles.inspectIcon}
        />
      ) : null}
    </View>
  );

  const emptyState = (message: string) => (
    <View style={styles.emptyState}>
      <GlassIconButton icon="search-outline" size={44} iconSize={21} />
      <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F6FB', '#FFFFFF', '#F5F7FB']} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <GlassIconButton icon="chevron-back" size={42} iconSize={21} onPress={onBack} accessibilityLabel="Geri dön" />
          <View style={styles.headerBrand}>
            <View style={styles.headerLogoBadge}>
              <Image source={KISTAS_LOGO} style={styles.headerLogoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Yönetim Merkezi</Text>
            </View>
          </View>
          <GlassIconButton icon="refresh-outline" size={42} iconSize={20} onPress={loadData} accessibilityLabel="Verileri yenile" disabled={isLoading} />
        </View>
      </View>

      <View style={styles.workspace}>
      <ScrollView decelerationRate={0.99} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.overviewCard}>
          <LinearGradient colors={['#173866', '#285EA5', '#347FC3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.overviewHero}>
            <View style={styles.overviewHeroGlowLarge} />
            <View style={styles.overviewHeroGlowSmall} />
            <View style={styles.overviewTopRow}>
              <View style={styles.overviewCopy}>
                <Text style={styles.overviewLabel}>OPERASYON ÖZETİ</Text>
                <Text style={styles.overviewTitle}>Genel bakış</Text>
                <Text style={styles.overviewSubtitle}>Platformun yayın, topluluk ve destek akışını tek merkezden yönetin.</Text>
              </View>
              <View style={styles.overviewAuthority}>
                <View style={styles.overviewAuthorityDot} />
                <Text style={styles.overviewAuthorityText}>{adminAccess?.isOwner ? 'Süper Yönetici' : adminAccess ? 'Ekip Yetkilisi' : 'Yetki doğrulanıyor'}</Text>
              </View>
            </View>
            <View style={styles.overviewMetaRow}>
              <Text style={styles.overviewMetaText}>{adminAccess?.isOwner ? '8 yönetim alanı' : `${adminAccess?.permissions.length || 0} görev yetkisi`}</Text>
            </View>
          </LinearGradient>
          <View style={styles.metricsGrid}>
            {[
              ['time-outline', '#936413', pendingListings.length, 'Onay bekleyen', 'moderation'],
              ['chatbubbles-outline', '#3269C7', supportConversations.length, 'Açık destek', 'support'],
              ['eye-outline', '#3269C7', stats?.sponsoredProjects || 0, 'Aktif Vitrin Desteği', 'sponsors'],
              ['apps-outline', '#3269C7', stats?.totalProjects || 0, 'Toplam proje', 'listings'],
              ['people-outline', '#187657', stats?.totalUsers || 0, 'Topluluk', 'users'],
              ['newspaper-outline', '#3269C7', blogPosts.length, 'Blog yazıları', 'blog'],
              ['analytics-outline', '#5c576b', stats?.totalUpvotes || 0, 'Toplam etkileşim', 'analytics'],
              ['shield-half-outline', '#BD354C', threatCount, 'Siber Tehdit Radarı', 'threat_intel'],
            ].filter((entry) => Boolean(adminAccess && canAccessAdminTab(adminAccess, entry[4] as AdminTab))).map(([icon, color, value, label, targetTab]) => {
              const metricTab = targetTab as AdminTab;
              const surface = METRIC_SURFACES[metricTab];
              const isActiveMetric = activeTab === targetTab;
              return (
                <TouchableOpacity
                  key={label as string}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} detaylarını aç`}
                  onPress={() => { setActiveTab(metricTab); setSearchQuery(''); }}
                  activeOpacity={0.82}
                  style={[styles.metricCard, wide && styles.metricCardWide, !wide && styles.metricCardMobile, isActiveMetric && styles.metricCardActive]}
                >
                  <LinearGradient colors={[...surface.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.metricSheen} />
                  {isActiveMetric ? <View style={[styles.metricActiveRail, { backgroundColor: color as string }]} /> : null}
                  <View style={styles.metricTopRow}>
                    <GlassIconButton icon={icon as IoniconName} iconColor={color as string} size={39} iconSize={19} active={isActiveMetric} />
                    {targetTab === 'support' && unreadSupportCount > 0 ? (
                      <View style={styles.metricAlertBadge}><Text style={styles.metricAlertText}>{unreadSupportCount} yeni</Text></View>
                    ) : null}
                  </View>
                  <Text style={styles.metricValue}>{formatNumber(value as number)}</Text>
                  <Text style={styles.metricLabel}>{label as string}</Text>
                  <View style={[styles.metricArrow, isActiveMetric && styles.metricArrowActive]}>
                    <Ionicons name="arrow-forward" size={13} color={isActiveMetric ? '#FFFFFF' : '#69758A'} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {adminAccess && canAccessAdminTab(adminAccess, activeTab) && activeTab !== 'analytics' && activeTab !== 'threat_intel' ? (
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#686474" />
            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={activeTab === 'users' ? 'İsim veya e-posta ara' : activeTab === 'support' ? 'Kullanıcı veya mesaj ara' : activeTab === 'blog' ? 'Blog yazısı veya kategori ara' : 'Proje veya geliştirici ara'} placeholderTextColor="#686474" style={styles.searchInput} autoCorrect={false} />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}><Ionicons name="close-circle" size={18} color="#686474" /></TouchableOpacity> : null}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'moderation') && activeTab === 'moderation' ? (
          <View style={styles.section}>
            <SectionHeading
              icon="shield-checkmark-outline"
              iconColor="#936413"
              title="Lansman Onayları"
              subtitle="Kullanıcıların gönderdiği projeleri inceleyin, onaylayın veya gerekçeli düzeltme isteyin."
            />
            {pendingListings.length === 0 ? (
              emptyState('Şu anda onay bekleyen yeni lansman bulunmuyor. Tüm projeler incelendi.')
            ) : (
              pendingListings.map((project) => (
                <View key={project.id} style={[styles.dataCard, styles.moderationCard]}>
                  {projectIdentity(project)}

                  <View style={styles.statusRow}>
                    <StatusPill label="Onay Bekliyor" tone="gold" icon="time-outline" />
                    {renderCategoryBadge(project)}
                    <Text style={styles.inlineMeta}>{(project.platforms || ['iOS']).join(' · ')}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.inlineMeta}>{project.pricingModel || 'freemium'}</Text>
                    {project.promoCode ? (
                      <>
                        <View style={styles.metaDot} />
                        <Text style={styles.inlineMeta}>Kod: {project.promoCode}</Text>
                      </>
                    ) : null}
                  </View>

                  {project.description ? (
                    <View style={styles.moderationDescriptionBox}>
                      <Text style={styles.moderationDescriptionText} numberOfLines={5}>
                        {project.description}
                      </Text>
                    </View>
                  ) : null}

                  {project.appStoreUrl || project.playStoreUrl || project.webUrl ? (
                    <View style={styles.linksRow}>
                      {project.appStoreUrl ? (
                        <View style={styles.linkBadge}>
                          <Ionicons name="logo-apple" size={12} color="#3269C7" />
                          <Text style={styles.linkBadgeText} numberOfLines={1}>App Store</Text>
                        </View>
                      ) : null}
                      {project.playStoreUrl ? (
                        <View style={styles.linkBadge}>
                          <Ionicons name="logo-google-playstore" size={12} color="#187657" />
                          <Text style={styles.linkBadgeText} numberOfLines={1}>Play Store</Text>
                        </View>
                      ) : null}
                      {project.webUrl ? (
                        <View style={styles.linkBadge}>
                          <Ionicons name="globe-outline" size={12} color="#3269C7" />
                          <Text style={styles.linkBadgeText} numberOfLines={1}>{project.webUrl}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {project.images && project.images.length > 0 ? (
                    <View style={styles.moderationGallery}>
                      <Text style={styles.moderationGalleryLabel}>
                        Vitrin Görselleri ({project.images.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moderationThumbRow}>
                        {project.images.map((img, idx) => (
                          <View key={img.id || idx} style={styles.moderationThumbWrap}>
                            <Image source={{ uri: img.imageUrl }} style={styles.moderationThumb} resizeMode="cover" />
                            {img.isCover ? (
                              <View style={styles.coverBadgeMini}>
                                <Text style={styles.coverBadgeMiniText}>KAPAK</Text>
                              </View>
                            ) : null}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <ActionButton
                      label="Destek Ver"
                      icon="rocket-outline"
                      tone="gold"
                      onPress={() => handleOpenSupportModal(project)}
                    />
                    <ActionButton
                      label="Kategori Değiştir"
                      icon="folder-open-outline"
                      tone="blue"
                      onPress={() => handleOpenCategoryModal(project)}
                    />
                    <ActionButton
                      label="Onayla ve Vitrine Çıkar"
                      icon="checkmark-circle-outline"
                      tone="green"
                      onPress={() => handleUpdateStatus(project, 'active')}
                    />
                    <ActionButton
                      label="Düzeltme İste"
                      icon="construct-outline"
                      tone="gold"
                      onPress={() => openRevisionDialog(project)}
                    />
                    <ActionButton
                      label="Sil"
                      icon="trash-outline"
                      tone="neutral"
                      onPress={() => handleDeleteListing(project)}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'support') && activeTab === 'support' ? (
          <View style={styles.section}>
            <SectionHeading
              icon="chatbubbles-outline"
              iconColor="#3269C7"
              title="Destek talepleri"
              subtitle="Footer üzerinden açılan kullanıcı görüşmeleri doğrudan burada görünür."
            />
            <View style={styles.supportViewRail}>
              {([['open', `Açık (${openSupportCount})`], ['closed', `Sonlandırılan (${closedSupportCount})`]] as const).map(([key, label]) => {
                const selected = supportView === key;
                return (
                  <TouchableOpacity key={key} style={[styles.supportViewButton, selected && styles.supportViewButtonActive]} onPress={() => setSupportView(key)} activeOpacity={0.74}>
                    <Text style={[styles.supportViewText, selected && styles.supportViewTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredSupportConversations.length === 0 ? (
              emptyState(supportView === 'open' ? 'Şu anda açık bir destek görüşmesi bulunmuyor.' : 'Henüz sonlandırılmış bir destek görüşmesi bulunmuyor.')
            ) : filteredSupportConversations.map((conversation) => {
              const partyName = conversation.otherParty?.fullName || 'Kıstas Üyesi';
              const lastActivity = conversation.lastMessageAt
                ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(conversation.lastMessageAt))
                : 'Yeni görüşme';
              return (
                <View key={conversation.id} style={[styles.dataCard, conversation.unreadCount > 0 && styles.supportCardUnread]}>
                  <View style={styles.userHeader}>
                    <ProfileAvatar avatarUrl={conversation.otherParty?.avatarUrl} size={50} logoSize={40} />
                    <View style={styles.userCopy}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName} numberOfLines={1}>{partyName}</Text>
                        {conversation.unreadCount > 0 ? <StatusPill label={`${conversation.unreadCount} yeni`} tone="blue" icon="mail-unread-outline" /> : null}
                        {conversation.closedAt ? <StatusPill label="Sonlandırıldı" tone="neutral" icon="checkmark-done-outline" /> : <StatusPill label="Açık" tone="green" icon="radio-button-on-outline" />}
                      </View>
                      <Text style={styles.userEmail} numberOfLines={1}>{conversation.lastMessage || 'Destek görüşmesi başlatıldı.'}</Text>
                      <Text style={styles.supportTime}>{lastActivity}</Text>
                    </View>
                  </View>
                  <View style={styles.actionsRow}>
                    <ActionButton label="Görüşmeyi aç" icon="arrow-forward-outline" tone="blue" onPress={() => onOpenConversation?.(conversation)} />
                    {!conversation.closedAt ? <ActionButton label="Sohbeti Sonlandır" icon="checkmark-done-outline" tone="gold" onPress={() => handleCloseSupportConversation(conversation)} /> : null}
                    {conversation.closedAt ? <ActionButton label="Mesajları Sil" icon="trash-outline" tone="red" onPress={() => handleClearSupportMessages(conversation)} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'sponsors') && activeTab === 'sponsors' ? (
          <View style={styles.section}>
            <SectionHeading icon="eye-outline" iconColor="#3269C7" title="Vitrin Desteği" subtitle="Seçtiğiniz projeye süreli editoryal erişim sağlayın. Gerçek görüntülenme sayısı ayrı tutulur." />
            <View style={styles.sponsorPreview}>
              <View style={styles.sponsorPreviewHeader}>
                <View>
                  <Text style={styles.sponsorPreviewEyebrow}>CANLI ÖNİZLEME</Text>
                  <Text style={styles.sponsorPreviewTitle}>{activeSponsors.length} aktif Vitrin Desteği</Text>
                </View>
                <StatusPill label="Otomatik akış" tone="green" icon="sync-outline" />
              </View>
              <SponsorLogoMarquee
                projects={activeSponsors}
                label="VİTRİN DESTEĞİ ALAN PROJELER"
                emptyMessage="Aktif Vitrin Desteği yok. Aşağıdan bir projeye süre tanımlayın."
              />
            </View>
            <View style={styles.sponsorToolbar}>
              {([
                ['active', `Destek alan (${activeSponsors.length})`],
                ['all', `Tüm uygun projeler (${listings.filter((item) => item.status === 'active' || item.isBoosted).length})`],
              ] as Array<[SponsorView, string]>).map(([key, label]) => {
                const selected = sponsorView === key;
                return (
                  <TouchableOpacity key={key} style={[styles.sponsorViewButton, selected && styles.sponsorViewButtonActive]} onPress={() => setSponsorView(key)} activeOpacity={0.72}>
                    <Text style={[styles.sponsorViewText, selected && styles.sponsorViewTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {sponsorListings.length === 0 ? emptyState(sponsorView === 'active' ? 'Aktif Vitrin Desteği bulunmuyor. Uygun projelerden birini seçebilirsiniz.' : 'Aramanıza uygun bir proje bulunamadı.') : sponsorListings.map((project) => (
              <View key={project.id} style={[styles.dataCard, project.isBoosted && styles.dataCardBoosted]}>
                {projectIdentity(project)}
                <View style={styles.statusRow}>
                  {project.isBoosted ? <StatusPill label="Vitrin Desteği aktif" tone="blue" icon="eye-outline" /> : <StatusPill label="Desteğe uygun" tone="neutral" icon="add-circle-outline" />}
                  {!project.logoUrl ? <StatusPill label="Logo eksik" tone="gold" icon="image-outline" /> : null}
                  <Text style={styles.inlineMeta}>{formatNumber(project.viewCount)} görüntülenme</Text><View style={styles.metaDot} /><Text style={styles.inlineMeta}>{formatNumber(project.upvotesCount)} destek</Text><View style={styles.metaDot} /><Text style={styles.inlineMeta}>{formatSponsorExpiry(project.boostedUntil)}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <ActionButton
                    label="Görünürlük Ekle"
                    icon="eye-outline"
                    tone="blue"
                    onPress={() => handleOpenViewModal(project)}
                  />
                  <ActionButton label={project.isBoosted ? '+24 saat' : '24 saat destek ver'} icon={project.isBoosted ? 'time-outline' : 'eye-outline'} tone="blue" onPress={() => handleSponsorship(project, 24)} />
                  <ActionButton label="+3 gün" icon="calendar-outline" tone="blue" onPress={() => handleSponsorship(project, 72)} />
                  <ActionButton label="+7 gün" icon="calendar-number-outline" tone="gold" onPress={() => handleSponsorship(project, 168)} />
                  {project.isBoosted ? <ActionButton label="Desteği sonlandır" icon="close-outline" tone="red" onPress={() => handleSponsorship(project, 0)} /> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'listings') && activeTab === 'listings' ? (
          <View style={styles.section}>
            <SectionHeading icon="shield-checkmark-outline" iconColor="#3269C7" title="Proje moderasyonu" subtitle="Yayın durumlarını denetleyin ve içerikleri inceleyin." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
              {FILTERS.map((filter) => {
                const selected = listingFilter === filter.key;
                return <TouchableOpacity key={filter.key} style={[styles.filterButton, selected && styles.filterButtonActive]} onPress={() => setListingFilter(filter.key)} activeOpacity={0.72}><Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text></TouchableOpacity>;
              })}
            </ScrollView>
            {filteredListings.length === 0 ? emptyState('Bu filtrede görüntülenecek proje bulunmuyor.') : filteredListings.map((project) => {
              const status = project.status === 'active'
                ? { label: 'Aktif', tone: 'green' as Tone, icon: 'checkmark-circle-outline' as IoniconName }
                : project.status === 'banned'
                  ? { label: 'Askıda', tone: 'red' as Tone, icon: 'ban-outline' as IoniconName }
                  : project.status === 'inactive'
                    ? { label: 'Düzeltme İstendi', tone: 'gold' as Tone, icon: 'construct-outline' as IoniconName }
                    : { label: 'İncelemede', tone: 'gold' as Tone, icon: 'time-outline' as IoniconName };
              return (
                <View key={project.id} style={styles.dataCard}>
                  {projectIdentity(project)}
                  <View style={styles.statusRow}>
                    <StatusPill {...status} />
                    {renderCategoryBadge(project)}
                    <View style={styles.inlineUpvotesBadge}>
                      <Ionicons name="arrow-up-circle" size={13} color="#D97706" />
                      <Text style={styles.inlineUpvotesText}>{formatNumber(project.upvotesCount)} destek</Text>
                    </View>
                    <Text style={styles.inlineMeta}>{formatNumber(project.viewCount)} görüntülenme</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.inlineMeta}>{(project.platforms || ['iOS']).join(' · ')}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.inlineMeta}>{project.pricingModel}</Text>
                  </View>
                  <View style={styles.actionsRow}>
                    <ActionButton
                      label="Destek Ver"
                      icon="rocket-outline"
                      tone="gold"
                      onPress={() => handleOpenSupportModal(project)}
                    />
                    <ActionButton
                      label="Görünürlük Arttır"
                      icon="eye-outline"
                      tone="blue"
                      onPress={() => handleOpenViewModal(project)}
                    />
                    <ActionButton label="Kategori Değiştir" icon="folder-open-outline" tone="blue" onPress={() => handleOpenCategoryModal(project)} />
                    {project.status === 'draft' || project.status === 'banned' ? <ActionButton label="Yayına al" icon="checkmark-outline" tone="green" onPress={() => handleUpdateStatus(project, 'active')} /> : null}
                    {project.status !== 'banned' ? <ActionButton label="Askıya al" icon="pause-outline" tone="gold" onPress={() => handleUpdateStatus(project, 'banned')} /> : null}
                    <ActionButton label="Sil" icon="trash-outline" tone="red" onPress={() => handleDeleteListing(project)} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'users') && activeTab === 'users' ? (
          <View style={styles.section}>
            <SectionHeading
              icon="people-outline"
              iconColor="#3269C7"
              title={adminAccess?.isOwner ? 'Kullanıcı ve Ekip Yönetimi' : 'Yorum Yönetimi'}
              subtitle={adminAccess?.isOwner ? 'Hesapları, ekip görevlerini ve yorum yetkilerini yönetin.' : 'Topluluk yorum yetkilerini güvenli biçimde yönetin.'}
            />
            {filteredUsers.length === 0 ? emptyState('Aramanıza uygun bir kullanıcı bulunamadı.') : filteredUsers.map((user) => {
              const isCommentMuted = !!user.commentMutedUntil && Date.parse(user.commentMutedUntil) > Date.now();
              return (
              <View key={user.id} style={styles.dataCard}>
                <View style={styles.userHeader}>
                  <LinearGradient colors={['#F8F9FB', '#F8F9FB']} style={styles.userAvatar}><Text style={styles.userAvatarText}>{initials(user.fullName)}</Text></LinearGradient>
                  <View style={styles.userCopy}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName} numberOfLines={1}>{user.fullName}</Text>
                      {user.role === 'admin' ? <StatusPill label="Süper Yönetici" tone="gold" icon="shield-outline" /> : user.role === 'staff' ? <StatusPill label="Ekip Yetkilisi" tone="blue" icon="shield-checkmark-outline" /> : user.isVerified ? <Ionicons name="checkmark-circle" size={16} color="#25364E" /> : null}
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>{user.email || 'E-posta tanımlanmamış'}</Text>
                  </View>
                </View>
                {adminAccess?.isOwner ? <View style={styles.userMetrics}>
                  <UserMetric value={formatNumber(user.boostCredits)} label="Kredi" />
                  <View style={styles.userMetricDivider} />
                  <UserMetric value={`₺${formatNumber(user.balance)}`} label="Bakiye" />
                  <View style={styles.userMetricDivider} />
                  <UserMetric value={formatNumber(user.projectsCount)} label="Proje" />
                </View> : null}
                {adminAccess?.isOwner ? <View style={styles.creditRow}>
                  <Text style={styles.creditLabel}>Hızlı kredi</Text>
                  <View style={styles.creditActions}>
                    <ActionButton label="+50" icon="add-outline" tone="blue" onPress={() => handleGrantCredits(user, 50)} />
                    <ActionButton label="+100" icon="add-outline" tone="blue" onPress={() => handleGrantCredits(user, 100)} />
                    <ActionButton label="+500" icon="flash-outline" tone="gold" onPress={() => handleGrantCredits(user, 500)} />
                  </View>
                </View> : null}
                {adminAccess?.isOwner && !user.isAdminOwner ? (
                  <View style={styles.moderationRow}>
                    <View style={styles.moderationCopy}>
                      <Text style={styles.creditLabel}>Yönetim ekibi</Text>
                      <Text style={styles.moderationStatus}>
                        {user.adminPermissions.length > 0
                          ? ADMIN_PERMISSION_OPTIONS.filter((item) => user.adminPermissions.includes(item.key)).map((item) => item.title).join(' · ')
                          : 'Yönetim erişimi yok'}
                      </Text>
                    </View>
                    <ActionButton
                      label={user.adminPermissions.length > 0 ? 'Yetkileri Düzenle' : 'Yetki Ver'}
                      icon="key-outline"
                      tone="blue"
                      onPress={() => openPermissionDialog(user)}
                    />
                  </View>
                ) : null}
                {user.role === 'user' ? (
                  <View style={styles.moderationRow}>
                    <View style={styles.moderationCopy}>
                      <Text style={styles.creditLabel}>Yorum yetkisi</Text>
                      <Text style={styles.moderationStatus}>
                        {isCommentMuted && user.commentMutedUntil
                          ? `${formatCommentMuteExpiry(user.commentMutedUntil)} tarihine kadar kapalı`
                          : 'Yorumlara açık'}
                      </Text>
                    </View>
                    <ActionButton
                      label={isCommentMuted ? 'Susturmayı Kaldır' : '3 Gün Sustur'}
                      icon={isCommentMuted ? 'volume-high-outline' : 'volume-mute-outline'}
                      tone={isCommentMuted ? 'neutral' : 'red'}
                      onPress={() => handleCommentMute(user)}
                    />
                  </View>
                ) : null}
              </View>
              );
            })}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'blog') && activeTab === 'blog' ? (
          <View style={styles.section}>
            <View style={styles.blogSectionHeader}>
              <SectionHeading
                icon="newspaper-outline"
                iconColor="#3269C7"
                title="Blog ve İçerik Yönetimi"
                subtitle="SEO odaklı makaleler, rehberler ve dizin içeriklerini yönetin."
              />
              <TouchableOpacity
                style={styles.blogCreateBtn}
                onPress={() => handleOpenBlogModal()}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={17} color="#FAFBFD" />
                <Text style={styles.blogCreateBtnText}>Yeni Makale Ekle</Text>
              </TouchableOpacity>
            </View>

            {filteredBlogPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <GlassIconButton icon="newspaper-outline" size={44} iconSize={21} />
                <Text style={styles.emptyTitle}>Makale bulunamadı</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Aramanızla eşleşen bir yazı bulunamadı.' : 'Henüz oluşturulmuş bir blog içeriği yok.'}
                </Text>
              </View>
            ) : (
              filteredBlogPosts.map((post) => (
                <View key={post.id} style={styles.dataCard}>
                  <View style={styles.blogCardHeader}>
                    {post.cover_image_url ? (
                      <Image source={{ uri: post.cover_image_url }} style={styles.blogCardThumb} />
                    ) : (
                      <View style={[styles.blogCardThumb, styles.blogCardThumbFallback]}>
                        <Ionicons name="newspaper-outline" size={24} color="#3269C7" />
                      </View>
                    )}
                    <View style={styles.blogCardMain}>
                      <View style={styles.blogBadgeRow}>
                        <StatusPill
                          label={post.is_published ? 'Yayında' : 'Taslak'}
                          tone={post.is_published ? 'green' : 'neutral'}
                          icon={post.is_published ? 'checkmark-circle-outline' : 'document-outline'}
                        />
                        <View style={styles.blogCategoryBadge}>
                          <Text style={styles.blogCategoryBadgeText}>{post.category}</Text>
                        </View>
                      </View>
                      <Text style={styles.blogCardTitle} numberOfLines={2}>{post.title}</Text>
                      <Text style={styles.blogCardSlug} numberOfLines={1}>/blog/{post.slug}</Text>
                      <View style={styles.blogMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#686474" />
                        <Text style={styles.blogMetaText}>{post.reading_time_minutes} dk okuma</Text>
                        <Text style={styles.metaDot} />
                        <Ionicons name="eye-outline" size={12} color="#686474" />
                        <Text style={styles.blogMetaText}>{post.view_count} okunma</Text>
                        <Text style={styles.metaDot} />
                        <Text style={styles.blogMetaText}>
                          {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(post.created_at || Date.now()))}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {post.excerpt ? (
                    <Text style={styles.blogCardExcerpt} numberOfLines={2}>{post.excerpt}</Text>
                  ) : null}

                  <View style={styles.actionsRow}>
                    {onOpenBlog ? (
                      <ActionButton
                        label="Sitede Gör"
                        icon="open-outline"
                        tone="blue"
                        onPress={() => onOpenBlog(post.slug)}
                      />
                    ) : null}
                    <ActionButton
                      label={post.is_published ? 'Taslağa Al' : 'Yayına Al'}
                      icon={post.is_published ? 'eye-off-outline' : 'globe-outline'}
                      tone={post.is_published ? 'neutral' : 'green'}
                      onPress={() => handleTogglePublishBlog(post)}
                    />
                    <ActionButton
                      label="Düzenle"
                      icon="create-outline"
                      tone="blue"
                      onPress={() => handleOpenBlogModal(post)}
                    />
                    <ActionButton
                      label="Sil"
                      icon="trash-outline"
                      tone="red"
                      onPress={() => setDeleteBlogTarget(post)}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'analytics') && activeTab === 'analytics' && stats ? (
          <View style={styles.section}>
            <SectionHeading icon="analytics-outline" iconColor="#3269C7" title="Platform sağlığı" subtitle="Kıstas ekosisteminin anlık operasyon görünümü." />
            <View style={styles.healthCard}>
              <View style={styles.healthHeader}>
                <View><Text style={styles.healthEyebrow}>YAYIN ORANI</Text><Text style={styles.healthValue}>%{activeRatio}</Text></View>
                <GlassIconButton icon="pulse-outline" size={44} iconSize={22} />
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${activeRatio}%` }]} /></View>
              <Text style={styles.healthCaption}>{formatNumber(stats.activeProjects)} proje yayında, {formatNumber(stats.pendingProjects)} proje inceleme bekliyor.</Text>
            </View>
            <View style={styles.analyticsGrid}>
              <AnalyticsCard icon="arrow-up-circle-outline" color="#25364E" value={formatNumber(stats.totalUpvotes)} label="Topluluk oyu" caption="Toplam etkileşim" />
              <AnalyticsCard icon="sync-outline" color="#25364E" value={`%${sponsorRatio}`} label="Sponsor oranı" caption="Aktif projeler içinde" />
              <AnalyticsCard icon="wallet-outline" color="#25364E" value={formatNumber(stats.circulatingCredits)} label="Kredi hacmi" caption="Dolaşımdaki bakiye" />
              <AnalyticsCard icon="time-outline" color="#bd354c" value={formatNumber(stats.pendingProjects)} label="Bekleyen işlem" caption="Moderasyon kuyruğu" />
            </View>
          </View>
        ) : null}

        {adminAccess && canAccessAdminTab(adminAccess, 'threat_intel') && activeTab === 'threat_intel' ? (
          <ThreatIntelligenceView onRefreshStats={loadData} />
        ) : null}

        {loadError ? <View style={styles.emptyState}><GlassIconButton icon="shield-outline" iconColor="#bd354c" size={44} iconSize={21} /><Text style={styles.emptyTitle}>Yönetim verileri açılamadı</Text><Text style={styles.emptyText}>{loadError}</Text></View> : null}
        {isLoading && !stats ? <View style={styles.loadingState}><ActivityIndicator color="#25364E" /><Text style={styles.loadingText}>Yönetim verileri hazırlanıyor</Text></View> : null}
      </ScrollView>
      </View>

      <AdminPermissionModal
        target={permissionTarget}
        isOwner={Boolean(adminAccess?.isOwner)}
        onClose={() => setPermissionTarget(null)}
        onSuccess={(msg, icon) => {
          showSuccessDialog(msg, icon);
          void loadData();
        }}
      />

      <AdminSupportModals
        closeTarget={supportCloseTarget}
        clearTarget={supportClearTarget}
        onCancelClose={() => setSupportCloseTarget(null)}
        onCancelClear={() => setSupportClearTarget(null)}
        onSuccess={(msg, icon) => {
          showSuccessDialog(msg, icon);
          void loadData();
        }}
      />

      <AdminProjectModals
        categoryTarget={categoryModalTarget}
        categories={categories}
        onCloseCategory={() => setCategoryModalTarget(null)}
        supportTarget={supportModalTarget}
        onCloseSupport={() => setSupportModalTarget(null)}
        viewsTarget={viewModalTarget}
        onCloseViews={() => setViewModalTarget(null)}
        revisionTarget={revisionTarget}
        onCloseRevision={() => setRevisionTarget(null)}
        deleteTarget={deleteTarget}
        onCloseDelete={() => setDeleteTarget(null)}
        onSuccess={showSuccessDialog}
        onRefresh={loadData}
      />

      <AdminBlogModal
        isOpen={isBlogModalOpen}
        editingPost={editingBlogPost}
        deleteTarget={deleteBlogTarget}
        onClose={() => {
          setIsBlogModalOpen(false);
          setEditingBlogPost(null);
        }}
        onSaved={(msg, icon) => {
          showSuccessDialog(msg, icon);
          void BlogService.getAllPostsAdmin().then(setBlogPosts);
        }}
        onDeleted={(msg, icon) => {
          showSuccessDialog(msg, icon);
          setBlogPosts((prev) => prev.filter((p) => p.id !== deleteBlogTarget?.id));
          setDeleteBlogTarget(null);
        }}
        onCancelDelete={() => setDeleteBlogTarget(null)}
      />

      <Modal
        visible={Boolean(successDialog)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSuccessDialog(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            accessibilityRole="alert"
            style={[
              styles.successCommandDialog,
              {
                opacity: successDialogProgress,
                transform: [
                  { translateY: successDialogProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                  { scale: successDialogProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.98)', '#F1F8F5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successDialogHeader}
            >
              <GlassIconButton
                icon={successDialog?.icon || 'checkmark-circle-outline'}
                iconColor="#187657"
                size={46}
                iconSize={21}
                accessibilityLabel="İşlem başarılı"
              />
              <View style={styles.successDialogCopy}>
                <Text style={styles.successDialogEyebrow}>KISTAS YÖNETİM</Text>
                <Text style={styles.successDialogTitle}>İşlem tamamlandı</Text>
              </View>
              <View style={styles.successStatusDot}>
                <Ionicons name="checkmark" size={14} color="#187657" />
              </View>
            </LinearGradient>
            <View style={styles.successDialogBody}>
              <View style={styles.successMessageRow}>
                <View style={styles.successMessageMark}>
                  <Ionicons name="checkmark" size={13} color="#187657" />
                </View>
                <Text style={styles.successMessage}>{successDialog?.message}</Text>
              </View>
              <TouchableOpacity style={styles.successDoneButton} onPress={() => setSuccessDialog(null)} activeOpacity={0.72}>
                <Text style={styles.successDoneText}>Tamam</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <LinearGradient colors={['#3269C7', '#91B3A6', '#187657']} style={styles.successAccentLine} />
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
};

const SectionHeading = ({ icon, iconColor, title, subtitle }: { icon: IoniconName; iconColor: string; title: string; subtitle: string }) => (
  <View style={styles.sectionHeading}>
    <GlassIconButton icon={icon} iconColor={iconColor} size={42} iconSize={18} />
    <View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>
  </View>
);

const UserMetric = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.userMetric}><Text style={styles.userMetricValue}>{value}</Text><Text style={styles.userMetricLabel}>{label}</Text></View>
);

const AnalyticsCard = ({ icon, color, value, label, caption }: { icon: IoniconName; color: string; value: string; label: string; caption: string }) => (
  <View style={styles.analyticsCard}>
    <GlassIconButton icon={icon} iconColor={color} size={42} iconSize={21} />
    <Text style={styles.analyticsValue}>{value}</Text><Text style={styles.analyticsLabel}>{label}</Text><Text style={styles.analyticsCaption}>{caption}</Text>
  </View>
);

import { styles } from './AdminDashboardScreen.styles';
