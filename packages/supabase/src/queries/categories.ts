import { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from '@kistas/shared';
import { APP_STORE_CATEGORY_SLUGS } from '@kistas/shared';

interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon_url: string | null;
  order_index: number;
}

/**
 * Get all categories ordered by their database display order.
 */
export async function getCategories(client: SupabaseClient): Promise<Category[]> {
  const { data, error } = await client
    .from('categories')
    .select('id, parent_id, name, slug, icon_url, order_index')
    .eq('is_active', true)
    .in('slug', [...APP_STORE_CATEGORY_SLUGS])
    .order('order_index', { ascending: true });

  if (error) {
    return [];
  }

  return ((data as CategoryRow[]) || []).map((category) => ({
    id: category.id,
    parent_id: category.parent_id,
    name: category.name,
    slug: category.slug,
    icon_name: category.icon_url,
    sort_order: category.order_index,
  }));
}
