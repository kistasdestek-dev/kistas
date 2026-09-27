'use client';

import { usePathname } from 'next/navigation';
import { CinematicFooter } from './CinematicFooter';

export function RouteAwareFooter() {
  const pathname = usePathname();

  if (pathname === '/browse' || pathname === '/credits' || pathname.startsWith('/admin')) return null;

  return <CinematicFooter />;
}
