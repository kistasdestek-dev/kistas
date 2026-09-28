import { requireUser } from '@/lib/auth';
import { getCategories } from '@kistas/supabase';
import { BROWSE_CATEGORY_SLUGS } from '@/lib/categoryCatalog';
import { type EditableListing } from '@/components/CreateListingExperienceClient';
import { LaunchEditor } from '@/components/LaunchEditor';
import type { Category } from '@kistas/shared';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Yeni Proje Lansmanı Yap | Kıstas',
  description: 'Projenizi Kıstas vitrinine ekleyin, binlerce bağımsız geliştirici ve kullanıcıyla buluşturun.',
};

interface CreateListingPageProps {
  searchParams: Promise<{ edit?: string | string[]; archive?: string | string[] }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CreateListingPage({ searchParams }: CreateListingPageProps) {
  const { user, supabase } = await requireUser();
  const params = await searchParams;
  let editId = typeof params.edit === 'string' ? params.edit : null;
  const archiveId = typeof params.archive === 'string' ? params.archive : null;
  if (archiveId) {
    if (!UUID_PATTERN.test(archiveId)) notFound();
    const { data: archived } = await supabase.from('launch_drafts').select('source_listing_id')
      .eq('id', archiveId).eq('owner_id', user.id).maybeSingle();
    if (archived?.source_listing_id) {
      if (editId && editId !== archived.source_listing_id) notFound();
      editId = archived.source_listing_id;
    }
  }
  let categories: Category[] = [];
  let initialListing: EditableListing | null = null;

  try {
    const dbCategories = await getCategories(supabase);
    const browseCategorySlugs = new Set<string>(BROWSE_CATEGORY_SLUGS);
    categories = dbCategories.filter((category) => browseCategorySlugs.has(category.slug));
  } catch {
    // Keep the picker empty rather than exposing invalid legacy category IDs.
  }

  if (editId) {
    if (!UUID_PATTERN.test(editId)) notFound();

    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,
        save_revision,
        category_id,
        title,
        tagline,
        description,
        pricing_model,
        platforms,
        logo_url,
        app_store_url,
        play_store_url,
        web_url,
        listing_images(image_url, display_order, is_cover)
      `)
      .eq('id', editId)
      .eq('seller_id', user.id)
      .maybeSingle();

    if (error || !data) notFound();

    const images = [...(data.listing_images || [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
    const cover = images.find((image) => image.is_cover) || images[0];

    initialListing = {
      id: data.id,
      revision: data.save_revision,
      categoryId: data.category_id,
      title: data.title,
      tagline: data.tagline || '',
      description: data.description,
      pricingModel: data.pricing_model || 'freemium',
      platforms: data.platforms || ['iOS'],
      logoUrl: data.logo_url || '',
      appStoreUrl: data.app_store_url || '',
      playStoreUrl: data.play_store_url || '',
      webUrl: data.web_url || '',
      screenshots: images.filter((image) => image !== cover).map((image) => image.image_url),
      coverUrl: cover?.image_url || '',
    };
  }

  return (
    <LaunchEditor
      key={archiveId || editId || 'new'}
      userId={user.id}
      archiveId={archiveId}
      categories={categories}
      initialListing={initialListing}
    />
  );
}
