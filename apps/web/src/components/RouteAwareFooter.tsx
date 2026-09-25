'use client';

import { usePathname } from 'next/navigation';
import { CinematicFooter } from './CinematicFooter';

export function RouteAwareFooter() {
  const pathname = usePathname();

  if (pathname === '/browse') return null;

  return <CinematicFooter />;
}
