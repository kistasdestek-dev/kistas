#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeBundleBudget } from './engine/bundle-budget.mjs';
import { inspectSources, summarizeChecks } from './engine/system-health.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !['--static', '--e2e', '--live', '--report'].includes(arg))) {
  throw new Error('Options: --static (no commands), --e2e (built Workers tests), --live (read-only CDN probe), --report (save reports/system-health.json). Automatic deletion/healing is disabled.');
}
const checks = [];
function record(name, status, evidence) {
  checks.push({ name, status, evidence });
  console.log(`[${status.toUpperCase()}] ${name}: ${typeof evidence === 'string' ? evidence : JSON.stringify(evidence)}`);
}
function command(name, command) {
  if (args.has('--static')) return record(name, 'unmeasured', '--static: command not executed');
  const result = spawnSync(command, { cwd: root, shell: true, stdio: 'inherit', timeout: 240000, env: process.env });
  record(name, result.status === 0 && !result.error ? 'passed' : 'failed', { command, exitCode: result.status, error: result.error?.message });
}
console.log('KISTAS monorepo system radar — read-only source inspection; build tools may update generated caches.');
const temporary = fs.readdirSync(root).filter((name) => /^\.tmp|scratch/i.test(name));
record('1 Disk inventory', temporary.length ? 'warning' : 'passed', { temporary, action: 'No files deleted. Review candidates individually; active tools may own these directories.' });
const sources = inspectSources(root);
record('2 Source coverage', sources.length ? 'passed' : 'failed', { files: sources.length, roots: ['apps/*/src', 'packages/*/src'], limitation: 'Inventory does not prove absence of dead code. Unused checks depend on workspace TypeScript/ESLint configuration.' });
const bundle = analyzeBundleBudget(root);
record('3 Build inventory', bundle.bundleFound ? 'warning' : 'unmeasured', { builds: bundle.builds, routeBudget: 'unmeasured — all chunks include lazy routes', explanation: bundle.statusText, assets: bundle.topHeavyAssets });
const oversized = sources.filter((source) => source.lines > 750 || source.hooks > 12);
record('4 Architecture', oversized.length ? 'warning' : 'passed', { oversized, explicitAnyTypes: sources.reduce((sum, source) => sum + source.anyTypes, 0), limitation: 'AST counts are maintainability indicators, not performance or security proof.' });
command('5 TypeScript and lint', 'pnpm exec turbo run type-check lint --force');
command('6 Deterministic regressions', 'pnpm exec turbo run test --force');
command('7 Security scanners', 'pnpm sayos:security');
record('Web/package SQL pattern coverage', 'unmeasured', 'Existing SQL scanner covers legacy src and Edge Functions/migrations. Expand and triage web/package rules during M3. Pattern scans are not pentest/RLS proof; repo secret scanner covers staged/tracked files.');
if (args.has('--e2e')) command('8 Workers browser integration', 'pnpm test:e2e');
else record('8 Workers browser integration', 'unmeasured', 'Run --e2e after build:vinext. Live RLS, OAuth/payment and concurrency are outside these public fixture tests.');
if (args.has('--live')) {
  for (const endpoint of ['/', '/api/og?id=default', '/api/badge/demo-project-id?theme=dark']) {
    try {
      const observations = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(`https://www.kistas.com.tr${endpoint}`, { signal: AbortSignal.timeout(10000) });
        const bytes = await response.arrayBuffer();
        observations.push({ httpStatus: response.status, edgeCache: response.headers.get('cf-cache-status'), browserPolicy: response.headers.get('cache-control'), bytes: bytes.byteLength });
      }
      const status = observations.some((item) => item.httpStatus !== 200) ? 'failed' : observations.some((item) => item.edgeCache === 'HIT') ? 'passed' : 'warning';
      record(`CDN ${endpoint}`, status, { observations, limitation: 'Two reads; no invalidation or user-isolation proof.' });
    } catch (error) { record(`CDN ${endpoint}`, 'failed', error.message); }
  }
} else record('Live infrastructure', 'unmeasured', 'Not contacted. --live checks public CDN reads; it does not test RLS.');
record('RUM INP and slow DB queries', 'unmeasured', 'Requires field telemetry and database query statistics. Local lab results are separate.');
const summary = summarizeChecks(checks);
if (args.has('--report')) {
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(root, 'reports/system-health.json'), JSON.stringify({ capturedAt: new Date().toISOString(), options: [...args], summary, checks }, null, 2) + '\n');
}
console.log(`Health Score: ${summary.healthScore}/100; coverage: ${summary.coveragePercent}%; ${JSON.stringify(summary)}. Missing evidence never counts as success. This is a check score, not a production readiness certificate.`);
if (summary.failed) process.exitCode = 1;
