import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { parseDiscoveryState, decodeDiscoveryCursor, encodeDiscoveryCursor, discoverySearchFilter, sponsorExpiry, DISCOVERY_DEFAULTS } from '../../packages/shared/src/discovery.ts';
import { discoveryFixtureRows, queryDiscoveryFixture } from './discovery-fixture.mjs';

const requireWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createClient } = requireWeb('@supabase/supabase-js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kistas-m1-'));
try {
  const sourcePath = new URL('../../packages/supabase/src/queries/discovery.ts', import.meta.url);
  const sharedURL = new URL('../../packages/shared/src/discovery.ts', import.meta.url).href;
  const source = fs.readFileSync(sourcePath, 'utf8').replace("'@kistas/shared'", JSON.stringify(sharedURL));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledPath = path.join(root, 'discovery.mjs');
  fs.writeFileSync(compiledPath, compiled);
  const { getDiscoveryPage, getDiscoverySections, getSponsoredDiscovery } = await import(pathToFileURL(compiledPath));
  let rows = discoveryFixtureRows();
  const requests = [];
  let fail = false;
  const client = createClient('https://fixture.supabase.co', 'public-test-key', { auth: { persistSession: false }, global: { fetch: async (input, init) => {
    const request = new Request(input, init);
    requests.push(new URL(request.url));
    if (fail) return Response.json({ code: 'TEST_ERROR', message: 'Rejected' }, { status: 400 });
    const result = queryDiscoveryFixture(rows, new URL(request.url).searchParams);
    const headers = { 'content-range': `0-${result.rows.length - 1}/${result.count}` };
    return request.method === 'HEAD' ? new Response(null, { headers }) : Response.json(result.rows, { headers });
  } } });
  const now = Date.parse('2026-09-28T12:00:00Z');
  const sections = await getDiscoverySections(client, DISCOVERY_DEFAULTS, now);
  assert.equal(sections.popular.length, 6);
  assert.equal(sections.popular.some((card) => card.title === 'M1 Yeni Proje'), false);
  assert.equal(sections.newest[0].title, 'M1 Yeni Proje');
  assert.equal(sections.sponsored[0].title, 'M1 Sponsor Projesi');
  assert.equal(sections.popular.some((card) => card.title === 'Yayınlanmamış Proje'), false);
  assert.ok(sections.popular.every((card) => card.description.length <= 180 && !('seller_id' in card) && !('price' in card)));
  const oldFeed = rows.filter((row) => row.status === 'active').sort((a, b) => b.upvotes_count - a.upvotes_count).slice(0, 40);
  const payload = { fixtureRecords: rows.length, oldPopular40ModelBytes: Buffer.byteLength(JSON.stringify(oldFeed)), newSectionCardModelBytes: Buffer.byteLength(JSON.stringify(sections)), limitation: 'JSON model bytes on fixed fixtures; not actual RSC/HTTP transfer or database execution cost' };
  assert.ok(payload.newSectionCardModelBytes < payload.oldPopular40ModelBytes);
  fs.mkdirSync(new URL('../../reports/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../../reports/m1-card-payload.json', import.meta.url), JSON.stringify(payload, null, 2) + '\n');
  assert.ok(requests.every((url) => !url.searchParams.get('select').includes('*')));
  const scoped = { ...DISCOVERY_DEFAULTS, q: 'Aranabilir Ekip', platform: 'Web' };
  assert.equal((await getDiscoveryPage(client, scoped, undefined, 30, now)).items[0].title, 'M1 Yeni Proje');
  assert.equal((await getDiscoveryPage(client, { ...scoped, platform: 'Android' }, undefined, 30, now)).items.length, 0);
  assert.equal((await getDiscoveryPage(client, { ...scoped, categoryId: '99999999-9999-4999-8999-999999999999' }, undefined, 30, now)).items.length, 0);
  for (const sort of ['top_voted', 'newest']) {
    const state = { ...DISCOVERY_DEFAULTS, sort };
    const all = [];
    let cursor;
    do {
      const page = await getDiscoveryPage(client, state, cursor, 30, now);
      all.push(...page.items.map((card) => card.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.equal(all.length, rows.filter((row) => row.status === 'active').length);
    assert.equal(new Set(all).size, all.length, 'Equal vote/date ties must not duplicate or skip rows');
  }
  const state = { ...DISCOVERY_DEFAULTS, sort: 'newest' };
  const first = await getDiscoveryPage(client, state, undefined, 30, now);
  const cursor = decodeDiscoveryCursor(first.nextCursor, state);
  rows = rows.filter((row) => row.id !== cursor.id);
  rows.push({ ...rows[0], id: '88888888-8888-4888-8888-888888888888', created_at: '2026-09-28T12:01:00Z' });
  const next = await getDiscoveryPage(client, state, first.nextCursor, 30, now + 120000);
  assert.equal(next.items.some((card) => first.items.some((previous) => previous.id === card.id)), false);
  assert.equal(next.items.some((card) => card.id.startsWith('88888888')), false, 'Snapshot excludes later inserts');
  assert.throws(() => decodeDiscoveryCursor(first.nextCursor, { ...state, q: 'changed' }));
  for (const params of [{ q: 'a'.repeat(101) }, { platform: 'invalid' }, { category: 'x),or(status.eq.draft)' }, { sort: 'wrong' }, { q: ['a', 'b'] }]) assert.throws(() => parseDiscoveryState(params));
  for (const value of ['invalid', '{}', JSON.stringify({ ...cursor, id: 'id),status.eq.pending_review' }), JSON.stringify({ ...cursor, votes: Infinity }), JSON.stringify({ ...cursor, createdAt: 'not-a-date' })]) assert.throws(() => decodeDiscoveryCursor(value, state));
  rows = discoveryFixtureRows();
  rows.push({ ...rows[0], id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'İsim, (özel) "ürün" %_\\' });
  const literalQuery = 'İsim, (özel) "ürün" %_\\';
  assert.equal((await getDiscoveryPage(client, { ...DISCOVERY_DEFAULTS, q: literalQuery }, undefined, 30, now)).items.length, 1);
  assert.equal((await getDiscoveryPage(client, { ...DISCOVERY_DEFAULTS, q: 'x"),status.eq.pending_review' }, undefined, 30, now)).items.length, 0);
  assert.ok(discoverySearchFilter('x,()').startsWith('title.imatch.'));
  const sponsor = rows.find((row) => row.title === 'M1 Sponsor Projesi');
  const base = Array.from({ length: 17 }, (_, index) => ({ ...sponsor, id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12, '0')}`, upvotes_count: 100 - index }));
  rows = base;
  const ordered = base.map((row) => row.id);
  for (const time of [0, 3600000, 16 * 3600000, now]) {
    const sponsored = await getSponsoredDiscovery(client, DISCOVERY_DEFAULTS, time, 12);
    const shift = Math.floor(time / 3600000) % base.length;
    assert.deepEqual(sponsored.map((card) => card.id), [...ordered.slice(shift), ...ordered.slice(0, shift)].slice(0, 12));
  }
  rows = [{ ...sponsor, boosted_until: new Date(now).toISOString() }];
  assert.equal((await getSponsoredDiscovery(client, DISCOVERY_DEFAULTS, now)).length, 0, 'Expiry boundary is exclusive');
  const cat = '11111111-1111-4111-8111-111111111111';
  const categoryState = { ...DISCOVERY_DEFAULTS, categoryId: cat };
  rows = discoveryFixtureRows();
  const union = await getSponsoredDiscovery(client, categoryState, now);
  assert.deepEqual(union.map(card => card.title).sort(), ['Kategori Sponsor Projesi', 'M1 Sponsor Projesi']);
  assert.ok(union.every(card => card.is_boosted));
  assert.equal((await getSponsoredDiscovery(client, DISCOVERY_DEFAULTS, now)).some(card => card.title === 'Kategori Sponsor Projesi'), false);
  assert.deepEqual((await getSponsoredDiscovery(client, { ...categoryState, q: 'Kategori Sponsor', platform: 'Web' }, now)).map(card => card.title), ['Kategori Sponsor Projesi']);
  assert.equal((await getSponsoredDiscovery(client, { ...categoryState, q: 'Kategori Sponsor', platform: 'Android' }, now)).length, 0);
  assert.equal((await getSponsoredDiscovery(client, { ...categoryState, q: 'x"),status.eq.pending_review' }, now)).length, 0, 'Combined sponsor/search expression must not broaden status or scope');
  const scopedOrganic = await getDiscoveryPage(client, { ...categoryState, q: 'Kategori Sponsor' }, undefined, 30, now);
  assert.equal(scopedOrganic.items.find(card => card.title === 'Kategori Sponsor Projesi').is_boosted, true);
  rows = [{ ...sponsor, category_boosted_until: '2031-01-01T00:00:00Z' },
    { ...sponsor, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { ...sponsor, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', status: 'inactive' }];
  const dual = await getSponsoredDiscovery(client, categoryState, now);
  assert.equal(dual.length, 1, 'Dual sponsorship must not duplicate, and wrong category/inactive must be excluded');
  assert.equal(sponsorExpiry(dual[0], cat), Date.parse('2031-01-01T00:00:00Z'));
  assert.equal(sponsorExpiry(dual[0], null), Date.parse(sponsor.boosted_until));
  rows = [{ ...sponsor, boosted_until: null, category_boosted_until: new Date(now).toISOString() }];
  assert.equal((await getSponsoredDiscovery(client, categoryState, now)).length, 0);
  for (const count of [0, 1, 3, 17]) {
    rows = base.slice(0, count);
    const appearances = new Map(rows.map(row => [row.id, 0]));
    const slots = [new Set(), new Set(), new Set()];
    for (let hour = 0; hour < Math.max(1, count); hour++) {
      const cards = await getSponsoredDiscovery(client, DISCOVERY_DEFAULTS, hour * 3600000, 12);
      assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
      cards.slice(0, 3).forEach((card, index) => { appearances.set(card.id, appearances.get(card.id) + 1); slots[index].add(card.id); });
    }
    assert.ok([...appearances.values()].every(value => value === Math.min(3, count)));
    for (const slot of slots.slice(0, Math.min(3, count))) assert.equal(slot.size, count);
  }
  fail = true;
  await assert.rejects(getDiscoveryPage(client, DISCOVERY_DEFAULTS, undefined, 30, now), /TEST_ERROR/);
  await assert.rejects(getSponsoredDiscovery(client, DISCOVERY_DEFAULTS, now), /TEST_ERROR/);
  assert.throws(() => encodeDiscoveryCursor({ ...first.items[0], id: 'unsafe' }, state, new Date(now).toISOString()));
  await assert.rejects(getDiscoveryPage(client, state, undefined, 100, now));
  const cachePath = path.join(root, 'cache.mjs');
  const queriesPath = path.join(root, 'loader-queries.mjs');
  const navigationPath = path.join(root, 'navigation.mjs');
  fs.writeFileSync(cachePath, "export const stores = []; export function unstable_cache(fn, names, options) { const store = new Map(); stores.push({names, options, store}); return (...args) => { const key = JSON.stringify(args); if (!store.has(key)) store.set(key, fn(...args)); return store.get(key); }; }");
  fs.writeFileSync(queriesPath, "export const calls = {categories:0, sponsors:0, pages:0}; export function createAnonClient(){return {}} export async function getCategories(){calls.categories++; return []} export async function getSponsoredDiscovery(){calls.sponsors++; return []} export async function getDiscoveryPage(){calls.pages++; return {items:[], nextCursor:null}} ");
  fs.writeFileSync(navigationPath, "export function notFound(){throw new Error('NotFound')} ");
  const loaderPath = path.join(root, 'loader.mjs');
  let loader = fs.readFileSync(new URL('../../apps/web/src/lib/discovery.ts', import.meta.url), 'utf8');
  for (const [name, replacement] of [['next/cache', cachePath], ['next/navigation', navigationPath], ['@kistas/supabase', queriesPath]]) loader = loader.replace(JSON.stringify(name).replaceAll('"', "'"), JSON.stringify(pathToFileURL(replacement).href));
  loader = loader.replace("'@kistas/shared'", JSON.stringify(sharedURL));
  fs.writeFileSync(loaderPath, ts.transpileModule(loader, { compilerOptions: {module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022} }).outputText);
  const { loadDiscovery, loadDiscoveryCollection } = await import(pathToFileURL(loaderPath));
  const { calls } = await import(pathToFileURL(queriesPath));
  const { stores } = await import(pathToFileURL(cachePath));
  await loadDiscovery({}); await loadDiscovery({});
  assert.equal(calls.pages, 2, 'Organic sections stay cached');
  assert.equal(calls.sponsors, 2, 'Sponsors must be read fresh for each request');
  const entriesBeforeSearch = stores.reduce((sum, entry) => sum + entry.store.size, 0);
  await loadDiscovery({q:'one'}); await loadDiscovery({q:'two'});
  assert.equal(calls.pages, 6);
  assert.equal(calls.sponsors, 4);
  assert.equal(stores.reduce((sum, entry) => sum + entry.store.size, 0), entriesBeforeSearch, 'Free-text search must not add persistent cache keys');
  await loadDiscoveryCollection({}, 'newest'); await loadDiscoveryCollection({}, 'newest');
  assert.equal(calls.pages, 7);
  const entriesBeforeCursor = stores.reduce((sum, entry) => sum + entry.store.size, 0);
  await loadDiscoveryCollection({cursor:first.nextCursor}, 'newest'); await loadDiscoveryCollection({cursor:first.nextCursor}, 'newest');
  assert.equal(calls.pages, 9);
  assert.equal(stores.reduce((sum, entry) => sum + entry.store.size, 0), entriesBeforeCursor, 'Cursor must not add persistent cache keys');
  assert.ok(stores.every((entry) => entry.options.revalidate === 60));
  console.log('M1 discovery: >40 records, independent sections, server scope, safe filters, tie pagination, insert/delete, sponsor rotation/expiry, minimal payload and fail-closed errors passed.');
} finally {
  const target = path.resolve(root);
  if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('kistas-m1-')) throw new Error('Unsafe fixture cleanup');
  fs.rmSync(target, { recursive: true });
}
