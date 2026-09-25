import { test, expect } from '@playwright/test';

test.describe('Kıstas Keşif & Vitrin Akışı', () => {
  test('Ana sayfa yüklenmeli ve temel başlıkları içermeli', async ({ page }) => {
    await page.goto('/');

    // Başlık doğrulaması
    await expect(page).toHaveTitle(/Kıstas/);

    // Ana marka ve navigasyon elemanları mevcut olmalı
    const brandElement = page.locator('text=Kıstas').first();
    await expect(brandElement).toBeVisible();
  });

  test('Göz At (/browse) sayfasına erişilebilmeli', async ({ page }) => {
    await page.goto('/browse');
    await expect(page).toHaveTitle(/Göz At|Kıstas/);
  });

  test('Popüler (/popular) ve Yeni (/new) rotaları HTTP 200 ile açılmalı', async ({ page }) => {
    const popularResponse = await page.goto('/popular');
    expect(popularResponse?.status()).toBe(200);

    const newResponse = await page.goto('/new');
    expect(newResponse?.status()).toBe(200);
  });
});
