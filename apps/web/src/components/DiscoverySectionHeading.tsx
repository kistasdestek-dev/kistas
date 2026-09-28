'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GlassIconButton } from './GlassIconButton';

export function DiscoverySectionHeading({ title, subtitle, href }: { title?: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        {title && <h2 className="ios-project-heading">
          {href ? <Link href={href} className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">{title}</Link> : title}
        </h2>}
        {href && <Link href={href} aria-label={`${title || 'Projeler'} sayfasını aç`} className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">
          <GlassIconButton icon={ChevronRight} as="div" size={34} iconSize={19} />
        </Link>}
      </div>
      {subtitle && <p className="ios-project-subtitle">{subtitle}</p>}
    </div>
  );
}
