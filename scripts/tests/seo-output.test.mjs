import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SEO_ROUTES, SITEMAP_ROUTES, SITE_ORIGIN } from '../seo-config.mjs';

const projectRoot = resolve(import.meta.dirname, '../..');
const outputRoot = resolve(projectRoot, process.argv[2] || 'dist');
const paths = new Set();
const titles = new Set();
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

for (const route of SEO_ROUTES) {
  assert(route.path === '/' || route.path.endsWith('/'), `Pages son URL'siyle canonical uyusmuyor: ${route.path}`);
  assert(!paths.has(route.path), `Tekrarlanan SEO yolu: ${route.path}`);
  assert(!titles.has(route.title), `Tekrarlanan SEO basligi: ${route.title}`);
  assert(route.title.length >= 30 && route.title.length <= 65, `Baslik uzunlugu uygun degil: ${route.title}`);
  assert(route.description.length >= 90 && route.description.length <= 170, `Aciklama uzunlugu uygun degil: ${route.path}`);
  paths.add(route.path);
  titles.add(route.title);

  const file = route.path === '/' ? join(outputRoot, 'index.html') : join(outputRoot, route.path.slice(1), 'index.html');
  const html = await readFile(file, 'utf8');
  const ioniconsPreload = html.match(/<link rel="preload" href="(\/fonts\/Ionicons\.[a-f0-9]{32}\.ttf)" as="font"/);
  assert(ioniconsPreload, `Onceden yuklenen Ionicons uretim dosyasi eksik: ${route.path}`);
  assert(html.includes(`src: url('${ioniconsPreload[1]}')`), `Ionicons font yuzu farkli dosyaya bakiyor: ${route.path}`);
  assert((await stat(join(outputRoot, ioniconsPreload[1].slice(1)))).isFile(), `Ionicons dosyasi ciktiya yazilmadi: ${route.path}`);
  const canonical = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
  assert(html.includes(`<title>${route.title}</title>`), `Baslik ciktiya yazilmadi: ${route.path}`);
  assert(html.includes(`<link rel="canonical" href="${canonical}" />`), `Canonical eksik: ${route.path}`);
  assert(html.includes('id="kistas-page-schema-jsonld"'), `JSON-LD eksik: ${route.path}`);
  assert(html.includes(`<h1>${escapeHtml(route.heading)}</h1>`), `Sayfaya ozgu taranabilir H1 eksik: ${route.path}`);
  assert(html.includes(`<p>${escapeHtml(route.lead)}</p>`), `Sayfaya ozgu taranabilir aciklama eksik: ${route.path}`);
  if (route.path === '/blog/' || route.ogType === 'article') {
    const linkedArticles = SEO_ROUTES.filter((item) => item.ogType === 'article' && item.path !== route.path);
    for (const item of linkedArticles) {
      assert(html.includes(`href="${item.path}"`), `Blog ic baglantisi eksik: ${route.path} -> ${item.path}`);
    }
  }
  if (route.ogType === 'article') {
    const post = route.schema['@graph'].find((node) => node['@type'] === 'BlogPosting');
    assert(html.includes(`<meta property="article:published_time" content="${post.datePublished}" />`), `Yayin tarihi tutarsiz: ${route.path}`);
    assert.equal(route.lastmod, post.dateModified.slice(0, 10), `Sitemap degisiklik tarihi tutarsiz: ${route.path}`);
  }
  const scriptPaths = [...html.matchAll(/<script\s+src="(\/_expo\/static\/js\/web\/[^"\s]+\.js)"/g)].map((match) => match[1]);
  assert(scriptPaths.length > 0, `Web JavaScript girisi eksik: ${route.path}`);
  for (const scriptPath of scriptPaths) {
    const bundle = join(outputRoot, scriptPath.slice(1));
    assert((await stat(bundle)).isFile(), `HTML olmayan JavaScript dosyasina baglaniyor: ${route.path} -> ${scriptPath}`);
  }
}

const sitemap = await readFile(join(outputRoot, 'sitemap.xml'), 'utf8');
const sourceSitemap = await readFile(join(projectRoot, 'public', 'sitemap.xml'), 'utf8');
const llmsText = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
for (const route of SITEMAP_ROUTES) {
  assert(sitemap.includes(`<loc>${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}</loc>`), `Sitemap URL eksik: ${route.path}`);
}
assert(!sitemap.includes(`${SITE_ORIGIN}/privacy/</loc>`), 'Gizlilik sayfasi sitemap hedefi olmamali');
assert.equal(sourceSitemap.replaceAll('\r\n', '\n'), sitemap.replaceAll('\r\n', '\n'), 'Kaynak ve uretilen sitemap ayni olmali');
assert.match(llmsText, /^# Kıstas$/m, 'llms.txt H1 basligi eksik');
assert(llmsText.includes(`${SITE_ORIGIN}/blog`), 'llms.txt taranabilir kaynak baglantilari eksik');
console.log(`SEO output checks passed: ${SEO_ROUTES.length} pages, ${SITEMAP_ROUTES.length} sitemap URLs.`);
