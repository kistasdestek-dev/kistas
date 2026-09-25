'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { KistasRouteLoader } from './KistasRouteLoader';

const LOADER_DELAY_MS = 150;
const NAVIGATION_TIMEOUT_MS = 12_000;

export function NavigationLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoaderVisible, setIsLoaderVisible] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
    setIsLoaderVisible(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const startNavigation = () => setIsNavigating(true);

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.download || (anchor.target && anchor.target !== '_self')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        !['http:', 'https:'].includes(destination.protocol)
      ) {
        return;
      }

      const currentRoute = `${window.location.pathname}${window.location.search}`;
      const destinationRoute = `${destination.pathname}${destination.search}`;
      if (currentRoute === destinationRoute) return;

      startNavigation();
    };

    const stopNavigation = () => setIsNavigating(false);

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', startNavigation);
    window.addEventListener('pageshow', stopNavigation);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', startNavigation);
      window.removeEventListener('pageshow', stopNavigation);
    };
  }, []);

  useEffect(() => {
    if (!isNavigating) {
      setIsLoaderVisible(false);
      return;
    }

    const showTimer = window.setTimeout(
      () => setIsLoaderVisible(true),
      LOADER_DELAY_MS,
    );
    const failSafeTimer = window.setTimeout(
      () => setIsNavigating(false),
      NAVIGATION_TIMEOUT_MS,
    );

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(failSafeTimer);
    };
  }, [isNavigating]);

  return isLoaderVisible ? <KistasRouteLoader /> : null;
}
