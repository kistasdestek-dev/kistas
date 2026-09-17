export type WebTabKey = 'discover' | 'browse' | 'messages' | 'create' | 'credits' | 'profile';
export type WebPlatform = 'iOS' | 'Android' | 'Web' | 'macOS' | 'SaaS' | 'all';

export interface WebRouteState {
  tab: WebTabKey;
  screen: 'none' | 'about' | 'how-it-works' | 'faq' | 'privacy' | 'blog' | 'category' | 'showcase' | 'popular' | 'new';
  blogSlug?: string | null;
  categoryId?: string | null;
  platform?: WebPlatform;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLATFORMS: WebPlatform[] = ['all', 'iOS', 'Android', 'Web', 'macOS', 'SaaS'];
const TABS: WebTabKey[] = ['discover', 'browse', 'messages', 'create', 'credits', 'profile'];
const AUTH_CALLBACK_KEYS = ['access_token', 'refresh_token', 'code', 'token_hash', 'error', 'error_code', 'error_description'];

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
};

const splitRoute = (route: string): { path: string; query: string } => {
  const queryIndex = route.indexOf('?');
  if (queryIndex < 0) return { path: route, query: '' };
  return { path: route.slice(0, queryIndex), query: route.slice(queryIndex + 1) };
};

const containsAuthCallbackKey = (value: string): boolean => {
  const params = new URLSearchParams(value);
  return AUTH_CALLBACK_KEYS.some((key) => params.has(key));
};

export const isAuthCallbackHash = (hash: string): boolean =>
  !hash.startsWith('#/') && containsAuthCallbackKey(hash.replace(/^#/, ''));

export const isAuthCallbackSearch = (search: string): boolean =>
  containsAuthCallbackKey(search.replace(/^\?/, ''));

export const parseWebRouteLocation = (
  pathname: string,
  search = '',
  hash = '',
): WebRouteState => {
  const legacyHashRoute = hash.startsWith('#/') ? hash.slice(2) : null;
  const routeSource = legacyHashRoute ?? `${pathname.replace(/^\/+/, '')}${search}`;
  const { path, query } = splitRoute(routeSource);
  const segments = path.split('/').filter(Boolean);
  const primary = (segments[0] || '').toLowerCase();
  const secondary = safeDecode(segments[1] || '');

  if (!primary || primary === 'discover') return { tab: 'discover', screen: 'none' };
  if (primary === 'blog') return { tab: 'discover', screen: 'blog', blogSlug: secondary || null };
  if (primary === 'about' || primary === 'hakkimizda') return { tab: 'discover', screen: 'about' };
  if (primary === 'how-it-works' || primary === 'nasil-calisir') return { tab: 'discover', screen: 'how-it-works' };
  if (primary === 'faq' || primary === 'sss') return { tab: 'discover', screen: 'faq' };
  if (primary === 'privacy' || primary === 'gizlilik' || primary === 'gizlilik-politikasi') {
    return { tab: 'discover', screen: 'privacy' };
  }
  if (primary === 'category' && secondary) {
    return { tab: 'browse', screen: 'category', categoryId: secondary };
  }

  const params = new URLSearchParams(query);
  const rawCategoryId = params.get('category');
  const rawPlatform = params.get('platform') as WebPlatform | null;
  const filters = {
    categoryId: rawCategoryId && UUID_PATTERN.test(rawCategoryId) ? rawCategoryId : null,
    platform: rawPlatform && PLATFORMS.includes(rawPlatform) ? rawPlatform : 'all' as WebPlatform,
  };
  if (primary === 'showcase') return { tab: 'discover', screen: 'showcase', ...filters };
  if (primary === 'popular' || primary === 'populer') return { tab: 'discover', screen: 'popular', ...filters };
  if (primary === 'new' || primary === 'yeni' || primary === 'yeni-cikanlar') {
    return { tab: 'discover', screen: 'new', ...filters };
  }
  if (TABS.includes(primary as WebTabKey)) return { tab: primary as WebTabKey, screen: 'none' };
  return { tab: 'discover', screen: 'none' };
};

const publicPathForRoute = (route: WebRouteState): string | null => {
  if (route.screen === 'blog') return route.blogSlug ? `/blog/${encodeURIComponent(route.blogSlug)}/` : '/blog/';
  if (route.screen === 'about') return '/about/';
  if (route.screen === 'how-it-works') return '/how-it-works/';
  if (route.screen === 'faq') return '/sss/';
  if (route.screen === 'privacy') return '/privacy/';
  if (route.screen === 'category' && route.categoryId) return `/category/${encodeURIComponent(route.categoryId)}`;
  if (route.screen === 'showcase') return '/showcase/';
  if (route.screen === 'popular') return '/popular/';
  if (route.screen === 'new') return '/new/';
  if (route.tab === 'discover') return '/';
  if (route.tab === 'browse') return '/browse/';
  return `/${route.tab}`;
};

/** Converts only the legacy Kıstas hash router; OAuth/recovery fragments are never touched. */
export const getLegacyHashReplacement = (hash: string): string | null => {
  if (!hash.startsWith('#/') || isAuthCallbackHash(hash)) return null;
  const legacyRoute = hash.slice(2);
  const { query } = splitRoute(legacyRoute);
  const parsed = parseWebRouteLocation('/', '', hash);
  const path = publicPathForRoute(parsed);
  return path ? `${path}${query ? `?${query}` : ''}` : null;
};
