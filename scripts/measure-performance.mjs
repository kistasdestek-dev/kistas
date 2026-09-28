import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { evaluateRouteBudget, estimateBrotli } from './engine/bundle-budget.mjs';

const root = path.resolve(import.meta.dirname, '..');
const phase = process.argv[2] || 'm1';
if (!['m0', 'm1', 'm2'].includes(phase)) throw new Error('Performance phase must be m0, m1 or m2');
const requireWeb = createRequire(path.join(root, 'apps/web/package.json'));
const { chromium, devices } = requireWeb('@playwright/test');
const baseURL = process.env.PERFORMANCE_BASE_URL || 'http://127.0.0.1:8788';
const controlledFixture = !process.env.PERFORMANCE_BASE_URL;
const server = controlledFixture ? spawn(process.execPath, ['scripts/tests/start-workers-test-server.mjs'], { cwd: root, env: { ...process.env, M0_TEST_PORT: '8788' }, stdio: ['ignore', 'pipe', 'pipe'] }) : null;
let serverFailure = false;
server?.once('exit', () => { serverFailure = true; });
server?.stderr.on('data', (chunk) => process.stderr.write(chunk));
server?.stdout.on('data', (chunk) => process.stdout.write(chunk));
let browser;
try {
  if (server) {
    const deadline = Date.now() + 30000;
    let ready = false;
    while (!ready && Date.now() < deadline && !serverFailure) {
      try { const response = await fetch(baseURL, { signal: AbortSignal.timeout(1000) }); ready = response.ok && (await response.text()).includes('M1 Yeni Proje'); } catch { /* startup */ }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error('Performance fixture server failed to start');
  }
  browser = await chromium.launch();
  const runs = [];
  for (let index = 0; index < 3; index++) {
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    const page = await context.newPage();
    const origin = new URL(baseURL).origin;
    await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1000 * 1000 / 8, uploadThroughput: 750 * 1000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const scripts = new Map();
    let collectScripts = true;
    const transfers = [];
    cdp.on('Network.loadingFinished', (event) => transfers.push(event.encodedDataLength));
    page.on('response', (response) => {
      if (collectScripts && response.request().resourceType() === 'script' && new URL(response.url()).origin === origin) scripts.set(response.url(), response.body().catch(() => null));
    });
    await page.addInitScript(() => {
      window.__m0 = { lcp: null, cls: 0, interactionDurations: [] };
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__m0.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__m0.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (entry.interactionId) window.__m0.interactionDurations.push(entry.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    });
    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (response?.status() !== 200) throw new Error(`Home returned ${response?.status()}`);
    await page.getByRole('heading', { name: 'Popüler Projeler', exact: true }).waitFor();
    await page.waitForTimeout(2000); // fixed observation window; never wait for third-party network idle
    const navigation = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { ...window.__m0, ttfbMs: nav.responseStart - nav.requestStart, domContentLoadedMs: nav.domContentLoadedEventEnd };
    });
    collectScripts = false;
    const encodedNetworkBytes = transfers.reduce((sum, size) => sum + size, 0);
    const results = await Promise.all([...scripts.values()]);
    if (results.some((body) => !body)) throw new Error('Initial script body could not be measured; baseline is incomplete');
    const bodies = results;
    const rawBytes = bodies.reduce((sum, body) => sum + body.length, 0);
    const brotliBytes = bodies.reduce((sum, body) => sum + estimateBrotli(body).length, 0);
    await page.getByRole('button', { name: 'Reddet', exact: true }).click();
    await page.waitForTimeout(200);
    const durations = await page.evaluate(() => window.__m0.interactionDurations);
    runs.push({ run: index + 1, ...navigation, observedInteractionMaxMs: durations.length ? Math.max(...durations) : null, initialJavaScript: { requests: scripts.size, rawBytes, estimatedBrotliBytes: brotliBytes, brotliQuality: 4, budget: evaluateRouteBudget(rawBytes, brotliBytes) }, observedEncodedNetworkBytes: encodedNetworkBytes });
    await context.close();
  }
  const median = (key) => { const values = runs.map((run) => run[key]).filter(Number.isFinite).sort((a, b) => a - b); return values.length ? values[Math.floor(values.length / 2)] : null; };
  const report = { capturedAt: new Date().toISOString(), environment: controlledFixture ? 'local Workers emulator, 74 fixture records including one pending review, external requests blocked' : 'explicit target, external requests blocked', target: new URL(baseURL).origin, browser: browser.version(), profile: { device: 'Pixel 5', cpuSlowdown: 4, latencyMs: 150, downloadMbps: 1.6, uploadKbps: 750, cache: 'disabled', runs: 3, observationWindow: 'public heading ready + 2000ms; before consent interaction' }, median: { lcpMs: median('lcp'), cls: median('cls'), ttfbMs: median('ttfbMs') }, runs, fieldINP: 'unmeasured; consent click Event Timing is a lab observation, not field INP', slowDatabaseQueries: 'unmeasured; fixture reads do not represent PostgreSQL execution', limitations: ['Synthetic device on this host; not real user performance.', 'JS includes scripts loaded within the observation window, including any prefetch.', 'Brotli is a local estimate, not actual CDN transfer.', 'Encoded bytes reflect local server responses, not production transport.', 'Fixed 74-record fixture is not a database capacity test.'] };
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  report.fixtureVersion = 'm1-74-records';
  fs.writeFileSync(path.join(root, `reports/${phase}-performance-baseline.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ median: report.median, initialJavaScript: runs.map((run) => run.initialJavaScript) }, null, 2));
} finally {
  await browser?.close();
  server?.kill();
}
