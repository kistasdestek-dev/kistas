import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SHOPIER_CREDIT_PACKAGES,
  decodeShopierPayload,
  extractEmail,
  normalizeShopierCurrency,
  parsePriceMinor,
  resolveShopierCreditPackage,
  verifyShopierOsbSignature,
} from '../../supabase/functions/shopier-credit-webhook/shopier-osb.ts';

const username = 'kistas-osb-user';
const password = 'test-only-osb-password';
const payload = {
  orderid: 'ORDER_123',
  productid: '50900401',
  currency: 'TRY',
  price: '699.00',
  email: 'USER@EXAMPLE.COM',
};
const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
const encoder = new TextEncoder();
const key = await crypto.subtle.importKey(
  'raw',
  encoder.encode(password),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
);
const signature = await crypto.subtle.sign(
  'HMAC',
  key,
  encoder.encode(`${encodedPayload}${username}`)
);
const hash = Buffer.from(signature).toString('hex');

assert.equal(await verifyShopierOsbSignature(encodedPayload, hash, username, password), true);
const tamperedHash = `${hash.slice(0, -1)}${hash.endsWith('0') ? '1' : '0'}`;
assert.equal(
  await verifyShopierOsbSignature(encodedPayload, tamperedHash, username, password),
  false
);
assert.deepEqual(decodeShopierPayload(encodedPayload), payload);
assert.equal(parsePriceMinor('699.00'), 69_900);
assert.equal(parsePriceMinor('699,00'), 69_900);
assert.equal(parsePriceMinor('699.001'), null);
assert.equal(normalizeShopierCurrency(0), 'TRY');
assert.equal(normalizeShopierCurrency('0'), 'TRY');
assert.equal(normalizeShopierCurrency('TRY'), 'TRY');
assert.equal(normalizeShopierCurrency(1), 'USD');
assert.equal(normalizeShopierCurrency(2), 'EUR');
assert.equal(extractEmail('Hesap: USER@EXAMPLE.COM'), 'user@example.com');
assert.deepEqual(SHOPIER_CREDIT_PACKAGES['50900401'], {
  credits: 750,
  priceMinor: 69_900,
  currency: 'TRY',
});
assert.deepEqual(resolveShopierCreditPackage('50900401', 69_900, 'TRY'), {
  credits: 750,
  priceMinor: 69_900,
  currency: 'TRY',
});
assert.equal(resolveShopierCreditPackage('50900373', 30_000, 'TRY'), null);
assert.equal(resolveShopierCreditPackage('50900419', 169_900, 'TRY'), null);
assert.equal(resolveShopierCreditPackage('50900373', 29_900, 'USD'), null);

const webhookSource = await readFile(
  new URL('../../supabase/functions/shopier-credit-webhook/index.ts', import.meta.url),
  'utf8'
);
assert.match(webhookSource, /SHOPIER_OSB_USERNAME/);
assert.match(webhookSource, /SHOPIER_OSB_PASSWORD/);
assert.doesNotMatch(webhookSource, /productName|price\s*>?=/);
assert.match(webhookSource, /apply_shopier_credit_event_by_email/);
assert.doesNotMatch(webhookSource, /\.from\(['"]profiles['"]\)[\s\S]*\.eq\(['"]email['"]/);

const emailLookupMigration = await readFile(
  new URL(
    '../../supabase/migrations/20260916000003_shopier_credit_email_lookup.sql',
    import.meta.url
  ),
  'utf8'
);
assert.match(emailLookupMigration, /FROM auth\.users/);
assert.match(emailLookupMigration, /email_confirmed_at IS NOT NULL/);
assert.match(emailLookupMigration, /apply_shopier_credit_event\(/);

const cleanupMigration = await readFile(
  new URL(
    '../../supabase/migrations/20260916000004_shopier_one_time_test_cleanup.sql',
    import.meta.url
  ),
  'utf8'
);
assert.match(cleanupMigration, /DROP TABLE IF EXISTS public\.shopier_credit_test_slots/);

const notificationMigration = await readFile(
  new URL(
    '../../supabase/migrations/20260916000005_shopier_credit_notification.sql',
    import.meta.url
  ),
  'utf8'
);
assert.match(notificationMigration, /INSERT INTO public\.notifications/);
assert.match(notificationMigration, /'credit_purchase'/);
assert.match(notificationMigration, /'balance_after', v_new_credits/);
assert.match(notificationMigration, /IF v_inserted_event_id IS NULL[\s\S]*RETURN jsonb_build_object\('success', TRUE, 'duplicate', TRUE\);[\s\S]*INSERT INTO public\.notifications/);

const creditLedgerMigration = await readFile(
  new URL(
    '../../supabase/migrations/20260916000006_credit_ledger_details.sql',
    import.meta.url
  ),
  'utf8'
);
assert.match(creditLedgerMigration, /ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL/);
assert.match(creditLedgerMigration, /'amount_minor', p_amount_minor/);
assert.match(creditLedgerMigration, /'currency', p_currency/);
assert.match(creditLedgerMigration, /SET search_path = ''/);
assert.match(creditLedgerMigration, /REVOKE ALL ON FUNCTION public\.apply_shopier_credit_event[\s\S]*FROM PUBLIC, anon, authenticated/);

const repricingMigration = await readFile(
  new URL(
    '../../supabase/migrations/20260927000002_reprice_credit_store.sql',
    import.meta.url
  ),
  'utf8'
);
assert.match(repricingMigration, /\('50900373'::TEXT, 250, 29900\)/);
assert.match(repricingMigration, /\('50900401'::TEXT, 750, 69900\)/);
assert.match(repricingMigration, /\('50900419'::TEXT, 2000, 149900\)/);
assert.match(repricingMigration, /SET search_path = ''/);
assert.match(repricingMigration, /ON CONFLICT \(provider_order_id\) DO NOTHING/);
assert.match(repricingMigration, /ORDER_REPLAY_MISMATCH/);
assert.match(repricingMigration, /REVOKE ALL ON FUNCTION public\.apply_shopier_credit_event[\s\S]*FROM PUBLIC, anon, authenticated/);
assert.match(repricingMigration, /WHEN 'kistas_credits_250' THEN 250/);
assert.match(repricingMigration, /WHEN 'kistas_credits_750' THEN 750/);
assert.match(repricingMigration, /WHEN 'kistas_credits_2000' THEN 2000/);
assert.match(repricingMigration, /EVENT_REPLAY_MISMATCH/);
assert.match(repricingMigration, /REVOKE ALL ON FUNCTION public\.apply_revenuecat_credit_event[\s\S]*FROM PUBLIC, anon, authenticated/);

console.log('Shopier webhook signature, strict product and atomic RPC checks passed.');
