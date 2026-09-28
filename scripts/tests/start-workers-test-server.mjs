import { publicFixtureResponse } from './public-workers-fixture.mjs';
import { privateLaunchFixtureResponse } from './private-launch-fixture.mjs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');
const webRequire = createRequire(resolve(root, 'apps/web/package.json'));
const wranglerRequire = createRequire(webRequire.resolve('wrangler'));
const { unstable_getMiniflareWorkerOptions } = await import(pathToFileURL(webRequire.resolve('wrangler')).href);
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire('miniflare');
const config = resolve(root, 'apps/web/dist/server/wrangler.json');
if (!existsSync(config)) throw new Error('Workers build missing. Run pnpm --filter @kistas/web build:vinext first.');

async function outbound(request) {
  const privateResponse = await privateLaunchFixtureResponse(request);
  if (privateResponse) return privateResponse;
  const url = new URL(request.url);
  if (request.method === 'GET' && url.hostname === 'fonts.googleapis.com') return new Response('@font-face { font-family: Test; src: url(https://fonts.gstatic.com/m0.ttf); }', { headers: { 'content-type': 'text/css' } });
  if (request.method === 'GET' && url.hostname === 'fonts.gstatic.com') return new Response(readFileSync(webRequire.resolve('next/dist/compiled/@vercel/og/Geist-Regular.ttf')), { headers: { 'content-type': 'font/ttf' } });
  if (request.method === 'GET' && url.hostname === 'cdn.jsdelivr.net' && url.pathname === '/gh/twitter/twemoji@14.0.2/assets/svg/1f680.svg') return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="#38bdf8" d="M12 0L24 24H0Z"/></svg>', { headers: { 'content-type': 'image/svg+xml' } });
  return publicFixtureResponse(request);
}

const serverRoot = resolve(root, 'apps/web/dist/server');
const options = unstable_getMiniflareWorkerOptions(config);
delete options.workerOptions.modulesRules;
const files = readdirSync(serverRoot, { recursive: true }).filter((file) => file.endsWith('.js'));
const modules = ['index.js', ...files.filter((file) => file !== 'index.js')].map((file) => ({
  type: 'ESModule', path: resolve(serverRoot, file), contents: readFileSync(resolve(serverRoot, file), 'utf8'),
}));
for (const file of readdirSync(serverRoot, { recursive: true }).filter((file) => /\.(wasm|bin)$/.test(file))) {
  modules.push({ type: file.endsWith('.wasm') ? 'CompiledWasm' : 'Data', path: resolve(serverRoot, file), contents: readFileSync(resolve(serverRoot, file)) });
}
const converted = convertV4MiniflareOptions({ host: '127.0.0.1', port: Number(process.env.M0_TEST_PORT || 8787), workers: [{
  ...options.workerOptions, bindings: {}, name: 'kistas-m0', modules, modulesRoot: serverRoot, outboundService: outbound,
}] });
converted.workers[0].config.exports = JSON.parse(readFileSync(config, 'utf8')).exports;
const worker = new Miniflare(converted);
const address = await worker.ready;
const response = await fetch(address);
const html = await response.text();
if (response.status !== 200 || !html.includes('M1 Yeni Proje')) {
  await worker.dispose();
  throw new Error(`Hermetic Workers readiness failed: HTTP ${response.status}, fixture missing. No live-data fallback allowed.`);
}
console.log(`Workers fixture server ready: ${address}`);
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  await worker.dispose();
}
process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
