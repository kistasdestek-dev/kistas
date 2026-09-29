import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kistas-sponsors-'));
const sharedURL = new URL('../../packages/shared/src/discovery.ts', import.meta.url).href;
const read = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
function compile(name, source) {
  const target = path.join(root, `${name}.mjs`);
  fs.writeFileSync(target, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText);
  return pathToFileURL(target).href;
}
const settle = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
try {
  const { startSponsorRefresh } = await import(compile('refresh', read('apps/web/src/lib/sponsor-refresh.ts').replace("'@kistas/shared'", JSON.stringify(sharedURL))));
  const start = Date.parse('2026-09-29T12:59:50Z');
  const card = { id:'a', category_id:'cat', boosted_until:new Date(start+30000).toISOString(), category_boosted_until:null };
  function harness(initial = { items:[card], timestamp:start }) {
    let elapsed = 0, visible = true, sequence = 0;
    const timers = new Map(), requests = [], updates = [];
    const controller = startSponsorRefresh({ initial, categoryId:null, clock:()=>elapsed, visible:()=>visible,
      schedule:(callback, delay)=>{ const id=++sequence; timers.set(id,{callback,due:elapsed+delay}); return id; },
      cancel:id=>timers.delete(id), publish:items=>updates.push(items),
      request:signal=>new Promise((resolve,reject)=>requests.push({signal,resolve,reject})),
    });
    return { controller, requests, updates, timers,
      response:(index,items=[card])=>requests[index].resolve({items,timestamp:start+elapsed}),
      async tick(ms) {
        const end=elapsed+ms;
        while (true) {
          const next=[...timers].sort((a,b)=>a[1].due-b[1].due)[0];
          if (!next || next[1].due>end) break;
          elapsed=next[1].due; timers.delete(next[0]); next[1].callback(); await settle();
        }
        elapsed=end; await settle();
      },
      visibility:value=>{ visible=value; controller.visibilityChanged(); },
    };
  }
  const clock=harness();
  assert.equal(clock.requests.length,1);
  assert.equal(clock.controller.refresh(),clock.controller.refresh(), 'Concurrent refreshes must share the same promise');
  clock.response(0); await settle();
  await clock.tick(10000);
  assert.equal(clock.requests.length,2,'Refresh at hour boundary');
  await clock.tick(20000);
  assert.equal(clock.requests.length,2,'No second concurrent request even at expiry');
  assert.deepEqual(clock.updates.at(-1),[],'Expiry removes a card during a slow request');
  clock.requests[1].reject(new Error('offline')); await settle();
  assert.deepEqual(clock.updates.at(-1),[],'Failed fetch cannot restore expired cards');
  await clock.tick(60000); assert.equal(clock.requests.length,3,'Retry after failure');
  clock.controller.stop();
  assert.ok(clock.requests[2].signal.aborted); assert.equal(clock.timers.size,0);
  clock.response(2); await settle(); assert.deepEqual(clock.updates.at(-1),[],'Disposed scope must ignore late success');

  const longCard={...card,boosted_until:new Date(start+3600000).toISOString()};
  const background=harness({items:[longCard],timestamp:start});
  background.response(0,[longCard]); await settle();
  background.visibility(false); await background.tick(120000);
  assert.equal(background.requests.length,1,'Background tabs do not poll');
  background.visibility(true); assert.equal(background.requests.length,2,'Returning to visible refreshes immediately');
  background.controller.invalidate(); background.controller.invalidate();
  background.response(1,[longCard]); await settle();
  assert.equal(background.requests.length,3,'Purchase events during a fetch coalesce to one fresh follow-up');
  background.requests[2].reject(new Error('offline')); await settle();
  assert.equal(background.updates.at(-1)[0].id,longCard.id,'Failure keeps a valid card');
  await background.tick(60000); assert.equal(background.requests.length,4,'Visible polling every 60s');
  background.controller.stop(); background.requests[3].reject(new Error('aborted')); await settle();

  const catOnly={...card,boosted_until:null,category_boosted_until:new Date(start+30000).toISOString()};
  const wrongScope=harness({items:[catOnly],timestamp:start});
  assert.deepEqual(wrongScope.updates.at(-1),[],'Category-only cards do not survive in the general scope');
  wrongScope.controller.stop(); wrongScope.response(0); await settle();

  const queries=compile('route-queries', 'export let fail=false; export function setFail(value){fail=value} export function createAnonClient(){return {}} export async function getSponsoredDiscovery(client,state,now,limit){if(fail)throw new Error("private details"); return [{state,limit}]}');
  const {setFail}=await import(queries);
  const {GET}=await import(compile('route',read('apps/web/src/app/api/discovery/sponsors/route.ts').replace("'@kistas/shared'",JSON.stringify(sharedURL)).replace("'@kistas/supabase'",JSON.stringify(queries))));
  const response=await GET(new Request('https://kistas.test/api/discovery/sponsors?platform=Web'));
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json(); assert.equal(body.items[0].limit,12); assert.ok(Number.isFinite(body.timestamp));
  for (const query of ['platform=bad','category=bad','q=a&q=b','q='+ 'a'.repeat(101),'sort=bad']) {
    const bad=await GET(new Request('https://kistas.test/api/discovery/sponsors?'+query));
    assert.equal(bad.status,400); assert.equal(bad.headers.get('cache-control'),'no-store');
  }
  setFail(true);
  const failure=await GET(new Request('https://kistas.test/api/discovery/sponsors'));
  assert.equal(failure.status,503); assert.deepEqual(await failure.json(),{error:'SPONSORS_UNAVAILABLE'});
  console.log('Sponsor refresh: deadlines, expiry in-flight, coalescing, purchase invalidation, hidden tabs, retry, stale scope cleanup and endpoint validation passed.');
} finally {
  const target=path.resolve(root);
  if(path.dirname(target)!==path.resolve(os.tmpdir()) || !path.basename(target).startsWith('kistas-sponsors-')) throw new Error('Unsafe fixture cleanup');
  fs.rmSync(target,{recursive:true});
}
