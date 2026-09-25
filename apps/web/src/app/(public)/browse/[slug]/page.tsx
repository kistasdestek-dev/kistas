import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAnonClient, getCategories, getCuratedListings } from '@kistas/supabase';
import { DiscoverExperienceClient } from '@/components/DiscoverExperienceClient';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const resolveCategory = cache(async (slug: string) => {
  const supabase = createAnonClient();
  const categories = await getCategories(supabase);
  const category = categories.find((item) => item.slug === slug);
  return { supabase, categories, category };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await resolveCategory(slug);
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

export default async function CategoryDiscoveryPage({ params }: PageProps) {
  const { slug } = await params;
  const { supabase, categories, category } = await resolveCategory(slug);
  if (!category) notFound();

  const listings = await getCuratedListings(supabase, 'popular', 100);

  return (
    <DiscoverExperienceClient
      initialListings={listings || []}
      categories={categories}
      initialTimestamp={Date.now()}
      initialCategoryId={category.id}
      preserveLayoutWhenEmpty
    />
  );
}
