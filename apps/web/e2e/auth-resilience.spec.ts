import { test, expect } from './fixtures';

test.describe('Misafir yetkilendirme sınırı', () => {
  for (const path of ['/create-listing', '/launch-archive', '/admin', '/credits', '/messages', '/profile', '/admin/listings/22222222-2222-4222-8222-222222222222/preview']) {
    test(`${path} anonim kullanıcıyı girişe yönlendirmeli`, async ({ request, page }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      const location = new URL(response.headers().location, response.url());
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('redirect')).toBe(path);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login\?redirect=/);
      await expect(page.getByRole('textbox', { name: 'ornek@kistas.com.tr' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Devam Et', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Lansmanı Gönder', exact: true })).toHaveCount(0);
    });
  }
});

test('Güvenlik sayfası açılmalı', async ({ page }) => {
  const response = await page.goto('/guvenlik', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Güvenlik|Kıstas/);
});

test('Olmayan proje bulunamadı ekranı ve noindex üretmeli', async ({ page }) => {
  const response = await page.goto('/listings/00000000-0000-0000-0000-000000000000', { waitUntil: 'domcontentloaded' });
  // Next.js streams may commit HTTP 200 before notFound(); verify the error contract too.
  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.getByText('M0 Test Projesi', { exact: true })).toHaveCount(0);
});
