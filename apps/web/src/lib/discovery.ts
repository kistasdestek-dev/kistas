import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { createAnonClient, getCategories, getDiscoverySections, getDiscoveryPage } from '@kistas/supabase';
import { parseDiscoveryState, InvalidDiscoveryQuery, type DiscoveryParams, type DiscoveryState } from '@kistas/shared';

export const getDiscoveryCategories = unstable_cache(async () => getCategories(createAnonClient()), ['discovery-categories-v1'], { revalidate: 60 });
const getSections = unstable_cache(async (state: DiscoveryState) => {
  const timestamp = Date.now();
  return { sections: await getDiscoverySections(createAnonClient(), state, timestamp), timestamp };
}, ['discovery-sections-v2'], { revalidate: 60 });
const getFirstPage = unstable_cache(async (state: DiscoveryState) => getDiscoveryPage(createAnonClient(), state), ['discovery-first-page-v2'], { revalidate: 60 });
export async function resolveDiscoveryState(params: DiscoveryParams, defaults: Partial<DiscoveryState> = {}) {
  try {
    const state = parseDiscoveryState(params, defaults);
    const categories = await getDiscoveryCategories();
    if (state.categoryId && !categories.some((category) => category.id === state.categoryId)) notFound();
    return { state, categories };
  } catch (error) { if (error instanceof InvalidDiscoveryQuery) notFound(); throw error; }
}
export async function loadDiscovery(params: DiscoveryParams, defaults: Partial<DiscoveryState> = {}) {
  const { state, categories } = await resolveDiscoveryState(params, defaults);
  if (state.q) {
    const timestamp = Date.now();
    return { state, categories, sections: await getDiscoverySections(createAnonClient(), state, timestamp), timestamp };
  }
  return { state, categories, ...await getSections(state) };
}
export async function loadDiscoveryCollection(params: DiscoveryParams, sort: 'top_voted' | 'newest') {
  const { state } = await resolveDiscoveryState(params, { sort });
  if (state.sort !== sort || Array.isArray(params.cursor)) notFound();
  try {
    const page = state.q || params.cursor
      ? await getDiscoveryPage(createAnonClient(), state, params.cursor)
      : await getFirstPage(state);
    return { ...page, state };
  } catch (error) { if (error instanceof InvalidDiscoveryQuery) notFound(); throw error; }
}
