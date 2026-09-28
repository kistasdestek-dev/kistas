import { discoveryHref, type DiscoveryState } from '@kistas/shared';
import { ShinyButton } from './ui/shiny-button';
export function DiscoveryPagination({ pathname, state, nextCursor, hasCursor }: { pathname: string; state: DiscoveryState; nextCursor: string | null; hasCursor: boolean }) {
  if (!nextCursor && !hasCursor) return null;
  return <nav aria-label="Proje sayfaları" className="mt-8 flex flex-wrap justify-center gap-4">
    {hasCursor && <ShinyButton href={discoveryHref(pathname, state)}>Başa Dön</ShinyButton>}
    {nextCursor && <ShinyButton href={discoveryHref(pathname, state, nextCursor)}>Sonraki Sayfa</ShinyButton>}
  </nav>;
}
