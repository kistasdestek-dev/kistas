import { test, expect } from './fixtures';
import { launchSession } from '../../../scripts/tests/private-launch-fixture.mjs';

const category = '11111111-1111-4111-8111-111111111111';
const start = Date.parse('2026-09-29T12:59:50Z');
const makeCard = (title: string, expiry = start + 3600000) => ({
  id: title, category_id: category, title, tagline: 'Sponsor testi', description: '', platforms: ['Web'],
  developer_name: 'Test Maker', logo_url: '/kistas-logo-256.webp', images: [], upvote_count: 0,
  created_at: '2026-09-01T12:00:00Z', is_boosted: true, boosted_until: new Date(expiry).toISOString(), category_boosted_until: null,
});

test('Sponsor endpoint kategori havuzunu birleştirir ve önbelleksiz doğrulanmış veri döndürür', async ({ request }) => {
  const general = await request.get('/api/discovery/sponsors');
  expect(general.headers()['cache-control']).toContain('no-store');
  expect((await general.json()).items.map((card: { title: string }) => card.title)).toEqual(['M1 Sponsor Projesi']);
  const scoped = await request.get(`/api/discovery/sponsors?category=${category}&platform=Web`);
  const items = (await scoped.json()).items;
  expect(items.map((card: { title: string }) => card.title).sort()).toEqual(['Kategori Sponsor Projesi', 'M1 Sponsor Projesi']);
  expect(items.every((card: { is_boosted: boolean }) => card.is_boosted)).toBe(true);
  for (const query of ['platform=bad', 'category=bad', 'q=a&q=b']) {
    const invalid = await request.get('/api/discovery/sponsors?' + query);
    expect(invalid.status()).toBe(400);
    expect(invalid.headers()['cache-control']).toContain('no-store');
  }
});

test('Açık vitrin saat başında yenilenir; hata halinde süresi dolan kart kaldırılır, geçerli kart korunur', async ({ page }) => {
  await page.clock.install({ time: start });
  let calls = 0;
  await page.route('**/api/discovery/sponsors*', async route => {
    calls++;
    if (calls > 2) return route.fulfill({ status: 503, json: { error: 'SPONSORS_UNAVAILABLE' } });
    return route.fulfill({ json: { timestamp: calls === 1 ? start : start + 11000,
      items: [makeCard(calls === 1 ? 'Canlı A' : 'Canlı B', start + 25000), makeCard('Kalıcı C')] } });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Canlı A' })).toBeVisible();
  await page.clock.fastForward(11000);
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Canlı B' })).toBeVisible();
  await page.clock.fastForward(15000);
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Canlı B' })).toHaveCount(0);
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Kalıcı C' })).toBeVisible();
  expect(calls).toBe(3);
  await page.clock.fastForward(60000);
  await expect.poll(() => calls).toBe(4);
});

test('Geciken eski filtre yanıtı yeni sponsor kapsamını geri getiremez', async ({ page }) => {
  let release: (() => void) | undefined;
  await page.route('**/api/discovery/sponsors*', async route => {
    const query = new URL(route.request().url()).searchParams;
    if (!query.has('category')) {
      await new Promise<void>(resolve => { release = resolve; });
      return route.fulfill({ json: { timestamp: Date.now(), items: [makeCard('Eski Kapsam', Date.now() + 3600000)] } }).catch(() => {});
    }
    return route.fulfill({ json: { timestamp: Date.now(), items: [makeCard('Yeni Kapsam', Date.now() + 3600000)] } });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('button', { name: 'Kategoriler', exact: true }).click();
  await page.getByRole('button', { name: 'Geliştirici Araçları', exact: true }).click();
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Yeni Kapsam' })).toBeVisible();
  release!();
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Eski Kapsam' })).toHaveCount(0);
});

test('Gizli sekmede yenileme durur ve sekme görünür olunca hemen devam eder', async ({ page }) => {
  await page.clock.install({ time: start });
  let calls = 0;
  await page.route('**/api/discovery/sponsors*', route => {
    calls++;
    return route.fulfill({ json: { timestamp: start, items: [makeCard('Sekme Sponsoru')] } });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.crd-f3d-title-hero', { hasText: 'Sekme Sponsoru' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(120000);
  expect(calls).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => calls).toBe(2);
});

test('Kategori paketi sunucu action ile alınır; profil yenilenir ve diğer açık vitrin bilgilendirilir', async ({ page, context, baseURL }) => {
  const key = 'sb-iojgqicgeztqwkbetboa-auth-token';
  const session = launchSession();
  await context.addCookies([{ name: key, value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: baseURL! }]);
  await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key, session });
  const showcase = await context.newPage();
  let calls = 0;
  await showcase.route('**/api/discovery/sponsors*', route => {
    calls++;
    return route.fulfill({ json: { timestamp: Date.now(), items: [makeCard('Açık Vitrin', Date.now() + 3600000)] } });
  });
  await showcase.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => calls).toBe(1);
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(history.state?.__kistasNavigation))).toBe(true);
  await page.getByRole('button', { name: 'Reddet', exact: true }).click();
  let purchases = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && request.headers()['next-action']) purchases++;
  });
  await page.getByRole('button', { name: 'Sponsor Yap', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: /Kategori Vitrini/ }).click();
  await modal.getByRole('button', { name: /Projeyi Öne Çıkar.*50 Kredi/ }).evaluate(button => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect(modal.getByRole('status')).toContainText('görünürlüğü etkinleştirildi');
  await expect(page.getByText('4.950', { exact: true }).first()).toBeVisible();
  expect(purchases).toBe(1);
  await showcase.bringToFront();
  await expect.poll(() => calls).toBeGreaterThanOrEqual(2);
  await page.bringToFront();
  await modal.getByRole('button', { name: 'Tamam', exact: true }).click();
  await page.getByRole('button', { name: 'Sponsor Yap', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/mevcut görünürlük/)).toBeVisible();
  await showcase.close();
});
