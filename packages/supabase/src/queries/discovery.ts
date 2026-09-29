import type { SupabaseClient } from '@supabase/supabase-js';
import { parseDiscoveryState, decodeDiscoveryCursor, encodeDiscoveryCursor, discoverySearchFilter, discoveryCursorFilter, sponsorExpiry, type DiscoveryCard, type DiscoveryState } from '@kistas/shared';

const CARD_COLUMNS = 'id,category_id,title,tagline,description,logo_url,developer_name,platforms,created_at,boosted_until,category_boosted_until,upvotes_count,images:listing_images(id,listing_id,image_url,display_order,is_cover,created_at)';
interface CardRow extends Omit<DiscoveryCard, 'is_boosted' | 'upvote_count'> { upvotes_count: number }
export interface DiscoveryPage { items: DiscoveryCard[]; nextCursor: string | null }
function mapCard(row: CardRow, now: number, categoryId: string | null): DiscoveryCard {
  const card = { id: row.id, category_id: row.category_id, title: row.title, tagline: row.tagline, description: (row.description || '').slice(0, 180), logo_url: row.logo_url, developer_name: row.developer_name, platforms: row.platforms, created_at: row.created_at, boosted_until: row.boosted_until, category_boosted_until: row.category_boosted_until ?? null, is_boosted: false, upvote_count: Number(row.upvotes_count ?? 0), images: row.images ?? [] };
  return { ...card, is_boosted: sponsorExpiry(card, categoryId) > now };
}
function scopeQuery(client: SupabaseClient, state: DiscoveryState) {
  let query = client.from('listings').select(CARD_COLUMNS).eq('status', 'active');
  if (state.categoryId) query = query.eq('category_id', state.categoryId);
  if (state.platform !== 'all') query = query.contains('platforms', [state.platform]);
  return query;
}
function cardQuery(client: SupabaseClient, state: DiscoveryState) {
  return scopeQuery(client, state).order('is_cover', { referencedTable: 'images', ascending: false, nullsFirst: false }).order('display_order', { referencedTable: 'images', ascending: true }).order('id', { referencedTable: 'images', ascending: true }).limit(1, { referencedTable: 'images' });
}
function checkedState(state: DiscoveryState): DiscoveryState {
  return parseDiscoveryState({ q: state.q, category: state.categoryId ?? undefined, platform: state.platform, sort: state.sort });
}
export async function getDiscoveryPage(client: SupabaseClient, input: DiscoveryState, cursorValue?: string, limit = 30, now = Date.now()): Promise<DiscoveryPage> {
  const state = checkedState(input);
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error('Invalid discovery page size');
  const cursor = decodeDiscoveryCursor(cursorValue, state);
  const snapshot = cursor?.snapshot ?? new Date(now).toISOString();
  let query = cardQuery(client, state).lte('created_at', snapshot);
  const conditions: string[] = [];
  if (state.q) conditions.push(`or(${discoverySearchFilter(state.q)})`);
  if (cursor) conditions.push(`or(${discoveryCursorFilter(cursor, state.sort === 'newest')})`);
  if (conditions.length) query = query.or(`and(${conditions.join(',')})`);
  if (state.sort !== 'newest') query = query.order('upvotes_count', { ascending: false, nullsFirst: false });
  query = query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
  const { data, error } = await query;
  if (error) throw new Error(`Public discovery query failed (${error.code})`);
  const rows = (data ?? []) as CardRow[];
  const items = rows.slice(0, limit).map((row) => mapCard(row, now, state.categoryId));
  return { items, nextCursor: rows.length > limit && items.length ? encodeDiscoveryCursor(items[items.length - 1], state, snapshot) : null };
}
export async function getSponsoredDiscovery(client: SupabaseClient, input: DiscoveryState, now = Date.now(), limit = 12): Promise<DiscoveryCard[]> {
  const state = checkedState(input);
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error('Invalid sponsor window');
  const date = new Date(now).toISOString();
  // Combine expiry and search in one PostgREST expression; two .or() calls overwrite each other.
  const eligibility = state.categoryId
    ? `or(boosted_until.gt.${date},category_boosted_until.gt.${date})`
    : `boosted_until.gt.${date}`;
  const filter = state.q ? `and(${eligibility},or(${discoverySearchFilter(state.q)}))` : eligibility;
  let countQuery = client.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active').or(filter);
  if (state.categoryId) countQuery = countQuery.eq('category_id', state.categoryId);
  if (state.platform !== 'all') countQuery = countQuery.contains('platforms', [state.platform]);
  const { count, error } = await countQuery;
  if (error || count === null) throw new Error(`Public sponsor count failed (${error?.code ?? 'missing-count'})`);
  if (!count) return [];
  const start = Math.floor(now / 3600000) % count;
  const size = Math.min(limit, count);
  async function read(from: number, to: number): Promise<DiscoveryCard[]> {
    const query = cardQuery(client, state).or(filter);
    const { data, error: readError } = await query.order('upvotes_count', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
    if (readError) throw new Error(`Public sponsored discovery failed (${readError.code})`);
    return ((data ?? []) as CardRow[]).map((row) => mapCard(row, now, state.categoryId)).filter((card) => card.is_boosted);
  }
  const tail = Math.min(size, count - start);
  const slices = await Promise.all([read(start, start + tail - 1), size > tail ? read(0, size - tail - 1) : Promise.resolve([])]);
  // Changes between count/read may shorten a window; never repeat a project or fabricate a sponsor.
  return [...new Map(slices.flat().map((card) => [card.id, card])).values()];
}
export async function getDiscoverySections(client: SupabaseClient, state: DiscoveryState, now = Date.now()) {
  const [popular, newest, sponsored] = await Promise.all([
    getDiscoveryPage(client, { ...state, sort: 'top_voted' }, undefined, 6, now),
    getDiscoveryPage(client, { ...state, sort: 'newest' }, undefined, 6, now),
    getSponsoredDiscovery(client, state, now),
  ]);
  return { popular: popular.items, newest: newest.items, sponsored };
}
