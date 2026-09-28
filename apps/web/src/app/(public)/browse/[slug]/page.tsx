import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { createAnonClient, getCategories } from '@kistas/supabase';
import { loadDiscovery } from '@/lib/discovery';
import type { DiscoveryParams } from '@kistas/shared';
import { DiscoverExperienceClient } from '@/components/DiscoverExperienceClient';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DiscoveryParams>;
}

const getCategoryDiscoveryData = unstable_cache(async (slug: string) => {
  const supabase = createAnonClient();
  const categories = await getCategories(supabase);
  const category = categories.find((item) => item.slug === slug);
  return { category };
}, ['public-category-discovery'], { revalidate: 60 });

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryDiscoveryData(slug);
  if (!category) return {};

  const title = `${category.name} Projeleri | Kıstas`;
  const description = `${category.name} kategorisindeki sponsorlu, popüler ve yeni bağımsız dijital projeleri keşfedin.`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.kistas.com.tr/browse/${category.slug}` },
    openGraph: { title, description, url: `https://www.kistas.com.tr/browse/${category.slug}` },
  };
}

export default async function CategoryDiscoveryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { category } = await getCategoryDiscoveryData(slug);
  if (!category) notFound();
  const { state, categories, sections, timestamp } = await loadDiscovery(await searchParams, { categoryId: category.id });

  return (
    <DiscoverExperienceClient
      sections={sections}
      state={state}
      categories={categories}
      initialTimestamp={timestamp}
      preserveLayoutWhenEmpty
    />
  );
}
