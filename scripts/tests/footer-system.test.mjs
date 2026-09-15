import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const [webFooter, nativeFooter, about, howItWorks, blog] = await Promise.all([
  read('src/shared/components/CinematicFooter.web.tsx'),
  read('src/shared/components/CinematicFooter.tsx'),
  read('src/features/about/presentation/AboutScreen.tsx'),
  read('src/features/how-it-works/presentation/HowItWorksScreen.tsx'),
  read('src/features/blog/presentation/BlogScreen.tsx'),
]);

assert.match(webFooter, /radial-gradient/, 'Web footer radial ust isigi icermeli.');
assert.match(webFooter, /IntersectionObserver/, 'Web footer gorunur alanda animasyonu baslatmali.');
assert.match(webFooter, /blur\(4px\)/, 'Web footer referans blur girisini korumali.');
assert.match(webFooter, /prefers-reduced-motion/, 'Web footer azaltilmis hareket tercihini desteklemeli.');
assert.match(webFooter, /KistasLogo/, 'Web footer Kistas marka isaretini kullanmali.');
assert.doesNotMatch(webFooter, /Facebook|Instagram|Youtube|LinkedIn|href="#"/, 'Footer sahte sosyal baglanti icermemeli.');
assert.doesNotMatch(webFooter, /kcf-giant|kcf-grid|kcf-aurora/, 'Eski sinematik footer artigi kalmamali.');

assert.match(nativeFooter, /Animated\.stagger/, 'Mobil footer kademeli giris efektini korumali.');
assert.match(nativeFooter, /useNativeDriver: true/, 'Mobil animasyon native surucude calismali.');
assert.match(nativeFooter, /isReduceMotionEnabled/, 'Mobil footer azaltilmis hareket tercihini desteklemeli.');
assert.match(nativeFooter, /theme\.typography\.kistas/, 'Mobil footer Kistas tipografi standardini kullanmali.');

for (const [name, screen] of [['Hakkimizda', about], ['Nasil Calisir', howItWorks], ['Blog', blog]]) {
  assert.match(screen, /<CinematicFooter/, `${name} mobil ekraninda ortak footer kullanilmali.`);
}

console.log('Footer sistem kontrolleri basarili.');
