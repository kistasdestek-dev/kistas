import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '../..');
const suites = {
  shared: [
    'core-domain.test.mjs',
    'system-radar.test.mjs',
  ],
  supabase: [
    'retention-cleanup.test.mjs',
    'launch-atomic.test.mjs',
    'discovery-query.test.mjs',
    'disaster-recovery-and-keys.test.mjs',
    'field-level-encryption.test.mjs',
    'kvkk-pci-compliance.test.mjs',
    'session-jwt-hardening.test.mjs',
    'shopier-credit-webhook.test.mjs',
  ],
  ui: [
    'footer-system.test.mjs',
    'global-scroll-progress.test.mjs',
    'image-optimization.test.mjs',
    'typography-system.test.mjs',
  ],
  web: [
    'route-navigation.test.mjs',
    'web-admin-center.test.mjs',
    'web-discovery-citrus-glass.test.mjs',
    'web-project-logo-shape.test.mjs',
    'web-listing-review-flow.test.mjs',
    'analytics-consent.test.mjs',
    'chat-keyboard-viewport.test.mjs',
    'chat-presence-and-admin-announcements.test.mjs',
    'chat-identity.test.mjs',
    'google-identity.test.mjs',
    'inbox-lifecycle-and-notifications.test.mjs',
    'next-csp-environment.test.mjs',
    'profile-avatar-flow.test.mjs',
    'project-detail-performance.test.mjs',
    'public-route-performance.test.mjs',
    'route-loading.test.mjs',
    'seo-output.test.mjs',
    'web-routing.test.mjs',
    'web-credit-store.test.mjs',
    'web-credit-history-modal.test.mjs',
    'web-visibility-management.test.mjs',
    'sponsor-refresh.test.mjs',
    'sponsor-purchase.test.mjs',
  ],
  live: [
    'pars-defender-live.test.mjs',
  ],
};

const suiteName = process.argv[2];
const testFiles = suites[suiteName];

if (!testFiles) {
  console.error(`Unknown test suite: ${suiteName ?? '(missing)'}`);
  console.error(`Available suites: ${Object.keys(suites).join(', ')}`);
  process.exit(1);
}

console.log(`Running ${suiteName} suite (${testFiles.length} files)...`);

for (const testFile of testFiles) {
  const testPath = resolve(import.meta.dirname, testFile);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', testPath], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Unable to start ${testFile}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${suiteName} suite failed at ${testFile}.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`${suiteName} suite passed (${testFiles.length}/${testFiles.length} files).`);
