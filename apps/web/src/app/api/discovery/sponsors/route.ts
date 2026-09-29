import { createAnonClient, getSponsoredDiscovery } from '@kistas/supabase';
import { InvalidDiscoveryQuery, parseDiscoveryState, type DiscoveryParams } from '@kistas/shared';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const params: DiscoveryParams = {};
    const search = new URL(request.url).searchParams;
    for (const key of ['q', 'category', 'platform', 'sort']) {
      const values = search.getAll(key);
      if (values.length) params[key] = values.length === 1 ? values[0] : values;
    }
    const state = parseDiscoveryState(params);
    const timestamp = Date.now();
    const items = await getSponsoredDiscovery(createAnonClient(), state, timestamp, 12);
    return Response.json({ items, timestamp }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof InvalidDiscoveryQuery ? 'INVALID_DISCOVERY_QUERY' : 'SPONSORS_UNAVAILABLE' },
      { status: error instanceof InvalidDiscoveryQuery ? 400 : 503, headers });
  }
}
