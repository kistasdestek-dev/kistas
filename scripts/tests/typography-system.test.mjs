import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '../..');
const [tokens, globals] = await Promise.all([
  readFile(resolve(projectRoot, 'packages/ui/src/tokens.ts'), 'utf8'),
  readFile(resolve(projectRoot, 'apps/web/src/app/globals.css'), 'utf8'),
]);

assert.match(tokens, /typography:\s*\{\s*kistas:\s*\{/, 'Ortak Kistas tipografi tokeni eksik.');
assert.match(tokens, /fontSize:\s*12\b/, 'Kistas tipografi boyutu 12 px standardinda degil.');
assert.match(tokens, /fontWeight:\s*['"]600['"]/, 'Kistas tipografi agirligi 600 standardinda degil.');
assert.match(tokens, /letterSpacing:\s*-0\.1\b/, 'Kistas harf araligi -0.1 standardinda degil.');
assert.match(
  globals,
  /--font-kistas:\s*system-ui,\s*-apple-system,\s*BlinkMacSystemFont,[^;]+;/,
  'Web sistem font zinciri eksik.',
);
assert.doesNotMatch(globals, /font-family:\s*(?:Georgia|Inter)(?:\s|,|;)/i, 'Web kaynaklarinda standart disi font ailesi var.');

console.log('Kistas monorepo typography contract checks passed.');
