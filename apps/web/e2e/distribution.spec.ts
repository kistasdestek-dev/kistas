import { test, expect } from './fixtures';

test.describe('Kıstas Dağıtım Motoru (Distribution Engine)', () => {
  test('Dinamik OG Kartı (/api/og) HTTP 200 ve önbellek başlıklarıyla dönmeli', async ({ request }) => {
    const res = await request.get('/api/og?id=default');
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/image\/png/);

    const cacheControl = res.headers()['cache-control'];
    expect(cacheControl).toBe('private, max-age=0, must-revalidate');
    const png = await res.body();
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  test('Embed Rozet API (/api/badge/...) HTTP 200 ve SVG dönmeli', async ({ request }) => {
    const res = await request.get('/api/badge/demo-project-id?theme=dark');
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/image\/svg\+xml/);

    const cacheControl = res.headers()['cache-control'];
    expect(cacheControl).toBe('private, max-age=0, must-revalidate');

    const text = await res.text();
    expect(text).toContain('Kıstas');
  });

  test('Hakkımızda ve Nasıl Çalışır kurumsal sayfaları açılmalı', async ({ page }) => {
    const resAbout = await page.goto('/hakkimizda', { waitUntil: 'domcontentloaded' });
    expect(resAbout?.status()).toBe(200);
    await expect(page).toHaveTitle(/Kıstas|Hakkımızda/);

    const resHowItWorks = await page.goto('/nasil-calisir', { waitUntil: 'domcontentloaded' });
    expect(resHowItWorks?.status()).toBe(200);
    await expect(page).toHaveTitle(/Kıstas|Nasıl/);
  });
});
