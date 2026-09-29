import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'kistas-sponsor-purchase-'));
const db=new PGlite();
const userA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const project='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const read=file=>fs.readFileSync(new URL(`../../${file}`,import.meta.url),'utf8');
function compile(name,source) {
  const target=path.join(root,`${name}.mjs`);
  fs.writeFileSync(target,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
  return pathToFileURL(target).href;
}
try {
  await db.exec(`CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
    CREATE TYPE public.credit_tx_type AS ENUM ('spend_boost');
    CREATE TABLE public.profiles(id UUID PRIMARY KEY, boost_credits INTEGER, updated_at TIMESTAMPTZ);
    CREATE TABLE public.listings(id UUID PRIMARY KEY,seller_id UUID,title TEXT,status TEXT,boosted_until TIMESTAMPTZ,category_boosted_until TIMESTAMPTZ,updated_at TIMESTAMPTZ);
    CREATE TABLE public.credit_transactions(user_id UUID,amount INTEGER,balance_after INTEGER,type public.credit_tx_type,description TEXT,metadata JSONB,created_at TIMESTAMPTZ);
  `);
  const migration=read('supabase/migrations/20260916000006_credit_ledger_details.sql');
  const start=migration.indexOf('CREATE OR REPLACE FUNCTION public.boost_listing_scoped(');
  await db.exec(migration.slice(start,migration.indexOf('REVOKE ALL ON FUNCTION public.boost_listing_scoped',start)));
  await db.query('INSERT INTO public.profiles(id,boost_credits) VALUES ($1,5000),($2,5000)',[userA,userB]);
  await db.query("INSERT INTO public.listings(id,seller_id,title,status) VALUES ($1,$2,'Test Proje','active')",[project,userA]);
  const visibility=compile('visibility',read('apps/web/src/lib/visibility.ts'));
  const server=compile('server','let client; export function setClient(value){client=value} export async function createClient(){return client}');
  const {setClient}=await import(server);
  const {purchaseSponsorAction}=await import(compile('action',read('apps/web/src/app/actions/sponsors.ts')
    .replace("'@/lib/supabase/server'",JSON.stringify(server)).replace("'@/lib/visibility'",JSON.stringify(visibility))));
  let actor=null, rpcCalls=0, override=false;
  const rpc=async (listingId,scope,hours,cost)=>{
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actor||'']);
    return (await db.query('SELECT public.boost_listing_scoped($1::uuid,$2::text,$3::integer,$4::integer) AS result',[listingId,scope,hours,cost])).rows[0].result;
  };
  setClient({auth:{getUser:async()=>({data:{user:actor ? {id:actor} : null},error:null})},
    rpc:async(name,input)=>{
      assert.equal(name,'boost_listing_scoped'); rpcCalls++;
      try {return {data:await rpc(input.p_listing_id,input.p_scope,input.p_duration_hours,input.p_credit_cost),error:null};}
      catch(error){return {data:null,error:{message:override ? 'private database detail' : error.message}};}
    },
  });
  const balance=async user=>(await db.query('SELECT boost_credits FROM public.profiles WHERE id=$1',[user])).rows[0].boost_credits;
  const ledger=async()=>(await db.query('SELECT * FROM public.credit_transactions')).rows;
  assert.equal((await purchaseSponsorAction(project,'global-24')).success,false);
  assert.equal(rpcCalls,0,'Unauthenticated action must not call RPC');
  await assert.rejects(rpc(project,'global',24,200),/UNAUTHORIZED/);
  actor=userA;
  assert.equal((await purchaseSponsorAction(project,'global-24-cheap')).success,false);
  assert.equal((await purchaseSponsorAction('bad','global-24')).success,false);
  assert.equal(rpcCalls,0);
  await assert.rejects(rpc(project,'global',24,50),/INVALID_BOOST_PACKAGE/);
  await assert.rejects(rpc(project,'invalid',24,200),/INVALID_SCOPE/);
  actor=userB;
  assert.equal((await purchaseSponsorAction(project,'global-24')).success,false);
  assert.equal(await balance(userB),5000); assert.equal((await ledger()).length,0);
  actor=userA;
  const first=await purchaseSponsorAction(project,'category-24');
  assert.equal(first.success,true); assert.equal(first.newCredits,4950); assert.equal(first.scope,'category');
  assert.equal((await db.query('SELECT boosted_until FROM public.listings')).rows[0].boosted_until,null);
  const second=await purchaseSponsorAction(project,'category-72');
  assert.equal(second.success,true); assert.equal(second.newCredits,4830);
  assert.equal(Date.parse(second.expiresAt)-Date.parse(first.expiresAt),72*3600000,'Extension starts at the existing expiry');
  const global=await purchaseSponsorAction(project,'global-24');
  assert.equal(global.success,true); assert.equal(global.newCredits,4630);
  const transactions=await ledger();
  assert.equal(transactions.length,3); assert.deepEqual(transactions.map(row=>row.amount),[-50,-120,-200]);
  assert.equal(transactions[0].metadata.listing_id,project); assert.equal(transactions[0].metadata.scope,'category');
  await db.query('UPDATE public.profiles SET boost_credits=10 WHERE id=$1',[userA]);
  assert.equal((await purchaseSponsorAction(project,'global-24')).success,false);
  assert.equal(await balance(userA),10); assert.equal((await ledger()).length,3);
  await db.query('UPDATE public.profiles SET boost_credits=5000 WHERE id=$1',[userA]);
  await db.exec("UPDATE public.listings SET status='inactive'");
  assert.equal((await purchaseSponsorAction(project,'global-24')).success,false);
  assert.equal(await balance(userA),5000); assert.equal((await ledger()).length,3);
  override=true;
  const generic=await purchaseSponsorAction(project,'global-24');
  assert.equal(generic.success,false); assert.ok(!generic.error.includes('private database detail'));
  console.log('Sponsor purchase: server package selection, authenticated RPC, real PostgreSQL ownership/status/price/balance rejection, independent scopes, extension and atomic ledger passed. Synthetic auth / single-connection PGlite; not live Supabase concurrency proof.');
} finally {
  await db.close();
  const target=path.resolve(root);
  if(path.dirname(target)!==path.resolve(os.tmpdir()) || !path.basename(target).startsWith('kistas-sponsor-purchase-')) throw new Error('Unsafe fixture cleanup');
  fs.rmSync(target,{recursive:true});
}
