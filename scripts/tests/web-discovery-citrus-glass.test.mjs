import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../../apps/web/src/app/globals.css', import.meta.url), 'utf8');
const pager = readFileSync(new URL('../../apps/web/src/components/PopularProjectPager.tsx', import.meta.url), 'utf8');

assert.match(pager, /className={`ios-project-support/, 'Popüler ve Yeni listeleri ortak destek sayacını kullanmalı');
assert.match(styles, /\.ios-project-support\s*\{[\s\S]*?rgba\(228,\s*253,\s*151/, 'Destek sayacı Citrus glass kenarlığı kullanmalı');
assert.match(styles, /color:\s*#e4fd97/, 'Destek sayısı Citrus rengini kullanmalı');
assert.match(styles, /backdrop-filter:\s*blur\(16px\) saturate\(170%\)/, 'Glass bulanıklığı korunmalı');
assert.match(styles, /\.ios-project-support-locked::before\s*\{\s*display:\s*none;/, 'Sponsorlu kilit görünümü Citrus yansımadan ayrılmalı');
assert.match(styles, /prefers-reduced-motion[\s\S]*\.ios-project-support/, 'Sayaç hareketi azaltılmış hareket tercihini desteklemeli');

console.log('Discovery Citrus glass support counter contract passed.');
