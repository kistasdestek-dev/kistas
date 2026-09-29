import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { publicFixtureResponse } from './public-workers-fixture.mjs';
import { privateLaunchFixtureResponse } from './private-launch-fixture.mjs';

// Hermetic Next.js production tests; no outbound fallback to live Supabase.
const webRoot = resolve(import.meta.dirname, '../../apps/web');
const requireWeb = createRequire(resolve(webRoot, 'package.json'));
const next = requireWeb('next');
const port = Number(process.env.SPONSOR_TEST_PORT || 8791);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.hostname === '127.0.0.1' && url.port === String(port)) return originalFetch(input, init);
  const privateResponse = await privateLaunchFixtureResponse(request);
  return privateResponse ?? publicFixtureResponse(request);
};
const app = next({ dev: false, dir: webRoot, hostname: '127.0.0.1', port });
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((request, response) => { void handler(request, response); });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
console.log(`Next fixture server ready: http://127.0.0.1:${port}`);
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await app.close();
}
process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
