import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const [webFooter, nativeFooter, about, aboutWeb, howItWorks, howItWorksWeb, faq, faqWeb, blog, seoConfig] = await Promise.all([
  read('src/shared/components/CinematicFooter.web.tsx'),
  read('src/shared/components/CinematicFooter.tsx'),
  read('src/features/about/presentation/AboutScreen.tsx'),
  read('src/features/about/presentation/AboutScreen.web.tsx'),
  read('src/features/how-it-works/presentation/HowItWorksScreen.tsx'),
  read('src/features/how-it-works/presentation/HowItWorksScreen.web.tsx'),
  read('src/features/faq/presentation/FaqScreen.tsx'),
  read('src/features/faq/presentation/FaqScreen.web.tsx'),
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
assert.match(webFooter, /title: 'SSS'/, 'Web footer Destek yerine SSS baglantisi sunmali.');
assert.doesNotMatch(webFooter, /title: 'Destek'/, 'Eski Destek footer baglantisi kalmamali.');
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
assert.match(nativeFooter, /title: 'SSS'/, 'Mobil footer Destek yerine SSS baglantisi sunmali.');
assert.doesNotMatch(nativeFooter, /title: 'Destek'/, 'Eski mobil Destek footer baglantisi kalmamali.');

for (const [name, screen] of [['Hakkimizda', about], ['Nasil Calisir', howItWorks], ['Blog', blog]]) {
  assert.match(screen, /<CinematicFooter/, `${name} mobil ekraninda ortak footer kullanilmali.`);
}

assert.match(aboutWeb, /Yeni fikirleri keşfet[\s\S]*Sevdiğini destekle/, 'Hakkimizda ana deger onerisini net anlatmali.');
assert.match(aboutWeb, /YENİ BİR ÜRÜN ARIYORSAN[\s\S]*BİR PROJEN VARSA/, 'Hakkimizda iki hedef kitleyi acikca ayirmali.');
assert.match(aboutWeb, /Keşfet[\s\S]*İncele[\s\S]*Destekle[\s\S]*Yayınla[\s\S]*Ulaş[\s\S]*Büyüt/, 'Hakkimizda her hedef kitle icin net bir akıs sunmali.');
assert.doesNotMatch(aboutWeb, /CANLI KEŞİF|YENİ PROJELER|Odak AI|Pixel Quest|TaskFlow|>82%|▲ 248/, 'Eski soyut etiket, sahte proje ve aciklamasiz metrikler kalmamali.');

for (const screen of [howItWorks, howItWorksWeb]) {
  assert.match(screen, /Keşfetmek kolay/, 'Nasil Calisir ana deger onerisini net anlatmali.');
  assert.match(screen, /Projemi büyütmek istiyorum/, 'Kesfeden ve ureten kullanici akislari ayrilmali.');
  assert.doesNotMatch(screen, /Atomik Doğrulanmış Oylar|Geleneksel Mecralar|Sıkça Sorulanlar|EKOSİSTEM & ÇALIŞMA PRENSİPLERİ/, 'Eski teknik ve kalabalik anlatim geri gelmemeli.');
}

for (const screen of [faq, faqWeb]) {
  assert.match(screen, /Sorularının cevabı/, 'SSS ekrani net bir ana mesaj sunmali.');
  assert.match(screen, /Vitrin Kredisi/, 'SSS ekrani kredi konularini kapsamalı.');
  assert.match(screen, /Ekibimize Yaz/, 'SSS ekrani cozulmeyen sorulari canli destege yonlendirmeli.');
}
assert.match(faq, /theme\.typography\.kistas/, 'Mobil SSS Kistas tipografi standardini kullanmali.');
assert.match(seoConfig, /path: '\/sss\/'[\s\S]*'@type': 'FAQPage'/, 'SSS statik SEO ve FAQPage semasi uretilmeli.');

console.log('Footer sistem kontrolleri basarili.');
