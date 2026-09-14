import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { useChatUnreadCount } from '../../core/state';
import { breakpoints } from '../../core/theme';
import { KistasLogo } from '../components/KistasLogo';
import { NavAnimatedIcon } from '../components/NavAnimatedIcon';
import { AppNavigationProps, TabKey } from './navigationTypes';

export type { TabKey } from './navigationTypes';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Expo'nun varsayilan `auto` yuzunu olusturmadan once ayni fontu `swap` ile kaydet.
if (typeof window !== 'undefined') {
  void Font.loadAsync('ionicons', {
    uri: Asset.fromModule(Ionicons.font.ionicons).uri,
    display: Font.FontDisplay.SWAP,
  });
}

interface WebNavItem {
  key: TabKey;
  label: string;
  icon: IoniconName;
  activeIcon: IoniconName;
}

const WEB_NAV_ITEMS: ReadonlyArray<WebNavItem> = [
  { key: 'discover', label: 'Keşfet', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'browse', label: 'Göz At', icon: 'search-outline', activeIcon: 'search' },
  { key: 'create', label: 'Lansman Yap', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { key: 'messages', label: 'Mesajlar', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
  { key: 'credits', label: 'Krediler', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { key: 'profile', label: 'Profil', icon: 'person-outline', activeIcon: 'person' },
];

const PHONE_NAV_ITEMS = WEB_NAV_ITEMS.filter(({ key }) =>
  key === 'discover' || key === 'browse' || key === 'create' || key === 'messages' || key === 'profile'
);

const resolvePhoneTab = (tab: TabKey): TabKey =>
  tab === 'credits' ? 'profile' : tab;

const DESKTOP_STYLE_ID = 'kistas-desktop-navigation-styles';
const DESKTOP_STYLES = `
.kdn-shell{position:fixed;z-index:1000000;bottom:calc(20px + env(safe-area-inset-bottom, 0px));left:0;right:0;display:flex;justify-content:center;padding:0 16px;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.kdn-shell.is-mobile-shell{bottom:calc(12px + env(safe-area-inset-bottom, 0px));padding:0 12px}

/* --- Sabit Oval Liquid Glass Dock (Hiçbir zaman açılıp kapanmaz, arkasında bar yoktur) --- */
.kdn-dock{
  position:relative;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height:60px;
  padding:4px 10px 4px 12px;
  box-sizing:border-box;
  border-radius:9999px;
  border:1px solid rgba(255,255,255,.55);
  background:linear-gradient(155deg,rgba(255,255,255,.07),rgba(255,255,255,0) 55%),rgba(248,250,255,.16);
  backdrop-filter:blur(8px) saturate(145%);
  -webkit-backdrop-filter:blur(8px) saturate(145%);
  box-shadow:0 8px 24px -2px rgba(15,23,42,.12),0 2px 8px rgba(0,0,0,.04);
  pointer-events:auto;
  transition:border-color .3s ease,box-shadow .3s ease;
}
.kdn-dock:hover{
  border-color:rgba(255,255,255,.8);
  box-shadow:0 12px 30px -2px rgba(15,23,42,.16),0 4px 12px rgba(0,0,0,.06);
}
.kdn-dock.is-mobile{height:58px;padding:5px;max-width:100%}

.k-glass-content{
  position:relative;
  z-index:3;
  display:inline-flex;
  align-items:center;
  height:100%;
}

.kdn-expanded{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}

.kdn-brand{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 8px 0 4px;border:0;border-radius:9999px;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .18s ease,transform .2s ease}
.kdn-brand.is-mobile-brand{padding:0 4px}
.kdn-brand:hover{transform:scale(1.06)}
.kdn-brand:active{transform:scale(.95)}

.kdn-divider{width:1px;height:22px;background:rgba(255,255,255,.55);box-shadow:1px 0 0 rgba(50,105,199,.12);margin:0 5px 0 3px;flex-shrink:0}

.kdn-tabs{display:inline-flex;align-items:center;gap:3px}

.kdn-pill-tab{
  position:relative;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height:40px;
  padding:0 11px;
  border-radius:9999px;
  border:1px solid transparent;
  background:transparent;
  color:#2D3748;
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
  user-select:none;
  box-sizing:border-box;
  transition:all .35s cubic-bezier(.175,.885,.32,1.4);
}
.kdn-pill-tab.is-mobile-tab{height:38px;padding:0 9px}
.kdn-pill-tab:hover:not(.is-active){background:rgba(255,255,255,.36);box-shadow:inset 1px 1px 1px 0 rgba(255,255,255,.5)}
.kdn-pill-tab:active{transform:scale(.95)}

.kdn-pill-tab.is-active{padding:0 14px 0 12px}
.kdn-pill-tab.is-mobile-tab.is-active{padding:0 12px 0 10px}

/* Keşfet (Discover) - Liquid Sapphire */
.kdn-pill-tab[data-tab="discover"]:hover:not(.is-active){background:rgba(50,105,199,.10);color:#1E4E9E}
.kdn-pill-tab[data-tab="discover"].is-active{background:rgba(50,105,199,.15);color:#1E4E9E;border-color:rgba(50,105,199,.28);box-shadow:0 4px 14px -3px rgba(50,105,199,.22),inset 1px 1px 1px 0 rgba(255,255,255,.8)}

/* Göz At (Browse) - Liquid Indigo */
.kdn-pill-tab[data-tab="browse"]:hover:not(.is-active){background:rgba(99,102,241,.10);color:#4338CA}
.kdn-pill-tab[data-tab="browse"].is-active{background:rgba(99,102,241,.15);color:#4338CA;border-color:rgba(99,102,241,.28);box-shadow:0 4px 14px -3px rgba(99,102,241,.22),inset 1px 1px 1px 0 rgba(255,255,255,.8)}

/* Krediler (Credits) - Liquid Amber */
.kdn-pill-tab[data-tab="credits"]:hover:not(.is-active){background:rgba(245,158,11,.10);color:#B45309}
.kdn-pill-tab[data-tab="credits"].is-active{background:rgba(245,158,11,.15);color:#B45309;border-color:rgba(245,158,11,.30);box-shadow:0 4px 14px -3px rgba(245,158,11,.22),inset 1px 1px 1px 0 rgba(255,255,255,.8)}

/* Profil (Profile) - Liquid Violet */
.kdn-pill-tab[data-tab="profile"]:hover:not(.is-active){background:rgba(139,92,246,.10);color:#6D28D9}
.kdn-pill-tab[data-tab="profile"].is-active{background:rgba(139,92,246,.15);color:#6D28D9;border-color:rgba(139,92,246,.28);box-shadow:0 4px 14px -3px rgba(139,92,246,.22),inset 1px 1px 1px 0 rgba(255,255,255,.8)}

/* Mesajlar (Messages) - Liquid Emerald */
.kdn-pill-tab[data-tab="messages"]:hover:not(.is-active){background:rgba(16,185,129,.10);color:#047857}
.kdn-pill-tab[data-tab="messages"].is-active{background:rgba(16,185,129,.15);color:#047857;border-color:rgba(16,185,129,.28);box-shadow:0 4px 14px -3px rgba(16,185,129,.22),inset 1px 1px 1px 0 rgba(255,255,255,.8)}

/* Lansman Yap (Create) - Liquid Cobalt */
.kdn-pill-tab[data-tab="create"]:hover:not(.is-active){background:rgba(37,99,235,.10);color:#1D4ED8}
.kdn-pill-tab[data-tab="create"].is-active{background:rgba(37,99,235,.16);color:#1D4ED8;border-color:rgba(37,99,235,.30);box-shadow:0 4px 14px -3px rgba(37,99,235,.24),inset 1px 1px 1px 0 rgba(255,255,255,.8)}

.kdn-pill-icon{display:inline-flex;align-items:center;justify-content:center;position:relative;width:20px;height:20px;flex-shrink:0;transition:transform .3s cubic-bezier(.175,.885,.32,1.4);overflow:visible}
.kdn-pill-tab:hover .kdn-pill-icon{transform:scale(1.15)}
.kdn-pill-tab:active .kdn-pill-icon{transform:scale(.92)}
.kdn-pill-label-wrapper{display:inline-flex;align-items:center;max-width:0;opacity:0;margin-left:0;overflow:hidden;white-space:nowrap;transition:max-width .3s cubic-bezier(.175,.885,.32,1.275),opacity .19s ease,margin-left .19s ease}
.kdn-pill-tab.is-active .kdn-pill-label-wrapper{max-width:96px;opacity:1;margin-left:7px}
.kdn-pill-tab.is-mobile-tab.is-active .kdn-pill-label-wrapper{max-width:76px;opacity:1;margin-left:6px}
.kdn-pill-label{font-size:12px;font-weight:700;letter-spacing:-.01em;color:inherit;white-space:nowrap;transition:color .3s ease}
.kdn-pill-tab.is-mobile-tab .kdn-pill-label{font-size:11.5px}
.kdn-badge{position:absolute;top:-4px;right:-6px;display:grid;place-items:center;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:#252333;color:#FAFBFD;font-size:8.5px;font-weight:800}

/* --- 21st.dev Animated Icon Keyframes & Micro-interactions --- */
.k21-icon{display:block;width:20px;height:20px;flex-shrink:0;overflow:visible;transition:transform .24s cubic-bezier(.34,1.56,.64,1),stroke .2s ease,fill .2s ease}
@keyframes k21-needle-spin{0%{transform:rotate(0deg)}35%{transform:rotate(46deg)}70%{transform:rotate(-16deg)}100%{transform:rotate(0deg)}}
.kdn-pill-tab:hover .k21-compass-needle{transform-origin:12px 12px;animation:k21-needle-spin .7s cubic-bezier(.34,1.56,.64,1)}

@keyframes k21-search-wiggle{0%{transform:translate(0,0) scale(1)}40%{transform:translate(2px,-2px) scale(1.1)}75%{transform:translate(-1px,1px) scale(.98)}100%{transform:translate(0,0) scale(1)}}
.kdn-pill-tab:hover .k21-browse{animation:k21-search-wiggle .6s cubic-bezier(.34,1.56,.64,1)}

@keyframes k21-sparkle-burst{0%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.22) rotate(22deg)}100%{transform:scale(1) rotate(0deg)}}
@keyframes k21-dot-twinkle{0%,100%{opacity:.5;transform:scale(.75)}50%{opacity:1;transform:scale(1.35)}}
.kdn-pill-tab:hover .k21-sparkle-star{transform-origin:12px 12px;animation:k21-sparkle-burst .7s cubic-bezier(.34,1.56,.64,1)}
.kdn-pill-tab:hover .k21-sparkle-dot{transform-origin:19px 5px;animation:k21-dot-twinkle .7s ease-in-out}

@keyframes k21-user-nod{0%{transform:translateY(0)}35%{transform:translateY(-2.4px)}70%{transform:translateY(1px)}100%{transform:translateY(0)}}
.kdn-pill-tab:hover .k21-user-head{animation:k21-user-nod .55s cubic-bezier(.34,1.56,.64,1)}

@keyframes k21-chat-dot-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.6px)}}
.kdn-pill-tab:hover .k21-dot-1{animation:k21-chat-dot-bounce .45s ease 0s}
.kdn-pill-tab:hover .k21-dot-2{animation:k21-chat-dot-bounce .45s ease .09s}
.kdn-pill-tab:hover .k21-dot-3{animation:k21-chat-dot-bounce .45s ease .18s}

@keyframes k21-plus-turn{0%{transform:rotate(0deg)}100%{transform:rotate(90deg)}}
.kdn-pill-tab:hover .k21-create-plus{transform-origin:12px 12px;animation:k21-plus-turn .5s cubic-bezier(.34,1.56,.64,1)}

.kdn-brand:focus-visible,.kdn-pill-tab:focus-visible{outline:2px solid #3269C7;outline-offset:2px}

.kdn-dock{box-shadow:0 8px 28px rgba(27,43,72,.15),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.28);border-color:rgba(255,255,255,.85)}
.kdn-pill-tab{height:44px;min-width:44px;transition:background .2s ease,color .2s ease,transform .2s ease}
.kdn-pill-label{font-weight:600}
.kdn-dock.is-mobile{width:min(390px,100%)}
.is-mobile .k-glass-content,.is-mobile .kdn-expanded,.is-mobile .kdn-tabs{width:100%;min-width:0}
.kdn-pill-tab.is-mobile-tab,.kdn-pill-tab.is-mobile-tab.is-active{flex:1;min-width:0;height:46px;padding:4px 5px;flex-direction:column;gap:3px;border-radius:18px}
.kdn-pill-tab.is-mobile-tab .kdn-pill-label-wrapper,.kdn-pill-tab.is-mobile-tab.is-active .kdn-pill-label-wrapper{max-width:100%;opacity:1;margin:0}
.kdn-pill-tab.is-mobile-tab .kdn-pill-label{font-size:10px;font-weight:600}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.kdn-dock{background:rgba(248,250,255,.95)}}

@media(prefers-reduced-motion:reduce){.kdn-dock,.kdn-expanded,.kdn-pill-tab,.kdn-pill-label-wrapper,.kdn-pill-icon,.k21-icon,.k21-compass-needle,.k21-sparkle-star,.k21-user-head,.k21-create-plus{transition-duration:.01ms!important;animation:none!important}}
`;

interface DesktopNavigationProps extends AppNavigationProps {
  unreadCount: number;
}

const DESKTOP_NAV_ITEMS: ReadonlyArray<WebNavItem> = [
  { key: 'discover', label: 'Keşfet', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'browse', label: 'Göz At', icon: 'search-outline', activeIcon: 'search' },
  { key: 'credits', label: 'Krediler', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { key: 'messages', label: 'Mesajlar', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
  { key: 'create', label: 'Lansman Yap', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { key: 'profile', label: 'Profil', icon: 'person-outline', activeIcon: 'person' },
];

const DesktopFloatingNavigation: React.FC<DesktopNavigationProps> = ({
  activeTab,
  onTabPress,
  unreadCount,
  isAuthenticated = false,
}) => {
  useEffect(() => {
    const style = document.getElementById(DESKTOP_STYLE_ID) ?? document.createElement('style');
    style.id = DESKTOP_STYLE_ID;
    style.textContent = DESKTOP_STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  const navigate = (tab: TabKey) => {
    if (tab !== activeTab) onTabPress(tab);
  };

  return (
    <div className="kdn-shell" aria-label="Kıstas ana menü">
      <div className="kdn-dock">

        <div className="k-glass-content">
          <div className="kdn-expanded">
            <button
              className="kdn-brand"
              type="button"
              onClick={() => navigate('discover')}
              aria-label="Kıstas Keşfet'e git"
              title="Kıstas"
            >
              <KistasLogo size={26} showWordmark={false} />
            </button>
            <div className="kdn-divider" />
            <nav className="kdn-tabs" aria-label="Ana gezinti" role="tablist">
              {DESKTOP_NAV_ITEMS
                .filter((item) => (item.key !== 'create' && item.key !== 'messages') || isAuthenticated)
                .map((item) => {
                  const isActive = item.key === activeTab;
                  const showBadge = item.key === 'messages' && unreadCount > 0;
                  return (
                    <button
                      key={item.key}
                      data-tab={item.key}
                      className={`kdn-pill-tab${isActive ? ' is-active' : ''}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => navigate(item.key)}
                    >
                      <span className="kdn-pill-icon">
                        <NavAnimatedIcon
                          name={item.key}
                          isActive={isActive}
                          color="currentColor"
                          size={19}
                        />
                        {showBadge ? (
                          <span className="kdn-badge">{Math.min(unreadCount, 99)}</span>
                        ) : null}
                      </span>
                      <span className="kdn-pill-label-wrapper">
                        <span className="kdn-pill-label">{item.label}</span>
                      </span>
                    </button>
                  );
                })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileFloatingNavigation: React.FC<DesktopNavigationProps> = ({
  activeTab,
  onTabPress,
  unreadCount,
  isAuthenticated = false,
}) => {
  useEffect(() => {
    const style = document.getElementById(DESKTOP_STYLE_ID) ?? document.createElement('style');
    style.id = DESKTOP_STYLE_ID;
    style.textContent = DESKTOP_STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  const navigate = (tab: TabKey) => {
    if (tab !== activeTab) onTabPress(tab);
  };

  return (
    <div className="kdn-shell is-mobile-shell" aria-label="Kıstas mobil menü">
      <div className="kdn-dock is-mobile">

        <div className="k-glass-content">
          <div className="kdn-expanded is-mobile-expanded">
            <nav className="kdn-tabs is-mobile-tabs" aria-label="Mobil ana gezinti" role="tablist">
              {PHONE_NAV_ITEMS
                .filter((item) => (item.key !== 'create' && item.key !== 'messages') || isAuthenticated)
                .map((item) => {
                  const isActive = item.key === resolvePhoneTab(activeTab);
                  const label = item.key === 'create' ? 'Lansman' : item.label;
                  const showBadge = item.key === 'messages' && unreadCount > 0;
                  return (
                    <button
                      key={item.key}
                      data-tab={item.key}
                      className={`kdn-pill-tab is-mobile-tab${isActive ? ' is-active' : ''}`}
                      type="button"
                      role="tab"
                      aria-label={label}
                      aria-selected={isActive}
                      title={label}
                      onClick={() => navigate(item.key)}
                    >
                      <span className="kdn-pill-icon">
                        <NavAnimatedIcon
                          name={item.key}
                          isActive={isActive}
                          color="currentColor"
                          size={18}
                        />
                        {showBadge ? (
                          <span className="kdn-badge">{Math.min(unreadCount, 99)}</span>
                        ) : null}
                      </span>
                      <span className="kdn-pill-label-wrapper">
                        <span className="kdn-pill-label">{label}</span>
                      </span>
                    </button>
                  );
                })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

const WebAppNavigationComponent: React.FC<AppNavigationProps> = ({
  activeTab,
  onTabPress,
  unreadMessagesCount,
  isAuthenticated = false,
  compact,
}) => {
  const { width } = useWindowDimensions();
  const storeUnreadCount = useChatUnreadCount();
  const unreadCount = unreadMessagesCount ?? storeUnreadCount;
  const isPhone = width <= breakpoints.phoneMax;

  if (isPhone) {
    return (
      <MobileFloatingNavigation
        activeTab={activeTab}
        onTabPress={onTabPress}
        unreadMessagesCount={unreadMessagesCount}
        unreadCount={unreadCount}
        isAuthenticated={isAuthenticated}
        compact={compact}
      />
    );
  }

  return (
    <DesktopFloatingNavigation
      activeTab={activeTab}
      onTabPress={onTabPress}
      unreadMessagesCount={unreadMessagesCount}
      unreadCount={unreadCount}
      isAuthenticated={isAuthenticated}
      compact={compact}
    />
  );
};

export const AdaptiveAppNavigation = React.memo(WebAppNavigationComponent);
