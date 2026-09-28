'use client';

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { GlassIconButton } from './GlassIconButton';
import { fallbackBackHref, isBackSwipe, NAVIGATION_KEY, readNavigationEntry, usesNativeEdgeBack } from '@/lib/route-navigation';

const BackContext = createContext<((fallback?: string) => void) | null>(null);
const embeddedBackPaths = new Set(['/about', '/nasil-calisir', '/messages', '/gunun-vitrini', '/admin', '/login', '/signup', '/create-listing']);
const hasOpenDialog = () => Array.from(document.querySelectorAll('[aria-modal="true"], [role="dialog"], dialog[open], .k-modal-glass-card')).some(element => element.getClientRects().length > 0);
const sessionKey = 'kistas:navigation';

function reloadDepth(): number {
  if ((performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type !== 'reload') return 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    return saved?.pathname === window.location.pathname && Number.isSafeInteger(saved.depth) && saved.depth >= 0 ? saved.depth : 0;
  } catch { return 0; }
}

export function SiteBackButton({ fallback, className = '', size = 38 }: { fallback?: string; className?: string; size?: number }) {
  const goBack = useContext(BackContext);
  return <GlassIconButton icon={ArrowLeft} variant="glass" iconColor="#A8C8FB" size={size} iconSize={18}
    onClick={() => goBack?.(fallback)} title="Geri dön" ariaLabel="Geri dön" animation="nudge" className={className} />;
}

export function SiteNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const content = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const animation = useRef<Animation | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const observed = useRef<{ depth: number; href: string; length: number } | null>(null);
  const onRouteCommit = useCallback(() => {
    const history = window.history;
    const href = window.location.pathname + window.location.search + window.location.hash;
    const current = readNavigationEntry(history.state);
    const previous = observed.current;
    const depth = current?.href === href ? current.depth : !previous ? reloadDepth()
      : previous.depth + (history.length > previous.length || new URL(previous.href, window.location.origin).pathname !== window.location.pathname ? 1 : 0);
    const entry = { depth, href, scrollY: window.scrollY };
    history.replaceState({ ...history.state, [NAVIGATION_KEY]: entry }, '');
    observed.current = { depth, href, length: history.length };
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ depth, pathname: window.location.pathname })); } catch { /* History remains available when session storage is disabled. */ }
  }, []);

  const goBack = useCallback((fallback?: string) => {
    if (busy.current || hasOpenDialog()) return;
    busy.current = true;
    onRouteCommit();
    const entry = readNavigationEntry(window.history.state);
    if (window.location.pathname === '/' && (!entry || entry.depth === 0)) { busy.current = false; return; }
    const target = fallback?.startsWith('/') && !fallback.startsWith('//') ? fallback : fallbackBackHref(window.location.pathname);
    const navigate = () => {
      if (entry && entry.depth > 0) router.back();
      else router.replace(target);
      timer.current = setTimeout(() => { busy.current = false; animation.current?.cancel(); }, 600);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !content.current?.animate) navigate();
    else {
      animation.current?.cancel();
      animation.current = content.current.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0.94, transform: 'translateX(8px)' }], { duration: 160, easing: 'ease-out' });
      timer.current = setTimeout(navigate, 160);
    }
  }, [router, onRouteCommit]);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      busy.current = false;
      if (timer.current) clearTimeout(timer.current);
      animation.current?.cancel();
      const entry = readNavigationEntry(event.state);
      observed.current = entry ? { ...entry, length: window.history.length } : null;
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (timer.current) clearTimeout(timer.current);
      animation.current?.cancel();
    };
  }, []);
  useEffect(() => {
    if (usesNativeEdgeBack(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) return;
    let gesture: { x: number; y: number; time: number } | null = null;
    const blocked = (target: EventTarget | null) => {
      if (hasOpenDialog()) return true;
      if (!(target instanceof Element)) return true;
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [data-no-back-swipe]')) return true;
      for (let element: Element | null = target; element && element !== document.body; element = element.parentElement) {
        if (element.scrollWidth > element.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(element).overflowX)) return true;
      }
      return false;
    };
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      gesture = event.touches.length === 1 && touch.clientX <= 24 && !blocked(event.target)
        ? { x: touch.clientX, y: touch.clientY, time: performance.now() } : null;
    };
    const onMove = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1) { gesture = null; return; }
      const dx = event.touches[0].clientX - gesture.x;
      const dy = event.touches[0].clientY - gesture.y;
      if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) gesture = null;
      else if (dx > 14 && dx > Math.abs(dy) * 2 && event.cancelable) event.preventDefault();
    };
    const onEnd = (event: TouchEvent) => {
      const start = gesture;
      gesture = null;
      const touch = event.changedTouches[0];
      if (start && touch && isBackSwipe(start.x, touch.clientX - start.x, touch.clientY - start.y, performance.now() - start.time)) goBack();
    };
    const onCancel = () => { gesture = null; };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, [goBack]);

  return <BackContext.Provider value={goBack}>
    {pathname !== '/' && !embeddedBackPaths.has(pathname) && !pathname.startsWith('/listings/') && <nav aria-label="Geri navigasyonu" className="mx-auto w-full max-w-[1320px] px-4 pt-4 sm:px-6"><SiteBackButton /></nav>}
    <Suspense fallback={null}><RouteObserver onCommit={onRouteCommit} /></Suspense>
    <div ref={content}>{children}</div>
  </BackContext.Provider>;
}

function RouteObserver({ onCommit }: { onCommit: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(onCommit, [pathname, search, onCommit]);
  return null;
}
