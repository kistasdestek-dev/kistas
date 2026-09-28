import { test, expect } from './fixtures';
import { launchSession } from '../../../scripts/tests/private-launch-fixture.mjs';

test('Geri geçmişi filtreli URL ve kaydırmayı korur; hızlı çift tıklama tek adım döner', async ({ page }) => {
  const origin = '/?platform=Web';
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(history.state?.__kistasNavigation))).toBe(true);
  await page.getByRole('link',{name:'Popüler Projeler sayfasını aç',exact:true}).scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(()=>window.scrollY);
  await page.getByRole('link',{name:'Popüler Projeler sayfasını aç',exact:true}).click();
  await expect(page.getByRole('button',{name:'Geri dön',exact:true})).toBeVisible();
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/popular');
  await page.getByRole('button',{name:'Geri dön',exact:true}).dblclick();
  await expect.poll(()=>new URL(page.url()).pathname+new URL(page.url()).search).toBe(origin);
  await expect.poll(()=>page.evaluate(savedScroll=>Math.abs(window.scrollY - savedScroll),scroll)).toBeLessThanOrEqual(2);
  await page.goForward({waitUntil:'domcontentloaded'});
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/popular');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(history.state?.__kistasNavigation))).toBe(true);
  await page.getByRole('button',{name:'Geri dön',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).pathname+new URL(page.url()).search).toBe(origin);
});

test('Doğrudan gelen ziyaretçi ve reduced-motion güvenli geri döner', async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/new',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Geri dön',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/');
});

test('Sol kenar kaydırması tek geri adımı üretir; dikey, kısa, galeri ve dialog hareketleri korunur', async ({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'Yeni Çıkanlar sayfasını aç',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/new');
  const swipe=async(dx:number,dy:number,mode='normal')=>page.evaluate(({dx,dy,mode})=>{
    const target=document.createElement('div'); target.dataset.testSwipe='true'; target.style.cssText='width:100px;height:10px';
    if(mode==='gallery'){target.style.cssText='width:100px;overflow-x:scroll';target.innerHTML='<div style="width:400px;height:10px"></div>';}
    if(mode==='dialog')target.setAttribute('aria-modal','true');
    document.body.append(target);
    const touch=(x:number,y:number)=>new Touch({identifier:1,target,clientX:x,clientY:y});
    target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(10,200)]}));
    target.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch(10+dx,200+dy)]}));
    target.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[touch(10+dx,200+dy)]}));
    target.remove();
  },{dx,dy,mode});
  await swipe(30,0); await swipe(10,100); await swipe(130,0,'gallery'); await swipe(130,0,'dialog');
  expect(new URL(page.url()).pathname).toBe('/new');
  await swipe(130,5);
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/');
});

test('Yönetim projeleri mobil kartlarla taşmadan filtrelenir ve mevcut modallar açılır',async({page,context,baseURL})=>{
  const key='sb-iojgqicgeztqwkbetboa-auth-token'; const session=launchSession();
  await context.addCookies([{name:key,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:baseURL!}]);
  await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key,session});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/admin',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(history.state?.__kistasNavigation))).toBe(true);
  await page.getByRole('button',{name:/Toplam proje/}).click();
  await expect(page.getByRole('heading',{name:'Proje Moderasyonu'})).toBeVisible();
  await expect(page.locator('article')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Yayında',exact:true}).click();
  await expect(page.locator('article')).toHaveCount(1);
  const reject=page.getByRole('button',{name:'Reddet',exact:true});
  if(await reject.isVisible()) await reject.click();
  await page.locator('article').scrollIntoViewIfNeeded();
  await page.screenshot({path:'../../reports/admin-projects-mobile.png',fullPage:true});
  for(const width of [320,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(await page.locator('article').evaluate(element=>getComputedStyle(element.parentElement!).gridTemplateColumns.split(' ').length)).toBe(width>=1024?2:1);
  }
  await page.screenshot({path:'../../reports/admin-projects-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Destek Ver',exact:true}).click();
  await expect(page.getByText('YÖNETİM DESTEĞİ',{exact:true})).toBeVisible();
});
