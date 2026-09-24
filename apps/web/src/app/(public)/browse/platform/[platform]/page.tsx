import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCategories, getCuratedListings } from '@kistas/supabase';
import { DiscoverExperienceClient } from '@/components/DiscoverExperienceClient';
import type { DiscoverPlatform } from '@/components/DynamicDiscoverFilters';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ platform: string }>;
}

const PLATFORM_BY_PATH: Record<string, Exclude<DiscoverPlatform, 'all'>> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
  macos: 'macOS',
  saas: 'SaaS',
};

const resolvePlatform = (value: string) => PLATFORM_BY_PATH[value.toLocaleLowerCase('en-US')];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { platform: pathValue } = await params;
  const platform = resolvePlatform(pathValue);
  if (!platform) return {};

  const title = `${platform} Projeleri | Kıstas`;
  const description = `${platform} platformundaki sponsorlu, popüler ve yeni bağımsız dijital projeleri keşfedin.`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.kistas.com.tr/browse/platform/${platform}` },
    openGraph: { title, description, url: `https://www.kistas.com.tr/browse/platform/${platform}` },
  };
}

export default async function PlatformDiscoveryPage({ params }: PageProps) {
  const { platform: pathValue } = await params;
  const platform = resolvePlatform(pathValue);
  if (!platform) notFound();

  const supabase = await createClient();
  const [categories, listings] = await Promise.all([
    getCategories(supabase),
    getCuratedListings(supabase, 'popular', 100),
  ]);

  return (
    <DiscoverExperienceClient
      initialListings={listings || []}
      categories={categories}
      initialTimestamp={Date.now()}
      initialPlatform={platform}
      preserveLayoutWhenEmpty
    />
  );
}
