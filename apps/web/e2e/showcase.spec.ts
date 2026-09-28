import { test, expect } from './fixtures';

const sections = [
  { title: 'Günün Vitrini', path: '/gunun-vitrini' },
  { title: 'Popüler Projeler', path: '/popular' },
  { title: 'Yeni Çıkanlar', path: '/new' },
];

test('Keşfet başlıkları ve glass ikonları ayrı doğru rotaları açmalı; footer ve eski buton olmamalı', async ({ page }) => {
  for (const { title, path } of sections) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Tümünü Gör', { exact: true })).toHaveCount(0);
    const headingLink = page.getByRole('heading', { name: title, exact: true }).getByRole('link');
    const iconLink = page.getByRole('link', { name: `${title} sayfasını aç`, exact: true });
    const href = await headingLink.getAttribute('href');
    expect(new URL(href!, 'http://fixture.local').pathname).toBe(path);
    await expect(iconLink).toHaveAttribute('href', href!);
    await headingLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
    await expect(page.locator('footer')).toHaveCount(0);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: `${title} sayfasını aç`, exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
  }
});

test('Günün Vitrini aynı seçkiyi ve kategori/platform kapsamını korumalı', async ({ page }) => {
  const category = '11111111-1111-4111-8111-111111111111';
  await page.goto(`/?category=${category}&platform=Web`, { waitUntil: 'domcontentloaded' });
  const homeCards = await page.locator('.day-showcase-card').evaluateAll(cards => cards.map(card => card.getAttribute('href')).sort());
  expect(homeCards.length).toBeGreaterThan(0);
  await page.getByRole('heading', { name: 'Günün Vitrini', exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Günün Vitrini' })).toBeVisible();
  const url = new URL(page.url());
  expect(url.pathname).toBe('/gunun-vitrini');
  expect(url.searchParams.get('category')).toBe(category);
  expect(url.searchParams.get('platform')).toBe('Web');
  await expect(page.locator('.showcase-gallery-card')).toHaveCount(homeCards.length);
  expect(await page.locator('.showcase-gallery-card').evaluateAll(cards => cards.map(card => card.getAttribute('href')).sort())).toEqual(homeCards);
  await expect(page.locator('.showcase-page-caption')).toContainText('Geliştirici Araçları · Web');
  const firstHref = await page.locator('.showcase-gallery-card').first().getAttribute('href');
  await page.locator('.showcase-gallery-card').first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(firstHref);
});

test('Yeni vitrin geçersiz filtreyi reddetmeli; boş arama gerçek boş durum göstermeli', async ({ page }) => {
  const response = await page.goto('/gunun-vitrini?category=not-a-uuid', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
  await page.goto('/gunun-vitrini?q=unmatched-showcase-term', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Bu seçkide henüz proje yok' })).toBeVisible();
  await expect(page.locator('.showcase-gallery-card')).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(0);
});

for (const { width, columns, name } of [
  { width: 390, columns: 1, name: 'mobile' },
  { width: 768, columns: 2, name: 'tablet' },
  { width: 1440, columns: 3, name: 'desktop' },
]) {
  test(`Günün Vitrini ${name} düzeni taşmamalı ve okunabilir kartlar göstermeli`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/gunun-vitrini', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.showcase-gallery-card').first()).toBeVisible();
    const layout = await page.locator('.showcase-gallery-grid').evaluate(element => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(layout).toEqual({ columns, overflow: false });
    await expect(page.locator('footer')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reddet', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reddet', exact: true })).toHaveCount(0);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `../../reports/showcase-${name}.png`, fullPage: width > 390, animations: 'disabled' });
  });
}
