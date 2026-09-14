import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  assert(!paths.has(route.path), `Tekrarlanan SEO yolu: ${route.path}`);
  assert(!titles.has(route.title), `Tekrarlanan SEO basligi: ${route.title}`);
  assert(route.title.length >= 30 && route.title.length <= 65, `Baslik uzunlugu uygun degil: ${route.title}`);
  assert(route.description.length >= 90 && route.description.length <= 170, `Aciklama uzunlugu uygun degil: ${route.path}`);
  paths.add(route.path);
  titles.add(route.title);

  const file = route.path === '/' ? join(outputRoot, 'index.html') : join(outputRoot, route.path.slice(1), 'index.html');
  const html = await readFile(file, 'utf8');
  const canonical = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
  assert(html.includes(`<title>${route.title}</title>`), `Baslik ciktiya yazilmadi: ${route.path}`);
  assert(html.includes(`<link rel="canonical" href="${canonical}" />`), `Canonical eksik: ${route.path}`);
  assert(html.includes('id="kistas-page-schema-jsonld"'), `JSON-LD eksik: ${route.path}`);
  assert(html.includes(`<h1>${escapeHtml(route.heading)}</h1>`), `Sayfaya ozgu taranabilir H1 eksik: ${route.path}`);
  assert(html.includes(`<p>${escapeHtml(route.lead)}</p>`), `Sayfaya ozgu taranabilir aciklama eksik: ${route.path}`);
}

const sitemap = await readFile(join(outputRoot, 'sitemap.xml'), 'utf8');
const sourceSitemap = await readFile(join(projectRoot, 'public', 'sitemap.xml'), 'utf8');
for (const route of SITEMAP_ROUTES) {
  assert(sitemap.includes(`<loc>${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}</loc>`), `Sitemap URL eksik: ${route.path}`);
}
assert(!sitemap.includes(`${SITE_ORIGIN}/privacy</loc>`), 'Gizlilik sayfasi sitemap hedefi olmamali');
assert.equal(sourceSitemap.replaceAll('\r\n', '\n'), sitemap.replaceAll('\r\n', '\n'), 'Kaynak ve uretilen sitemap ayni olmali');
console.log(`SEO output checks passed: ${SEO_ROUTES.length} pages, ${SITEMAP_ROUTES.length} sitemap URLs.`);
