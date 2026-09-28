import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '../..');
const webRoot = resolve(projectRoot, 'apps/web');
const publicRoot = resolve(webRoot, 'public');
const appRoot = resolve(webRoot, 'src/app');
const siteOrigin = 'https://www.kistas.com.tr';

const routes = [
  ['/', 'page.tsx'],
  ['/browse', '(public)/browse/page.tsx'],
  ['/popular', '(public)/popular/page.tsx'],
  ['/new', '(public)/new/page.tsx'],
  ['/gunun-vitrini', '(public)/gunun-vitrini/page.tsx'],
  ['/hakkimizda', '(public)/hakkimizda/page.tsx'],
  ['/nasil-calisir', '(public)/nasil-calisir/page.tsx'],
  ['/guvenlik', '(public)/guvenlik/page.tsx'],
  ['/blog', '(public)/blog/page.tsx'],
];

const [layout, sitemap, robots, llmsText] = await Promise.all([
  readFile(resolve(appRoot, 'layout.tsx'), 'utf8'),
  readFile(resolve(publicRoot, 'sitemap.xml'), 'utf8'),
  readFile(resolve(publicRoot, 'robots.txt'), 'utf8'),
  readFile(resolve(publicRoot, 'llms.txt'), 'utf8'),
]);

assert.match(layout, /export const metadata:\s*Metadata\s*=\s*\{/, 'Root Next.js metadata tanimi eksik.');
assert.match(layout, /title:\s*['"][^'"]*Kıstas[^'"]*['"]/, 'Root SEO basligi Kıstas markasini icermiyor.');
assert.match(layout, /description:\s*['"][^'"]{80,}['"]/, 'Root SEO aciklamasi eksik veya cok kisa.');
assert.match(layout, /<html lang="tr">/, 'Sayfa dili Turkce olarak tanimlanmamis.');

const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/www\.kistas\.com\.tr[^<]*)<\/loc>/g)]
  .map((match) => match[1]);
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'Sitemap tekrarlanan URL iceriyor.');

for (const [route, sourcePath] of routes) {
  assert((await stat(resolve(appRoot, sourcePath))).isFile(), `Next.js sayfa kaynagi eksik: ${route}`);
  assert(sitemapUrls.includes(`${siteOrigin}${route === '/' ? '/' : route}`), `Sitemap URL eksik: ${route}`);
}

assert.match(robots, /^User-agent:\s*\*$/m, 'robots.txt genel tarayici kurali eksik.');
assert.match(robots, /^Allow:\s*\/$/m, 'robots.txt ana site taramasina izin vermiyor.');
assert(robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`), 'robots.txt sitemap bildirimi eksik.');
assert.match(llmsText, /^# Kıstas$/m, 'llms.txt H1 basligi eksik.');
assert(llmsText.includes(`${siteOrigin}/blog`), 'llms.txt taranabilir blog baglantisi eksik.');

console.log(`Next.js SEO contract checks passed: ${routes.length} routes, ${sitemapUrls.length} sitemap URLs.`);
