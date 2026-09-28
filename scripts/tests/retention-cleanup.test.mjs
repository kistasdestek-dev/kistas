import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { isLaunchArchiveExpired, LAUNCH_ARCHIVE_RETENTION_MS } from '../../packages/shared/src/retention.ts';

const read = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const migration = 'supabase/migrations/20260928000003_archive_notification_and_idle_chat_retention.sql';
const schedule = 'supabase/migrations/20260928000004_schedule_retention_cleanup.sql';
const db = new PGlite();
const user = randomUUID(); let passed = 0;
const query = (sql, params) => db.query(sql, params);
async function check(name, operation) { await operation(); passed++; console.log(`PASS: ${name}`); }
async function has(table, id) { return (await query(`SELECT 1 FROM public.${table} WHERE id=$1`, [id])).rows.length === 1; }
async function draft(age, state='editing', listing=null) {
  const id=randomUUID(); await query(`INSERT INTO public.launch_drafts(id,owner_id,payload,state,source_listing_id,submitted_listing_id,updated_at)
    VALUES ($1,$2,'{}',$3,$4,$4,clock_timestamp()-$5::interval)`,[id,user,state,listing,age]); return id;
}
async function conversation(age='40 days') {
  const id=randomUUID();await query('INSERT INTO public.conversations(id,created_at,last_message_at) VALUES ($1,clock_timestamp()-$2::interval,clock_timestamp())',[id,age]);return id;
}
async function message(id, age, type='text') {
  const result=await query('INSERT INTO public.messages(conversation_id,type) VALUES ($1,$2) RETURNING id',[id,type]);
  if(age) await query('UPDATE public.messages SET created_at=clock_timestamp()-$2::interval WHERE id=$1',[result.rows[0].id,age]);
  return result.rows[0].id;
}
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
    CREATE TABLE public.listings(id UUID PRIMARY KEY,seller_id UUID);
    CREATE TABLE public.launch_drafts(id UUID PRIMARY KEY,owner_id UUID NOT NULL,payload JSONB NOT NULL,
      source_listing_id UUID REFERENCES public.listings(id),source_listing_revision INTEGER,submitted_listing_id UUID REFERENCES public.listings(id),
      state TEXT DEFAULT 'editing',revision INTEGER DEFAULT 1,created_at TIMESTAMPTZ DEFAULT clock_timestamp(),updated_at TIMESTAMPTZ DEFAULT clock_timestamp());
    ALTER TABLE public.launch_drafts ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON public.launch_drafts TO authenticated;
    CREATE POLICY launch_drafts_owner_read ON public.launch_drafts FOR SELECT TO authenticated USING(owner_id=auth.uid());
    CREATE TABLE public.notifications(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),is_read BOOLEAN DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT clock_timestamp());
    CREATE TABLE public.conversations(id UUID PRIMARY KEY,created_at TIMESTAMPTZ DEFAULT clock_timestamp(),last_message_at TIMESTAMPTZ);
    CREATE TABLE public.messages(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'text',is_read BOOLEAN DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT clock_timestamp());
  `);
  await query('INSERT INTO auth.users VALUES ($1)',[user]);
  await query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
  const m2=read('supabase/migrations/20260928000002_atomic_launch_and_private_archive.sql');
  await db.exec(m2.slice(m2.indexOf('CREATE FUNCTION public.save_launch_draft('),m2.indexOf('CREATE OR REPLACE FUNCTION public.handle_listing_status_protection()')));
  await check('read-only retention preflight validates tables and cascading message FK',async()=>{
    await db.exec(read('supabase/tests/retention-preflight.sql'));
  });
  await db.exec(read(migration));
  await check('device expiry uses last edit: exact 72h expires, one millisecond before survives, invalid date fails closed',async()=>{
    const timestamp=Date.UTC(2026,8,28);const updated=new Date(timestamp).toISOString();
    assert.equal(isLaunchArchiveExpired(updated,timestamp+LAUNCH_ARCHIVE_RETENTION_MS-1),false);
    assert.equal(isLaunchArchiveExpired(updated,timestamp+LAUNCH_ARCHIVE_RETENTION_MS),true);
    assert.equal(isLaunchArchiveExpired('invalid',timestamp),true);
  });
  await check('archive cleanup deletes expired metadata, keeps recent archive and the linked published project',async()=>{
    const listing=randomUUID();await query('INSERT INTO public.listings VALUES ($1,$2)',[listing,user]);
    const old=await draft('73 hours','submitted',listing),recent=await draft('71 hours');
    await query('SELECT public.cleanup_expired_launch_archives()');
    assert.equal(await has('launch_drafts',old),false);assert.equal(await has('launch_drafts',recent),true);assert.equal(await has('listings',listing),true);
  });
  await check('editing renews server deadline even when the draft was first created long ago',async()=>{
    const id=await draft('71 hours');await query("UPDATE public.launch_drafts SET created_at=clock_timestamp()-interval '10 days' WHERE id=$1",[id]);
    const result=await query("SELECT public.save_launch_draft($1,1,'{}',NULL,NULL) AS result",[id]);
    assert.equal(result.rows[0].result.revision,2);
    const updated=(await query('SELECT updated_at FROM public.launch_drafts WHERE id=$1',[id])).rows[0].updated_at;
    assert.ok(Date.now()-new Date(updated).getTime()<10000);
    await query('SELECT public.cleanup_expired_launch_archives()');assert.equal(await has('launch_drafts',id),true);
  });
  await check('expired draft cannot be revived by save or submit-state update before the cron sweep',async()=>{
    const id=await draft('73 hours');
    await assert.rejects(query("SELECT public.save_launch_draft($1,1,'{}',NULL,NULL)",[id]),/DRAFT_EXPIRED/);
    await assert.rejects(query("UPDATE public.launch_drafts SET state='submitted' WHERE id=$1",[id]),/DRAFT_EXPIRED/);
    assert.equal((await query('SELECT revision FROM public.launch_drafts WHERE id=$1',[id])).rows[0].revision,1);
  });
  await check('owner RLS hides expired archives even before physical cleanup',async()=>{
    const id=await draft('73 hours');await db.exec('SET ROLE authenticated');
    assert.equal(await has('launch_drafts',id),false);await db.exec('RESET ROLE');
  });
  await check('notifications expire by creation time, independently of read status',async()=>{
    const rows=await query("INSERT INTO public.notifications(created_at,is_read) VALUES (clock_timestamp()-interval '73 hours',FALSE),(clock_timestamp()-interval '73 hours',TRUE),(clock_timestamp()-interval '71 hours',FALSE) RETURNING id");
    await query('SELECT public.cleanup_expired_notifications()');
    assert.equal(await has('notifications',rows.rows[0].id),false);assert.equal(await has('notifications',rows.rows[1].id),false);assert.equal(await has('notifications',rows.rows[2].id),true);
  });
  await check('30 days of inactivity deletes the whole conversation and its cascading messages',async()=>{
    const id=await conversation();const msg=await message(id,'31 days');
    await query('SELECT public.cleanup_idle_conversations()');
    assert.equal(await has('conversations',id),false);assert.equal(await has('messages',msg),false);
  });
  await check('a recent new message preserves an old conversation and all its history',async()=>{
    const id=await conversation();const old=await message(id,'35 days');await message(id,'29 days');
    await query('SELECT public.cleanup_idle_conversations()');
    assert.equal(await has('conversations',id),true);assert.equal(await has('messages',old),true);
  });
  await check('system messages and reading do not renew inactivity; recent empty conversations survive',async()=>{
    const old=await conversation();await message(old,'31 days');await message(old,null,'system');
    await query('UPDATE public.messages SET is_read=TRUE WHERE conversation_id=$1',[old]);
    const recent=await conversation('29 days');await query('SELECT public.cleanup_idle_conversations()');
    assert.equal(await has('conversations',old),false);assert.equal(await has('conversations',recent),true);
  });
  await check('new message timestamps come from the server; accepted message before cleanup renews the deadline',async()=>{
    const id=await conversation();const row=await query("INSERT INTO public.messages(conversation_id,created_at) VALUES ($1,clock_timestamp()-interval '40 days') RETURNING created_at",[id]);
    assert.ok(Date.now()-new Date(row.rows[0].created_at).getTime()<10000);
    await query('SELECT public.cleanup_idle_conversations()');assert.equal(await has('conversations',id),true);
  });
  await check('cleanup before send returns a clear error and never creates an orphan message',async()=>{
    const id=await conversation();await query('SELECT public.cleanup_idle_conversations()');
    await assert.rejects(query('INSERT INTO public.messages(conversation_id) VALUES ($1)',[id]),/CONVERSATION_NOT_FOUND/);
    assert.equal((await query('SELECT 1 FROM public.messages WHERE conversation_id=$1',[id])).rows.length,0);
  });
  await check('cascade error rolls back conversation and message deletion together',async()=>{
    const id=await conversation();const msg=await message(id,'31 days');
    await db.exec("CREATE FUNCTION fail_retention_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_DELETE_FAIL'; END $$; CREATE TRIGGER fail_retention_delete BEFORE DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION fail_retention_delete()");
    await assert.rejects(query('SELECT public.cleanup_idle_conversations()'),/TEST_DELETE_FAIL/);
    assert.equal(await has('conversations',id),true);assert.equal(await has('messages',msg),true);
    await db.exec('DROP TRIGGER fail_retention_delete ON public.messages; DROP FUNCTION fail_retention_delete()');
  });
  await check('public and authenticated clients cannot execute global cleanup',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      for(const name of ['cleanup_expired_launch_archives','cleanup_expired_notifications','cleanup_idle_conversations']) await assert.rejects(query(`SELECT public.${name}()`),/permission denied/);
      await db.exec('RESET ROLE');
    }
  });
  await check('scheduler replaces existing jobs without duplicates or immediate deletion',async()=>{
    // PGlite lacks pg_cron: simulate only its SQL registration API, not the scheduler itself.
    await db.exec(`CREATE SCHEMA cron; CREATE TABLE cron.job(jobid BIGSERIAL PRIMARY KEY,jobname TEXT,schedule TEXT,command TEXT);
      CREATE FUNCTION cron.schedule(TEXT,TEXT,TEXT) RETURNS BIGINT LANGUAGE sql AS $$ INSERT INTO cron.job(jobname,schedule,command) VALUES ($1,$2,$3) RETURNING jobid $$;
      CREATE FUNCTION cron.unschedule(BIGINT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$ BEGIN DELETE FROM cron.job WHERE jobid=$1; RETURN TRUE; END $$;
      INSERT INTO cron.job(jobname) VALUES ('kistas-notifications-retention-cleanup'),('kistas-notifications-retention-cleanup');`);
    const sql=read(schedule).replace('CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;','');
    const id=await conversation();await db.exec(sql);await db.exec(sql);
    const rows=(await query('SELECT * FROM cron.job')).rows;
    assert.equal(rows.length,3);assert.equal(new Set(rows.map(row=>row.jobname)).size,3);
    assert.equal(await has('conversations',id),true);
    assert.equal(rows.find(row=>row.jobname==='kistas-idle-conversations-cleanup').command,'SELECT public.cleanup_idle_conversations();');
  });
  const report={capturedAt:new Date().toISOString(),passed,failed:0,engine:'PGlite 0.5.8',serverVersion:(await query('SHOW server_version')).rows[0].server_version,
    migrationSha256:createHash('sha256').update(read(migration)).digest('hex'),scheduleSha256:createHash('sha256').update(read(schedule)).digest('hex'),productionDataWritten:false,
    limitations:['Minimal schema and synthetic auth roles; not live Supabase policies/triggers.','One PostgreSQL connection verifies send-before-cleanup and cleanup-before-send ordering; independent-connection lock races remain unverified.','Cron SQL registration API is simulated; actual pg_cron extension/timer execution requires production acceptance.']};
  fs.writeFileSync(new URL('../../reports/retention-postgres-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(`Retention: ${passed} scenarios passed; production scheduler and independent connections are separate acceptance checks.`);
} catch(error) { console.error('Retention test failed:',error.message,error.code||'');process.exitCode=1; }
finally { await db.close(); }
