import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getLegacyHashReplacement,
  isAuthCallbackHash,
  isAuthCallbackSearch,
  isCanaryQueryParam,
  isDecoyApiRoute,
  isRobotsCanaryPath,
  parseWebRouteLocation,
} from '../../src/core/navigation/webRouting.ts';

const root = resolve(import.meta.dirname, '../..');
const appSource = await readFile(resolve(root, 'App.tsx'), 'utf8');

assert.deepStrictEqual(parseWebRouteLocation('/how-it-works/', '', ''), {
  tab: 'discover', screen: 'how-it-works',
});
assert.deepStrictEqual(parseWebRouteLocation('/blog/ornek-yazi/', '', ''), {
  tab: 'discover', screen: 'blog', blogSlug: 'ornek-yazi',
});
assert.deepStrictEqual(
  parseWebRouteLocation('/showcase/', '?category=not-a-uuid&platform=Web', ''),
  { tab: 'discover', screen: 'showcase', categoryId: null, platform: 'Web' },
);
assert.deepStrictEqual(parseWebRouteLocation('/', '', '#/about'), {
  tab: 'discover', screen: 'about',
});
assert.equal(getLegacyHashReplacement('#/how-it-works'), '/how-it-works/');
assert.equal(getLegacyHashReplacement('#/blog/ornek-yazi'), '/blog/ornek-yazi/');
assert.equal(getLegacyHashReplacement('#/popular?platform=Web'), '/popular/?platform=Web');
assert.equal(getLegacyHashReplacement('#access_token=secret'), null);
assert.equal(getLegacyHashReplacement('#error_description=denied'), null);
assert.equal(isAuthCallbackHash('#refresh_token=secret'), true);
assert.equal(isAuthCallbackHash('#/profile'), false);
assert.equal(isAuthCallbackSearch('?code=pkce-code'), true);
assert.equal(isAuthCallbackSearch('?token_hash=recovery-token&type=recovery'), true);
assert.equal(isAuthCallbackSearch('?category=tools'), false);

// Aşama 2: robots.txt Canary Honeypot Route Tespiti
assert.equal(isRobotsCanaryPath('/admin-internal-audit-portal/'), true);
assert.equal(isRobotsCanaryPath('/kistas-secret-vault-backup'), true);
assert.equal(isRobotsCanaryPath('/api/v1/system-internal-probe/'), true);
assert.equal(isRobotsCanaryPath('/server-backup-archive'), true);
assert.equal(isRobotsCanaryPath('/private-core-telemetry/'), true);
assert.equal(isRobotsCanaryPath('/how-it-works/'), false);
assert.equal(isRobotsCanaryPath('/blog/ornek-yazi/'), false);
assert.equal(isRobotsCanaryPath('/'), false);

// Aşama 3: Sahte API Endpoint ve Canary Query Parametre Tespiti
assert.equal(isDecoyApiRoute('/api/v1/admin/users/export'), true);
assert.equal(isDecoyApiRoute('/api/v1/system/config-dump'), true);
assert.equal(isDecoyApiRoute('/api/v1/debug/sql-console'), true);
assert.equal(isDecoyApiRoute('/api/internal/secrets'), true);
assert.equal(isDecoyApiRoute('/blog/ornek-yazi/'), false);

assert.equal(isCanaryQueryParam('?admin_mode=true'), true);
assert.equal(isCanaryQueryParam('?bypass_auth=1&user=admin'), true);
assert.equal(isCanaryQueryParam('?sudo=1'), true);
assert.equal(isCanaryQueryParam('?ktst_dev_override=1'), true);
assert.equal(isCanaryQueryParam('?category=tools'), false);
assert.equal(isCanaryQueryParam('?platform=Web'), false);

assert.doesNotMatch(appSource, /addEventListener\(['"]hashchange/i, 'Eski hashchange router geri gelmemeli.');
assert.doesNotMatch(appSource, /location\.hash\s*=/i, 'Navigasyon hash yazmamalı.');
assert.doesNotMatch(appSource, /targetHash/i, 'Hash hedefi üretilmemeli.');
assert.match(appSource, /history\.pushState\(null, '', targetPath\)/, 'History API navigasyonu eksik.');
assert.match(appSource, /isAuthCallbackHash\(currentHash\)[\s\S]*isAuthCallbackSearch\(window\.location\.search\)/, 'OAuth ve kurtarma callback koruması eksik.');

console.log('Clean URL routing, legacy hash migration and auth callback protection checks passed.');
