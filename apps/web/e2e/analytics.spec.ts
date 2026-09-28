import { expect, test } from './fixtures';

test('GA4 yalnız açık rıza sonrası yüklenmeli ve güvenli page_view göndermeli', async ({ page, baseURL }) => {
  const googleTagRequests: string[] = [];

  await page.route('https://www.googletagmanager.com/**', async (route) => {
    googleTagRequests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });

  await page.goto('/?access_token=TEST_SECRET#refresh_token=TEST_SECRET', {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('region', { name: 'Analitik çerez tercihi' })).toBeVisible();
  expect(googleTagRequests).toHaveLength(0);
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();

  await page.getByRole('button', { name: 'Kabul et' }).click();
  await expect.poll(() => googleTagRequests.length).toBe(1);

  const analyticsState = await page.evaluate(() => ({
    commands: window.dataLayer?.map((command) => Array.from(command)) ?? [],
    disabled: (window as unknown as Record<string, unknown>)['ga-disable-G-2XXP5LHME9'],
  }));

  expect(analyticsState.disabled).toBe(false);
  expect(JSON.stringify(analyticsState.commands)).not.toContain('TEST_SECRET');
  expect(analyticsState.commands).toEqual(
    expect.arrayContaining([
      expect.arrayContaining([
        'event',
        'page_view',
        expect.objectContaining({
          page_path: '/',
          page_location: `${new URL(baseURL!).origin}/`,
          send_to: 'G-2XXP5LHME9',
        }),
      ]),
    ]),
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Analitik çerez tercihi' })).toHaveCount(0);
  await expect.poll(() => googleTagRequests.length).toBe(2);
});

test('Reddedilen analitik tercihi gezinme ve yenilemede korunmalı', async ({ page }) => {
  const requests: string[] = [];
  await page.route('https://www.googletagmanager.com/**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Reddet' }).click();
  await expect(page.getByRole('region', { name: 'Analitik çerez tercihi' })).toHaveCount(0);
  await page.goto('/browse', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Analitik çerez tercihi' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('kistas_analytics_consent_v1'))).toBe('denied');
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
  expect(requests).toEqual([]);
});
