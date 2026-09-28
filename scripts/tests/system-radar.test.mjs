import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeBundleBudget, evaluateRouteBudget, BROTLI_BUDGET_BYTES, estimateBrotli } from '../engine/bundle-budget.mjs';
import { inspectSources, summarizeChecks } from '../engine/system-health.mjs';
import { publicFixtureResponse, listing } from './public-workers-fixture.mjs';

const publicURL = 'https://fixture.supabase.co/rest/v1/listings';
assert.deepEqual(await (await publicFixtureResponse(new Request(publicURL))).json(), [listing]);
assert.equal((await publicFixtureResponse(new Request(`${publicURL}?id=eq.missing`))).status, 406);
assert.equal((await (await publicFixtureResponse(new Request(`${publicURL}?id=eq.${listing.id}`))).json()).id, listing.id);
await assert.rejects(publicFixtureResponse(new Request(publicURL, { method: 'POST' })), /Unmocked outbound/);
await assert.rejects(publicFixtureResponse(new Request('https://example.com/rest/v1/listings')), /Unmocked outbound/);
await assert.rejects(publicFixtureResponse(new Request('https://fixture.supabase.co/rest/v1/profiles')), /Unmocked public table/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kistas-m0-'));
try {
  assert.equal(analyzeBundleBudget(root).bundleFound, false);
  assert.equal(analyzeBundleBudget(root).isOverBudget, null);
  assert.equal(evaluateRouteBudget(10, BROTLI_BUDGET_BYTES + 1).status, 'warning');
  assert.equal(evaluateRouteBudget(null, 1).status, 'unmeasured');
  assert.equal(evaluateRouteBudget(-1, 1).status, 'unmeasured');
  assert.equal(evaluateRouteBudget(10, 1).status, 'passed');
  const chunk = path.join(root, 'apps/web/dist/client/_next/static/chunks/a.js');
  fs.mkdirSync(path.dirname(chunk), { recursive: true });
  fs.writeFileSync(chunk, 'export const fixture = 1;');
  const build = analyzeBundleBudget(root);
  assert.equal(build.builds[0].files, 1);
  assert.equal(build.builds[1].files, 0);
  assert.equal(build.builds[0].brotliBytes, estimateBrotli(fs.readFileSync(chunk)).length);
  assert.equal(build.isOverBudget, null);
  const source = path.join(root, 'packages/demo/src/index.ts');
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.writeFileSync(source, '// useState() : any\nconst text = "any";\nexport const value: any = useState();');
  const legacy = path.join(root, 'src/legacy.ts');
  fs.mkdirSync(path.dirname(legacy));
  fs.writeFileSync(legacy, 'const bad: any = 1;');
  const inspected = inspectSources(root);
  assert.equal(inspected.length, 1);
  assert.equal(inspected[0].anyTypes, 1);
  assert.equal(inspected[0].hooks, 1);
  assert.deepEqual(summarizeChecks([{ status: 'passed' }, { status: 'unmeasured' }]), { passed: 1, warning: 0, failed: 0, unmeasured: 1, total: 2, coveragePercent: 50, healthScore: 50 });
  assert.equal(summarizeChecks([]).healthScore, null);
  assert.throws(() => summarizeChecks([{ status: 'invented' }]));
  console.log('M0 radar: missing builds, compression, route budgets, AST scope and missing-evidence scoring passed.');
} finally {
  const target = path.resolve(root);
  const expectedParent = path.resolve(os.tmpdir());
  if (path.dirname(target) !== expectedParent || !path.basename(target).startsWith('kistas-m0-')) throw new Error('Unsafe fixture cleanup path');
  fs.rmSync(target, { recursive: true });
}
