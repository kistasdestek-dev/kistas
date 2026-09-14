const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  for (const width of [1440, 390, 320]) {
   const page = await browser.newPage({ viewport: { width, height: 900 } });
   const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   let submissions = 0;
   await page.route('**/auth/v1/token*', async route => {
    submissions++;
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) });
   });
   await page.goto('http://127.0.0.1:8091');
   await page.waitForTimeout(1200);
   const tab = page.getByRole('tab', { name: 'Profil', exact: true });
   if (await tab.count()) await tab.click();
   else await page.getByRole('button', { name: 'Profil', exact: true }).first().click();
   const root = page.locator('#kistas-auth-experience');
   await root.waitFor();
   await page.waitForTimeout(400);
   await page.screenshot({ path: `scratch/auth-${width}-login.png` });
   const email = root.getByRole('textbox', { name: 'E-posta adresi', exact: true });
   await email.fill('invalid');
   await email.press('Enter');
   await root.getByRole('alert').waitFor();
   assert.equal(submissions, 0);
   await email.fill('preview@example.com');
   await email.press('Enter');
   const password = root.getByLabel('Şifre', { exact: true });
   await password.fill('123');
   await password.press('Enter');
   assert.equal(submissions, 0);
   await password.fill('test-only-password');
   await password.press('Enter');
   await password.press('Enter');
   await page.waitForTimeout(700);
   assert.equal(submissions, 1);
   await root.getByRole('alert').waitFor();
   await root.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();
   await root.getByRole('textbox', { name: 'E-posta adresi', exact: true }).fill('preview@example.com');
   await root.getByRole('button', { name: 'Devam et', exact: true }).click();
   await root.getByLabel('Şifre', { exact: true }).fill('test-only-password');
   await root.getByRole('button', { name: 'Şifreyle devam et', exact: true }).click();
   await root.getByRole('textbox', { name: 'Ad soyad', exact: true }).fill('Preview Test');
   await root.getByLabel('Şifreyi doğrula', { exact: true }).fill('different-password');
   await root.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
   await root.getByText('Şifreler birbiriyle uyuşmuyor.', { exact: true }).waitFor();
   await root.getByLabel('Şifreyi doğrula', { exact: true }).fill('test-only-password');
   await root.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
   await root.getByText('KVKK Aydınlatma Metni’ni onaylayın.', { exact: true }).waitFor();
   assert.equal(await root.getByRole('checkbox', { checked: true }).count(), 0);
   await page.screenshot({ path: `scratch/auth-${width}-register.png` });
   const overflows = await root.evaluate(el => [...el.querySelectorAll('input,[role=button]')].filter(node => {
    const box=node.getBoundingClientRect(); return box.width>0 && (box.left < -1 || box.right > innerWidth+1);
   }).length);
   assert.equal(overflows, 0);
   assert.deepEqual(errors, []);
   await page.close();
   console.log(`${width}px: login, registration validation, single request, no horizontal overflow passed`);
  }
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
