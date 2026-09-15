import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, component, nativeComponent, entryComponent, colors] = await Promise.all([
  readFile('App.tsx', 'utf8'),
  readFile('src/shared/components/GlobalScrollProgress.web.tsx', 'utf8'),
  readFile('src/shared/components/GlobalScrollProgress.native.tsx', 'utf8'),
  readFile('src/shared/components/GlobalScrollProgress.tsx', 'utf8'),
  readFile('src/core/theme/colors.ts', 'utf8'),
]);

assert.match(app, /<GlobalScrollProgress pageKey=\{scrollProgressPageKey\}\s*\/>/, 'Global ilerleme cubugu uygulama kokunde degil.');
assert.match(colors, /scrollProgress:\s*'#013196'/, 'Kaydirma ilerleme rengi tema tokeninda #013196 degil.');
assert.match(component, /document\.addEventListener\('scroll', handleScroll, true\)/, 'Ic ScrollView kaydirmalari capture asamasinda izlenmiyor.');
assert.match(component, /position:\s*'fixed'/, 'Ilerleme cubugu ekranin ustune sabitlenmemis.');
assert.match(component, /transform:\s*`scaleX\(\$\{progress\}\)`/, 'Ilerleme orani yatay olcege uygulanmiyor.');
assert.doesNotMatch(component, /boxShadow|box-shadow/, 'Ilerleme cubugunun altinda gri iz olusturan golge yeniden eklenmis.');
assert.match(component, /pageKey/, 'Sayfa gecislerinde ilerleme sifirlanmiyor.');
assert.match(nativeComponent, /=>\s*null/, 'Web ilerleme cubugunun guvenli native karsiligi yok.');
assert.match(entryComponent, /GlobalScrollProgress\.native/, 'Platformlar arasi ortak bilesen girisi eksik.');

console.log('Global scroll progress checks passed.');
