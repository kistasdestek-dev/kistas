import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const proxySource = readFileSync(
  new URL('../../apps/web/src/proxy.ts', import.meta.url),
  'utf8',
);
const middlewareSource = readFileSync(
  new URL('../../apps/web/src/lib/supabase/middleware.ts', import.meta.url),
  'utf8',
);
const browsePageSource = readFileSync(
  new URL('../../apps/web/src/app/(public)/browse/page.tsx', import.meta.url),
  'utf8',
);
const headersSource = readFileSync(
  new URL('../../apps/web/public/_headers', import.meta.url),
  'utf8',
);
const dockSource = readFileSync(
  new URL('../../apps/web/src/components/KistasGlassDock.tsx', import.meta.url),
  'utf8',
);
const homePageSource = readFileSync(
  new URL('../../apps/web/src/app/page.tsx', import.meta.url),
  'utf8',
);
const browseClientSource = readFileSync(
  new URL('../../apps/web/src/components/BrowseExperienceClient.tsx', import.meta.url),
  'utf8',
);
const categoryPageSource = readFileSync(
  new URL('../../apps/web/src/app/(public)/browse/[slug]/page.tsx', import.meta.url),
  'utf8',
);
const platformPageSource = readFileSync(
  new URL('../../apps/web/src/app/(public)/browse/platform/[platform]/page.tsx', import.meta.url),
  'utf8',
);
const listingDetailSource = readFileSync(
  new URL('../../apps/web/src/app/(public)/listings/[id]/page.tsx', import.meta.url),
  'utf8',
);
const logoSource = readFileSync(
  new URL('../../apps/web/src/components/KistasLogo.tsx', import.meta.url),
  'utf8',
);
const listingsQuerySource = readFileSync(
  new URL('../../packages/supabase/src/queries/listings.ts', import.meta.url),
  'utf8',
);
const publicRouteSources = [
  '../../apps/web/src/app/page.tsx',
  '../../apps/web/src/app/(public)/browse/[slug]/page.tsx',
  '../../apps/web/src/app/(public)/browse/platform/[platform]/page.tsx',
  '../../apps/web/src/app/(public)/new/page.tsx',
  '../../apps/web/src/app/(public)/popular/page.tsx',
  '../../apps/web/src/app/(public)/blog/page.tsx',
  '../../apps/web/src/app/(public)/blog/[slug]/page.tsx',
].map((path) => ({
  path,
  source: readFileSync(new URL(path, import.meta.url), 'utf8'),
}));

assert.doesNotMatch(
  proxySource,
  /\/\(\(\?!_next/,
  'Proxy bütün public sayfaları Supabase oturum kontrolüne sokmamalı',
);
assert.doesNotMatch(
  proxySource,
  /['"]\/browse\/:path\*['"]/,
  'Public Göz At rotası auth proxy kapsamına alınmamalı',
);

for (const route of ['/admin', '/create-listing', '/dashboard', '/messages', '/profile']) {
  assert.match(proxySource, new RegExp(`${route.replace('/', '\\/')}\\/:path\\*`), `${route} proxy korumasında kalmalı`);
  assert.match(middlewareSource, new RegExp(`['"]${route}['"]`), `${route} anonim yönlendirme kontrolünde kalmalı`);
}

assert.doesNotMatch(browsePageSource, /createClient|getUser|getSession/, 'Göz At sayfası sunucu oturumu veya veri ağı beklememeli');
assert.match(browsePageSource, /revalidate\s*=\s*86_400/, 'Göz At sayfası günlük edge ISR cache kullanmalı');
assert.match(headersSource, /\/_next\/static\/\*/, 'Fingerprintli Next.js dosyaları için cache kuralı bulunmalı');
assert.match(headersSource, /max-age=31556952, immutable/, 'Fingerprintli dosyalar bir yıl immutable cache kullanmalı');
assert.doesNotMatch(dockSource, /^import .*supabase\/browser/m, 'Global navigasyon Supabase istemcisini başlangıç paketine statik eklememeli');
assert.match(dockSource, /await import\(['"]@\/lib\/supabase\/browser['"]\)/, 'Global navigasyon oturum istemcisini hydration sonrasında yüklemeli');
assert.match(dockSource, /router\.prefetch\(['"]\/browse['"]\)/, 'Göz At rotası ilk etkileşimden önce proaktif yüklenmeli');
assert.match(homePageSource, /revalidate\s*=\s*60/, 'Ana sayfa kısa süreli ISR cache kullanmalı');
for (const route of publicRouteSources) {
  assert.doesNotMatch(route.source, /@\/lib\/supabase\/server/, `${route.path} cookie tabanlı Supabase istemcisi kullanmamalı`);
  assert.match(route.source, /createAnonClient/, `${route.path} RLS korumalı anonim istemci kullanmalı`);
}
assert.match(browseClientSource, /index < 4 \? null : false/, 'Kategori ön yüklemesi ilk dört görünür kartla sınırlanmalı');
assert.match(browseClientSource, /onPointerEnter=\{\(\) => router\.prefetch/, 'Kategori rotaları kullanıcı niyetinde ön yüklenmeli');
assert.match(browseClientSource, /onPointerDown=\{\(\) => router\.prefetch/, 'Dokunmatik ve kalem etkileşiminde rota erken ön yüklenmeli');
assert.match(categoryPageSource, /categoryId:\s*category\.id/, 'Kategori rotası yalnız seçili kategorinin verisini istemeli');
assert.match(platformPageSource, /\{ platform \}/, 'Platform rotası yalnız seçili platformun verisini istemeli');
assert.doesNotMatch(categoryPageSource, /getCuratedListings\(supabase, 'popular', 100\)/, 'Kategori rotası 100 genel projeyi taşımamalı');
assert.doesNotMatch(platformPageSource, /getCuratedListings\(supabase, 'popular', 100\)/, 'Platform rotası 100 genel projeyi taşımamalı');
assert.doesNotMatch(listingDetailSource, /@\/lib\/supabase\/server/, 'Public proje detayı cookie tabanlı sunucu istemcisini beklememeli');
assert.doesNotMatch(listingDetailSource, /auth\.getUser/, 'Public proje gövdesi kullanıcı doğrulamasını bloklamamalı');
assert.match(listingDetailSource, /const getPublicListing = unstable_cache/, 'Metadata ve sayfa public proje cache kaydını paylaşmalı');
assert.match(categoryPageSource, /unstable_cache[\s\S]*revalidate:\s*60/, 'Kategori public verisi 60 saniye cache kullanmalı');
assert.match(platformPageSource, /unstable_cache[\s\S]*revalidate:\s*60/, 'Platform public verisi 60 saniye cache kullanmalı');
assert.match(logoSource, /kistas-logo-256\.webp/, 'Global Kıstas logosu küçültülmüş WebP varlığını kullanmalı');
assert.doesNotMatch(
  listingsQuerySource,
  /seller:profiles\(/,
  'Public proje sorguları anon rolüne kapalı profiles tablosuna doğrudan ilişki kurmamalı',
);
assert.match(
  listingsQuerySource,
  /Public curated listings query failed/,
  'Vitrin sorgusu yetki veya şema hatasını sessizce boş vitrine çevirmemeli',
);

console.log('Public route latency and immutable asset cache checks passed.');
