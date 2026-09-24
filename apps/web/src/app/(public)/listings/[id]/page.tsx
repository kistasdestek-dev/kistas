import { createClient } from '@/lib/supabase/server';
import { getListingById, getListingComments, getCategories } from '@kistas/supabase';
import { notFound } from 'next/navigation';
import { ProjectDetailExperienceClient } from '@/components/ProjectDetailExperienceClient';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const listing = await getListingById(supabase, id);

  if (!listing) {
    return {
      title: 'Proje Bulunamadı | Kıstas',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kistas.com.tr';
  const ogImageUrl = `${siteUrl}/api/og?id=${id}`;
  const title = `${listing.title} — ${listing.tagline || 'Kıstas Proje Vitrini'}`;
  const description = listing.description ? listing.description.slice(0, 160) : `${listing.title} Kıstas vitrininde.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/listings/${id}`,
      siteName: 'Kıstas',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${listing.title} Kıstas Lansman Kartı`,
        },
      ],
      locale: 'tr_TR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [listing, dbComments, dbCategories, { data: { user } }] = await Promise.all([
    getListingById(supabase, id),
    getListingComments(supabase, id),
    getCategories(supabase),
    supabase.auth.getUser(),
  ]);

  if (!listing) {
    notFound();
  }

  const categories = dbCategories || [];
  const category = categories.find((c) => c.id === listing.category_id);

  return (
    <ProjectDetailExperienceClient
      project={listing}
      comments={dbComments || []}
      categoryName={category?.name || null}
      currentUser={user ? { id: user.id, email: user.email, full_name: user.user_metadata?.full_name } : null}
    />
  );
}
