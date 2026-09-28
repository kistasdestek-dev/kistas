import { DiscoverExperienceClient } from '@/components/DiscoverExperienceClient';
import { loadDiscovery } from '@/lib/discovery';
import type { DiscoveryParams } from '@kistas/shared';

export const revalidate = 60;
export default async function HomePage({ searchParams }: { searchParams: Promise<DiscoveryParams> }) {
  const { state, categories, sections, timestamp } = await loadDiscovery(await searchParams);
  return <DiscoverExperienceClient sections={sections} state={state} categories={categories} initialTimestamp={timestamp} />;
}
