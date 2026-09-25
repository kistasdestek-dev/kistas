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
    alternates: {
      canonical: `${siteUrl}/listings/${id}`,
    },
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kistas.com.tr';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: listing.title,
    headline: listing.tagline || listing.title,
    description: listing.description || listing.tagline || `${listing.title} Kıstas vitrininde.`,
    applicationCategory: category?.name || 'DeveloperApplication',
    operatingSystem: listing.platforms && listing.platforms.length > 0 ? listing.platforms.join(', ') : 'Web, Cloud',
    offers: {
      '@type': 'Offer',
      price: listing.price ?? 0,
      priceCurrency: 'TRY',
      availability: 'https://schema.org/InStock',
    },
    ...(listing.rating_count && listing.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: listing.rating_average ?? 5.0,
            ratingCount: listing.rating_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    author: {
      '@type': 'Person',
      name: listing.developer_name || listing.seller?.full_name || 'Kıstas Üreticisi',
    },
    url: `${siteUrl}/listings/${id}`,
    image: `${siteUrl}/api/og?id=${id}`,
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <ProjectDetailExperienceClient
        project={listing}
        comments={dbComments || []}
        categoryName={category?.name || null}
        currentUser={user ? { id: user.id, email: user.email, full_name: user.user_metadata?.full_name } : null}
      />
    </>
  );
}
