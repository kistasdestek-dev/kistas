import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const rootLoadingUrl = new URL('../../apps/web/src/app/loading.tsx', import.meta.url);
const legacyLoaderUrl = new URL('../../apps/web/src/components/KistasRouteLoader.tsx', import.meta.url);
const navigationOverlayUrl = new URL('../../apps/web/src/components/NavigationLoadingOverlay.tsx', import.meta.url);
const skeletonSource = readFileSync(
  new URL('../../apps/web/src/components/RouteSkeletons.tsx', import.meta.url),
  'utf8',
);
const routeLoadingSources = [
  '../../apps/web/src/app/(public)/browse/[slug]/loading.tsx',
  '../../apps/web/src/app/(public)/browse/platform/[platform]/loading.tsx',
  '../../apps/web/src/app/(public)/listings/[id]/loading.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));
const layoutSource = readFileSync(
  new URL('../../apps/web/src/app/layout.tsx', import.meta.url),
  'utf8',
);
const dockSource = readFileSync(
  new URL('../../apps/web/src/components/KistasGlassDock.tsx', import.meta.url),
  'utf8',
);
const runtimeSource = readFileSync(
  new URL('../../apps/web/src/components/GlobalClientRuntime.tsx', import.meta.url),
  'utf8',
);
const footerSloganSource = readFileSync(
  new URL('../../apps/web/src/components/FooterSloganBanner.tsx', import.meta.url),
  'utf8',
);
const globalStylesSource = readFileSync(
  new URL('../../apps/web/src/app/globals.css', import.meta.url),
  'utf8',
);

assert.equal(existsSync(rootLoadingUrl), false, 'Kök rota tüm sayfayı kaplayan loading sınırı taşımamalı');
assert.equal(existsSync(legacyLoaderUrl), false, 'Eski tam ekran logo loaderı kaldırılmalı');
assert.equal(existsSync(navigationOverlayUrl), false, 'Belge tıklamalarını yakalayan global loader kaldırılmalı');
assert.doesNotMatch(layoutSource, /NavigationLoadingOverlay|KistasRouteLoader/, 'Kök layout eski global loaderı içermemeli');
assert.doesNotMatch(globalStylesSource, /\.kistas-route-loader/, 'Eski loader CSS artığı bırakılmamalı');
assert.match(skeletonSource, /role="status"/, 'Route skeletonları erişilebilir durum rolüne sahip olmalı');
assert.match(skeletonSource, /aria-live="polite"/, 'Route skeletonları ekran okuyucuyu bölmemeli');
assert.match(skeletonSource, /DiscoveryRouteSkeleton/, 'Keşif rotaları için yerleşim koruyan skeleton bulunmalı');
assert.match(skeletonSource, /ProjectDetailRouteSkeleton/, 'Proje detayı için yerleşim koruyan skeleton bulunmalı');
for (const source of routeLoadingSources) {
  assert.match(source, /RouteSkeleton/, 'Her dinamik public rota kendi skeleton sınırını kullanmalı');
}
assert.match(dockSource, /useLinkStatus/, 'Navbar tıklanan linkte anlık pending durumu göstermeli');
assert.match(dockSource, /NavPendingIndicator/, 'Navbar pending durumu yerel göstergeyle sunulmalı');
assert.match(dockSource, /if \(pathname === href\)/, 'Navbar aynı rotaya tekrar navigasyon başlatmamalı');
assert.match(dockSource, /event\.preventDefault\(\)/, 'Aktif navbar sekmesi tıklaması engellenmeli');
assert.match(runtimeSource, /dynamic\(/, 'Global bildirim sistemi başlangıç paketinden ayrılmalı');
assert.match(runtimeSource, /ssr:\s*false/, 'Tarayıcı bildirim runtimeı sunucu renderına girmemeli');
assert.match(footerSloganSource, /flex w-full max-w-full[^\"]*justify-center[^\"]*px-4 text-center/, 'Mobil footer sloganı tam genişlikte ve eşit iç boşlukla ortalanmalı');

console.log('Route-level loading and navigation feedback contract checks passed.');
