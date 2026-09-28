import { SupabaseClient } from '@supabase/supabase-js';
import type { Listing } from '@kistas/shared';

export interface ListingFilterOptions {
  categoryId?: string;
  platform?: string;
  limit?: number;
  offset?: number;
  searchQuery?: string;
}

/**
 * Map raw database row to strongly-typed client Listing model
 */
export function mapListing(row: any): Listing {
  if (!row) return row;
  return {
    ...row,
    upvote_count: Number(row.upvote_count ?? row.upvotes_count ?? 0),
    is_boosted: Boolean(row.boosted_until && new Date(row.boosted_until).getTime() > Date.now()),
    website_url: row.website_url ?? row.web_url ?? null,
    rating_average: Number(row.rating_average ?? row.seller?.rating_average ?? 5.0),
    rating_count: Number(row.rating_count ?? row.seller?.rating_count ?? 0),
    price: Number(row.price || 0),
  };
}

/**
 * Public query for active listings (RSC safe)
 */
export async function getListings(
  client: SupabaseClient,
  options: ListingFilterOptions = {}
): Promise<{ data: Listing[]; count: number }> {
  let query = client
    .from('listings')
    .select('*, images:listing_images(*)', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (options.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  if (options.platform) {
    query = query.contains('platforms', [options.platform]);
  }

  if (options.searchQuery) {
    query = query.ilike('title', `%${options.searchQuery}%`);
  }

  if (options.limit) {
    const from = options.offset || 0;
    query = query.range(from, from + options.limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Public listings query failed (${error.code})`);
  }
  if (!data) {
    return { data: [], count: 0 };
  }
  return { data: (data as any[]).map(mapListing), count: count || 0 };
}

/**
 * Get a single listing detail with full images and public seller data
 */
export async function getListingById(
  client: SupabaseClient,
  id: string
): Promise<Listing | null> {
  const { data, error } = await client
    .from('listings')
    .select('*, images:listing_images(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Public listing detail query failed (${error.code})`);
  }
  if (!data) {
    return null;
  }
  return mapListing(data);
}
