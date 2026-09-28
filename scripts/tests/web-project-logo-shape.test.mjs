import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const logo = read('apps/web/src/components/AutoTransparentLogo.tsx');
const detail = read('apps/web/src/components/ProjectDetailExperienceClient.tsx');
const appStoreList = read('apps/web/src/components/AppStoreProjectList.tsx');
const newPage = read('apps/web/src/app/(public)/new/page.tsx');
const popularPage = read('apps/web/src/app/(public)/popular/page.tsx');
const styles = read('apps/web/src/app/globals.css');

assert.match(logo, /shape\?: 'soft' \| 'circle' \| 'none'/, 'Logo şekli açık bir sözleşme kullanmalı');
assert.match(logo, /shape = 'soft'/, 'Proje logoları varsayılan olarak soft-corner olmalı');
assert.match(logo, /shape === 'soft' \? '22%'/, 'Soft-corner oranı tüm boyutlarda aynı kalmalı');
assert.match(detail, /shape="circle"/, 'Proje detayındaki bilinçli dairesel logo korunmalı');
assert.match(appStoreList, /<AutoTransparentLogo[\s\S]*shape="none"[\s\S]*className="ios-project-logo"/, 'App Store listesi çerçevesiz şeffaf logo standardını kullanmalı');
assert.doesNotMatch(styles, /\.ios-project-icon\s*\{[^}]*\b(?:border|background)\s*:/, 'Gerçek proje logosunun arkasında kutu veya çerçeve olmamalı');
assert.match(newPage, /AppStoreProjectList/, 'Yeni sayfası ortak logo ve liste standardını kullanmalı');
assert.match(popularPage, /AppStoreProjectList/, 'Popüler sayfası ortak logo ve liste standardını kullanmalı');
assert.doesNotMatch(newPage, /AutoTransparentLogo|<img/, 'Yeni sayfasında paralel logo render yolu kalmamalı');
assert.doesNotMatch(popularPage, /AutoTransparentLogo|<img/, 'Popüler sayfasında paralel logo render yolu kalmamalı');

console.log('Project logo soft-corner shape contract passed.');
