import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const logo = read('apps/web/src/components/AutoTransparentLogo.tsx');
const detail = read('apps/web/src/components/ProjectDetailExperienceClient.tsx');
const newPage = read('apps/web/src/app/(public)/new/page.tsx');
const popularPage = read('apps/web/src/app/(public)/popular/page.tsx');

assert.match(logo, /shape\?: 'soft' \| 'circle' \| 'none'/, 'Logo şekli açık bir sözleşme kullanmalı');
assert.match(logo, /shape = 'soft'/, 'Proje logoları varsayılan olarak soft-corner olmalı');
assert.match(logo, /shape === 'soft' \? '22%'/, 'Soft-corner oranı tüm boyutlarda aynı kalmalı');
assert.match(detail, /shape="circle"/, 'Proje detayındaki bilinçli dairesel logo korunmalı');
assert.match(newPage, /AutoTransparentLogo src=\{cover\}/, 'Yeni sayfası ortak logo standardını kullanmalı');
assert.match(popularPage, /AutoTransparentLogo src=\{cover\}/, 'Popüler sayfası ortak logo standardını kullanmalı');
assert.doesNotMatch(newPage, /<img src=\{cover\}/, 'Yeni sayfasında legacy ham logo görseli kalmamalı');
assert.doesNotMatch(popularPage, /<img src=\{cover\}/, 'Popüler sayfasında legacy ham logo görseli kalmamalı');

console.log('Project logo soft-corner shape contract passed.');
