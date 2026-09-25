import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../apps/web/src/lib/analytics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const values = new Map();
const scripts = [];
const window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
  location: { origin: 'https://www.kistas.com.tr', pathname: '/' },
};
const document = {
  createElement: () => ({}),
  getElementById: (id) => scripts.find((script) => script.id === id) ?? null,
  head: { appendChild: (element) => scripts.push(element) },
};
const exports = {};
runInNewContext(compiled, {
  exports,
  window,
  document,
  Date,
});

assert.equal(exports.readAnalyticsConsent(), null);
exports.trackPageView('/browse', 'Kıstas');
assert.equal(scripts.length, 0, 'Consent olmadan Google kodu yuklenmemeli');

exports.saveAnalyticsConsent(true);
assert.equal(scripts.length, 1, 'Onaydan sonra Google kodu yuklenmeli');
assert.equal(Object.prototype.toString.call(window.dataLayer[0]), '[object Arguments]', 'gtag komutlari Google etiketinin bekledigi Arguments biciminde olmali');
assert.equal(JSON.stringify(window.dataLayer).includes('ad_storage'), true, 'Reklam depolama izni acikca reddedilmeli');
exports.startAnalytics();
assert.equal(scripts.length, 1, 'Google kodu birden fazla kez yuklenmemeli');
exports.trackPageView('/browse?access_token=TEST_SECRET#refresh_token=TEST_SECRET', 'Kıstas');
assert.equal(JSON.stringify(window.dataLayer).includes('TEST_SECRET'), false, 'Kurtarma tokeni analitige gitmemeli');
assert.equal(window.dataLayer.at(-1)[2].page_location, 'https://www.kistas.com.tr/browse');
window.location.pathname = '/blog/ornek-yazi';
exports.trackPageView('/blog/ornek-yazi', 'Örnek Yazı');
assert.equal(window.dataLayer.at(-1)[2].page_location, 'https://www.kistas.com.tr/blog/ornek-yazi', 'Dogrudan acilan blog URL yolu iki kez eklenmemeli');

exports.saveAnalyticsConsent(false);
const eventCount = window.dataLayer.length;
exports.trackEvent('project_upvote', { project_id: 'test' });
assert.equal(window.dataLayer.length, eventCount, 'Ret sonrasi etkinlik gonderilmemeli');
assert.equal(window[`ga-disable-${exports.GA_MEASUREMENT_ID}`], true, 'Ret sonrasi GA devre disi birakilmali');

console.log('Analytics consent and URL sanitization checks passed.');
