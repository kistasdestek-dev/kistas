'use client';

import { usePathname } from 'next/navigation';
import { CinematicFooter } from './CinematicFooter';

export function RouteAwareFooter() {
  const pathname = usePathname();

  if (['/browse', '/credits', '/create-listing', '/launch-archive', '/popular', '/new', '/gunun-vitrini'].includes(pathname) || pathname.startsWith('/admin')) return null;

  return <CinematicFooter />;
}
