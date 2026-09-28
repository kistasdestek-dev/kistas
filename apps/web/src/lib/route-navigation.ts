export interface NavigationEntry {
  depth: number;
  href: string;
  scrollY: number;
}

export const NAVIGATION_KEY = '__kistasNavigation';

export function readNavigationEntry(state: unknown): NavigationEntry | null {
  if (!state || typeof state !== 'object' || !(NAVIGATION_KEY in state)) return null;
  const entry = (state as Record<string, unknown>)[NAVIGATION_KEY];
  if (!entry || typeof entry !== 'object') return null;
  const value = entry as Record<string, unknown>;
  if (typeof value.depth !== 'number' || !Number.isSafeInteger(value.depth) || value.depth < 0
    || typeof value.href !== 'string' || !value.href.startsWith('/') || value.href.startsWith('//')
    || typeof value.scrollY !== 'number' || !Number.isFinite(value.scrollY) || value.scrollY < 0) return null;
  return value as unknown as NavigationEntry;
}

export function fallbackBackHref(pathname: string): string {
  if (pathname.startsWith('/admin/')) return '/admin';
  if (pathname.startsWith('/profile/') || pathname === '/launch-archive') return '/profile';
  return '/';
}

export function isBackSwipe(startX: number, dx: number, dy: number, elapsed: number): boolean {
  return startX <= 24 && startX >= 0 && dx >= 80 && dx > Math.abs(dy) * 2 && elapsed <= 800;
}

export function usesNativeEdgeBack(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}
