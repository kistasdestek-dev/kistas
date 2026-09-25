import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const modal = read('apps/web/src/components/profile/VisibilityManagementModal.tsx');
const visibility = read('apps/web/src/lib/visibility.ts');
const rpcMigration = read('supabase/migrations/20260916000006_credit_ledger_details.sql');

assert.match(modal, /supabase\.rpc\('boost_listing_scoped'/, 'Vitrin işlemi güvenli RPC üzerinden yürümeli');
assert.doesNotMatch(modal, /\.from\('listings'\)[\s\S]{0,120}\.update\(/, 'İstemci sponsor alanlarını doğrudan güncellememeli');
assert.match(modal, /ShinyButton/, 'Ana eylem Kıstas Glass Buton kullanmalı');
assert.match(modal, /GlassIconButton/, 'Başlık Kıstas ikon sistemini kullanmalı');
assert.match(modal, /k-modal-glass-card/, 'Modal ortak Kıstas glass yüzeyini kullanmalı');
assert.match(modal, /AutoTransparentLogo[\s\S]*drop-shadow/, 'Proje logosu arka çerçevesiz gösterilmeli');

for (const [hours, credits] of [[24, 50], [72, 120], [168, 250], [24, 200], [72, 450], [168, 900]]) {
  assert.match(visibility, new RegExp(`durationHours: ${hours},\\s+creditCost: ${credits}`));
  assert.match(rpcMigration, new RegExp(`p_duration_hours = ${hours} AND p_credit_cost = ${credits}`));
}

assert.match(rpcMigration, /FOR UPDATE[\s\S]*UPDATE public\.profiles[\s\S]*UPDATE public\.listings[\s\S]*INSERT INTO public\.credit_transactions/,
  'Kredi ve sponsorluk işlemi atomik RPC akışında kalmalı');

console.log('Web visibility management design and secure purchase contracts passed.');
