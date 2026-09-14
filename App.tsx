import { BlurTargetView, BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Alert, Platform, Text, useWindowDimensions } from 'react-native';
import { AdaptiveAppNavigation, TabKey } from './src/shared/navigation/AdaptiveAppNavigation';
import { PremiumBackdrop, PremiumBackdropVariant } from './src/shared/components/PremiumBackdrop';
import { KistasLaunchScreen } from './src/shared/components/KistasLaunchScreen';
import { KistasLogo } from './src/shared/components/KistasLogo';
import { AuthSuccessOverlay } from './src/shared/components/AuthSuccessOverlay';
import { DiscoverScreen } from './src/features/listings/presentation/DiscoverScreen';
import { ProjectDetailScreen } from './src/features/listings/presentation/ProjectDetailScreen';
import { CreateListingScreen } from './src/features/listings/presentation/CreateListingScreen';
import { ConversationsScreen } from './src/features/chat/presentation/ConversationsScreen';
import { ChatScreen } from './src/features/chat/presentation/ChatScreen';
import { ChatService } from './src/features/chat/application/ChatService';
import { CreditStoreScreen } from './src/features/credits/presentation/CreditStoreScreen';
import { ProfileAndWalletScreen } from './src/features/profile/presentation/ProfileAndWalletScreen';
import { VisibilityManagementScreen } from './src/features/profile/presentation/VisibilityManagementScreen';
import { AccountSecurityScreen } from './src/features/profile/presentation/AccountSecurityScreen';
import { LoginScreen } from './src/features/auth/presentation/LoginScreen';
import { RegisterScreen } from './src/features/auth/presentation/RegisterScreen';
import { AdminDashboardScreen } from './src/features/admin/presentation/AdminDashboardScreen';
import { UserProfile } from './src/features/auth/domain/User';
import { Listing, PlatformType } from './src/features/listings/domain/Listing';
import { BrowseScreen } from './src/features/listings/presentation/BrowseScreen';
import { CategoryScreen } from './src/features/listings/presentation/CategoryScreen';
import { ShowcaseLeadersScreen } from './src/features/listings/presentation/ShowcaseLeadersScreen';
import { AboutScreen } from './src/features/about/presentation/AboutScreen';
import { HowItWorksScreen } from './src/features/how-it-works/presentation/HowItWorksScreen';
import { PrivacyPolicyScreen } from './src/features/legal/presentation/PrivacyPolicyScreen';
import { BlogScreen } from './src/features/blog/presentation/BlogScreen';
import { AppProviders, chatNotificationActions, useAuth, useAuthActions } from './src/core/state';
import { breakpoints, theme } from './src/core/theme';

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('App Error Caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorFallbackContainer}>
          <Text style={styles.errorTitle}>Uygulama Çalışırken Bir Hata Oluştu</Text>
          <Text style={styles.errorDetails}>{String(this.state.error?.message || this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

interface DiscoverPreset {
  categoryId?: string | null;
  searchQuery?: string;
  feedSort?: 'trending' | 'top_voted' | 'newest';
  platform?: PlatformType | 'all';
}

interface ShowcaseFilters {
  categoryId: string | null;
  platform: PlatformType | 'all';
}

const NavigationBackdrop = Platform.OS === 'android' ? BlurTargetView : View;

interface WebRouteState {
  tab: TabKey;
  screen: 'none' | 'about' | 'how-it-works' | 'privacy' | 'blog' | 'category' | 'showcase';
  blogSlug?: string | null;
  categoryId?: string | null;
  platform?: PlatformType | 'all';
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHOWCASE_PLATFORMS: Array<PlatformType | 'all'> = ['all', 'iOS', 'Android', 'Web', 'macOS', 'SaaS'];

const parseWebRoute = (): WebRouteState => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { tab: 'discover', screen: 'none' };
  }

  const rawRoute = window.location.hash
    ? window.location.hash.replace(/^#\/?/, '').trim()
    : window.location.pathname.replace(/^\/+/, '').trim();
  const [rawPath, rawQuery = ''] = rawRoute.split('?');
  const segments = rawPath.split('/').filter(Boolean);
  const primary = (segments[0] || '').toLowerCase();
  const secondary = segments[1] || '';

  if (primary === 'blog') {
    return { tab: 'discover', screen: 'blog', blogSlug: secondary || null };
  }
  if (primary === 'about' || primary === 'hakkimizda') {
    return { tab: 'discover', screen: 'about' };
  }
  if (primary === 'how-it-works' || primary === 'nasil-calisir') {
    return { tab: 'discover', screen: 'how-it-works' };
  }
  if (primary === 'privacy' || primary === 'gizlilik' || primary === 'gizlilik-politikasi') {
    return { tab: 'discover', screen: 'privacy' };
  }
  if (primary === 'category' && secondary) {
    return { tab: 'browse', screen: 'category', categoryId: decodeURIComponent(secondary) };
  }
  if (primary === 'showcase') {
    const params = new URLSearchParams(rawQuery);
    const rawCategoryId = params.get('category');
    const rawPlatform = params.get('platform') as PlatformType | 'all' | null;
    return {
      tab: 'discover',
      screen: 'showcase',
      categoryId: rawCategoryId && UUID_PATTERN.test(rawCategoryId) ? rawCategoryId : null,
      platform: rawPlatform && SHOWCASE_PLATFORMS.includes(rawPlatform) ? rawPlatform : 'all',
    };
  }

  const validTabs: TabKey[] = ['discover', 'browse', 'messages', 'create', 'credits', 'profile'];
  if (validTabs.includes(primary as TabKey)) {
    return { tab: primary as TabKey, screen: 'none' };
  }

  // Tarayıcı yenilendiğinde (F5) son sekmeyi sessionStorage'dan geri yükle
  try {
    const savedSessionTab = sessionStorage.getItem('kistas_active_tab') as TabKey | null;
    if (savedSessionTab && validTabs.includes(savedSessionTab)) {
      return { tab: savedSessionTab, screen: 'none' };
    }
  } catch {
    // sessionStorage erişim engeli varsa yoksay
  }

  return { tab: 'discover', screen: 'none' };
};

function AppContent() {
  const navigationBlurTarget = useRef<View>(null);
  const { width: viewportWidth } = useWindowDimensions();
  const { profile: currentUser, isLoading: isAuthLoading } = useAuth();
  const { signOut, setProfile } = useAuthActions();

  const initialWebRoute = useMemo(() => parseWebRoute(), []);

  const [isLaunchVisible, setIsLaunchVisible] = useState(Platform.OS !== 'web');
  const [activeTab, setActiveTab] = useState<TabKey>(initialWebRoute.tab);
  const [discoverPreset, setDiscoverPreset] = useState<DiscoverPreset>({});

  // Alt ekran durumları
  const [selectedProject, setSelectedProject] = useState<Listing | null>(null);
  const [editingProject, setEditingProject] = useState<Listing | null>(null);
  const [activeChatConvId, setActiveChatConvId] = useState<string | null>(null);
  const [activeChatProjectTitle, setActiveChatProjectTitle] = useState<string>('Kıstas AI Studio');
  const [activeChatOtherPartyName, setActiveChatOtherPartyName] = useState<string>('Kıstas Üyesi');
  const [activeChatOtherPartyAvatar, setActiveChatOtherPartyAvatar] = useState<string | null>(null);
  const [activeChatCanManageSupport, setActiveChatCanManageSupport] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isVisibilityManagementOpen, setIsVisibilityManagementOpen] = useState(false);
  const [visibilityTargetListingId, setVisibilityTargetListingId] = useState<string | null>(null);
  const [isAccountSecurityOpen, setIsAccountSecurityOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthSuccessVisible, setIsAuthSuccessVisible] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(initialWebRoute.screen === 'about');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(initialWebRoute.screen === 'how-it-works');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(initialWebRoute.screen === 'privacy');
  const [isBlogOpen, setIsBlogOpen] = useState(initialWebRoute.screen === 'blog');
  const [blogPostSlug, setBlogPostSlug] = useState<string | null>(initialWebRoute.blogSlug || null);
  const [activeCategoryScreenId, setActiveCategoryScreenId] = useState<string | null>(
    initialWebRoute.screen === 'category' ? initialWebRoute.categoryId || null : null,
  );
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(initialWebRoute.screen === 'showcase');
  const [showcaseFilters, setShowcaseFilters] = useState<ShowcaseFilters>({
    categoryId: initialWebRoute.screen === 'showcase' ? initialWebRoute.categoryId || null : null,
    platform: initialWebRoute.screen === 'showcase' ? initialWebRoute.platform || 'all' : 'all',
  });
  const isHandlingPopstateRef = useRef(false);
  const [pendingSupportAfterAuth, setPendingSupportAfterAuth] = useState(false);
  const [pendingVisibilityAfterAuth, setPendingVisibilityAfterAuth] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isNavCompact, setIsNavCompact] = useState(false);
  const lastScrollOffsetRef = useRef(0);
  const isNavCompactRef = useRef(false);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const scrollDirectionDistanceRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const themeColor = '#ffffff';
    document.documentElement.style.backgroundColor = themeColor;
    document.documentElement.style.colorScheme = 'light';
    document.body.style.backgroundColor = themeColor;
    document.body.style.colorScheme = 'light';

    const root = document.getElementById('root');
    if (root) {
      root.style.backgroundColor = themeColor;
      root.style.minHeight = '100dvh';
    }

    let metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = themeColor;

    const scrollbarStyle = document.getElementById('kistas-scrollbars') ?? document.createElement('style');
    scrollbarStyle.id = 'kistas-scrollbars';
    scrollbarStyle.textContent = `
      * {
        scrollbar-width: thin;
        scrollbar-color: #3269C7 transparent;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
      }
      html, body, #root { scroll-behavior: smooth; overscroll-behavior-y: none; }
      *::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      *::-webkit-scrollbar-track,
      *::-webkit-scrollbar-corner {
        background: transparent;
      }
      *::-webkit-scrollbar-thumb {
        background: #3269C7;
        border-radius: 999px;
        min-height: 32px;
      }
      *::-webkit-scrollbar-thumb:hover { background: #3269C7; }
      *::-webkit-scrollbar-thumb:active { background: #3269C7; }
      *::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
      @media (forced-colors: active) {
        * { scrollbar-color: auto; }
      }
    `;
    if (!scrollbarStyle.parentNode) document.head.appendChild(scrollbarStyle);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let frameId: number | null = null;
    let activeScroller: HTMLElement | null = null;
    let targetTop = 0;

    const resetWheelScroll = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      activeScroller = null;
      targetTop = 0;
    };

    const findScrollableParent = (start: EventTarget | null, delta: number) => {
      let node = start instanceof HTMLElement ? start : null;
      while (node && node !== document.body && node !== document.documentElement) {
        const overflowY = window.getComputedStyle(node).overflowY;
        const canScroll = /(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1;
        if (canScroll) {
          const atStart = node.scrollTop <= 0;
          const atEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
          if ((delta < 0 && !atStart) || (delta > 0 && !atEnd)) return node;
        }
        node = node.parentElement;
      }
      return document.scrollingElement as HTMLElement | null;
    };

    let lastWheelTime = 0;
    let velocityMultiplier = 1;

    const animateScroll = () => {
      if (!activeScroller) return;
      const distance = targetTop - activeScroller.scrollTop;
      if (Math.abs(distance) < 0.8) {
        activeScroller.scrollTop = targetTop;
        frameId = null;
        activeScroller = null;
        return;
      }
      activeScroller.scrollTop += distance * 0.38;
      frameId = window.requestAnimationFrame(animateScroll);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const rawDelta = event.deltaY * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (Math.abs(rawDelta) < 1) return;

      const scroller = findScrollableParent(event.target, rawDelta);
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 1) return;

      const now = performance.now();
      const timeDiff = now - lastWheelTime;
      lastWheelTime = now;

      if (timeDiff < 140) {
        velocityMultiplier = Math.min(2.2, velocityMultiplier + 0.22);
      } else {
        velocityMultiplier = 1.0;
      }

      const effectiveDelta = rawDelta * 1.35 * velocityMultiplier;
      const maxTop = scroller.scrollHeight - scroller.clientHeight;
      if (scroller !== activeScroller || Math.abs(scroller.scrollTop - targetTop) > 30) {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        activeScroller = scroller;
        targetTop = scroller.scrollTop;
        frameId = null;
      }

      targetTop = Math.max(0, Math.min(maxTop, targetTop + effectiveDelta));
      event.preventDefault();
      if (frameId === null) frameId = window.requestAnimationFrame(animateScroll);
    };

    window.addEventListener('kistas:scroll-to-top', resetWheelScroll);
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('kistas:scroll-to-top', resetWheelScroll);
      document.removeEventListener('wheel', handleWheel);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  const updateNavCompact = useCallback((nextValue: boolean) => {
    if (isNavCompactRef.current === nextValue) return;
    isNavCompactRef.current = nextValue;
    setIsNavCompact(nextValue);
  }, []);

  const handleContentScroll = useCallback((offsetY: number) => {
    const nextOffset = Math.max(0, offsetY);
    const delta = nextOffset - lastScrollOffsetRef.current;
    const direction = delta > 0 ? 'down' : delta < 0 ? 'up' : null;

    if (direction) {
      if (scrollDirectionRef.current === direction) {
        scrollDirectionDistanceRef.current += Math.abs(delta);
      } else {
        scrollDirectionRef.current = direction;
        scrollDirectionDistanceRef.current = Math.abs(delta);
      }
    }

    if (nextOffset <= 24) {
      updateNavCompact(false);
      scrollDirectionDistanceRef.current = 0;
    } else if (nextOffset > 36 && direction === 'down' && scrollDirectionDistanceRef.current >= 14) {
      updateNavCompact(true);
      scrollDirectionDistanceRef.current = 0;
    } else if (direction === 'up' && scrollDirectionDistanceRef.current >= 22) {
      updateNavCompact(false);
      scrollDirectionDistanceRef.current = 0;
    }

    lastScrollOffsetRef.current = nextOffset;
  }, [updateNavCompact]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let animationFrameId: number | null = null;
    let pendingOffset = 0;

    const handleWebScroll = (event: Event) => {
      const target = event.target;

      if (target === document) {
        pendingOffset = window.scrollY;
      } else {
        if (!(target instanceof HTMLElement)) return;
        if (target.scrollHeight <= target.clientHeight + 1) return;
        pendingOffset = target.scrollTop;
      }

      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        handleContentScroll(pendingOffset);
      });
    };

    document.addEventListener('scroll', handleWebScroll, true);
    return () => {
      document.removeEventListener('scroll', handleWebScroll, true);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    };
  }, [handleContentScroll]);

  useEffect(() => {
    lastScrollOffsetRef.current = 0;
    scrollDirectionRef.current = null;
    scrollDirectionDistanceRef.current = 0;
    updateNavCompact(false);
  }, [activeTab, updateNavCompact]);

  useEffect(() => {
    let cancelled = false;
    setActiveChatConvId(null);

    if (!currentUser) {
      chatNotificationActions.resetUnread();
      return undefined;
    }

    ChatService.getConversations().then((conversations) => {
      if (cancelled) return;
      chatNotificationActions.setUnreadCount(
        conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
      );
    });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const openSupportConversation = useCallback(async () => {
    const result = await ChatService.getOrCreateSupportConversation();
    if (!result.success || !result.conversationId) {
      Alert.alert('Destek açılamadı', result.error || 'Lütfen tekrar deneyin.');
      return;
    }

    setIsAboutOpen(false);
    setIsPrivacyOpen(false);
    setIsAdminDashboardOpen(false);
    setSelectedProject(null);
    setActiveChatProjectTitle('Kıstas Destek');
    setActiveChatOtherPartyName('Kıstas Destek');
    setActiveChatOtherPartyAvatar(null);
    setActiveChatCanManageSupport(false);
    setActiveChatConvId(result.conversationId);
    setActiveTab('messages');
    updateNavCompact(false);
  }, [updateNavCompact]);

  const handleOpenSupport = useCallback(() => {
    if (!currentUser) {
      setPendingSupportAfterAuth(true);
      setAuthView('login');
      setIsAuthModalOpen(true);
      updateNavCompact(false);
      return;
    }
    void openSupportConversation();
  }, [currentUser, openSupportConversation, updateNavCompact]);

  const handleOpenSponsorManagement = useCallback((listingId?: string) => {
    if (!currentUser) {
      setPendingVisibilityAfterAuth(true);
      setAuthView('login');
      setIsAuthModalOpen(true);
      updateNavCompact(false);
      return;
    }

    setSelectedProject(null);
    setIsAboutOpen(false);
    setIsPrivacyOpen(false);
    setVisibilityTargetListingId(listingId || null);
    setIsVisibilityManagementOpen(true);
    updateNavCompact(false);
  }, [currentUser, updateNavCompact]);

  const handleLoginSuccess = (profile: UserProfile | null) => {
    setProfile(profile);
    setIsAuthSuccessVisible(true);
  };

  const handleAuthSuccessOverlayFinish = () => {
    const shouldOpenSupport = pendingSupportAfterAuth;
    const shouldOpenVisibility = pendingVisibilityAfterAuth;
    setIsAuthSuccessVisible(false);
    setIsAuthModalOpen(false);
    setIsAdminDashboardOpen(false);
    setIsVisibilityManagementOpen(false);
    setIsAccountSecurityOpen(false);
    setAuthView('login');
    setSelectedProject(null);
    setActiveChatConvId(null);
    setEditingProject(null);
    setIsAboutOpen(false);
    setIsPrivacyOpen(false);
    setPendingSupportAfterAuth(false);
    setPendingVisibilityAfterAuth(false);
    setDiscoverPreset({
      categoryId: null,
      searchQuery: '',
      feedSort: 'trending',
      platform: 'all',
    });
    setActiveTab('discover');
    if (shouldOpenSupport) void openSupportConversation();
    else if (shouldOpenVisibility) setIsVisibilityManagementOpen(true);
  };

  const handleOpenBlog = useCallback((slug?: string) => {
    lastScrollOffsetRef.current = 0;
    scrollDirectionRef.current = null;
    scrollDirectionDistanceRef.current = 0;
    updateNavCompact(false);
    setIsAboutOpen(false);
    setIsHowItWorksOpen(false);
    setIsPrivacyOpen(false);
    setBlogPostSlug(typeof slug === 'string' ? slug : null);
    setIsBlogOpen(true);
  }, [updateNavCompact]);

  // Web tarayıcı geri/ileri butonları ve manuel hash değişikliklerini dinleme
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWebHashChange = () => {
      const route = parseWebRoute();
      isHandlingPopstateRef.current = true;

      if (route.screen === 'blog') {
        setIsShowcaseOpen(false);
        setIsBlogOpen(true);
        setBlogPostSlug(route.blogSlug || null);
        setIsAboutOpen(false);
        setIsHowItWorksOpen(false);
        setIsPrivacyOpen(false);
        setActiveCategoryScreenId(null);
        setSelectedProject(null);
      } else if (route.screen === 'about') {
        setIsShowcaseOpen(false);
        setIsAboutOpen(true);
        setIsBlogOpen(false);
        setBlogPostSlug(null);
        setIsHowItWorksOpen(false);
        setIsPrivacyOpen(false);
        setActiveCategoryScreenId(null);
        setSelectedProject(null);
      } else if (route.screen === 'how-it-works') {
        setIsShowcaseOpen(false);
        setIsHowItWorksOpen(true);
        setIsAboutOpen(false);
        setIsBlogOpen(false);
        setBlogPostSlug(null);
        setIsPrivacyOpen(false);
        setActiveCategoryScreenId(null);
        setSelectedProject(null);
      } else if (route.screen === 'privacy') {
        setIsShowcaseOpen(false);
        setIsPrivacyOpen(true);
        setIsAboutOpen(false);
        setIsBlogOpen(false);
        setBlogPostSlug(null);
        setIsHowItWorksOpen(false);
        setActiveCategoryScreenId(null);
        setSelectedProject(null);
      } else if (route.screen === 'category' && route.categoryId) {
        setIsShowcaseOpen(false);
        setActiveCategoryScreenId(route.categoryId);
        setIsAboutOpen(false);
        setIsBlogOpen(false);
        setBlogPostSlug(null);
        setIsHowItWorksOpen(false);
        setIsPrivacyOpen(false);
        setSelectedProject(null);
        setActiveTab('browse');
      } else if (route.screen === 'showcase') {
        setIsShowcaseOpen(true);
        setShowcaseFilters({
          categoryId: route.categoryId || null,
          platform: route.platform || 'all',
        });
        setIsAboutOpen(false);
        setIsBlogOpen(false);
        setBlogPostSlug(null);
        setIsHowItWorksOpen(false);
        setIsPrivacyOpen(false);
        setActiveCategoryScreenId(null);
        setSelectedProject(null);
        setActiveTab('discover');
      } else {
        setIsShowcaseOpen(false);
        setIsAboutOpen(false);
        setIsBlogOpen(false);
        setBlogPostSlug(null);
        setIsHowItWorksOpen(false);
        setIsPrivacyOpen(false);
        setActiveCategoryScreenId(null);
        setSelectedProject(null);
        setActiveTab(route.tab);
      }

      try {
        sessionStorage.setItem('kistas_active_tab', route.tab);
      } catch {}

      setTimeout(() => {
        isHandlingPopstateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handleWebHashChange);
    window.addEventListener('hashchange', handleWebHashChange);
    return () => {
      window.removeEventListener('popstate', handleWebHashChange);
      window.removeEventListener('hashchange', handleWebHashChange);
    };
  }, []);

  // Web URL senkronizasyonu ve sekme/ekran durumunu sessionStorage'a kalıcı kılma
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('kistas_active_tab', activeTab);
    } catch {}

    if (isHandlingPopstateRef.current) return;

    let targetPath = '';
    if (isBlogOpen) {
      targetPath = blogPostSlug ? `blog/${blogPostSlug}` : 'blog';
    } else if (isAboutOpen) {
      targetPath = 'about';
    } else if (isHowItWorksOpen) {
      targetPath = 'how-it-works';
    } else if (isPrivacyOpen) {
      targetPath = 'privacy';
    } else if (activeCategoryScreenId) {
      targetPath = `category/${activeCategoryScreenId}`;
    } else if (isShowcaseOpen) {
      const params = new URLSearchParams();
      if (showcaseFilters.categoryId) params.set('category', showcaseFilters.categoryId);
      if (showcaseFilters.platform !== 'all') params.set('platform', showcaseFilters.platform);
      const query = params.toString();
      targetPath = `showcase${query ? `?${query}` : ''}`;
    } else {
      targetPath = activeTab === 'discover' ? 'discover' : activeTab;
    }

    const targetHash = `#/${targetPath}`;
    const currentHash = window.location.hash;

    if (
      currentHash === targetHash ||
      (targetPath === 'discover' && (currentHash === '' || currentHash === '#' || currentHash === '#/' || currentHash === '#/discover'))
    ) {
      return;
    }

    try {
      window.history.pushState(null, '', targetHash);
    } catch {
      window.location.hash = targetHash;
    }
  }, [activeTab, isBlogOpen, blogPostSlug, isAboutOpen, isHowItWorksOpen, isPrivacyOpen, activeCategoryScreenId, isShowcaseOpen, showcaseFilters]);

  const handleTabChange = useCallback((tab: TabKey) => {
    const wasStandalonePageOpen = isAboutOpen || isPrivacyOpen || isHowItWorksOpen || isBlogOpen || isShowcaseOpen || Boolean(activeCategoryScreenId);
    if (isShowcaseOpen) setIsShowcaseOpen(false);
    if (isAboutOpen) setIsAboutOpen(false);
    if (isPrivacyOpen) setIsPrivacyOpen(false);
    if (isHowItWorksOpen) setIsHowItWorksOpen(false);
    if (isBlogOpen) {
      setIsBlogOpen(false);
      setBlogPostSlug(null);
    }
    if (activeCategoryScreenId) setActiveCategoryScreenId(null);
    if (tab === 'create') setEditingProject(null);
    if (activeTab === tab && !wasStandalonePageOpen) return;

    if ((tab === 'create' || tab === 'messages') && !currentUser) {
      setSelectedProject(null);
      setAuthView('login');
      setIsAuthModalOpen(true);
      updateNavCompact(false);
      return;
    }

    lastScrollOffsetRef.current = 0;
    updateNavCompact(false);
    setSelectedProject(null);
    setActiveTab(tab);
    setActiveChatConvId(null);
    setIsAuthModalOpen(false);
    setIsAdminDashboardOpen(false);
    setIsVisibilityManagementOpen(false);
    setIsAccountSecurityOpen(false);
    if (tab === 'discover') {
      setDiscoverPreset({
        categoryId: null,
        searchQuery: '',
        feedSort: 'trending',
        platform: 'all',
      });
    }
  }, [activeCategoryScreenId, activeTab, currentUser, isAboutOpen, isBlogOpen, isHowItWorksOpen, isPrivacyOpen, isShowcaseOpen, updateNavCompact]);

  const handleOpenAbout = useCallback(() => {
    lastScrollOffsetRef.current = 0;
    scrollDirectionRef.current = null;
    scrollDirectionDistanceRef.current = 0;
    updateNavCompact(false);
    setIsAboutOpen(true);
    setIsHowItWorksOpen(false);
    setIsPrivacyOpen(false);
    setIsBlogOpen(false);
    setBlogPostSlug(null);
  }, [updateNavCompact]);

  const handleOpenHowItWorks = useCallback(() => {
    lastScrollOffsetRef.current = 0;
    scrollDirectionRef.current = null;
    scrollDirectionDistanceRef.current = 0;
    updateNavCompact(false);
    setIsAboutOpen(false);
    setIsHowItWorksOpen(true);
    setIsPrivacyOpen(false);
    setIsBlogOpen(false);
    setBlogPostSlug(null);
  }, [updateNavCompact]);

  const handleOpenPrivacy = useCallback(() => {
    lastScrollOffsetRef.current = 0;
    scrollDirectionRef.current = null;
    scrollDirectionDistanceRef.current = 0;
    updateNavCompact(false);
    setIsAboutOpen(false);
    setIsHowItWorksOpen(false);
    setIsPrivacyOpen(true);
    setIsBlogOpen(false);
    setBlogPostSlug(null);
  }, [updateNavCompact]);

  const handleAboutExplore = useCallback(() => {
    setIsAboutOpen(false);
    setIsHowItWorksOpen(false);
    setIsBlogOpen(false);
    setBlogPostSlug(null);
    setSelectedProject(null);
    setDiscoverPreset({
      categoryId: null,
      searchQuery: '',
      feedSort: 'trending',
      platform: 'all',
    });
    setActiveTab('discover');
  }, []);

  const handleBrowseCategory = useCallback((categoryId: string) => {
    setActiveCategoryScreenId(categoryId);
  }, []);

  const handleBrowseTopVoted = useCallback(() => {
    setDiscoverPreset({
      categoryId: null,
      searchQuery: '',
      feedSort: 'top_voted',
      platform: 'all',
    });
    setActiveTab('discover');
  }, []);

  const handleBrowseNewest = useCallback(() => {
    setDiscoverPreset({
      categoryId: null,
      searchQuery: '',
      feedSort: 'newest',
      platform: 'all',
    });
    setActiveTab('discover');
  }, []);

  const handleBrowsePlatform = useCallback((platform: PlatformType | 'all') => {
    setDiscoverPreset({
      categoryId: null,
      searchQuery: '',
      feedSort: 'trending',
      platform,
    });
    setActiveTab('discover');
  }, []);

  const handleOpenShowcase = useCallback((filters: DiscoverPreset) => {
    setDiscoverPreset(filters);
    setShowcaseFilters({
      categoryId: filters.categoryId || null,
      platform: filters.platform || 'all',
    });
    setSelectedProject(null);
    setIsShowcaseOpen(true);
    updateNavCompact(false);
  }, [updateNavCompact]);

  const isCheckoutLikeOpen = () => {
    return isAuthModalOpen || isAuthSuccessVisible || !!selectedProject || isAdminDashboardOpen || isVisibilityManagementOpen || isAccountSecurityOpen || isAboutOpen || isPrivacyOpen || isHowItWorksOpen || isBlogOpen || isShowcaseOpen;
  };

  const backdropVariant: PremiumBackdropVariant = selectedProject
    ? 'detail'
    : 'discover';
  const isPhoneWeb = Platform.OS === 'web' && viewportWidth <= breakpoints.phoneMax;
  const isMobileChatOpen = activeTab === 'messages'
    && Boolean(activeChatConvId)
    && (Platform.OS !== 'web' || isPhoneWeb);
  const showNavigation = !isCheckoutLikeOpen() && !isMobileChatOpen;
  const webContentWidth = Math.min(viewportWidth, 1600);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.brand.canvas}
      />

      <PremiumBackdrop variant={backdropVariant} />

      <NavigationBackdrop
        ref={navigationBlurTarget}
        style={[
          styles.screenContainer,
          Platform.OS === 'web' && showNavigation && {
            width: '100%',
            maxWidth: webContentWidth,
            alignSelf: 'center',
            paddingTop: 12,
          },
        ]}
      >
        {/* Modal Ekranlar (Overlay / Drill-down) */}
        {isAdminDashboardOpen ? (
          <View style={styles.flexOne}>
            <AdminDashboardScreen
              onBack={() => setIsAdminDashboardOpen(false)}
              onSelectProject={(project) => {
                setSelectedProject(project);
                setIsAdminDashboardOpen(false);
              }}
              onOpenConversation={(conversation) => {
                setActiveChatConvId(conversation.id);
                setActiveChatProjectTitle('Kıstas Destek');
                setActiveChatOtherPartyName(conversation.otherParty?.fullName || 'Kıstas Üyesi');
                setActiveChatOtherPartyAvatar(conversation.otherParty?.avatarUrl || null);
                setActiveChatCanManageSupport(true);
                setIsAdminDashboardOpen(false);
                setActiveTab('messages');
              }}
              onOpenBlog={(slug) => {
                setIsAdminDashboardOpen(false);
                handleOpenBlog(slug);
              }}
            />
          </View>
        ) : isVisibilityManagementOpen ? (
          <VisibilityManagementScreen
            initialListingId={visibilityTargetListingId}
            onBack={() => {
              setVisibilityTargetListingId(null);
              setIsVisibilityManagementOpen(false);
            }}
            onOpenCreditStore={() => {
              setVisibilityTargetListingId(null);
              setIsVisibilityManagementOpen(false);
              setActiveTab('credits');
            }}
          />
        ) : isAccountSecurityOpen ? (
          <AccountSecurityScreen onBack={() => setIsAccountSecurityOpen(false)} />
        ) : isAuthModalOpen ? (
          authView === 'login' ? (
            <LoginScreen
              onBack={() => {
                setIsAuthModalOpen(false);
                setPendingSupportAfterAuth(false);
                setPendingVisibilityAfterAuth(false);
                if (activeTab === 'profile' && !currentUser) {
                  setActiveTab('discover');
                }
              }}
              onRegister={() => setAuthView('register')}
              onAuthSuccess={handleLoginSuccess}
            />
          ) : (
            <RegisterScreen
              onBack={() => setAuthView('login')}
              onLogin={() => setAuthView('login')}
              onAuthSuccess={handleLoginSuccess}
            />
          )
        ) : isPrivacyOpen ? (
          <PrivacyPolicyScreen onBack={() => setIsPrivacyOpen(false)} />
        ) : isBlogOpen ? (
          <BlogScreen
            initialPostSlug={blogPostSlug || undefined}
            onBack={() => {
              setIsBlogOpen(false);
              setBlogPostSlug(null);
            }}
            onExplore={handleAboutExplore}
            onOpenAbout={handleOpenAbout}
            onOpenHowItWorks={handleOpenHowItWorks}
            onOpenPrivacy={handleOpenPrivacy}
            onOpenSupport={handleOpenSupport}
          />
        ) : isAboutOpen ? (
          <AboutScreen
            onBack={() => setIsAboutOpen(false)}
            onExplore={handleAboutExplore}
            onOpenPrivacy={handleOpenPrivacy}
            onOpenSupport={handleOpenSupport}
            onOpenHowItWorks={handleOpenHowItWorks}
            onOpenBlog={handleOpenBlog}
          />
        ) : isHowItWorksOpen ? (
          <HowItWorksScreen
            onBack={() => setIsHowItWorksOpen(false)}
            onExplore={handleAboutExplore}
            onCreateProject={currentUser ? () => {
              setIsHowItWorksOpen(false);
              setActiveTab('create');
            } : () => {
              setIsHowItWorksOpen(false);
              setAuthView('login');
              setIsAuthModalOpen(true);
            }}
            onOpenAbout={handleOpenAbout}
            onOpenPrivacy={handleOpenPrivacy}
            onOpenSupport={handleOpenSupport}
            onOpenBlog={handleOpenBlog}
          />
        ) : selectedProject ? (
          <ProjectDetailScreen
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => setSelectedProject(null)}
            onRequireAuth={() => {
              setAuthView('login');
              setIsAuthModalOpen(true);
            }}
            onOpenAbout={handleOpenAbout}
            onOpenPrivacy={handleOpenPrivacy}
            onOpenSupport={handleOpenSupport}
            onOpenHowItWorks={handleOpenHowItWorks}
            onOpenBlog={handleOpenBlog}
            onOpenChat={async (_makerId, title) => {
              if (!currentUser) {
                setAuthView('login');
                setIsAuthModalOpen(true);
                return;
              }

              const result = await ChatService.getOrCreateListingConversation(selectedProject.id);
              if (!result.success || !result.conversationId) {
                Alert.alert('Sohbet başlatılamadı', result.error || 'Lütfen tekrar deneyin.');
                return;
              }

              setActiveChatProjectTitle(title || selectedProject.title);
              setActiveChatOtherPartyName(selectedProject.seller?.fullName || 'Kıstas Üyesi');
              setActiveChatOtherPartyAvatar(selectedProject.seller?.avatarUrl || null);
              setActiveChatCanManageSupport(false);
              setActiveChatConvId(result.conversationId);
              setActiveTab('messages');
              setSelectedProject(null);
            }}
          />
        ) : isShowcaseOpen ? (
          <ShowcaseLeadersScreen
            categoryId={showcaseFilters.categoryId}
            platform={showcaseFilters.platform}
            onBack={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.startsWith('#/showcase')) {
                window.history.back();
              } else {
                setIsShowcaseOpen(false);
              }
            }}
            onSelectProject={(project) => setSelectedProject(project)}
          />
        ) : activeCategoryScreenId ? (
          <CategoryScreen
            categoryId={activeCategoryScreenId}
            onBack={() => setActiveCategoryScreenId(null)}
            onSelectProject={(project) => setSelectedProject(project)}
            onOpenSponsorManagement={(listingId) => {
              setVisibilityTargetListingId(listingId || null);
              setIsVisibilityManagementOpen(true);
            }}
            onOpenCreditStore={() => {
              setActiveCategoryScreenId(null);
              setActiveTab('credits');
            }}
          />
        ) : activeTab === 'discover' ? (
          <DiscoverScreen
            onSelectListing={(project) => {
              setSelectedProject(project);
            }}
            initialCategoryId={discoverPreset.categoryId}
            initialSearchQuery={discoverPreset.searchQuery}
            initialFeedSort={discoverPreset.feedSort}
            initialPlatform={discoverPreset.platform}
            onOpenBrowse={() => setActiveTab('browse')}
            onOpenCreditStore={handleOpenSponsorManagement}
            onOpenAbout={handleOpenAbout}
            onOpenPrivacy={handleOpenPrivacy}
            onOpenSupport={handleOpenSupport}
            onOpenHowItWorks={handleOpenHowItWorks}
            onOpenBlog={handleOpenBlog}
            onOpenShowcase={handleOpenShowcase}
            onScrollOffsetChange={Platform.OS === 'web' ? undefined : handleContentScroll}
          />
        ) : activeTab === 'browse' ? (
          <BrowseScreen
            onSelectCategory={handleBrowseCategory}
            onOpenTopVoted={handleBrowseTopVoted}
            onOpenNewest={handleBrowseNewest}
            onSelectPlatform={handleBrowsePlatform}
            onOpenAbout={handleOpenAbout}
            onOpenPrivacy={handleOpenPrivacy}
            onOpenSupport={handleOpenSupport}
            onOpenHowItWorks={handleOpenHowItWorks}
            onOpenBlog={handleOpenBlog}
            onScrollOffsetChange={Platform.OS === 'web' ? undefined : handleContentScroll}
          />
        ) : activeTab === 'create' && currentUser ? (
          <CreateListingScreen
            editingListing={editingProject}
            onCancel={editingProject ? () => { setEditingProject(null); setActiveTab('profile'); } : undefined}
            onSuccess={() => {
              const wasEditing = Boolean(editingProject);
              setEditingProject(null);
              setActiveTab(wasEditing ? 'profile' : 'discover');
            }}
          />
        ) : activeTab === 'messages' && currentUser ? (
          activeChatConvId ? (
            <ChatScreen
              conversationId={activeChatConvId}
              projectTitle={activeChatProjectTitle}
              otherPartyName={activeChatOtherPartyName}
              otherPartyAvatar={activeChatOtherPartyAvatar}
              canManageSupport={activeChatCanManageSupport}
              onBack={() => setActiveChatConvId(null)}
            />
          ) : (
            <ConversationsScreen
              onSelectConversation={(conversation) => {
                setActiveChatConvId(conversation.id);
                setActiveChatProjectTitle(conversation.listing?.title || 'Kıstas Destek');
                setActiveChatOtherPartyName(conversation.otherParty?.fullName || 'Kıstas Üyesi');
                setActiveChatOtherPartyAvatar(conversation.otherParty?.avatarUrl || null);
                setActiveChatCanManageSupport(false);
              }}
              onScrollOffsetChange={Platform.OS === 'web' ? undefined : handleContentScroll}
            />
          )
        ) : activeTab === 'credits' ? (
          <CreditStoreScreen
            currentUser={currentUser}
            onNavigateToLaunch={() => handleTabChange('create')}
          />
        ) : (
          currentUser ? (
            <ProfileAndWalletScreen
              profile={currentUser}
              onOpenAuth={() => {
                setAuthView('login');
                setIsAuthModalOpen(true);
              }}
              onOpenMessages={() => setActiveTab('messages')}
              onOpenSupport={handleOpenSupport}
              onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
              onScrollOffsetChange={Platform.OS === 'web' ? undefined : handleContentScroll}
              onNavigateToCredits={() => setActiveTab('credits')}
              onOpenVisibilityManagement={(project) => handleOpenSponsorManagement(project?.id)}
              onOpenAccountSecurity={() => setIsAccountSecurityOpen(true)}
              onNavigateToLaunch={() => handleTabChange('create')}
              onEditProject={(project) => {
                setEditingProject(project);
                setActiveTab('create');
                updateNavCompact(false);
              }}
              onSelectProject={(project) => setSelectedProject(project)}
              onSignOut={async () => {
                await signOut();
                setActiveTab('discover');
              }}
            />
          ) : authView === 'login' ? (
            <LoginScreen
              onBack={() => setActiveTab('discover')}
              onRegister={() => setAuthView('register')}
              onAuthSuccess={handleLoginSuccess}
            />
          ) : (
            <RegisterScreen
              onBack={() => setAuthView('login')}
              onLogin={() => setAuthView('login')}
              onAuthSuccess={handleLoginSuccess}
            />
          )
        )}
      </NavigationBackdrop>

      {/* Modern Saf Mobil Alt Gezinme Barı (Bottom Navigation) */}
      {showNavigation && (
        <AdaptiveAppNavigation
          activeTab={activeTab}
          onTabPress={handleTabChange}
          isAuthenticated={!!currentUser}
          compact={isNavCompact}
          blurTarget={navigationBlurTarget}
        />
      )}
      {isLaunchVisible ? <KistasLaunchScreen onFinish={() => setIsLaunchVisible(false)} /> : null}
      {isAuthSuccessVisible ? <AuthSuccessOverlay onFinish={handleAuthSuccessOverlayFinish} /> : null}
      {isAuthLoading ? (
        <View style={styles.authRestoreOverlay} accessibilityLabel="Oturum yükleniyor">
          <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.authRestoreTint} />
          <KistasLogo size={52} showWordmark={false} glow />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    height: Platform.OS === 'web' ? ('100%' as any) : undefined,
    width: '100%',
    backgroundColor: theme.colors.brand.canvas,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  flexOne: {
    flex: 1,
  },
  authRestoreOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  authRestoreTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(248, 251, 255, 0.28)',
  },
  errorFallbackContainer: {
    flex: 1,
    backgroundColor: theme.colors.brand.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a02e2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
});
