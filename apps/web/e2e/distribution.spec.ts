import { test, expect } from '@playwright/test';

test.describe('Kıstas Dağıtım Motoru (Distribution Engine)', () => {
  test('Dinamik OG Kartı (/api/og) HTTP 200 ve önbellek başlıklarıyla dönmeli', async ({ request }) => {
    const res = await request.get('/api/og?title=TestProje&tagline=YapayZekaAraci&category=AI');
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/image\/png/);

    const cacheControl = res.headers()['cache-control'];
    expect(cacheControl).toContain('s-maxage=604800');
  });

  test('Embed Rozet API (/api/badge/...) HTTP 200 ve SVG dönmeli', async ({ request }) => {
    const res = await request.get('/api/badge/demo-project-id?theme=dark');
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/image\/svg\+xml/);

    const cacheControl = res.headers()['cache-control'];
    expect(cacheControl).toContain('s-maxage=1800');

    const text = await res.text();
    expect(text).toContain('Kıstas');
  });

  test('Hakkımızda ve Nasıl Çalışır kurumsal sayfaları açılmalı', async ({ page }) => {
    const resAbout = await page.goto('/hakkimizda');
    expect(resAbout?.status()).toBe(200);

    const resHowItWorks = await page.goto('/nasil-calisir');
    expect(resHowItWorks?.status()).toBe(200);
  });
});
