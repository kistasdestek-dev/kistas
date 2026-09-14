import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { SEO_ROUTES, SITEMAP_ROUTES, SITE_ORIGIN } from './seo-config.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const targetRoot = resolve(projectRoot, process.argv[2] || 'dist');
if (targetRoot !== projectRoot && !targetRoot.startsWith(`${projectRoot}${sep}`)) {
  throw new Error('SEO sayfa hedefi proje klasorunun disinda olamaz.');
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const baseHtml = await readFile(join(targetRoot, 'index.html'), 'utf8');
const articles = SEO_ROUTES.filter((route) => route.ogType === 'article');

for (const route of SEO_ROUTES) {
  const canonical = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
  const relatedArticles = route.path === '/blog/' ? articles : route.ogType === 'article' ? articles.filter((item) => item.path !== route.path) : [];
  const articleLinks = relatedArticles.length
    ? `<section aria-label="İlgili yazılar"><h2>${route.path === '/blog/' ? 'Son yazılar' : 'İlgili yazılar'}</h2><ul>${relatedArticles.map((item) => `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.heading)}</a></li>`).join('')}</ul></section>`
    : '';
  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(route.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${route.ogType}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${escapeHtml(route.image)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${escapeHtml(route.image)}" />`)
    .replace(/<script id="kistas-page-schema-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/, `<script id="kistas-page-schema-jsonld" type="application/ld+json">${safeJson(route.schema)}</script>`)
    .replace(/<main id="seo-fallback"[\s\S]*?<\/main>/, `<main id="seo-fallback" style="max-width:760px;margin:64px auto;padding:24px;font-family:system-ui,sans-serif;color:#203754"><h1>${escapeHtml(route.heading)}</h1><p>${escapeHtml(route.lead)}</p>${articleLinks}<nav aria-label="Kıstas bağlantıları"><a href="/">Ana Sayfa</a> · <a href="/blog/">Blog</a> · <a href="/about/">Hakkımızda</a> · <a href="/how-it-works/">Nasıl Çalışır?</a></nav></main>`);

  if (route.ogType === 'article') {
    const articleNode = route.schema['@graph'].find((node) => node['@type'] === 'BlogPosting');
    html = html.replace('</head>', `    <meta property="article:published_time" content="${articleNode.datePublished}" />\n    <meta property="article:section" content="${escapeHtml(articleNode.articleSection)}" />\n  </head>`);
  }

  const outputPath = route.path === '/' ? join(targetRoot, 'index.html') : join(targetRoot, route.path.slice(1), 'index.html');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITEMAP_ROUTES.map((route) => `  <url><loc>${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}</loc><lastmod>${route.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile(join(targetRoot, 'sitemap.xml'), sitemap, 'utf8');
console.log(`SEO pages generated: ${SEO_ROUTES.length}`);
