import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loaderSource = readFileSync(
  new URL('../../apps/web/src/components/KistasRouteLoader.tsx', import.meta.url),
  'utf8',
);
const loadingSource = readFileSync(
  new URL('../../apps/web/src/app/loading.tsx', import.meta.url),
  'utf8',
);
const navigationOverlaySource = readFileSync(
  new URL('../../apps/web/src/components/NavigationLoadingOverlay.tsx', import.meta.url),
  'utf8',
);
const layoutSource = readFileSync(
  new URL('../../apps/web/src/app/layout.tsx', import.meta.url),
  'utf8',
);
const dockSource = readFileSync(
  new URL('../../apps/web/src/components/KistasGlassDock.tsx', import.meta.url),
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

assert.match(loadingSource, /KistasRouteLoader/, 'Kök App Router loading sınırı ortak loaderı kullanmalı');
assert.match(loaderSource, /KistasLogo/, 'Yükleme görünümü ortak Kıstas logosunu kullanmalı');
assert.match(loaderSource, /role="status"/, 'Yükleme görünümü erişilebilir durum rolüne sahip olmalı');
assert.match(loaderSource, /aria-live="polite"/, 'Yükleme bildirimi ekran okuyucuyu bölmemeli');
assert.match(loaderSource, /size=\{52\}/, 'Eski Expo yükleyicisinin 52 px logo ölçüsü korunmalı');
assert.match(globalStylesSource, /\.kistas-route-loader\s*\{[\s\S]*?background:\s*transparent;/, 'Eski Expo yükleyicisinin şeffaf zemini korunmalı');
assert.match(globalStylesSource, /\.kistas-route-loader__wrap\s*\{[\s\S]*?width:\s*100px;[\s\S]*?height:\s*100px;/, 'Eski 100 px yükleyici alanı korunmalı');
assert.match(globalStylesSource, /\.kistas-route-loader__aura\s*\{[\s\S]*?width:\s*90px;[\s\S]*?radial-gradient/, 'Eski mavi aura korunmalı');
assert.match(globalStylesSource, /2\.2s cubic-bezier\(0\.4, 0, 0\.6, 1\)/, 'Eski nefes animasyonu korunmalı');
assert.match(globalStylesSource, /prefers-reduced-motion:\s*reduce/, 'Animasyon azaltma tercihi korunmalı');
assert.doesNotMatch(loaderSource, /backdrop-blur|bg-\[#050A13\]/, 'Yeni koyu glass perde kaldırılmalı');
assert.match(layoutSource, /NavigationLoadingOverlay/, 'Global navigasyon katmanı kök layoutta bulunmalı');
assert.match(navigationOverlaySource, /document\.addEventListener\('click'/, 'İç link tıklamaları anında izlenmeli');
assert.match(navigationOverlaySource, /destination\.origin !== window\.location\.origin/, 'Dış bağlantılar loaderı tetiklememeli');
assert.match(navigationOverlaySource, /event\.metaKey/, 'Yeni sekme kısayolları korunmalı');
assert.match(navigationOverlaySource, /LOADER_DELAY_MS\s*=\s*150/, 'Hızlı geçişlerde loader parlamasını önleyen eşik korunmalı');
assert.match(navigationOverlaySource, /setIsLoaderVisible\(true\)/, 'Loader yalnız gecikme eşiği aşıldığında görünmeli');
assert.match(navigationOverlaySource, /NAVIGATION_TIMEOUT_MS/, 'Başarısız navigasyonda loader kilitli kalmamalı');
assert.match(dockSource, /if \(pathname === href\)/, 'Navbar aynı rotaya tekrar navigasyon başlatmamalı');
assert.match(dockSource, /event\.preventDefault\(\)/, 'Aktif navbar sekmesi tıklaması engellenmeli');
assert.match(dockSource, /onClick=\{\(event\) => handleNavClick\(event, item\.href\)\}/, 'Aynı rota koruması tüm navbar sekmelerine uygulanmalı');
assert.match(footerSloganSource, /flex w-full max-w-full[^"]*justify-center[^"]*px-4 text-center/, 'Mobil footer sloganı tam genişlikte ve eşit iç boşlukla ortalanmalı');

console.log('Global Kıstas route loading contract checks passed.');
