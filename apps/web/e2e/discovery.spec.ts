import { test, expect } from './fixtures';

test.describe('Kıstas Keşif & Vitrin Akışı', () => {
  test('Ana sayfa yüklenmeli ve temel başlıkları içermeli', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Başlık doğrulaması
    await expect(page).toHaveTitle(/Kıstas/);

    // Ana marka ve navigasyon elemanları mevcut olmalı
    const brandElement = page.locator('text=Kıstas').first();
    await expect(brandElement).toBeVisible();
  });

  test('Göz At (/browse) sayfasına erişilebilmeli', async ({ page }) => {
    const response = await page.goto('/browse', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Göz At|Kıstas/);
  });

  test('Popüler (/popular) ve Yeni (/new) rotaları HTTP 200 ile açılmalı', async ({ page }) => {
    const popularResponse = await page.goto('/popular', { waitUntil: 'domcontentloaded' });
    expect(popularResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'En Çok Desteklenenler' })).toBeVisible();

    const newResponse = await page.goto('/new', { waitUntil: 'domcontentloaded' });
    expect(newResponse?.status()).toBe(200);
  });
});
