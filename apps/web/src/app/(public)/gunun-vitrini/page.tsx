import type { Metadata } from 'next';
import { rotateListingsByHour, type DiscoveryParams } from '@kistas/shared';
import { loadDiscovery } from '@/lib/discovery';
import { ShowcaseExperienceClient } from '@/components/ShowcaseExperienceClient';
import './showcase.css';

const description = 'Topluluğun desteklediği bağımsız projelerin saatlik rotasyonla hazırlanan seçkisini Günün Vitrini’nde keşfedin.';
export const metadata: Metadata = {
  metadataBase: new URL('https://www.kistas.com.tr'),
  title: 'Günün Vitrini | Kıstas',
  description,
  alternates: { canonical: '/gunun-vitrini' },
  openGraph: { title: 'Günün Vitrini | Kıstas', description, url: '/gunun-vitrini', type: 'website' },
};
export const revalidate = 60;

export default async function ShowcasePage({ searchParams }: { searchParams: Promise<DiscoveryParams> }) {
  const { sections, state, categories, timestamp } = await loadDiscovery(await searchParams);
  return <ShowcaseExperienceClient projects={rotateListingsByHour(sections.popular, timestamp)} state={state} categories={categories} timestamp={timestamp} />;
}
