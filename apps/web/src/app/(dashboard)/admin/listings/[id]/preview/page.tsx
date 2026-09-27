import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getListingById } from '@kistas/supabase';
import { requireAdmin } from '@/lib/auth';
import { ProjectDetailExperienceClient } from '@/components/ProjectDetailExperienceClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lansman Önizlemesi | Kıstas Yönetim',
  robots: { index: false, follow: false },
};

interface AdminListingPreviewPageProps {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminListingPreviewPage({ params }: AdminListingPreviewPageProps) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const { supabase } = await requireAdmin();
  const [listing, categories] = await Promise.all([
    getListingById(supabase, id),
    getCategories(supabase),
  ]);

  if (!listing) notFound();

  const categoryName = categories.find((category) => category.id === listing.category_id)?.name || null;

  return (
    <ProjectDetailExperienceClient
      project={listing}
      categoryName={categoryName}
      reviewPreview
    />
  );
}
