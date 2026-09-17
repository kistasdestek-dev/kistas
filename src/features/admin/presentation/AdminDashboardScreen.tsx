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
import { BlogPost, BLOG_CATEGORIES, generateSlug } from '../../blog/domain/BlogPost';
import { BlogService } from '../../blog/application/BlogService';
import { CategoryService, Category } from '../../categories/application/CategoryService';
import { ThreatIntelligenceView } from './ThreatIntelligenceView';
import { kistasStyle, theme } from '../../../core/theme';

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
  threat_intel: { gradient: ['#10192A', '#1E293B'] },
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
  const [supportConversations, setSupportConversations] = useState<Conversation[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [blogFormTitle, setBlogFormTitle] = useState('');
  const [blogFormSlug, setBlogFormSlug] = useState('');
  const [blogFormExcerpt, setBlogFormExcerpt] = useState('');
  const [blogFormContent, setBlogFormContent] = useState('');
  const [blogFormCover, setBlogFormCover] = useState('');
  const [blogFormCategory, setBlogFormCategory] = useState('Girişimcilik');
  const [blogFormPublished, setBlogFormPublished] = useState(true);
  const [isSavingBlog, setIsSavingBlog] = useState(false);
  const [deleteBlogTarget, setDeleteBlogTarget] = useState<BlogPost | null>(null);
  const [isDeletingBlog, setIsDeletingBlog] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryModalTarget, setCategoryModalTarget] = useState<AdminListingItem | null>(null);
  const [selectedNewCategoryId, setSelectedNewCategoryId] = useState<string | null>(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categorySegment, setCategorySegment] = useState<'all' | 'game' | 'app'>('all');
  const [supportModalTarget, setSupportModalTarget] = useState<AdminListingItem | null>(null);
  const [supportAmount, setSupportAmount] = useState<number>(1);
  const [customSupportInput, setCustomSupportInput] = useState<string>('');
  const [isGrantingSupport, setIsGrantingSupport] = useState<boolean>(false);
  const [supportModalError, setSupportModalError] = useState<string | null>(null);
  const [viewModalTarget, setViewModalTarget] = useState<AdminListingItem | null>(null);
  const [viewAmount, setViewAmount] = useState<number>(50);
  const [customViewInput, setCustomViewInput] = useState<string>('');
  const [isGrantingViews, setIsGrantingViews] = useState<boolean>(false);
  const [viewModalError, setViewModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listingFilter, setListingFilter] = useState<AdminListingFilter>('all');
  const [sponsorView, setSponsorView] = useState<SponsorView>('active');
  const [supportView, setSupportView] = useState<SupportView>('open');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<SuccessDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminListingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<AdminListingItem | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [supportCloseTarget, setSupportCloseTarget] = useState<Conversation | null>(null);
  const [isClosingSupportConversation, setIsClosingSupportConversation] = useState(false);
  const [supportCloseError, setSupportCloseError] = useState<string | null>(null);
  const [supportClearTarget, setSupportClearTarget] = useState<Conversation | null>(null);
  const [isClearingSupportMessages, setIsClearingSupportMessages] = useState(false);
  const [supportClearError, setSupportClearError] = useState<string | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<AdminUserSummary | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
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
      const [nextListings, nextUsers, nextStats, nextConversations, nextBlogPosts, nextCategories] = await Promise.all([
        canReviewLaunches ? AdminService.getAllListings() : Promise.resolve([]),
        canManageCommunity ? AdminService.getAllUsers() : Promise.resolve([]),
        access.isOwner ? AdminService.getPlatformStats() : Promise.resolve(null),
        canManageCommunity ? ChatService.getAdminSupportConversations() : Promise.resolve([]),
        canManageBlog ? BlogService.getAllPostsAdmin() : Promise.resolve([]),
        canReviewLaunches ? CategoryService.getProjectCategories() : Promise.resolve([]),
      ]);
      setListings(nextListings);
      setUsers(nextUsers);
      setStats(nextStats);
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
    setRevisionFeedback('');
    setRevisionError(null);
  };

  const closeRevisionDialog = () => {
    if (isRequestingRevision) return;
    setRevisionTarget(null);
    setRevisionFeedback('');
    setRevisionError(null);
  };

  const confirmRevisionRequest = async () => {
    if (!revisionTarget || isRequestingRevision) return;
    const feedback = revisionFeedback.trim();
    if (feedback.length < 10) {
      setRevisionError('Lütfen kullanıcıya yol gösterecek en az 10 karakterlik bir açıklama yazın.');
      return;
    }
    setIsRequestingRevision(true);
    setRevisionError(null);
    const project = revisionTarget;
    const result = await AdminService.requestListingRevision(project.id, feedback);
    setIsRequestingRevision(false);
    if (!result.success) {
      setRevisionError(result.error || 'Düzeltme talebi gönderilemedi.');
      return;
    }
    setRevisionTarget(null);
    setRevisionFeedback('');
    showSuccessDialog(`“${project.title}” düzeltme için geliştiriciye gönderildi.`, 'construct-outline');
    loadData();
  };

  const confirmDeleteListing = async () => {
    if (!deleteTarget || isDeleting) return;
    const project = deleteTarget;
    setIsDeleting(true);
    const result = await AdminService.deleteListing(project.id);
    setIsDeleting(false);
    if (!result.success) {
      Alert.alert('Proje silinemedi', result.error || 'İşlem sunucuda tamamlanamadı.');
      return;
    }
    setDeleteTarget(null);
    showSuccessDialog(`“${project.title}” kalıcı olarak silindi.`, 'trash-outline');
    loadData();
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
    setSelectedPermissions(user.adminPermissions);
    setPermissionError(null);
  };

  const togglePermission = (permission: AdminPermission) => {
    if (isSavingPermissions) return;
    setSelectedPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
    setPermissionError(null);
  };

  const saveTeamPermissions = async () => {
    if (!permissionTarget || !adminAccess?.isOwner || isSavingPermissions) return;
    setIsSavingPermissions(true);
    setPermissionError(null);
    const result = await AdminService.setTeamMemberPermissions(permissionTarget.id, selectedPermissions);
    setIsSavingPermissions(false);
    if (!result.success) {
      setPermissionError(result.error || 'Ekip yetkileri güncellenemedi.');
      return;
    }
    const removed = selectedPermissions.length === 0;
    setPermissionTarget(null);
    showSuccessDialog(
      removed ? `“${permissionTarget.fullName}” yönetim ekibinden çıkarıldı.` : `“${permissionTarget.fullName}” için görev yetkileri güncellendi.`,
      removed ? 'person-remove-outline' : 'shield-checkmark-outline',
    );
    void loadData();
  };

  const handleCloseSupportConversation = (conversation: Conversation) => {
    setSupportCloseError(null);
    setSupportCloseTarget(conversation);
  };

  const confirmCloseSupportConversation = async () => {
    if (!supportCloseTarget || isClosingSupportConversation) return;
    setIsClosingSupportConversation(true);
    setSupportCloseError(null);
    const result = await ChatService.closeSupportConversation(supportCloseTarget.id);
    setIsClosingSupportConversation(false);
    if (!result.success) {
      setSupportCloseError(result.error || 'Görüşme sonlandırılamadı.');
      return;
    }
    setSupportCloseTarget(null);
    showSuccessDialog('Destek görüşmesi sonlandırıldı ve arşivlendi.', 'checkmark-done-outline');
    void loadData();
  };

  const handleClearSupportMessages = (conversation: Conversation) => {
    setSupportClearError(null);
    setSupportClearTarget(conversation);
  };

  const confirmClearSupportMessages = async () => {
    if (!supportClearTarget || isClearingSupportMessages) return;
    setIsClearingSupportMessages(true);
    setSupportClearError(null);
    const result = await ChatService.clearSupportMessages(supportClearTarget.id);
    setIsClearingSupportMessages(false);
    if (!result.success) {
      setSupportClearError(result.error || 'Mesaj geçmişi temizlenemedi.');
      return;
    }
    setSupportClearTarget(null);
    showSuccessDialog(`${result.deletedCount || 0} mesaj kalıcı olarak silindi.`, 'trash-outline');
    void loadData();
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const filteredModalCategories = useMemo(() => {
    const q = categorySearchQuery.trim().toLocaleLowerCase('tr-TR');
    return categories.filter((cat) => {
      if (categorySegment === 'game' && !cat.slug.startsWith('game-')) return false;
      if (categorySegment === 'app' && !cat.slug.startsWith('app-')) return false;
      if (!q) return true;
      return (
        cat.name.toLocaleLowerCase('tr-TR').includes(q) ||
        cat.slug.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [categories, categorySearchQuery, categorySegment]);

  const handleOpenCategoryModal = (project: AdminListingItem) => {
    setCategoryModalTarget(project);
    setSelectedNewCategoryId(project.categoryId || null);
    setCategorySearchQuery('');
    setCategoryModalError(null);
    const currentCat = project.categoryId ? categoryMap.get(project.categoryId) : undefined;
    if (currentCat?.slug.startsWith('game-')) {
      setCategorySegment('game');
    } else if (currentCat?.slug.startsWith('app-')) {
      setCategorySegment('app');
    } else {
      setCategorySegment('all');
    }
  };

  const handleSaveCategoryChange = async () => {
    if (!categoryModalTarget) return;

    if (!selectedNewCategoryId) {
      setCategoryModalError('Lütfen projenin atanacağı yeni kategoriyi seçin.');
      return;
    }

    if (selectedNewCategoryId === categoryModalTarget.categoryId) {
      const currentCatName = categoryMap.get(selectedNewCategoryId)?.name || 'Mevcut Kategori';
      setCategoryModalError(`Proje zaten “${currentCatName}” kategorisinde bulunuyor. Farklı bir kategori seçiniz.`);
      return;
    }

    setCategoryModalError(null);
    setIsUpdatingCategory(true);
    try {
      const result = await AdminService.updateListingCategory(
        categoryModalTarget.id,
        selectedNewCategoryId
      );
      if (!result.success) {
        setCategoryModalError(result.error || 'Kategori güncellenemedi.');
        return;
      }
      const newCategory = categoryMap.get(selectedNewCategoryId);
      const categoryName = newCategory?.name || 'Yeni Kategori';
      setListings((prev) =>
        prev.map((p) =>
          p.id === categoryModalTarget.id ? { ...p, categoryId: selectedNewCategoryId } : p
        )
      );
      showSuccessDialog(
        `“${categoryModalTarget.title}” projesinin kategorisi “${categoryName}” olarak güncellendi.`,
        'checkmark-circle-outline'
      );
      setCategoryModalTarget(null);
      void loadData();
    } catch (err: any) {
      setCategoryModalError(err?.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleOpenSupportModal = (project: AdminListingItem) => {
    setSupportModalTarget(project);
    setSupportAmount(1);
    setCustomSupportInput('');
    setSupportModalError(null);
  };

  const handleConfirmGrantSupport = async () => {
    if (!supportModalTarget) return;
    const finalAmount = customSupportInput ? parseInt(customSupportInput, 10) : supportAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setSupportModalError('Lütfen geçerli bir destek miktarı girin (en az 1).');
      return;
    }
    if (finalAmount > 100) {
      setSupportModalError('Tek seferde en fazla 100 destek puanı tanımlanabilir.');
      return;
    }

    setSupportModalError(null);
    setIsGrantingSupport(true);
    try {
      const result = await AdminService.grantProjectSupport(supportModalTarget.id, finalAmount);
      if (!result.success) {
        setSupportModalError(result.error || 'Yönetim desteği tanımlanamadı.');
        return;
      }
      const newCount = result.newUpvotesCount ?? (supportModalTarget.upvotesCount + finalAmount);
      setListings((prev) =>
        prev.map((p) => (p.id === supportModalTarget.id ? { ...p, upvotesCount: newCount, likesCount: newCount } : p))
      );
      showSuccessDialog(
        `“${supportModalTarget.title}” projesine +${finalAmount} yönetim desteği eklendi. Güncel destek: ${newCount}`,
        'rocket-outline'
      );
      setSupportModalTarget(null);
      void loadData();
    } catch (err: any) {
      setSupportModalError(err?.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      setIsGrantingSupport(false);
    }
  };

  const handleOpenViewModal = (project: AdminListingItem) => {
    setViewModalTarget(project);
    setViewAmount(50);
    setCustomViewInput('');
    setViewModalError(null);
  };

  const handleConfirmGrantViews = async () => {
    if (!viewModalTarget) return;
    const finalAmount = customViewInput ? parseInt(customViewInput, 10) : viewAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setViewModalError('Lütfen geçerli bir görünürlük miktarı girin (en az 1).');
      return;
    }
    if (finalAmount > 100000) {
      setViewModalError('Tek seferde en fazla 100.000 görünürlük tanımlanabilir.');
      return;
    }

    setViewModalError(null);
    setIsGrantingViews(true);
    try {
      const result = await AdminService.grantProjectViews(viewModalTarget.id, finalAmount);
      if (!result.success) {
        setViewModalError(result.error || 'Görünürlük tanımlanamadı.');
        return;
      }
      const newCount = result.newViewCount ?? (viewModalTarget.viewCount + finalAmount);
      setListings((prev) =>
        prev.map((p) => (p.id === viewModalTarget.id ? { ...p, viewCount: newCount } : p))
      );
      showSuccessDialog(
        `“${viewModalTarget.title}” projesine +${finalAmount} görünürlük eklendi. Güncel görünürlük: ${newCount}`,
        'eye-outline'
      );
      setViewModalTarget(null);
      void loadData();
    } catch (err: any) {
      setViewModalError(err?.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      setIsGrantingViews(false);
    }
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
    if (postToEdit) {
      setEditingBlogPost(postToEdit);
      setBlogFormTitle(postToEdit.title);
      setBlogFormSlug(postToEdit.slug);
      setBlogFormExcerpt(postToEdit.excerpt);
      setBlogFormContent(postToEdit.content);
      setBlogFormCover(postToEdit.cover_image_url);
      setBlogFormCategory(postToEdit.category);
      setBlogFormPublished(postToEdit.is_published);
    } else {
      setEditingBlogPost(null);
      setBlogFormTitle('');
      setBlogFormSlug('');
      setBlogFormExcerpt('');
      setBlogFormContent('');
      setBlogFormCover('https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop');
      setBlogFormCategory('Girişimcilik');
      setBlogFormPublished(true);
    }
    setIsBlogModalOpen(true);
  };

  const handleSaveBlogPost = async () => {
    if (!blogFormTitle.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen bir başlık girin.');
      return;
    }
    if (!blogFormExcerpt.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen kısa bir özet girin (Google arama sonucu için gereklidir).');
      return;
    }
    if (!blogFormContent.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen yazı içeriğini girin.');
      return;
    }

    setIsSavingBlog(true);
    try {
      if (editingBlogPost) {
        await BlogService.updatePost(editingBlogPost.id, {
          title: blogFormTitle.trim(),
          slug: blogFormSlug ? generateSlug(blogFormSlug) : generateSlug(blogFormTitle),
          excerpt: blogFormExcerpt.trim(),
          content: blogFormContent,
          cover_image_url: blogFormCover.trim(),
          category: blogFormCategory,
          is_published: blogFormPublished,
        });
        showSuccessDialog('Blog yazısı başarıyla güncellendi.', 'checkmark-circle-outline');
      } else {
        await BlogService.createPost({
          title: blogFormTitle.trim(),
          custom_slug: blogFormSlug ? generateSlug(blogFormSlug) : undefined,
          excerpt: blogFormExcerpt.trim(),
          content: blogFormContent,
          cover_image_url: blogFormCover.trim(),
          category: blogFormCategory,
          is_published: blogFormPublished,
        });
        showSuccessDialog('Yeni blog yazısı yayınlandı.', 'newspaper-outline');
      }
      setIsBlogModalOpen(false);
      const updatedPosts = await BlogService.getAllPostsAdmin();
      setBlogPosts(updatedPosts);
    } catch {
      Alert.alert('Hata', 'Yazı kaydedilirken bir sorun oluştu.');
    } finally {
      setIsSavingBlog(false);
    }
  };

  const handleTogglePublishBlog = async (post: BlogPost) => {
    const nextState = !post.is_published;
    await BlogService.togglePublish(post.id, nextState);
    setBlogPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_published: nextState } : p));
    showSuccessDialog(nextState ? 'Yazı yayına alındı.' : 'Yazı taslağa çekildi.', nextState ? 'eye-outline' : 'eye-off-outline');
  };

  const handleConfirmDeleteBlog = async () => {
    if (!deleteBlogTarget) return;
    setIsDeletingBlog(true);
    try {
      await BlogService.deletePost(deleteBlogTarget.id);
      setBlogPosts(prev => prev.filter(p => p.id !== deleteBlogTarget.id));
      setDeleteBlogTarget(null);
      showSuccessDialog('Blog yazısı başarıyla silindi.', 'trash-outline');
    } finally {
      setIsDeletingBlog(false);
    }
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
              ['shield-half-outline', '#EF4444', 4, 'Siber Tehdit Radarı', 'threat_intel'],
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

      <Modal
        visible={Boolean(permissionTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isSavingPermissions && setPermissionTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.permissionDialog}>
            <LinearGradient colors={['#173B72', '#3269C7', '#4F87DF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="shield-checkmark-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>EKİP YETKİLERİ</Text>
                <Text style={styles.dialogHeroTitle}>Görev alanlarını seçin</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.permissionUserName} numberOfLines={1}>{permissionTarget?.fullName}</Text>
              <Text style={styles.permissionHelper}>Yalnızca seçtiğiniz alanlar yönetim panelinde görünür ve sunucu tarafından izinli olur.</Text>
              <View style={styles.permissionOptions}>
                {ADMIN_PERMISSION_OPTIONS.map((option) => {
                  const selected = selectedPermissions.includes(option.key);
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.permissionOption, selected && styles.permissionOptionSelected]}
                      onPress={() => togglePermission(option.key)}
                      disabled={isSavingPermissions}
                      activeOpacity={0.74}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <GlassIconButton icon={option.icon} iconSize={18} size={40} active={selected} />
                      <View style={styles.permissionOptionCopy}>
                        <Text style={styles.permissionOptionTitle}>{option.title}</Text>
                        <Text style={styles.permissionOptionDescription}>{option.description}</Text>
                      </View>
                      <View style={[styles.permissionCheck, selected && styles.permissionCheckSelected]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {permissionError ? <Text style={styles.supportDialogError}>{permissionError}</Text> : null}
              <Text style={styles.permissionRemoveHint}>Tüm seçimleri kaldırıp kaydetmek, kullanıcıyı yönetim ekibinden çıkarır.</Text>
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={() => setPermissionTarget(null)} disabled={isSavingPermissions} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.supportCloseConfirmButton]} onPress={() => { void saveTeamPermissions(); }} disabled={isSavingPermissions} activeOpacity={0.75}>
                  {isSavingPermissions ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="shield-checkmark-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.supportCloseConfirmText}>{isSavingPermissions ? 'Kaydediliyor' : 'Yetkileri Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(supportCloseTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isClosingSupportConversation && setSupportCloseTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#173B72', '#3269C7', '#4F87DF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="checkmark-done-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>CANLI DESTEK</Text>
                <Text style={styles.dialogHeroTitle}>Sohbeti sonlandır?</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.supportDialogParty} numberOfLines={1}>{supportCloseTarget?.otherParty?.fullName || 'Kıstas Üyesi'}</Text>
              <Text style={styles.supportDialogMessage}>Görüşme arşivlenecek ve kullanıcı bu talebe artık mesaj gönderemeyecek. Yeni talebi ayrı bir görüşme olarak açılacaktır.</Text>
              {supportCloseError ? <Text style={styles.supportDialogError}>{supportCloseError}</Text> : null}
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={() => setSupportCloseTarget(null)} disabled={isClosingSupportConversation} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.supportCloseConfirmButton]} onPress={() => { void confirmCloseSupportConversation(); }} disabled={isClosingSupportConversation} activeOpacity={0.75}>
                  {isClosingSupportConversation ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-done-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.supportCloseConfirmText}>{isClosingSupportConversation ? 'Sonlandırılıyor' : 'Sohbeti Sonlandır'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(supportClearTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isClearingSupportMessages && setSupportClearTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#70263A', '#A9334E', '#C75770']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="trash-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>DESTEK ARŞİVİ</Text>
                <Text style={styles.dialogHeroTitle}>Mesajları sil?</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.supportDialogParty} numberOfLines={1}>{supportClearTarget?.otherParty?.fullName || 'Kıstas Üyesi'}</Text>
              <Text style={styles.supportDialogMessage}>Bu görüşmedeki tüm mesajlar kalıcı olarak silinecek. Sonlandırılan görüşme kaydı destek taleplerinde görünmeye devam edecektir.</Text>
              {supportClearError ? <Text style={styles.supportDialogError}>{supportClearError}</Text> : null}
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={() => setSupportClearTarget(null)} disabled={isClearingSupportMessages} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.dialogDeleteButton]} onPress={() => { void confirmClearSupportMessages(); }} disabled={isClearingSupportMessages} activeOpacity={0.75}>
                  {isClearingSupportMessages ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.dialogDeleteText}>{isClearingSupportMessages ? 'Siliniyor' : 'Mesajları Sil'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(revisionTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeRevisionDialog}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#76510D', '#B98916', '#D8A52A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}>
                <Ionicons name="construct-outline" size={27} color="#FFFFFF" />
              </View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>PROJE İNCELEMESİ</Text>
                <Text style={styles.dialogHeroTitle}>Düzeltme isteyin</Text>
              </View>
              <View style={styles.dialogStepBadge}><Ionicons name="create-outline" size={15} color="#FFFFFF" /></View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.revisionProjectName} numberOfLines={1}>{revisionTarget?.title}</Text>
              <Text style={styles.revisionHelper}>Eksik veya geliştirilmesi gereken noktaları açıkça belirtin. Bu not kullanıcının bildirimlerine gönderilecektir.</Text>
              <View style={[styles.revisionInputShell, revisionError ? styles.revisionInputShellError : null]}>
                <TextInput
                  value={revisionFeedback}
                  onChangeText={(value) => {
                    setRevisionFeedback(value);
                    if (revisionError) setRevisionError(null);
                  }}
                  placeholder="Örn. Logo çözünürlüğünü yükseltin ve en az üç vitrin görseli ekleyin."
                  placeholderTextColor="#9A958A"
                  multiline
                  maxLength={1200}
                  textAlignVertical="top"
                  style={styles.revisionInput}
                  editable={!isRequestingRevision}
                  autoFocus={Platform.OS === 'web'}
                />
                <Text style={styles.revisionCounter}>{revisionFeedback.trim().length}/1200</Text>
              </View>
              {revisionError ? (
                <View style={styles.revisionErrorRow}>
                  <Ionicons name="alert-circle-outline" size={15} color="#A9334E" />
                  <Text style={styles.revisionErrorText}>{revisionError}</Text>
                </View>
              ) : null}
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={closeRevisionDialog} disabled={isRequestingRevision} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.revisionSubmitButton]} onPress={confirmRevisionRequest} disabled={isRequestingRevision} activeOpacity={0.75}>
                  {isRequestingRevision ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.revisionSubmitText}>{isRequestingRevision ? 'Gönderiliyor' : 'Kullanıcıya Gönder'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(deleteTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isDeleting && setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#7E263C', '#B83D57', '#D96772']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}>
                <Ionicons name="trash-outline" size={27} color="#FFFFFF" />
              </View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>KALICI İŞLEM</Text>
                <Text style={styles.dialogHeroTitle}>Projeyi sil?</Text>
              </View>
              <View style={styles.dialogStepBadge}><Ionicons name="alert" size={15} color="#FFFFFF" /></View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <View style={styles.dialogNotice}>
                <View style={styles.dialogNoticeMark}><Ionicons name="alert" size={14} color="#B83D57" /></View>
                <Text style={styles.dialogMessage}>
                  {deleteTarget ? `“${deleteTarget.title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ''}
                </Text>
              </View>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogSecondaryButton}
                  onPress={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogPrimaryButton, styles.dialogDeleteButton]}
                  onPress={confirmDeleteListing}
                  disabled={isDeleting}
                  activeOpacity={0.75}
                >
                  {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.dialogDeleteText}>{isDeleting ? 'Siliniyor' : 'Kalıcı Olarak Sil'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Blog Delete Confirmation Modal */}
      <Modal
        visible={Boolean(deleteBlogTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isDeletingBlog && setDeleteBlogTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#7E263C', '#B83D57', '#D96772']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}>
                <Ionicons name="trash-outline" size={27} color="#FFFFFF" />
              </View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>KALICI İŞLEM</Text>
                <Text style={styles.dialogHeroTitle}>Makaleyi sil?</Text>
              </View>
              <View style={styles.dialogStepBadge}><Ionicons name="alert" size={15} color="#FFFFFF" /></View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <View style={styles.dialogNotice}>
                <View style={styles.dialogNoticeMark}><Ionicons name="alert" size={14} color="#B83D57" /></View>
                <Text style={styles.dialogMessage}>
                  {deleteBlogTarget ? `“${deleteBlogTarget.title}” başlıklı blog yazısı silinecek. Bu işlem geri alınamaz.` : ''}
                </Text>
              </View>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogSecondaryButton}
                  onPress={() => setDeleteBlogTarget(null)}
                  disabled={isDeletingBlog}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogPrimaryButton, styles.dialogDeleteButton]}
                  onPress={handleConfirmDeleteBlog}
                  disabled={isDeletingBlog}
                  activeOpacity={0.75}
                >
                  {isDeletingBlog ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.dialogDeleteText}>{isDeletingBlog ? 'Siliniyor' : 'Kalıcı Olarak Sil'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blog Editor Modal */}
      <Modal
        visible={isBlogModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isSavingBlog && setIsBlogModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.blogModalBox}>
            <View style={styles.blogModalHeader}>
              <View>
                <Text style={styles.dialogEyebrow}>KISTAS SEO İÇERİK EDİTÖRÜ</Text>
                <Text style={styles.blogModalHeaderTitle}>
                  {editingBlogPost ? 'Makaleyi Düzenle' : 'Yeni Blog Makalesi'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.blogModalCloseBtn}
                onPress={() => setIsBlogModalOpen(false)}
                disabled={isSavingBlog}
              >
                <Ionicons name="close" size={20} color="#25364E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.blogModalScroll} contentContainerStyle={styles.blogModalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.blogInputGroup}>
                <Text style={styles.blogInputLabel}>Makale Başlığı (H1 / Title)</Text>
                <TextInput
                  style={styles.blogTextInput}
                  value={blogFormTitle}
                  onChangeText={(val) => {
                    setBlogFormTitle(val);
                    if (!editingBlogPost && (!blogFormSlug || blogFormSlug === generateSlug(blogFormTitle))) {
                      setBlogFormSlug(generateSlug(val));
                    }
                  }}
                  placeholder="Örn: 2026'da SaaS Girişimi Başlatırken Dikkat Edilmesi Gerekenler"
                  placeholderTextColor="#908c9f"
                />
              </View>

              {/* Slug */}
              <View style={styles.blogInputGroup}>
                <View style={styles.blogLabelRow}>
                  <Text style={styles.blogInputLabel}>SEO URL Bağlantısı (Slug)</Text>
                  <Text style={styles.blogHelperHint}>www.kistas.com.tr/blog/{blogFormSlug || '...'}</Text>
                </View>
                <TextInput
                  style={styles.blogTextInput}
                  value={blogFormSlug}
                  onChangeText={(val) => setBlogFormSlug(generateSlug(val))}
                  placeholder="saas-girisimi-baslatirken-dikkat-edilmesi-gerekenler"
                  placeholderTextColor="#908c9f"
                  autoCapitalize="none"
                />
              </View>

              {/* Category */}
              <View style={styles.blogInputGroup}>
                <Text style={styles.blogInputLabel}>Kategori</Text>
                <View style={styles.blogCategoryPills}>
                  {BLOG_CATEGORIES.map((cat) => {
                    const isSelected = blogFormCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.blogCategorySelectPill, isSelected && styles.blogCategorySelectPillActive]}
                        onPress={() => setBlogFormCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.blogCategorySelectPillText, isSelected && styles.blogCategorySelectPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Excerpt / Meta Description */}
              <View style={styles.blogInputGroup}>
                <View style={styles.blogLabelRow}>
                  <Text style={styles.blogInputLabel}>Meta Açıklaması & Özet (Google Snippet)</Text>
                  <Text style={[
                    styles.blogCharCount,
                    blogFormExcerpt.length >= 120 && blogFormExcerpt.length <= 160 && styles.blogCharCountOptimal
                  ]}>
                    {blogFormExcerpt.length}/160 karakter
                  </Text>
                </View>
                <TextInput
                  style={[styles.blogTextInput, styles.blogTextAreaSmall]}
                  value={blogFormExcerpt}
                  onChangeText={setBlogFormExcerpt}
                  placeholder="Google arama sonuçlarında görünecek 120-160 karakterlik özet metin..."
                  placeholderTextColor="#908c9f"
                  multiline
                  maxLength={250}
                />
              </View>

              {/* Cover Image URL */}
              <View style={styles.blogInputGroup}>
                <Text style={styles.blogInputLabel}>Kapak Görseli URL'si</Text>
                <TextInput
                  style={styles.blogTextInput}
                  value={blogFormCover}
                  onChangeText={setBlogFormCover}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#908c9f"
                  autoCapitalize="none"
                />
                {blogFormCover ? (
                  <View style={styles.blogCoverPreviewBox}>
                    <Image source={{ uri: blogFormCover }} style={styles.blogCoverPreviewImg} resizeMode="cover" />
                  </View>
                ) : null}
              </View>

              {/* Content */}
              <View style={styles.blogInputGroup}>
                <View style={styles.blogLabelRow}>
                  <Text style={styles.blogInputLabel}>Makale İçeriği (Markdown & Paragraflar)</Text>
                  <Text style={styles.blogHelperHint}>## Alt Başlık, - Madde</Text>
                </View>
                <TextInput
                  style={[styles.blogTextInput, styles.blogTextAreaContent]}
                  value={blogFormContent}
                  onChangeText={setBlogFormContent}
                  placeholder="Makalenizi buraya yazın. Başlıklar için ##, listeler için - kullanabilirsiniz..."
                  placeholderTextColor="#908c9f"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Publish Toggle */}
              <TouchableOpacity
                style={styles.blogPublishToggleRow}
                onPress={() => setBlogFormPublished(!blogFormPublished)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={blogFormPublished ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={blogFormPublished ? '#187657' : '#686474'}
                />
                <View style={styles.blogPublishToggleCopy}>
                  <Text style={styles.blogPublishToggleTitle}>
                    {blogFormPublished ? 'Yazıyı doğrudan yayına al' : 'Taslak olarak kaydet'}
                  </Text>
                  <Text style={styles.blogPublishToggleSubtitle}>
                    {blogFormPublished
                      ? 'Yazı kaydedildiği anda ziyaretçilere ve Google botlarına açık olacaktır.'
                      : 'Yazı yalnızca admin panelinde görünür, yayına alınana kadar gizli kalır.'}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.blogModalFooter}>
              <TouchableOpacity
                style={styles.blogModalCancelBtn}
                onPress={() => setIsBlogModalOpen(false)}
                disabled={isSavingBlog}
                activeOpacity={0.75}
              >
                <Text style={styles.blogModalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blogModalSaveBtn}
                onPress={handleSaveBlogPost}
                disabled={isSavingBlog}
                activeOpacity={0.8}
              >
                {isSavingBlog ? (
                  <ActivityIndicator size="small" color="#FAFBFD" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#FAFBFD" />
                    <Text style={styles.blogModalSaveText}>
                      {editingBlogPost ? 'Değişiklikleri Kaydet' : 'Makaleyi Yayınla'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* KATEGORİ DEĞİŞTİRME MODALI */}
      <Modal
        visible={!!categoryModalTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isUpdatingCategory) setCategoryModalTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.categoryModalBox}>
            <LinearGradient
              colors={['#173866', '#285DA8', '#3D78CB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.categoryModalHeader}
            >
              <View style={styles.categoryModalHeaderGlow} />
              <View style={styles.categoryModalHeaderCopy}>
                <Text style={styles.categoryModalEyebrow}>KATEGORİ MODERASYONU</Text>
                <Text style={styles.categoryModalTitle}>Kategori Değiştir</Text>
                <Text style={styles.categoryModalSubtitle}>Projeyi doğru keşif alanına taşıyın.</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseBtn}
                onPress={() => setCategoryModalTarget(null)}
                disabled={isUpdatingCategory}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Proje Bilgi Şeridi */}
            {categoryModalTarget ? (
              <View style={styles.categoryModalProjectCard}>
                <View style={styles.categoryModalProjectInfo}>
                  <Text style={styles.categoryModalProjectLabel}>DÜZENLENEN PROJE</Text>
                  <Text style={styles.categoryModalProjectTitle} numberOfLines={1}>
                    {categoryModalTarget.title}
                  </Text>
                  <Text style={styles.categoryModalProjectTagline} numberOfLines={1}>
                    {categoryModalTarget.tagline || 'Dijital Proje'}
                  </Text>
                </View>
                <View style={styles.categoryModalCurrentPill}>
                  <Text style={styles.categoryModalCurrentLabel}>MEVCUT KATEGORİ</Text>
                  <Text style={styles.categoryModalCurrentVal} numberOfLines={1}>
                    {categoryModalTarget.categoryId
                      ? categoryMap.get(categoryModalTarget.categoryId)?.name || 'Bilinmiyor'
                      : 'Atanmamış'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Hata Bildirimi */}
            {categoryModalError ? (
              <View style={styles.categoryModalErrorBox}>
                <Ionicons name="alert-circle" size={17} color="#B83D57" />
                <Text style={styles.categoryModalErrorText}>{categoryModalError}</Text>
              </View>
            ) : null}

            {/* Kategori Filtre Sekmeleri */}
            <View style={styles.categorySegmentRow}>
              {[
                { id: 'all', label: `Tümü (${categories.length})` },
                { id: 'game', label: `Oyunlar (${categories.filter((c) => c.slug.startsWith('game-')).length})` },
                { id: 'app', label: `Uygulamalar (${categories.filter((c) => c.slug.startsWith('app-')).length})` },
              ].map((tab) => {
                const isSelected = categorySegment === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.categorySegmentBtn, isSelected && styles.categorySegmentBtnActive]}
                    onPress={() => setCategorySegment(tab.id as any)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.categorySegmentBtnText,
                        isSelected && styles.categorySegmentBtnTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Arama Kutusu */}
            <View style={styles.categoryModalSearch}>
              <Ionicons name="search-outline" size={17} color="#686474" />
              <TextInput
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                placeholder="Kategori ara (ör. Finans, Bulmaca, Sosyal...)"
                placeholderTextColor="#686474"
                style={styles.categoryModalSearchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {categorySearchQuery ? (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#686474" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Kategori Seçim Listesi */}
            <ScrollView
              style={styles.categoryModalList}
              contentContainerStyle={styles.categoryModalListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {filteredModalCategories.length === 0 ? (
                <View style={styles.categoryModalEmpty}>
                  <Ionicons name="search-outline" size={26} color="#8a8597" />
                  <Text style={styles.categoryModalEmptyText}>Aramanızla eşleşen kategori bulunamadı.</Text>
                </View>
              ) : (
                filteredModalCategories.map((cat) => {
                  const isSelected = selectedNewCategoryId === cat.id;
                  const isGame = cat.slug.startsWith('game-');

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryOptionCard, isSelected && styles.categoryOptionCardSelected]}
                      onPress={() => {
                        setSelectedNewCategoryId(cat.id);
                        setCategoryModalError(null);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.categoryOptionLeft}>
                        <View style={styles.categoryOptionTexts}>
                          <Text style={[styles.categoryOptionName, isSelected && styles.categoryOptionNameSelected]}>
                            {cat.name}
                          </Text>
                          <View style={styles.categoryOptionMeta}>
                            <Text style={[styles.categoryOptionKind, isGame ? styles.categoryOptionKindGame : styles.categoryOptionKindApp]}>
                              {isGame ? 'OYUN' : 'UYGULAMA'}
                            </Text>
                            <Text style={styles.categoryOptionSlug}>{cat.slug}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.categoryRadio, isSelected && styles.categoryRadioSelected]}>
                        {isSelected ? <Ionicons name="checkmark" size={14} color="#FAFBFD" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Alt Butonlar */}
            <View style={styles.categoryModalFooter}>
              <View style={styles.categoryModalSelection}>
                <Text style={styles.categoryModalSelectionLabel}>SEÇİLEN</Text>
                <Text style={styles.categoryModalSelectionValue} numberOfLines={1}>
                  {selectedNewCategoryId ? categoryMap.get(selectedNewCategoryId)?.name || 'Kategori' : 'Henüz seçilmedi'}
                </Text>
              </View>
              <View style={styles.categoryModalFooterActions}>
                <TouchableOpacity
                  style={styles.categoryModalCancelBtn}
                  onPress={() => setCategoryModalTarget(null)}
                  disabled={isUpdatingCategory}
                  activeOpacity={0.75}
                >
                  <Text style={styles.categoryModalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryModalSaveBtn,
                    (!selectedNewCategoryId || selectedNewCategoryId === categoryModalTarget?.categoryId) &&
                      styles.categoryModalSaveBtnSubdued,
                  ]}
                  onPress={handleSaveCategoryChange}
                  disabled={isUpdatingCategory}
                  activeOpacity={0.8}
                >
                  {isUpdatingCategory ? (
                    <ActivityIndicator size="small" color="#FAFBFD" />
                  ) : (
                    <>
                      <Text style={styles.categoryModalSaveText}>Kategoriyi Güncelle</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FAFBFD" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* GİZLİ YÖNETİM DESTEĞİ MODALI */}
      <Modal
        visible={!!supportModalTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isGrantingSupport) setSupportModalTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.supportModalBox}>
            <LinearGradient
              colors={['#173866', '#246592', '#218B87']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.supportModalHeader}
            >
              <View style={styles.supportModalGlow} />
              <View style={styles.supportModalHeaderCopy}>
                <View style={styles.supportSecretPill}>
                  <View style={styles.supportSecretDot} />
                  <Text style={styles.supportSecretPillText}>KISTAS YÖNETİM DESTEĞİ</Text>
                </View>
                <Text style={styles.supportModalTitle}>Geliştiriciye Destek Ol</Text>
                <Text style={styles.supportModalSubtitle}>
                  Projeye eklenecek destek puanını seçin ve yeni toplamı onaylayın.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseBtn}
                onPress={() => setSupportModalTarget(null)}
                disabled={isGrantingSupport}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Proje Bilgi Kartı */}
            {supportModalTarget ? (
              <View style={styles.supportProjectCard}>
                <View style={styles.supportProjectInfo}>
                  <Text style={styles.supportProjectLabel}>HEDEF PROJE</Text>
                  <Text style={styles.supportProjectTitle} numberOfLines={1}>
                    {supportModalTarget.title}
                  </Text>
                  <Text style={styles.supportProjectTagline} numberOfLines={1}>
                    {supportModalTarget.tagline || 'Dijital Proje'}
                  </Text>
                </View>
                <View style={styles.supportCurrentBadge}>
                  <Text style={styles.supportCurrentLabel}>MEVCUT DESTEK</Text>
                  <Text style={styles.supportCurrentVal}>
                    ▲ {formatNumber(supportModalTarget.upvotesCount)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Hata Bildirimi */}
            {supportModalError ? (
              <View style={styles.categoryModalErrorBox}>
                <Ionicons name="alert-circle" size={17} color="#B83D57" />
                <Text style={styles.categoryModalErrorText}>{supportModalError}</Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.supportModalScroll}
              contentContainerStyle={styles.supportModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.supportChoicePanel}>
                <View style={styles.supportChoiceHeader}>
                  <View>
                    <Text style={styles.supportSectionLabel}>DESTEK MİKTARI</Text>
                    <Text style={styles.supportSectionHint}>Hazır bir paket seçin veya özel değer girin.</Text>
                  </View>
                  <View style={styles.supportLimitBadge}><Text style={styles.supportLimitText}>1–100 PUAN</Text></View>
                </View>
                <View style={styles.supportPresetRow}>
                  {[1, 3, 5, 10, 25].map((amt) => {
                    const isSelected = !customSupportInput && supportAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.supportPresetPill, isSelected && styles.supportPresetPillActive]}
                        onPress={() => {
                          setSupportAmount(amt);
                          setCustomSupportInput('');
                          setSupportModalError(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.supportPresetAmount, isSelected && styles.supportPresetAmountActive]}>+{amt}</Text>
                        <Text style={[styles.supportPresetPillText, isSelected && styles.supportPresetPillTextActive]}>puan</Text>
                        {isSelected ? <View style={styles.supportPresetCheck}><Ionicons name="checkmark" size={10} color="#FFFFFF" /></View> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.supportCustomInputGroup}>
                  <Text style={styles.supportCustomLabel}>ÖZEL MİKTAR</Text>
                  <View style={[styles.supportInputWrap, Boolean(customSupportInput) && styles.supportInputWrapActive]}>
                    <Text style={styles.supportInputPrefix}>+</Text>
                    <TextInput
                      style={styles.supportTextInput}
                      placeholder="Örn. 12"
                      placeholderTextColor="#98A2B3"
                      keyboardType="number-pad"
                      value={customSupportInput}
                      onChangeText={(val) => {
                        setCustomSupportInput(val.replace(/[^0-9]/g, ''));
                        setSupportModalError(null);
                      }}
                    />
                    <Text style={styles.supportInputSuffix}>DESTEK PUANI</Text>
                  </View>
                </View>
              </View>

              {/* Hesaplanan Özet Şeridi */}
              {supportModalTarget ? (
                <View style={styles.supportCalculationCard}>
                  <View style={styles.supportCalcItem}>
                    <Text style={styles.supportCalcLabel}>MEVCUT</Text>
                    <Text style={styles.supportCalcOldVal}>
                      {formatNumber(supportModalTarget.upvotesCount)}
                    </Text>
                  </View>
                  <View style={styles.supportCalcOperator}><Text style={styles.supportCalcOperatorText}>+</Text></View>
                  <View style={styles.supportCalcItem}>
                    <Text style={styles.supportCalcLabel}>EKLENECEK</Text>
                    <Text style={styles.supportCalcAddVal}>
                      +{customSupportInput ? (parseInt(customSupportInput, 10) || 0) : supportAmount}
                    </Text>
                  </View>
                  <View style={styles.supportCalcOperator}><Text style={styles.supportCalcOperatorText}>=</Text></View>
                  <View style={[styles.supportCalcItem, styles.supportCalcTotalItem]}>
                    <Text style={[styles.supportCalcLabel, styles.supportCalcTotalLabel]}>YENİ TOPLAM</Text>
                    <Text style={styles.supportCalcTotalVal}>
                      {formatNumber(
                        supportModalTarget.upvotesCount +
                          (customSupportInput ? (parseInt(customSupportInput, 10) || 0) : supportAmount)
                      )}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Gizli Sır Notu */}
              <View style={styles.supportSecretNotice}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.supportSecretNoticeText}>
                  Bu işlem yalnızca yönetim panelinde görünür. Dışarıdan bakan kullanıcılar için organik ve gerçek topluluk desteği olarak işlenir.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Butonları */}
            <View style={styles.supportModalFooter}>
              <View style={styles.supportFooterAmount}>
                <Text style={styles.supportFooterLabel}>TANIMLANACAK</Text>
                <Text style={styles.supportFooterValue}>+{customSupportInput ? (parseInt(customSupportInput, 10) || 0) : supportAmount} destek</Text>
              </View>
              <View style={styles.supportFooterActions}>
                <TouchableOpacity
                  style={styles.categoryModalCancelBtn}
                  onPress={() => setSupportModalTarget(null)}
                  disabled={isGrantingSupport}
                  activeOpacity={0.75}
                >
                  <Text style={styles.categoryModalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportModalConfirmBtn}
                  onPress={handleConfirmGrantSupport}
                  disabled={isGrantingSupport}
                  activeOpacity={0.8}
                >
                  {isGrantingSupport ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.supportModalConfirmText}>Desteği Tanımla</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* GÖRÜNÜRLÜK ARTTIRMA MODALI */}
      <Modal
        visible={!!viewModalTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isGrantingViews) setViewModalTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.supportModalBox}>
            <LinearGradient
              colors={['#0F2B5C', '#1D4ED8', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.supportModalHeader}
            >
              <View style={styles.supportModalGlow} />
              <View style={styles.supportModalHeaderCopy}>
                <View style={styles.supportSecretPill}>
                  <View style={styles.supportSecretDot} />
                  <Text style={styles.supportSecretPillText}>KISTAS GÖRÜNÜRLÜK YÖNETİMİ</Text>
                </View>
                <Text style={styles.supportModalTitle}>Görünürlük Tanımla</Text>
                <Text style={styles.supportModalSubtitle}>
                  Projeye eklenecek görüntülenme (görünürlük) sayısını belirleyin.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseBtn}
                onPress={() => setViewModalTarget(null)}
                disabled={isGrantingViews}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Proje Bilgi Kartı */}
            {viewModalTarget ? (
              <View style={styles.supportProjectCard}>
                <View style={styles.supportProjectInfo}>
                  <Text style={styles.supportProjectLabel}>HEDEF PROJE</Text>
                  <Text style={styles.supportProjectTitle} numberOfLines={1}>
                    {viewModalTarget.title}
                  </Text>
                  <Text style={styles.supportProjectTagline} numberOfLines={1}>
                    {viewModalTarget.tagline || 'Dijital Proje'}
                  </Text>
                </View>
                <View style={styles.supportCurrentBadge}>
                  <Text style={styles.supportCurrentLabel}>MEVCUT GÖRÜNÜRLÜK</Text>
                  <Text style={styles.supportCurrentVal}>
                    👁️ {formatNumber(viewModalTarget.viewCount)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Hata Bildirimi */}
            {viewModalError ? (
              <View style={styles.categoryModalErrorBox}>
                <Ionicons name="alert-circle" size={17} color="#B83D57" />
                <Text style={styles.categoryModalErrorText}>{viewModalError}</Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.supportModalScroll}
              contentContainerStyle={styles.supportModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.supportChoicePanel}>
                <View style={styles.supportChoiceHeader}>
                  <View>
                    <Text style={styles.supportSectionLabel}>GÖRÜNÜRLÜK MİKTARI</Text>
                    <Text style={styles.supportSectionHint}>Hazır bir paket seçin veya özel değer girin.</Text>
                  </View>
                  <View style={styles.supportLimitBadge}><Text style={styles.supportLimitText}>1–100.000</Text></View>
                </View>
                <View style={styles.supportPresetRow}>
                  {[25, 50, 100, 250, 500].map((amt) => {
                    const isSelected = !customViewInput && viewAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.supportPresetPill, isSelected && styles.supportPresetPillActive]}
                        onPress={() => {
                          setViewAmount(amt);
                          setCustomViewInput('');
                          setViewModalError(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.supportPresetAmount, isSelected && styles.supportPresetAmountActive]}>+{amt}</Text>
                        <Text style={[styles.supportPresetPillText, isSelected && styles.supportPresetPillTextActive]}>görünürlük</Text>
                        {isSelected ? <View style={styles.supportPresetCheck}><Ionicons name="checkmark" size={10} color="#FFFFFF" /></View> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.supportCustomInputGroup}>
                  <Text style={styles.supportCustomLabel}>ÖZEL MİKTAR</Text>
                  <View style={[styles.supportInputWrap, Boolean(customViewInput) && styles.supportInputWrapActive]}>
                    <Text style={styles.supportInputPrefix}>+</Text>
                    <TextInput
                      style={styles.supportTextInput}
                      placeholder="Örn. 75"
                      placeholderTextColor="#98A2B3"
                      keyboardType="number-pad"
                      value={customViewInput}
                      onChangeText={(val) => {
                        setCustomViewInput(val.replace(/[^0-9]/g, ''));
                        setViewModalError(null);
                      }}
                    />
                    <Text style={styles.supportInputSuffix}>GÖRÜNTÜLENME</Text>
                  </View>
                </View>
              </View>

              {/* Hesaplanan Özet Şeridi */}
              {viewModalTarget ? (
                <View style={styles.supportCalculationCard}>
                  <View style={styles.supportCalcItem}>
                    <Text style={styles.supportCalcLabel}>MEVCUT</Text>
                    <Text style={styles.supportCalcOldVal}>
                      {formatNumber(viewModalTarget.viewCount)}
                    </Text>
                  </View>
                  <View style={styles.supportCalcOperator}><Text style={styles.supportCalcOperatorText}>+</Text></View>
                  <View style={styles.supportCalcItem}>
                    <Text style={styles.supportCalcLabel}>EKLENECEK</Text>
                    <Text style={styles.supportCalcAddVal}>
                      +{customViewInput ? (parseInt(customViewInput, 10) || 0) : viewAmount}
                    </Text>
                  </View>
                  <View style={styles.supportCalcOperator}><Text style={styles.supportCalcOperatorText}>=</Text></View>
                  <View style={[styles.supportCalcItem, styles.supportCalcTotalItem]}>
                    <Text style={[styles.supportCalcLabel, styles.supportCalcTotalLabel]}>YENİ TOPLAM</Text>
                    <Text style={styles.supportCalcTotalVal}>
                      {formatNumber(
                        viewModalTarget.viewCount +
                          (customViewInput ? (parseInt(customViewInput, 10) || 0) : viewAmount)
                      )}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Bilgilendirme Notu */}
              <View style={styles.supportSecretNotice}>
                <Ionicons name="eye" size={16} color="#059669" />
                <Text style={styles.supportSecretNoticeText}>
                  Tanımlanan miktar doğrudan projenin toplam görüntülenme (view_count) sayacına eklenir ve vitrinde gerçek veri olarak yansıtılır.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Butonları */}
            <View style={styles.supportModalFooter}>
              <View style={styles.supportFooterAmount}>
                <Text style={styles.supportFooterLabel}>TANIMLANACAK</Text>
                <Text style={styles.supportFooterValue}>+{customViewInput ? (parseInt(customViewInput, 10) || 0) : viewAmount} görünürlük</Text>
              </View>
              <View style={styles.supportFooterActions}>
                <TouchableOpacity
                  style={styles.categoryModalCancelBtn}
                  onPress={() => setViewModalTarget(null)}
                  disabled={isGrantingViews}
                  activeOpacity={0.75}
                >
                  <Text style={styles.categoryModalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportModalConfirmBtn}
                  onPress={handleConfirmGrantViews}
                  disabled={isGrantingViews}
                  activeOpacity={0.8}
                >
                  {isGrantingViews ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.supportModalConfirmText}>Görünürlüğü Tanımla</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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

const styles = StyleSheet.create({
  workspace: { flex: 1, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  metricCardMobile: { flexBasis: '46%' },
  container: { flex: 1, backgroundColor: '#F1F5FA' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(25,27,40,0.48)' },
  commandDialog: { width: '100%', maxWidth: 430, overflow: 'hidden', borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#171724', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.22, shadowRadius: 42, elevation: 28 },
  successCommandDialog: { width: '100%', maxWidth: 390, overflow: 'hidden', borderRadius: 22, backgroundColor: NEO.surface, borderWidth: 1, borderColor: 'rgba(50,105,199,0.2)', shadowColor: NEO.shadow, shadowOffset: { width: 10, height: 16 }, shadowOpacity: 0.28, shadowRadius: 28, elevation: 20 },
  successDialogHeader: { minHeight: 78, paddingHorizontal: 17, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  successDialogCopy: { flex: 1, minWidth: 0 },
  successDialogEyebrow: { ...theme.typography.kistas, color: '#3269C7', fontSize: 8, lineHeight: 11, fontWeight: '700', letterSpacing: 1.05 },
  successDialogTitle: { ...theme.typography.kistas, color: NEO.ink, fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: -0.35, marginTop: 3 },
  successStatusDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4F5EC', borderWidth: 1, borderColor: '#BFE4D2' },
  successDialogBody: { paddingHorizontal: 17, paddingTop: 14, paddingBottom: 15 },
  successMessageRow: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.68)', borderWidth: 1, borderColor: 'rgba(145,179,166,0.4)' },
  successMessageMark: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4F5EC' },
  successMessage: { ...theme.typography.kistas, flex: 1, color: '#4C5D67', fontSize: 11.5, lineHeight: 17, fontWeight: '600' },
  successDoneButton: { minWidth: 112, minHeight: 38, marginTop: 12, paddingHorizontal: 15, alignSelf: 'flex-end', borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#187657', borderWidth: 1, borderColor: '#126448', shadowColor: '#187657', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 9, elevation: 3 },
  successDoneText: { ...theme.typography.kistas, color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
  successAccentLine: { height: 3, width: '100%' },
  permissionDialog: { width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#171724', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.22, shadowRadius: 42, elevation: 28 },
  dialogHero: { minHeight: 122, paddingHorizontal: 24, paddingVertical: 24, flexDirection: 'row', alignItems: 'center', gap: 15, overflow: 'hidden' },
  dialogHeroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -52, top: -94, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  dialogHeroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  dialogHeroCopy: { flex: 1, minWidth: 0 },
  dialogHeroEyebrow: { color: 'rgba(255,255,255,0.76)', fontSize: 9, fontWeight: '700', letterSpacing: 1.25 },
  dialogHeroTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 28, fontWeight: '700', marginTop: 5, letterSpacing: -0.35 },
  dialogStepBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,21,35,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  dialogBody: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20 },
  dialogNotice: { width: '100%', minHeight: 66, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#FFF5F6', borderWidth: 1, borderColor: '#F2D9DE' },
  dialogNoticeMark: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9E1E6' },
  dialogEyebrow: { color: '#3269C7', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.7 },
  dialogMessage: { flex: 1, color: '#555362', fontSize: 12.5, lineHeight: 19, paddingTop: 2 },
  dialogActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 16 },
  dialogSecondaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#F2F4F8', borderWidth: 1, borderColor: '#E0E4EC' },
  dialogSecondaryText: { color: '#424252', fontSize: 12, fontWeight: '700' },
  dialogPrimaryButton: { flex: 1.45, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13 },
  dialogDeleteButton: { backgroundColor: '#A9334E', borderWidth: 1, borderColor: '#8F2941' },
  dialogDeleteText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  supportDialogParty: { color: '#25364E', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  supportDialogMessage: { marginTop: 7, color: '#686474', fontSize: 12, lineHeight: 18 },
  supportDialogError: { marginTop: 10, color: '#A9334E', fontSize: 11, lineHeight: 16 },
  supportCloseConfirmButton: { backgroundColor: '#3269C7', borderWidth: 1, borderColor: '#2858AC' },
  supportCloseConfirmText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  permissionUserName: { color: '#25364E', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  permissionHelper: { marginTop: 6, color: '#686474', fontSize: 11.5, lineHeight: 17 },
  permissionOptions: { marginTop: 15, gap: 9 },
  permissionOption: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 16, backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#E1E8F2' },
  permissionOptionSelected: { backgroundColor: '#F0F6FF', borderColor: '#9CBBE8' },
  permissionOptionCopy: { flex: 1, minWidth: 0 },
  permissionOptionTitle: { color: '#25364E', fontSize: 12.5, fontWeight: '700' },
  permissionOptionDescription: { marginTop: 3, color: '#74839A', fontSize: 10, lineHeight: 14 },
  permissionCheck: { width: 23, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C9D5E5', backgroundColor: '#FFFFFF' },
  permissionCheckSelected: { borderColor: '#3269C7', backgroundColor: '#3269C7' },
  permissionRemoveHint: { marginTop: 12, color: '#8A6670', fontSize: 9.5, lineHeight: 14 },
  revisionProjectName: { color: '#25364E', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  revisionHelper: { marginTop: 6, color: '#706A60', fontSize: 11.5, lineHeight: 17 },
  revisionInputShell: { marginTop: 14, minHeight: 142, borderRadius: 14, backgroundColor: '#FFFCF4', borderWidth: 1, borderColor: '#E5D4AA', overflow: 'hidden' },
  revisionInputShellError: { borderColor: '#C34A61', backgroundColor: '#FFF8F9' },
  revisionInput: { minHeight: 112, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 8, color: '#383441', fontSize: 12.5, lineHeight: 19 },
  revisionCounter: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingBottom: 9, color: '#8C826F', fontSize: 9.5, fontWeight: '700' },
  revisionErrorRow: { marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  revisionErrorText: { flex: 1, color: '#9C3048', fontSize: 10.5, lineHeight: 15 },
  revisionSubmitButton: { backgroundColor: '#936413', borderWidth: 1, borderColor: '#79520D' },
  revisionSubmitText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  header: { paddingTop: Platform.OS === 'ios' ? 14 : 15, paddingHorizontal: 18, paddingBottom: 13, backgroundColor: 'rgba(255,255,255,0.94)', borderBottomWidth: 1, borderBottomColor: '#E5EAF2', ...Platform.select({ web: { boxShadow: '0 8px 28px -24px rgba(24,48,84,0.45)' } }) },
  headerRow: { width: '100%', maxWidth: 1360, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerLogoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(37, 84, 199, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px -4px rgba(37, 84, 199, 0.15), 0 2px 5px rgba(0, 0, 0, 0.04)',
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
  headerLogoImg: {
    width: 32,
    height: 32,
    transform: [{ translateX: -1 }, { translateY: 1 }],
  },
  headerTitle: { color: '#25364E', fontSize: 18.5, fontWeight: '700', letterSpacing: -0.25, marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 48 },
  overviewCard: { paddingBottom: 25, marginBottom: 23, borderBottomWidth: 1, borderBottomColor: '#E1E7F0' },
  overviewHero: { minHeight: 178, borderRadius: 22, overflow: 'hidden', paddingHorizontal: 25, paddingVertical: 24, shadowColor: '#18365F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 22, elevation: 7 },
  overviewHeroGlowLarge: { position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -86, top: -188, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  overviewHeroGlowSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: 150, bottom: -104, backgroundColor: 'rgba(91,216,202,0.13)' },
  overviewTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  overviewCopy: { flex: 1, minWidth: 0 },
  overviewLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 8.5, fontWeight: '700', letterSpacing: 1.15 },
  overviewTitle: { color: '#FFFFFF', fontSize: 29, fontWeight: '700', letterSpacing: -0.6, marginTop: 7 },
  overviewSubtitle: { maxWidth: 520, color: 'rgba(255,255,255,0.72)', fontSize: 12, lineHeight: 18, marginTop: 7 },
  overviewAuthority: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  overviewAuthorityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#73E0B7' },
  overviewAuthorityText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' },
  overviewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 },
  overviewMetaText: { color: 'rgba(255,255,255,0.64)', fontSize: 9.5, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 12 },
  metricCard: { position: 'relative', flexGrow: 1, flexBasis: '30%', minWidth: 0, minHeight: 142, paddingHorizontal: 17, paddingVertical: 16, borderRadius: 17, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E6EF', shadowColor: '#1D3557', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
  metricCardWide: { flexBasis: '22%' },
  metricCardActive: { borderColor: '#8EB1E5', shadowOpacity: 0.13, shadowRadius: 17, elevation: 5 },
  metricSheen: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -45, top: -68, backgroundColor: 'rgba(255,255,255,0.72)' },
  metricActiveRail: { position: 'absolute', left: 16, right: 16, top: 0, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  metricTopRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricAlertBadge: { minHeight: 24, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#E3F4ED', borderWidth: 1, borderColor: '#CBE8DD' },
  metricAlertText: { color: '#187657', fontSize: 9, fontWeight: '700' },
  metricArrow: { position: 'absolute', right: 14, bottom: 14, width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' },
  metricArrowActive: { backgroundColor: '#285EA5' },
  metricValue: { color: '#25364E', fontSize: 27, fontWeight: '700', marginTop: 13, letterSpacing: -0.55 },
  metricLabel: { color: '#68758A', fontSize: 11, fontWeight: '700', marginTop: 3 },
  searchBox: { height: 52, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE4EE', marginBottom: 22, shadowColor: '#1D3557', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  searchInput: { flex: 1, paddingVertical: 0, color: '#25364E', fontSize: 13.5 },
  section: { paddingBottom: 8 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionCopy: { flex: 1 }, sectionTitle: { color: '#25364E', fontSize: 18, fontWeight: '700', letterSpacing: -0.2 }, sectionSubtitle: { color: '#748096', fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  sponsorPreview: { marginBottom: 16, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(50,105,199,0.15)' },
  sponsorPreviewHeader: { paddingHorizontal: 14, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sponsorPreviewEyebrow: { color: '#3269C7', fontSize: 8.5, fontWeight: '700', letterSpacing: 0 },
  sponsorPreviewTitle: { color: '#25364E', fontSize: 14, fontWeight: '700', marginTop: 3 },
  sponsorToolbar: { flexDirection: 'row', gap: 8, marginBottom: 13, padding: 4, borderRadius: 8, backgroundColor: 'rgba(250,251,253,0.70)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.10)' },
  sponsorViewButton: { flex: 1, minHeight: 37, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  sponsorViewButtonActive: { backgroundColor: 'rgba(50,105,199,0.14)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.25)' },
  sponsorViewText: { color: '#3269C7', fontSize: 10.5, fontWeight: '700', textAlign: 'center' },
  sponsorViewTextActive: { color: '#25364E' },
  dataCard: { borderRadius: 17, padding: 19, marginBottom: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E6EF', shadowColor: '#1D3557', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.055, shadowRadius: 14, elevation: 2 },
  dataCardBoosted: { borderColor: '#9CB9E3', backgroundColor: '#FBFDFF', shadowOpacity: 0.1, elevation: 4 },
  projectIdentity: { flexDirection: 'row', alignItems: 'center' }, projectLogo: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E2E7EF' },
  projectLogoFallback: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E7EF' }, projectLogoFallbackText: { color: '#34445D', fontSize: 15, fontWeight: '700' },
  projectCopy: { flex: 1, marginLeft: 13 }, projectTitle: { color: '#25364E', fontSize: 15.5, fontWeight: '700', letterSpacing: -0.15 }, projectTagline: { color: '#6E798D', fontSize: 11.5, marginTop: 3 }, projectOwner: { color: '#8A95A8', fontSize: 10.5, marginTop: 4, fontWeight: '600' },
  inspectIcon: { marginLeft: 9 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 14 }, pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, borderWidth: 1 }, pillText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0 },
  inlineMeta: { color: '#788397', fontSize: 10.5, fontWeight: '600' }, metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C6CED9' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 14, marginTop: 14, borderTopWidth: 1, borderTopColor: '#E8ECF2' },
  actionButton: { minHeight: 42, borderRadius: 13, overflow: 'hidden', borderWidth: 1, shadowColor: NEO.shadow, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.13, shadowRadius: 8, elevation: 2 },
  actionButtonSurface: { minHeight: 40, paddingLeft: 7, paddingRight: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionIconPlate: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionAccent: { width: 4, height: 4, borderRadius: 2, opacity: 0.72 },
  actionButtonSelected: { borderWidth: 1.5 },
  actionButtonText: { ...theme.typography.kistas, fontSize: 10, fontWeight: '700' },
  filterRail: { gap: 8, paddingBottom: 14 }, filterButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, backgroundColor: '#F1F4F8', borderWidth: 1, borderColor: '#E2E7EF' }, filterButtonActive: { backgroundColor: '#285EA5', borderColor: '#285EA5', shadowColor: '#285EA5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 }, filterText: { color: '#68758A', fontSize: 11, fontWeight: '700' }, filterTextActive: { color: '#FFFFFF' },
  userHeader: { flexDirection: 'row', alignItems: 'center' }, userAvatar: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, userAvatarText: { color: '#25364E', fontSize: 14, fontWeight: '700' }, userCopy: { flex: 1, marginLeft: 12 }, userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, userName: { flexShrink: 1, color: '#25364E', fontSize: 15, fontWeight: '700' }, userEmail: { color: '#686474', fontSize: 11.5, marginTop: 3 },
  supportCardUnread: { borderColor: 'rgba(50,105,199,0.35)', backgroundColor: 'rgba(250,251,253,0.92)' },
  supportViewRail: { flexDirection: 'row', gap: 8, marginBottom: 13 },
  supportViewButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F8', borderWidth: 1, borderColor: '#E0E6EF' },
  supportViewButtonActive: { backgroundColor: '#285EA5', borderColor: '#285EA5' },
  supportViewText: { color: '#68758A', fontSize: 10.5, fontWeight: '700' },
  supportViewTextActive: { color: '#FFFFFF' },
  supportTime: { color: '#777181', fontSize: 9.5, marginTop: 5 },
  userMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 11, borderRadius: 8, backgroundColor: 'transparent' }, userMetric: { flex: 1, alignItems: 'center' }, userMetricDivider: { width: StyleSheet.hairlineWidth, height: 27, backgroundColor: 'rgba(50,105,199,0.18)' }, userMetricValue: { color: '#25364E', fontSize: 13, fontWeight: '700' }, userMetricLabel: { color: '#686474', fontSize: 9, marginTop: 2 },
  creditRow: { paddingTop: 12, marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(50,105,199,0.14)' }, creditLabel: { color: '#686474', fontSize: 9.5, fontWeight: '700', letterSpacing: 0, textTransform: 'uppercase', marginBottom: 8 }, creditActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  moderationRow: { paddingTop: 12, marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(50,105,199,0.14)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  moderationCopy: { flex: 1 },
  moderationStatus: { color: '#748096', fontSize: 10.5, lineHeight: 15 },
  healthCard: { borderRadius: 17, padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE6F0', marginBottom: 12, shadowColor: '#1D3557', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }, healthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, healthEyebrow: { color: '#66748A', fontSize: 9, fontWeight: '700', letterSpacing: 0.7 }, healthValue: { color: '#25364E', fontSize: 31, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 }, progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#E8EDF4', overflow: 'hidden', marginTop: 15 }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#3E79C5' }, healthCaption: { color: '#748096', fontSize: 11, lineHeight: 16, marginTop: 10 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, analyticsCard: { width: '48.5%', minHeight: 142, borderRadius: 17, padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E6EF', shadowColor: '#1D3557', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 1 }, analyticsValue: { color: '#25364E', fontSize: 25, fontWeight: '700', letterSpacing: -0.3, marginTop: 13 }, analyticsLabel: { color: '#34445D', fontSize: 11.5, fontWeight: '700', marginTop: 3 }, analyticsCaption: { color: '#7B879A', fontSize: 9.5, marginTop: 3 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 34, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E6EF' }, emptyTitle: { color: '#25364E', fontSize: 14, fontWeight: '700', marginTop: 11 }, emptyText: { color: '#748096', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 4 }, loadingState: { alignItems: 'center', paddingVertical: 38, gap: 10 }, loadingText: { color: '#748096', fontSize: 11.5 },
  moderationCard: {
    borderColor: '#E7D8B7',
    borderLeftWidth: 3,
    borderLeftColor: '#D6A84B',
  },
  moderationDescriptionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E5EAF1',
  },
  moderationDescriptionText: {
    color: '#68758A',
    fontSize: 12.5,
    lineHeight: 18,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  linkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D4E1F4',
  },
  linkBadgeText: {
    color: '#36557F',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 200,
  },
  moderationGallery: {
    marginTop: 12,
  },
  moderationGalleryLabel: {
    color: '#3269C7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  moderationThumbRow: {
    flexDirection: 'row',
  },
  moderationThumbWrap: {
    position: 'relative',
    marginRight: 8,
  },
  moderationThumb: {
    width: 68,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
  },
  coverBadgeMini: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#EAF2FC',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeMiniText: {
    color: '#3269C7',
    fontSize: 7.5,
    fontWeight: '700',
  },
  blogSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  blogCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#3269C7',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  blogCreateBtnText: {
    color: '#FAFBFD',
    fontSize: 12.5,
    fontWeight: '700',
  },
  blogCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  blogCardThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  blogCardThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,105,199,0.06)',
  },
  blogCardMain: {
    flex: 1,
    minWidth: 0,
  },
  blogBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  blogCategoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(50,105,199,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.15)',
  },
  blogCategoryBadgeText: {
    color: '#3269C7',
    fontSize: 9.5,
    fontWeight: '700',
  },
  blogCardTitle: {
    color: '#25364E',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  blogCardSlug: {
    color: '#3269C7',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  blogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  blogMetaText: {
    color: '#686474',
    fontSize: 10.5,
    fontWeight: '600',
  },
  blogCardExcerpt: {
    color: '#686474',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  blogModalBox: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    backgroundColor: '#FAFBFD',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.22)',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    elevation: 24,
  },
  blogModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.12)',
    backgroundColor: 'rgba(250,251,253,0.95)',
  },
  blogModalHeaderTitle: {
    color: '#25364E',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  blogModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,105,199,0.06)',
  },
  blogModalScroll: {
    flex: 1,
  },
  blogModalScrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  blogInputGroup: {
    marginBottom: 16,
  },
  blogLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  blogInputLabel: {
    color: '#25364E',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  blogHelperHint: {
    color: '#3269C7',
    fontSize: 10.5,
    fontWeight: '600',
  },
  blogCharCount: {
    color: '#686474',
    fontSize: 10.5,
    fontWeight: '700',
  },
  blogCharCountOptimal: {
    color: '#187657',
  },
  blogTextInput: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
    color: '#25364E',
    fontSize: 13,
  },
  blogTextAreaSmall: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  blogTextAreaContent: {
    minHeight: 220,
    textAlignVertical: 'top',
    fontSize: 13,
    lineHeight: 19,
  },
  blogCategoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  blogCategorySelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(50,105,199,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  blogCategorySelectPillActive: {
    backgroundColor: 'rgba(50,105,199,0.16)',
    borderColor: '#3269C7',
  },
  blogCategorySelectPillText: {
    color: '#686474',
    fontSize: 11,
    fontWeight: '700',
  },
  blogCategorySelectPillTextActive: {
    color: '#25364E',
    fontWeight: '700',
  },
  blogCoverPreviewBox: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    height: 110,
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  blogCoverPreviewImg: {
    width: '100%',
    height: '100%',
  },
  blogPublishToggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(50,105,199,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    marginTop: 4,
    marginBottom: 8,
  },
  blogPublishToggleCopy: {
    flex: 1,
  },
  blogPublishToggleTitle: {
    color: '#25364E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  blogPublishToggleSubtitle: {
    color: '#686474',
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
  },
  blogModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50,105,199,0.12)',
    backgroundColor: 'rgba(250,251,253,0.95)',
  },
  blogModalCancelBtn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,105,199,0.06)',
  },
  blogModalCancelText: {
    color: '#686474',
    fontSize: 12,
    fontWeight: '700',
  },
  blogModalSaveBtn: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3269C7',
  },
  blogModalSaveText: {
    color: '#FAFBFD',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(50,105,199,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3269C7',
    maxWidth: 140,
  },
  categoryBadgeWarning: {
    backgroundColor: 'rgba(147,100,19,0.08)',
    borderColor: 'rgba(147,100,19,0.22)',
  },
  categoryBadgeTextWarning: {
    color: '#936413',
  },
  categoryModalBox: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#151A2A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 42,
    elevation: 28,
  },
  categoryModalHeader: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 21,
    overflow: 'hidden',
  },
  categoryModalHeaderGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -48,
    top: -118,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  categoryModalHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryModalEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  categoryModalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 5,
    letterSpacing: -0.35,
  },
  categoryModalSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11.5,
    marginTop: 4,
  },
  categoryModalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  categoryModalProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F6FB',
    borderWidth: 1,
    borderColor: '#E2E9F4',
  },
  categoryModalProjectInfo: {
    flex: 1,
    minWidth: 0,
  },
  categoryModalProjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#25364E',
    marginTop: 3,
  },
  categoryModalProjectLabel: { color: '#6F80A0', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8 },
  categoryModalProjectTagline: {
    fontSize: 11.5,
    color: '#686474',
    marginTop: 2,
  },
  categoryModalCurrentPill: {
    minWidth: 138,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E3F2',
  },
  categoryModalCurrentLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.65,
    color: '#8490A7',
  },
  categoryModalCurrentVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#285DA8',
    maxWidth: 180,
    marginTop: 3,
  },
  categorySegmentRow: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 18,
    marginTop: 13,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#EDF2F8',
  },
  categorySegmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categorySegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E2F2',
    shadowColor: '#1C3F72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  categorySegmentBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#686474',
  },
  categorySegmentBtnTextActive: {
    fontWeight: '700',
    color: '#3269C7',
  },
  categoryModalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4F0',
  },
  categoryModalSearchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    color: '#25364E',
  },
  categoryModalList: {
    maxHeight: 350,
  },
  categoryModalListContent: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 8,
  },
  categoryModalEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryModalEmptyText: {
    fontSize: 13,
    color: '#8a8597',
    fontWeight: '500',
  },
  categoryOptionCard: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E7F0',
  },
  categoryOptionCardSelected: {
    backgroundColor: '#EEF4FF',
    borderColor: '#8CB1EA',
  },
  categoryOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  categoryOptionTexts: {
    flex: 1,
    minWidth: 0,
  },
  categoryOptionName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#25364E',
  },
  categoryOptionNameSelected: {
    color: '#245AA7',
    fontWeight: '700',
  },
  categoryOptionMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  categoryOptionKind: { fontSize: 8, fontWeight: '700', letterSpacing: 0.65 },
  categoryOptionKindGame: { color: '#7A569E' },
  categoryOptionKindApp: { color: '#18766A' },
  categoryOptionSlug: {
    fontSize: 10.5,
    color: '#8a8597',
  },
  categoryRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(50,105,199,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  categoryRadioSelected: {
    backgroundColor: '#3269C7',
    borderColor: '#3269C7',
  },
  categoryModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3E9F2',
    backgroundColor: '#F7F9FC',
  },
  categoryModalSelection: { flex: 1, minWidth: 110 },
  categoryModalSelectionLabel: { color: '#8993A7', fontSize: 8, fontWeight: '700', letterSpacing: 0.75 },
  categoryModalSelectionValue: { color: '#25364E', fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  categoryModalFooterActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  categoryModalCancelBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EDF4',
  },
  categoryModalCancelText: {
    color: '#686474',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryModalSaveBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#285DA8',
  },
  categoryModalSaveBtnDisabled: {
    opacity: 0.45,
  },
  categoryModalSaveBtnSubdued: {
    opacity: 0.7,
  },
  categoryModalSaveText: {
    color: '#FAFBFD',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryModalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: '#F2D9DE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 10,
  },
  categoryModalErrorText: {
    flex: 1,
    color: '#B83D57',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  inlineUpvotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inlineUpvotesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  supportModalBox: {
    width: '100%',
    maxWidth: 590,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 36,
    elevation: 24,
  },
  supportModalHeader: {
    minHeight: 126,
    paddingHorizontal: 24,
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  supportModalGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -70,
    top: -90,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  supportModalHeaderCopy: {
    flex: 1,
    paddingRight: 16,
  },
  supportSecretPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  supportSecretDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F6C85F', shadowColor: '#F6C85F', shadowOpacity: 0.5, shadowRadius: 6 },
  supportSecretPillText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.05,
  },
  supportModalTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  supportModalSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 11.5,
    lineHeight: 16.5,
    marginTop: 5,
  },
  supportProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#F3F7FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE8EE',
  },
  supportProjectInfo: {
    flex: 1,
    paddingRight: 12,
  },
  supportProjectLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#8993A7',
    letterSpacing: 0.7,
  },
  supportProjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#25364E',
    marginTop: 2,
  },
  supportProjectTagline: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  supportCurrentBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CEE1EA',
  },
  supportCurrentLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#568093',
    letterSpacing: 0.6,
  },
  supportCurrentVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#176B70',
    marginTop: 2,
  },
  supportModalBody: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 13,
  },
  supportModalScroll: { flexShrink: 1 },
  supportChoicePanel: { padding: 15, borderRadius: 16, backgroundColor: '#F7F9FC', borderWidth: 1, borderColor: '#E2E8F1' },
  supportChoiceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  supportSectionLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#445775',
    letterSpacing: 0.9,
  },
  supportSectionHint: { color: '#7D899D', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  supportLimitBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E6EEF8' },
  supportLimitText: { color: '#41638F', fontSize: 8, fontWeight: '700', letterSpacing: 0.55 },
  supportPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  supportPresetPill: {
    flex: 1,
    minWidth: 76,
    minHeight: 66,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5EF',
  },
  supportPresetPillActive: {
    backgroundColor: '#225F78',
    borderColor: '#225F78',
    shadowColor: '#173F55',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },
  supportPresetAmount: { color: '#243B58', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  supportPresetAmountActive: { color: '#FFFFFF' },
  supportPresetPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8490A3',
    marginTop: 1,
  },
  supportPresetPillTextActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  supportPresetCheck: { position: 'absolute', top: 6, right: 6, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  supportCustomInputGroup: {
    gap: 7,
    marginTop: 14,
  },
  supportCustomLabel: { color: '#68778E', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.7 },
  supportInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 46,
  },
  supportInputWrapActive: { borderColor: '#43889B', backgroundColor: '#F9FDFD' },
  supportInputPrefix: { color: '#25797C', fontSize: 19, lineHeight: 22, fontWeight: '700' },
  supportInputSuffix: { color: '#8490A3', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.55 },
  supportTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#25364E',
    padding: 0,
  },
  supportCalculationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 11,
    backgroundColor: '#18354F',
    borderRadius: 15,
  },
  supportCalcItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  supportCalcLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  supportCalcOldVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  supportCalcAddVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F6C85F',
    marginTop: 2,
  },
  supportCalcTotalVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  supportCalcOperator: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.09)' },
  supportCalcOperatorText: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '700' },
  supportCalcTotalItem: { borderRadius: 10, backgroundColor: '#207261' },
  supportCalcTotalLabel: { color: 'rgba(255,255,255,0.7)' },
  supportSecretNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F8F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D8EAE4',
  },
  supportSecretNoticeText: {
    flex: 1,
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 14.5,
  },
  supportModalConfirmBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minWidth: 160,
    backgroundColor: '#1E746E',
  },
  supportModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  supportModalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E3E9F2', backgroundColor: '#F7F9FC' },
  supportFooterAmount: { flex: 1, minWidth: 105 },
  supportFooterLabel: { color: '#8993A7', fontSize: 8, fontWeight: '700', letterSpacing: 0.7 },
  supportFooterValue: { color: '#1E746E', fontSize: 13, fontWeight: '700', marginTop: 3 },
  supportFooterActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
});
