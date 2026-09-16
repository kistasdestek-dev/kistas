import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const [webFooter, nativeFooter, about, aboutWeb, howItWorks, howItWorksWeb, blog, seoConfig] = await Promise.all([
  read('src/shared/components/CinematicFooter.web.tsx'),
  read('src/shared/components/CinematicFooter.tsx'),
  read('src/features/about/presentation/AboutScreen.tsx'),
  read('src/features/about/presentation/AboutScreen.web.tsx'),
  read('src/features/how-it-works/presentation/HowItWorksScreen.tsx'),
  read('src/features/how-it-works/presentation/HowItWorksScreen.web.tsx'),
  read('src/features/blog/presentation/BlogScreen.tsx'),
  read('scripts/seo-config.mjs'),
]);

assert.match(webFooter, /radial-gradient/, 'Web footer radial ust isigi icermeli.');
assert.match(webFooter, /IntersectionObserver/, 'Web footer gorunur alanda animasyonu baslatmali.');
assert.match(webFooter, /blur\(4px\)/, 'Web footer referans blur girisini korumali.');
assert.match(webFooter, /prefers-reduced-motion/, 'Web footer azaltilmis hareket tercihini desteklemeli.');
assert.match(webFooter, /KistasLogo/, 'Web footer Kistas marka isaretini kullanmali.');
assert.doesNotMatch(webFooter, /Facebook|Instagram|Youtube|LinkedIn|href="#"/, 'Footer sahte sosyal baglanti icermemeli.');
assert.doesNotMatch(webFooter, /kcf-giant|kcf-grid|kcf-aurora/, 'Eski sinematik footer artigi kalmamali.');
assert.match(webFooter, /kcf-glow-breathe/, 'Footer ust isigi yumusak nefes animasyonunu korumali.');
assert.doesNotMatch(webFooter, /Uygulamalar|Yakında/, 'Uygulama magazasi taslaklari footer icinde kalmamali.');
for (const path of ['/browse/', '/popular/', '/new/']) {
  assert(webFooter.includes(`href="${path}"`), `Footer taranabilir SEO baglantisini icermeli: ${path}`);
  assert(seoConfig.includes(`path: '${path}'`), `SEO cikti rotasi tanimli olmali: ${path}`);
}

assert.match(nativeFooter, /Animated\.stagger/, 'Mobil footer kademeli giris efektini korumali.');
assert.match(nativeFooter, /useNativeDriver: true/, 'Mobil animasyon native surucude calismali.');
assert.match(nativeFooter, /isReduceMotionEnabled/, 'Mobil footer azaltilmis hareket tercihini desteklemeli.');
assert.match(nativeFooter, /theme\.typography\.kistas/, 'Mobil footer Kistas tipografi standardini kullanmali.');
assert.match(nativeFooter, /glowPulse/, 'Mobil footer hafif nefes alan ust isigi kullanmali.');
assert.doesNotMatch(nativeFooter, /Uygulamalar|Yakında/, 'Mobil footer uygulama magazasi taslagi icermemeli.');

for (const [name, screen] of [['Hakkimizda', about], ['Nasil Calisir', howItWorks], ['Blog', blog]]) {
  assert.match(screen, /<CinematicFooter/, `${name} mobil ekraninda ortak footer kullanilmali.`);
}

assert.match(aboutWeb, /Yeni fikirleri keşfet[\s\S]*Sevdiğini destekle/, 'Hakkimizda ana deger onerisini net anlatmali.');
assert.match(aboutWeb, /YENİ PROJELER/, 'Hakkimizda vitrin etiketi anlasilir olmali.');
assert.doesNotMatch(aboutWeb, /CANLI KEŞİF|>82%</, 'Eski soyut canli kesif ve sahte oran metinleri kalmamali.');

for (const screen of [howItWorks, howItWorksWeb]) {
  assert.match(screen, /Keşfetmek kolay/, 'Nasil Calisir ana deger onerisini net anlatmali.');
  assert.match(screen, /Projemi büyütmek istiyorum/, 'Kesfeden ve ureten kullanici akislari ayrilmali.');
  assert.doesNotMatch(screen, /Atomik Doğrulanmış Oylar|Geleneksel Mecralar|Sıkça Sorulanlar|EKOSİSTEM & ÇALIŞMA PRENSİPLERİ/, 'Eski teknik ve kalabalik anlatim geri gelmemeli.');
}

console.log('Footer sistem kontrolleri basarili.');
