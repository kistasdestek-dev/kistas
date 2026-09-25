import { test, expect } from '@playwright/test';

test.describe('Kıstas Yetkilendirme & Hata Dayanıklılığı', () => {
  test('Misafir kullanıcının /create sayfasına erişimi güvenle ele alınmalı', async ({ page }) => {
    await page.goto('/create');

    // Sayfa yüklenmeli, çökmemeli ve ya giriş formunu ya da giriş uyarısını göstermeli
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Giriş yap / Oturum aç veya form alanları kontrolü
    const content = await page.content();
    const hasAuthOrForm = content.includes('Giriş') || content.includes('Google') || content.includes('Proje');
    expect(hasAuthOrForm).toBe(true);
  });

  test('Güvenlik sayfası (/guvenlik) HTTP 200 ile yüklenmeli', async ({ page }) => {
    const res = await page.goto('/guvenlik');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Güvenlik|Kıstas/);
  });

  test('Olmayan proje ID sorgusu 500 sunucu çökmesi üretmemeli', async ({ page }) => {
    const res = await page.goto('/listings/00000000-0000-0000-0000-000000000000');
    // Status 200 (istemci taraflı 404 UI) veya 404 dönmeli, asla 500 olmamalı
    expect(res?.status()).not.toBe(500);
  });
});
