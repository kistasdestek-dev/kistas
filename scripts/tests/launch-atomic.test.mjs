import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const read = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const db = new PGlite();
const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const category = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const origin = 'https://iojgqicgeztqwkbetboa.supabase.co';
const payload = { title: 'Test Lansmanı', tagline: 'Özgür lansman', description: 'Yeterince uzun bir açıklama.', categoryId: category,
  pricingModel: 'freemium', price: 0, platforms: ['Web'], websiteUrl: 'https://example.com',
  logoUrl: `${origin}/storage/v1/object/public/kistas/logos/owned.webp`,
  coverUrl: `${origin}/storage/v1/object/public/kistas/vitrin/owned.webp`, screenshots: [] };
let checks = 0;
async function check(name, operation) { await operation(); checks++; console.log(`PASS: ${name}`); }
const query = (sql, values) => db.query(sql, values);
async function actor(id, role = 'authenticated') {
  await db.exec('RESET ROLE');
  await query("SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [id || '', role]);
  await db.exec(`SET ROLE ${role}`);
}
async function submit(data = payload, id = null, revision = null, draft = null) {
  return (await query('SELECT public.submit_launch($1::jsonb, $2::uuid, $3::integer, $4::uuid) AS result', [JSON.stringify(data), id, revision, draft])).rows[0].result;
}
async function save(id, revision, data = payload, source = null, sourceRevision = null) {
  return (await query('SELECT public.save_launch_draft($1::uuid,$2::integer,$3::jsonb,$4::uuid,$5::integer) AS result',
    [id, revision, JSON.stringify(data), source, sourceRevision])).rows[0].result;
}
async function snapshot(id) {
  await db.exec('RESET ROLE');
  const listing = (await query('SELECT * FROM public.listings WHERE id=$1', [id])).rows;
  const images = (await query('SELECT * FROM public.listing_images WHERE listing_id=$1 ORDER BY id', [id])).rows;
  await actor(userA);
  return { listing, images };
}
try {
  // Minimal real PostgreSQL schema. Auth claims emulate verified users; not a live Supabase auth proof.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id UUID PRIMARY KEY, email_confirmed_at TIMESTAMPTZ);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, anon;
    CREATE TYPE public.listing_status AS ENUM ('draft','active','inactive','banned','reserved','sold');
    CREATE TABLE public.categories(id UUID PRIMARY KEY);
    CREATE TABLE public.listings(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID REFERENCES auth.users(id),
      category_id UUID REFERENCES public.categories(id), title VARCHAR(150), tagline TEXT, description TEXT, price NUMERIC,
      pricing_model TEXT, platforms TEXT[], logo_url TEXT, web_url TEXT, app_store_url TEXT, play_store_url TEXT, promo_code TEXT,
      status public.listing_status, boosted_until TIMESTAMPTZ, category_boosted_until TIMESTAMPTZ, upvotes_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0, review_feedback TEXT, review_requested_at TIMESTAMPTZ, reviewed_by UUID,
      updated_at TIMESTAMPTZ DEFAULT clock_timestamp());
    CREATE TABLE public.listing_images(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID REFERENCES public.listings(id),
      image_url TEXT NOT NULL, display_order INTEGER, is_cover BOOLEAN);
    CREATE TABLE public.admin_action_audit(actor_id UUID, action TEXT, target_type TEXT, target_id UUID, details JSONB);
    CREATE TABLE storage.objects(bucket_id TEXT, name TEXT, owner_id TEXT);
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY);
    CREATE TABLE public.notifications(id UUID PRIMARY KEY,created_at TIMESTAMPTZ DEFAULT clock_timestamp());
    CREATE TABLE public.conversations(id UUID PRIMARY KEY,created_at TIMESTAMPTZ DEFAULT clock_timestamp());
    CREATE TABLE public.messages(id UUID PRIMARY KEY,conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
      type TEXT,created_at TIMESTAMPTZ DEFAULT clock_timestamp());
    INSERT INTO storage.buckets VALUES ('kistas');
    CREATE FUNCTION public.is_platform_admin() RETURNS BOOLEAN LANGUAGE sql AS $$ SELECT FALSE $$;
    CREATE FUNCTION public.has_admin_permission(TEXT) RETURNS BOOLEAN LANGUAGE sql AS $$ SELECT FALSE $$;
    GRANT SELECT ON public.listings, public.listing_images TO authenticated;
  `);
  await query('INSERT INTO auth.users VALUES ($1,now()),($2,now())', [userA, userB]);
  await query('INSERT INTO public.categories VALUES ($1)', [category]);
  await query("INSERT INTO storage.objects VALUES ('kistas','logos/owned.webp',$1),('kistas','vitrin/owned.webp',$1),('kistas','vitrin/foreign.webp',$2)", [userA,userB]);
  await db.exec(read('supabase/migrations/20260914000004_listing_revision_resubmission.sql'));
  const originalModeration = read('supabase/migrations/20260927000005_repair_admin_dashboard_and_listing_approval.sql');
  await db.exec(originalModeration.slice(originalModeration.indexOf('CREATE OR REPLACE FUNCTION public.handle_listing_status_protection()'),
    originalModeration.indexOf('CREATE OR REPLACE FUNCTION public.admin_update_listing_status(')));
  await check('read-only preflight validates required schema before applying M2',async()=>{
    await db.exec(read('supabase/tests/m2-preflight.sql'));
    assert.equal((await query("SELECT to_regclass('public.launch_drafts') AS object")).rows[0].object,null);
  });
  await db.exec(read('supabase/migrations/20260928000002_atomic_launch_and_private_archive.sql'));
  await db.exec(read('supabase/migrations/20260928000003_archive_notification_and_idle_chat_retention.sql'));
  await db.exec(read('supabase/migrations/20260928000005_owner_delete_launch_draft.sql'));
  await db.exec('CREATE TRIGGER protect_status BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.handle_listing_status_protection()');
  await actor(userA);
  let created;
  await check('new launch includes cover and committed project together', async () => {
    created = await submit(); assert.equal(created.status, 'draft'); assert.equal(created.revision, 1);
    const state = await snapshot(created.listingId); assert.equal(state.images.length,1); assert.equal(state.images[0].is_cover,true);
  });
  await check('same content may be launched again: no quota or request deduplication', async () => {
    const second = await submit(); assert.notEqual(second.listingId, created.listingId);
  });
  await check('private archive accepts incomplete content and detects stale archive edits', async () => {
    const id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const result = await save(id,0,{ title:'' }); assert.equal(result.revision,1);
    await assert.rejects(save(id,0),/DRAFT_CONFLICT/);
    await actor(userB); assert.equal((await query('SELECT * FROM public.launch_drafts')).rows.length,0);
    await assert.rejects(save(id,1),/FORBIDDEN/); await actor(userA);
    const updated = await save(id,1); assert.equal(updated.revision,2);
  });
  await check('anonymous access and direct archive writes are rejected', async () => {
    await actor(null,'anon'); await assert.rejects(submit(),/permission denied/);
    await assert.rejects(query('SELECT * FROM public.launch_drafts'),/permission denied/);
    await actor(userA); await assert.rejects(query('DELETE FROM public.launch_drafts'),/permission denied/);
  });
  await check('foreign listing and foreign uploaded image are rejected', async () => {
    await actor(userB); await assert.rejects(submit(payload,created.listingId,1),/FORBIDDEN/);
    await actor(userA); await assert.rejects(submit({...payload,coverUrl:`${origin}/storage/v1/object/public/kistas/vitrin/foreign.webp`}),/MEDIA_NOT_OWNED/);
    await assert.rejects(submit({...payload,logoUrl:payload.logoUrl.replace(origin,'https://evil.example')}),/INVALID_MEDIA_ORIGIN/);
  });
  await check('direct RPC validates fields, platform values, image bounds, links and protected columns', async () => {
    await assert.rejects(submit({...payload,title:'x'.repeat(151)}),/INVALID_LAUNCH/);
    await assert.rejects(submit({...payload,platforms:['Web',null]}),/INVALID_LAUNCH/);
    await assert.rejects(submit({...payload,screenshots:Array(7).fill(payload.coverUrl)}),/INVALID_LAUNCH/);
    await assert.rejects(submit({...payload,websiteUrl:'javascript:alert(1)'}),/INVALID_LINK/);
    await assert.rejects(submit({...payload,websiteUrl:null}),/INVALID_LINK/);
    const result=await submit({...payload,seller_id:userB,status:'active',upvotes_count:100000,boosted_until:'2030-01-01'});
    const state=await snapshot(result.listingId);assert.equal(state.listing[0].seller_id,userA);assert.equal(state.listing[0].status,'draft');
    assert.equal(state.listing[0].upvotes_count,0);assert.equal(state.listing[0].boosted_until,null);
  });
  await check('failed image insert rolls back project creation and restores edited project/images', async () => {
    const before = await snapshot(created.listingId);
    await db.exec('RESET ROLE');
    const count = (await query('SELECT count(*)::integer AS count FROM public.listings')).rows[0].count;
    await db.exec(`CREATE FUNCTION public.fail_image() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INJECTED_IMAGE_FAILURE'; END $$;
      CREATE TRIGGER image_failure BEFORE INSERT ON public.listing_images FOR EACH ROW EXECUTE FUNCTION public.fail_image()`);
    await actor(userA);
    const archiveId='ffffffff-ffff-4fff-8fff-ffffffffffff';await save(archiveId,0);
    await assert.rejects(submit(),/INJECTED_IMAGE_FAILURE/);
    await assert.rejects(submit(payload,null,null,archiveId),/INJECTED_IMAGE_FAILURE/);
    assert.equal((await query('SELECT state FROM public.launch_drafts WHERE id=$1',[archiveId])).rows[0].state,'editing');
    await assert.rejects(submit({...payload,title:'Yeni başlık'},created.listingId,1),/INJECTED_IMAGE_FAILURE/);
    assert.deepEqual(await snapshot(created.listingId),before);
    await db.exec('RESET ROLE'); assert.equal((await query('SELECT count(*)::integer AS count FROM public.listings')).rows[0].count,count);
    await db.exec('DROP TRIGGER image_failure ON public.listing_images; DROP FUNCTION public.fail_image()'); await actor(userA);
  });
  await check('two queued edits with the same revision cannot silently overwrite one another', async () => {
    const results = await Promise.allSettled([submit({...payload,title:'Birinci sekme'},created.listingId,1),submit({...payload,title:'İkinci sekme'},created.listingId,1)]);
    assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
    assert.match(results.find(item=>item.status==='rejected').reason.message,/EDIT_CONFLICT/);
    assert.equal((await snapshot(created.listingId)).listing[0].title,'Birinci sekme');
  });
  await check('resubmission audit failure rolls back all edited data; successful resubmission clears review fields', async () => {
    await db.exec('RESET ROLE');
    await query("UPDATE public.listings SET status='inactive',review_feedback='Düzeltme gerekli',review_requested_at=now(),reviewed_by=$2 WHERE id=$1",[created.listingId,userB]);
    await actor(userA); const before = await snapshot(created.listingId); const revision = before.listing[0].save_revision;
    await db.exec('RESET ROLE');
    await db.exec("ALTER TABLE public.admin_action_audit ADD CONSTRAINT fail_audit CHECK (action <> 'listing_revision_resubmitted')");
    await actor(userA); await assert.rejects(submit({...payload,title:'Düzeltilmiş'},created.listingId,revision),/fail_audit/);
    assert.deepEqual(await snapshot(created.listingId),before);
    await db.exec('RESET ROLE'); await db.exec('ALTER TABLE public.admin_action_audit DROP CONSTRAINT fail_audit'); await actor(userA);
    await submit({...payload,title:'Düzeltilmiş'},created.listingId,revision);
    const state = await snapshot(created.listingId); assert.equal(state.listing[0].status,'draft');
    assert.equal(state.listing[0].review_feedback,null); assert.equal(state.listing[0].review_requested_at,null); assert.equal(state.listing[0].reviewed_by,null);
  });
  await check('committed submission moves archive out of unfinished queue, without deduplicating a second explicit request', async () => {
    const id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'; await save(id,0);
    const one=await submit(payload,null,null,id); const two=await submit(payload,null,null,id); assert.notEqual(one.listingId,two.listingId);
    const rows=(await query('SELECT state,submitted_listing_id FROM public.launch_drafts WHERE id=$1',[id])).rows;
    assert.equal(rows[0].state,'submitted'); assert.equal(rows[0].submitted_listing_id,two.listingId);
    await assert.rejects(save(id,1),/DRAFT_CONFLICT/);
  });
  await check('expired archive submit rolls back new project and gallery atomically',async()=>{
    const id='11111111-1111-4111-8111-111111111111';await db.exec('RESET ROLE');
    await query("INSERT INTO public.launch_drafts(id,owner_id,payload,updated_at) VALUES ($1,$2,$3,clock_timestamp()-interval '73 hours')",[id,userA,JSON.stringify(payload)]);
    const before=(await query('SELECT (SELECT count(*) FROM public.listings) AS projects,(SELECT count(*) FROM public.listing_images) AS images')).rows;
    await actor(userA);await assert.rejects(submit(payload,null,null,id),/DRAFT_EXPIRED/);
    await db.exec('RESET ROLE');assert.deepEqual((await query('SELECT (SELECT count(*) FROM public.listings) AS projects,(SELECT count(*) FROM public.listing_images) AS images')).rows,before);
    await actor(userA);
  });
  await check('confirmed submission refreshes archive acknowledgement lifetime without deleting the project',async()=>{
    const id='22222222-2222-4222-8222-222222222222';await db.exec('RESET ROLE');
    await query("INSERT INTO public.launch_drafts(id,owner_id,payload,updated_at) VALUES ($1,$2,$3,clock_timestamp()-interval '71 hours')",[id,userA,JSON.stringify(payload)]);
    await actor(userA);const launch=await submit(payload,null,null,id);
    const row=(await query('SELECT updated_at FROM public.launch_drafts WHERE id=$1',[id])).rows[0];assert.ok(Date.now()-new Date(row.updated_at).getTime()<10000);
    await db.exec('RESET ROLE');await query('SELECT public.cleanup_expired_launch_archives()');
    assert.equal((await query('SELECT id FROM public.listings WHERE id=$1',[launch.listingId])).rows.length,1);await actor(userA);
  });
  await check('archive deletion rejects other owners, stale revisions, submitted rows and anonymous callers', async () => {
    const id = '33333333-3333-4333-8333-333333333333';
    await actor(userA); await save(id, 0);
    const remove = (revision = 1) => query('SELECT public.delete_launch_draft($1::uuid,$2::integer)', [id, revision]);
    await actor(userB); await assert.rejects(remove(), /DRAFT_CONFLICT/);
    await actor(userA); await save(id, 1); await assert.rejects(remove(), /DRAFT_CONFLICT/);
    await actor(null, 'anon'); await assert.rejects(remove(2), /permission denied/);
    await actor(null); await assert.rejects(remove(2), /AUTH_REQUIRED/);
    await actor(userA); await assert.rejects(remove(-1), /INVALID_DRAFT/);
    const before = await query('SELECT count(*) AS count FROM public.listings');
    await remove(2); await remove(2);
    assert.equal((await query('SELECT id FROM public.launch_drafts WHERE id=$1', [id])).rows.length, 0);
    assert.deepEqual((await query('SELECT count(*) AS count FROM public.listings')).rows, before.rows);
    await assert.rejects(save(id, 2), /DRAFT_CONFLICT/);
    await save(id, 0); await submit(payload, null, null, id); await assert.rejects(remove(), /DRAFT_CONFLICT/);
    await assert.rejects(query('DELETE FROM public.launch_drafts WHERE id=$1', [id]), /permission denied/);
  });
  console.log(`M2: ${checks} PostgreSQL transaction/role scenarios passed. PGlite uses one connection; cross-connection races and live Supabase auth remain separate staging checks.`);
  const serverVersion = (await query("SELECT current_setting('server_version') AS version")).rows[0].version;
  fs.mkdirSync(new URL('../../reports/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../../reports/m2-postgres-validation.json', import.meta.url), JSON.stringify({
    capturedAt: new Date().toISOString(), engine:'PGlite 0.5.8', serverVersion, passed:checks, failed:0,
    migrationSha256:createHash('sha256').update(read('supabase/migrations/20260928000002_atomic_launch_and_private_archive.sql')).digest('hex'),
    retentionMigrationSha256:createHash('sha256').update(read('supabase/migrations/20260928000003_archive_notification_and_idle_chat_retention.sql')).digest('hex'),
    deleteMigrationSha256:createHash('sha256').update(read('supabase/migrations/20260928000005_owner_delete_launch_draft.sql')).digest('hex'),
    productionDataWritten:false, auth:'synthetic claims/roles', connections:1,
    limitations:['Minimal schema is not the full production Supabase schema/policy/trigger set.','Synthetic auth claims do not verify actual Supabase Auth or Storage APIs.','Queued concurrent calls on one connection do not prove independent-connection races.'],
  },null,2)+'\n');
} catch (error) { console.error({ message: error.message, code: error.code, position: error.position, detail: error.detail }); process.exitCode = 1; } finally { await db.close(); }
