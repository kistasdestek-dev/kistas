import { category, listing, discoveryFixtureRows, queryDiscoveryFixture } from './discovery-fixture.mjs';
export { listing };
// Only public GET/HEAD reads are mocked. Unknown destinations and writes fail closed.
export async function publicFixtureResponse(request) {
  const url = new URL(request.url);
  if (!url.hostname.endsWith('.supabase.co') || !['GET', 'HEAD'].includes(request.method) || !url.pathname.startsWith('/rest/v1/')) throw new Error('Unmocked outbound request');
  const table = url.pathname.split('/').at(-1);
  if (table === 'categories') return Response.json([category]);
  if (table === 'blog_posts') return Response.json([]);
  if (table !== 'listings') throw new Error(`Unmocked public table: ${table}`);
  const { rows, count, offset } = queryDiscoveryFixture(url.searchParams.has('select') ? discoveryFixtureRows() : [listing], url.searchParams);
  const headers = { 'content-range': `${offset}-${offset + rows.length - 1}/${count}` };
  if (request.method === 'HEAD') return new Response(null, { headers });
  if (request.headers.get('accept')?.includes('application/vnd.pgrst.object+json') || url.searchParams.has('id')) {
    return rows.length === 1 ? Response.json(rows[0], { headers }) : Response.json({ code: 'PGRST116', message: 'No rows found' }, { status: 406 });
  }
  return Response.json(rows, { headers });
}
