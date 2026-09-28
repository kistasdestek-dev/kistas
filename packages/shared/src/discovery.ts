import type { Listing } from './types';

export type DiscoveryCard = Pick<Listing, 'id' | 'category_id' | 'title' | 'tagline' | 'description' | 'logo_url' | 'developer_name' | 'platforms' | 'created_at' | 'is_boosted' | 'boosted_until' | 'upvote_count' | 'images'>;
export type DiscoveryPlatform = 'all' | 'iOS' | 'Android' | 'Web' | 'macOS' | 'SaaS';
export type DiscoverySort = 'trending' | 'top_voted' | 'newest';
export interface DiscoveryState { q: string; categoryId: string | null; platform: DiscoveryPlatform; sort: DiscoverySort }
export type DiscoveryParams = Record<string, string | string[] | undefined>;
export interface DiscoveryCursor { version: 1; scope: string; id: string; createdAt: string; votes: number; snapshot: string }
export const DISCOVERY_DEFAULTS: DiscoveryState = { q: '', categoryId: null, platform: 'all', sort: 'trending' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
export class InvalidDiscoveryQuery extends Error { constructor() { super('Geçersiz keşif filtresi veya sayfalama bağlantısı.'); } }
export function parseDiscoveryState(params: DiscoveryParams, defaults: Partial<DiscoveryState> = {}): DiscoveryState {
  const base = { ...DISCOVERY_DEFAULTS, ...defaults };
  function single(key: string): string | undefined { const value = params[key]; if (Array.isArray(value)) throw new InvalidDiscoveryQuery(); return value; }
  const state = { q: (single('q') ?? base.q).trim(), categoryId: single('category') || base.categoryId, platform: single('platform') || base.platform, sort: single('sort') || base.sort };
  if (state.q.length > 100 || /[\x00-\x1f\x7f]/.test(state.q) || (state.categoryId && !uuid.test(state.categoryId)) || !['all', 'iOS', 'Android', 'Web', 'macOS', 'SaaS'].includes(state.platform) || !['trending', 'top_voted', 'newest'].includes(state.sort)) throw new InvalidDiscoveryQuery();
  return state as DiscoveryState;
}
export function discoveryScope(state: DiscoveryState): string { return JSON.stringify([state.q, state.categoryId, state.platform, state.sort]); }
export function discoveryHref(pathname: string, state: DiscoveryState, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.categoryId) params.set('category', state.categoryId);
  if (state.platform !== 'all') params.set('platform', state.platform);
  if (state.sort !== 'trending') params.set('sort', state.sort);
  if (cursor) params.set('cursor', cursor);
  return `${pathname}${params.size ? `?${params}` : ''}`;
}
export function decodeDiscoveryCursor(value: string | undefined, state: DiscoveryState): DiscoveryCursor | null {
  if (!value) return null;
  try {
    if (value.length > 1000) throw new InvalidDiscoveryQuery();
    const cursor: DiscoveryCursor = JSON.parse(value);
    if (cursor.version !== 1 || cursor.scope !== discoveryScope(state) || !uuid.test(cursor.id) || !timestamp.test(cursor.createdAt) || !timestamp.test(cursor.snapshot) || !Number.isFinite(Date.parse(cursor.createdAt)) || !Number.isFinite(Date.parse(cursor.snapshot)) || !Number.isSafeInteger(cursor.votes) || cursor.votes < 0 || Date.parse(cursor.createdAt) > Date.parse(cursor.snapshot)) throw new InvalidDiscoveryQuery();
    return cursor;
  } catch { throw new InvalidDiscoveryQuery(); }
}
export function encodeDiscoveryCursor(card: DiscoveryCard, state: DiscoveryState, snapshot: string): string {
  const value = JSON.stringify({ version: 1, scope: discoveryScope(state), id: card.id, createdAt: card.created_at, votes: card.upvote_count, snapshot });
  decodeDiscoveryCursor(value, state);
  return value;
}
// Quote PostgREST reserved characters and escape regex operators for literal case-insensitive search.
export function discoverySearchFilter(q: string): string {
  const safe = parseDiscoveryState({ q }).q;
  const value = JSON.stringify(safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return ['title', 'tagline', 'description', 'developer_name'].map((column) => `${column}.imatch.${value}`).join(',');
}
export function discoveryCursorFilter(cursor: DiscoveryCursor, newest: boolean): string {
  const date = JSON.stringify(cursor.createdAt);
  const tail = `created_at.lt.${date},and(created_at.eq.${date},id.lt.${cursor.id})`;
  return newest ? tail : `upvotes_count.lt.${cursor.votes},and(upvotes_count.eq.${cursor.votes},or(${tail}))`;
}
