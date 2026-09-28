import { test, expect } from './fixtures';

test('İlk 40 dışında kalan yeni ve sponsorlu projeler ayrı vitrinlerde görünmeli', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.getByText('M1 Yeni Proje', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('M1 Sponsor Projesi', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Yayınlanmamış Proje', { exact: true })).toHaveCount(0);
});

test('Sunucu araması URL, yenileme ve geliştirici alanında doğru sonucu korumalı', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('textbox', { name: 'Uygulama, proje veya geliştirici ara...' });
  await input.fill('Aranabilir Ekip');
  await expect(page).toHaveURL(/q=Aranabilir\+Ekip/);
  await expect(page.getByText('M1 Yeni Proje', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Eski Proje 1', { exact: true })).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(input).toHaveValue('Aranabilir Ekip');
  await expect(page.getByText('M1 Yeni Proje', { exact: true }).first()).toBeVisible();
  await page.goto('/?q=Aranabilir+Ekip&platform=Android', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('M1 Yeni Proje', { exact: true })).toHaveCount(0);
});

test('Popüler listesi cursor ile 30 kayıttan sonrasına erişmeli ve yeni filtrede reddetmeli', async ({ page }) => {
  await page.goto('/popular', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Reddet', exact: true }).click();
  const projectLinks = page.locator('a.ios-project-row');
  await expect(projectLinks).toHaveCount(30);
  const firstIds = await projectLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  await page.getByRole('link', { name: 'Sonraki Sayfa', exact: true }).click();
  await expect(page).toHaveURL(/cursor=/);
  await expect(projectLinks).toHaveCount(30);
  const nextIds = await projectLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(nextIds.every((id) => !firstIds.includes(id))).toBe(true);
  const nextURL = new URL(page.url());
  nextURL.searchParams.set('platform', 'Android');
  await page.goto(nextURL.href, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
});

test('Geçersiz keşif filtresi ve cursor hata ekranına gitmeli', async ({ page }) => {
  for (const path of ['/?platform=unknown', '/popular?cursor=invalid']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  }
});

test('Yavaş sunucu yanıtında filtre temizleme eski scope ile tekrar gönderilmemeli', async ({ page, baseURL }) => {
  await page.goto('/?q=missing&platform=Web&category=11111111-1111-4111-8111-111111111111', { waitUntil: 'domcontentloaded' });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === new URL(baseURL!).origin && new URL(route.request().url()).pathname === '/') await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fallback();
  });
  await page.getByRole('button', { name: 'Filtreleri Temizle', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(page.getByText('M1 Yeni Proje', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(800); // catches a late debounce that would restore the old filter scope
  expect(new URL(page.url()).search).toBe('');
});
