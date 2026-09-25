import assert from 'node:assert/strict';
import { createContentSecurityPolicy } from '../../apps/web/next.config.ts';

const developmentPolicy = createContentSecurityPolicy(true);
const productionPolicy = createContentSecurityPolicy(false);

assert.match(
  developmentPolicy,
  /script-src[^;]*'unsafe-eval'/,
  'React/Turbopack development debugging requires unsafe-eval on localhost.',
);
assert.doesNotMatch(
  productionPolicy,
  /'unsafe-eval'/,
  'Production CSP must never permit unsafe-eval.',
);
assert.match(developmentPolicy, /'wasm-unsafe-eval'/);
assert.match(productionPolicy, /'wasm-unsafe-eval'/);

console.log('Environment-scoped Next.js CSP checks passed.');
