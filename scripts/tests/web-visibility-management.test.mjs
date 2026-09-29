import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const modal = read('apps/web/src/components/profile/VisibilityManagementModal.tsx');
const profileExperience = read('apps/web/src/components/ProfileExperienceClient.tsx');
const visibility = read('apps/web/src/lib/visibility.ts');
const scrollLock = read('apps/web/src/hooks/useBodyScrollLock.ts');
const rpcMigration = read('supabase/migrations/20260916000006_credit_ledger_details.sql');
const action = read('apps/web/src/app/actions/sponsors.ts');

assert.match(action, /supabase\.rpc\('boost_listing_scoped'/, 'Vitrin işlemi sunucuda güvenli RPC üzerinden yürümeli');
assert.doesNotMatch(modal, /supabase\.rpc|supabase\/browser/, 'Eski doğrudan istemci satın alma yolu kaldırılmalı');
assert.match(modal, /purchaseSponsorAction\(selectedListing\.id, selectedPackage\.id\)/);
assert.doesNotMatch(modal, /\.from\('listings'\)[\s\S]{0,120}\.update\(/, 'İstemci sponsor alanlarını doğrudan güncellememeli');
assert.match(modal, /ShinyButton/, 'Ana eylem Kıstas Glass Buton kullanmalı');
assert.doesNotMatch(modal, /GlassIconButton|Kıstas görünürlük motoru|\{activeListings\.length\} yayındaki proje/, 'Kaldırılan başlık ikon ve metinleri geri gelmemeli');
assert.match(modal, /k-modal-glass-card/, 'Modal ortak Kıstas glass yüzeyini kullanmalı');
assert.match(modal, /AutoTransparentLogo[\s\S]*drop-shadow/, 'Proje logosu arka çerçevesiz gösterilmeli');
assert.match(modal, /useBodyScrollLock\(isOpen\)/, 'Vitrin modalı ortak mobil scroll kilidini kullanmalı');
assert.match(scrollLock, /body\.style\.position = 'fixed'/, 'Mobilde arka sayfa konumu kilitlenmeli');
assert.match(scrollLock, /window\.scrollTo\(\{ top: previous\.scrollY, left: 0, behavior: 'auto' \}\)/, 'Modal kapanınca sayfanın kaydırma konumu geri yüklenmeli');
assert.match(modal, /overscroll-contain/, 'Kaydırma modal sınırları içinde tutulmalı');
assert.match(profileExperience, /href=\{`\/listings\/\$\{item\.id\}`\}/, 'Vitrinde Gör gerçek proje detay rotasına gitmeli');
assert.doesNotMatch(profileExperience, /href=\{`\/project\/\$\{item\.id\}`\}/, 'Eski ve 404 üreten proje rotası geri gelmemeli');
assert.match(profileExperience, /<Link[\s\S]{0,250}href=\{`\/listings\/\$\{item\.id\}`\}[\s\S]{0,800}Vitrinde Gör/, 'Vitrinde Gör sade dahili bağlantı kullanmalı');
assert.doesNotMatch(profileExperience, /<ShinyButton[\s\S]{0,500}Vitrinde Gör/, 'Vitrinde Gör animasyonlu ShinyButton kullanmamalı');
assert.match(modal, /shiny-cta--citrus[\s\S]{0,350}Projeyi Öne Çıkar/, 'Projeyi Öne Çıkar Citrus glass kullanmalı');
assert.doesNotMatch(modal, /:\s*<Sparkles size=\{16\}/, 'Projeyi Öne Çıkar dekoratif ikonu kaldırılmalı');
assert.match(profileExperience, /aria-label="Proje işlemleri"/, 'Proje aksiyonları ortak glass dock içinde gruplanmalı');
assert.match(profileExperience, /grid grid-cols-2[\s\S]{0,300}sm:grid-cols-4/, 'Aktif proje aksiyonları mobilde 2x2, geniş ekranda dört eşit sütun olmalı');
assert.match(profileExperience, /<ShinyButton[\s\S]{0,350}shiny-cta--citrus[\s\S]{0,350}Sponsor Yap/, 'Sponsor Yap ortak Citrus Glass butonunu kullanmalı');
assert.match(profileExperience, /group flex min-h-11 items-center justify-center gap-2/, 'Aksiyonlar kompakt yatay ikon ve etiket düzenini kullanmalı');
assert.doesNotMatch(profileExperience, /min-h-\[72px\][\s\S]{0,120}flex-col/, 'Eski büyük dikey aksiyon kartları geri gelmemeli');
assert.doesNotMatch(modal, /Kredi ve görünürlük süresi sunucuda tek işlemde doğrulanır/, 'Kaldırılan atomik işlem açıklaması geri gelmemeli');
assert.doesNotMatch(profileExperience, /flex flex-wrap items-center justify-end gap-2/, 'Eski dağınık aksiyon satırı geri gelmemeli');
assert.doesNotMatch(profileExperience, /h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white\/5 border border-white\/10/, 'Lansman logosunun eski arka çerçevesi geri gelmemeli');

for (const [hours, credits] of [[24, 50], [72, 120], [168, 250], [24, 200], [72, 450], [168, 900]]) {
  assert.match(visibility, new RegExp(`durationHours: ${hours},\\s+creditCost: ${credits}`));
  assert.match(rpcMigration, new RegExp(`p_duration_hours = ${hours} AND p_credit_cost = ${credits}`));
}

assert.match(rpcMigration, /FOR UPDATE[\s\S]*UPDATE public\.profiles[\s\S]*UPDATE public\.listings[\s\S]*INSERT INTO public\.credit_transactions/,
  'Kredi ve sponsorluk işlemi atomik RPC akışında kalmalı');

console.log('Web visibility management design and secure purchase contracts passed.');
