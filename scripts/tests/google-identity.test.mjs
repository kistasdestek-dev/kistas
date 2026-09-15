import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [button, authService, authExperience, headers] = await Promise.all([
  readFile('src/features/auth/presentation/GoogleIdentityButton.web.tsx', 'utf8'),
  readFile('src/features/auth/application/AuthService.ts', 'utf8'),
  readFile('src/features/auth/presentation/AuthExperience.tsx', 'utf8'),
  readFile('public/_headers', 'utf8'),
]);

assert.match(button, /https:\/\/accounts\.google\.com\/gsi\/client/, 'Resmi Google Identity betigi kullanilmiyor.');
assert.match(button, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/, 'Kriptografik Google nonce uretilmiyor.');
assert.match(button, /crypto\.subtle\.digest\('SHA-256'/, 'Google nonce SHA-256 ile baglanmiyor.');
assert.match(button, /use_fedcm_for_button:\s*true/, 'Google FedCM dugme akisi etkin degil.');
assert.match(authService, /signInWithIdToken\(\{[\s\S]*provider:\s*'google'[\s\S]*token,[\s\S]*nonce,/m, 'Google ID token Supabase tarafinda nonce ile dogrulanmiyor.');
assert.doesNotMatch(authExperience, /signInWithOAuth\(['"]google['"]\)/, 'Eski Supabase Google yonlendirmesi arayuzde kalmis.');
assert.match(headers, /script-src[^;]*https:\/\/accounts\.google\.com\/gsi\/client/, 'Google Identity betigi CSP allowlistinde degil.');
assert.match(headers, /frame-src[^;]*https:\/\/accounts\.google\.com\/gsi\//, 'Google Identity iframe CSP allowlistinde degil.');
assert.match(headers, /connect-src[^;]*https:\/\/accounts\.google\.com\/gsi\//, 'Google Identity baglantisi CSP allowlistinde degil.');

console.log('Google Identity token, nonce, FedCM and CSP checks passed.');
