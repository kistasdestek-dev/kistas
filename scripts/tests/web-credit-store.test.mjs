import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CREDIT_STORE_PLANS } from '../../apps/web/src/lib/creditStore.ts';
import { SHOPIER_CREDIT_PACKAGES } from '../../supabase/functions/shopier-credit-webhook/shopier-osb.ts';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
const page = read('apps/web/src/app/(dashboard)/credits/page.tsx');
const store = read('apps/web/src/components/credits/CreditStoreExperienceClient.tsx');
const dock = read('apps/web/src/components/KistasGlassDock.tsx');
const profile = read('apps/web/src/components/ProfileExperienceClient.tsx');
const contracts = read('src/features/credits/application/CreditPurchaseContracts.ts');
const middleware = read('apps/web/src/lib/supabase/middleware.ts');
const proxy = read('apps/web/src/proxy.ts');
const globalStyles = read('apps/web/src/app/globals.css');
const routeFooter = read('apps/web/src/components/RouteAwareFooter.tsx');

assert.deepEqual(
  CREDIT_STORE_PLANS.map(({ credits, priceTRY, amountMinor }) => ({ credits, priceTRY, amountMinor })),
  [
    { credits: 250, priceTRY: 299, amountMinor: 29_900 },
    { credits: 750, priceTRY: 699, amountMinor: 69_900 },
    { credits: 2_000, priceTRY: 1_499, amountMinor: 149_900 },
  ],
);

for (const plan of CREDIT_STORE_PLANS) {
  assert.deepEqual(SHOPIER_CREDIT_PACKAGES[plan.shopierProductId], {
    credits: plan.credits,
    priceMinor: plan.amountMinor,
    currency: 'TRY',
  });
}

assert.match(page, /requireUser\(\)/, 'Kredi mağazası oturum gerektirmeli');
assert.match(middleware, /'\/credits'/, 'Kredi mağazası edge katmanında korunmalı');
assert.match(proxy, /'\/credits\/:path\*'/, 'Kredi mağazası proxy eşleştiricisine dahil edilmeli');
assert.match(page, /getOwnProfile/, 'Bakiye sunucuda hesap sahibinden okunmalı');
assert.match(store, /\.from\('credit_transactions'\)/, 'Ödeme sonucu güvenli kredi hareketinden doğrulanmalı');
assert.match(store, /transaction\.metadata\?\.product_id === selectedPlan\.shopierProductId/);
assert.match(store, /Number\(transaction\.metadata\?\.amount_minor\) === selectedPlan\.amountMinor/);
assert.match(store, /window\.setInterval[\s\S]*5_000/, 'Ödeme kontrolü beş saniyelik sınırlı polling kullanmalı');
assert.match(store, /attempts >= 24/, 'Polling iki dakika sonra sonlanmalı');
assert.match(store, /document\.body\.style\.position|body\.style\.position = 'fixed'/, 'Mobil checkout arka planı kilitlemeli');
assert.match(store, /body\.classList\.add\('k-credit-checkout-open'\)/, 'Checkout açıldığında mobil dock gizlenmeli');
assert.match(store, /body\.classList\.remove\('k-credit-checkout-open'\)/, 'Checkout kapanırken dock durumu temizlenmeli');
assert.match(globalStyles, /body\.k-credit-checkout-open \.kdn-shell[\s\S]*?display: none !important;/);
assert.match(store, /Projeni doğru zamanda, doğru kitleyle buluştur\./);
assert.doesNotMatch(store, /Kıstas Kredi Mağazası|Görünürlüğünü krediyle büyüt\./);
assert.match(store, /variant="bare"[\s\S]*?ariaLabel="Ödeme penceresini kapat"/);
assert.match(routeFooter, /pathname === '\/credits'/, 'Kredi mağazasında footer gösterilmemeli');
assert.match(dock, /key: 'credits', label: 'Krediler', href: '\/credits'/);
assert.match(profile, /<ShinyButton href="\/credits"/);
assert.match(contracts, /kistas_credits_250/);
assert.match(contracts, /kistas_credits_750/);
assert.match(contracts, /kistas_credits_2000/);

console.log('Web credit store design, routing and secure payment contracts passed.');
