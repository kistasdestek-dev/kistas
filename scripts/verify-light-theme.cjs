const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8091');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.resolve(`scratch/light-${width}-discover.png`) });
    const search = page.locator('#isc-q');
    await search.fill('Trendyol');
    if (await search.inputValue() !== 'Trendyol') throw new Error('Search input failed');
    await search.fill('');
    const browse = page.getByRole('tab', { name: 'Göz At', exact: true });
    if (await browse.count()) await browse.click();
    else await page.getByRole('button', { name: 'Göz At', exact: true }).first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.resolve(`scratch/light-${width}-browse.png`) });
    const profile = page.getByRole('tab', { name: 'Profil', exact: true });
    if (await profile.count()) await profile.click();
    else await page.getByRole('button', { name: 'Profil', exact: true }).first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.resolve(`scratch/light-${width}-login.png`) });
    console.log(`${width}px: search, browse, login checked`);
    await page.close();
  }
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
})().catch(error => { console.error(error); process.exitCode = 1; });
