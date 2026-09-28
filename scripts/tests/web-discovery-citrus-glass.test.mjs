import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../../apps/web/src/app/globals.css', import.meta.url), 'utf8');
const appStoreList = readFileSync(new URL('../../apps/web/src/components/AppStoreProjectList.tsx', import.meta.url), 'utf8');
const projectDetail = readFileSync(new URL('../../apps/web/src/components/ProjectDetailExperienceClient.tsx', import.meta.url), 'utf8');
const popularPage = readFileSync(new URL('../../apps/web/src/app/(public)/popular/page.tsx', import.meta.url), 'utf8');
const newPage = readFileSync(new URL('../../apps/web/src/app/(public)/new/page.tsx', import.meta.url), 'utf8');
const dock = readFileSync(new URL('../../apps/web/src/components/KistasGlassDock.tsx', import.meta.url), 'utf8');

assert.match(appStoreList, /className="ios-project-support"/, 'Popüler ve Yeni listeleri ortak destek sayacını kullanmalı');
assert.match(appStoreList, /aria-label=\{`\$\{supportCount\} destek`\}/, 'Destek sayacı erişilebilir gerçek destek sayısını sunmalı');
assert.doesNotMatch(appStoreList, /supportText|ios-project-support-locked/, 'Sponsor durumu destek sayısının yerini almamalı');
assert.match(styles, /\.ios-project-support\s*\{[\s\S]*?rgba\(228,\s*253,\s*151/, 'Destek sayacı Citrus glass kenarlığı kullanmalı');
assert.match(styles, /color:\s*#e4fd97/, 'Destek sayısı Citrus rengini kullanmalı');
assert.match(styles, /backdrop-filter:\s*blur\(16px\) saturate\(170%\)/, 'Glass bulanıklığı korunmalı');
assert.match(styles, /prefers-reduced-motion[\s\S]*\.ios-project-support/, 'Sayaç hareketi azaltılmış hareket tercihini desteklemeli');
assert.match(popularPage, /<AppStoreProjectList[\s\S]*variant="ranked"[\s\S]*maxItems=\{30\}/, 'Popüler tam sayfası ortak App Store listesini kullanmalı');
assert.match(newPage, /<AppStoreProjectList[\s\S]*variant="new"[\s\S]*maxItems=\{30\}/, 'Yeni tam sayfası ortak App Store listesini kullanmalı');
assert.match(dock, /pathname\.startsWith\('\/popular'\)[\s\S]*pathname\.startsWith\('\/new'\)[\s\S]*return 'discover'/, 'Popüler ve Yeni rotaları Keşfet sekmesini aktif göstermeli');
assert.match(dock, /pathname\.startsWith\('\/credits'\)[\s\S]*return 'credits'/, 'Yalnız kredi rotası Krediler sekmesini aktif göstermeli');
assert.doesNotMatch(popularPage, /Haftalık Topluluk Trendi/, 'Haftalık olmayan popüler sorgusu haftalık olarak etiketlenmemeli');
assert.match(projectDetail, /className="shiny-cta--citrus/, 'Proje detay destek aksiyonu Citrus varyantını kullanmalı');
assert.match(styles, /\.shiny-cta\.shiny-cta--citrus\s*\{[\s\S]*?--shiny-cta-highlight:\s*#e4fd97/i, 'Citrus CTA ortak ShinyButton animasyonunu yalnız renk değişkenleriyle kullanmalı');
assert.match(projectDetail, /ChevronUp[\s\S]*?text-\[#E4FD97\]/, 'Proje detay destek ikonu Citrus rengini kullanmalı');

console.log('Discovery Citrus glass support counter contract passed.');
