import { test, expect } from './fixtures';
import { launchSession, launchUsers } from '../../../scripts/tests/private-launch-fixture.mjs';
import type { BrowserContext } from '@playwright/test';

const key='sb-iojgqicgeztqwkbetboa-auth-token';
const archiveLifetime=72*60*60*1000;
async function signIn(context: BrowserContext, baseURL: string, id=launchUsers[0]) {
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(baseURL).origin
    ? route.continue() : route.abort('blockedbyclient'));
  const session=launchSession(id);
  await context.clearCookies();
  await context.addCookies([{name:key,value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,url:baseURL}]);
  await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key,session});
}

test('Kesinti ve kapanma sonrası metin cihazdan geri yüklenmeli; bağlantıda hesap arşivine gitmeli',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);
  await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();
  const url=page.url(); const id=new URL(url).searchParams.get('archive')!;
  await context.setOffline(true);
  await page.getByPlaceholder('Örn: Kıstas').fill('Kesintide kalan lansman');
  await page.getByPlaceholder('Projenizin hikayesi, çözdüğü problem ve sunduğu yenilikler...').fill('İnternet kesildiğinde de açıklamam korunmalı.');
  await expect.poll(()=>page.evaluate(id=>{
    const raw=localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`);return raw?JSON.parse(raw).payload.description:null;
  },id)).toBe('İnternet kesildiğinde de açıklamam korunmalı.');
  await page.close(); await context.setOffline(false);
  const restored=await context.newPage(); await restored.goto(url,{waitUntil:'domcontentloaded'});
  await expect(restored.getByPlaceholder('Örn: Kıstas')).toHaveValue('Kesintide kalan lansman');
  await expect(restored.getByPlaceholder('Projenizin hikayesi, çözdüğü problem ve sunduğu yenilikler...')).toHaveValue('İnternet kesildiğinde de açıklamam korunmalı.');
  await expect.poll(async()=>{const response=await context.request.get(`/api/launch-drafts?id=${id}`);return response.ok()?(await response.json()).payload.title:null;}).toBe('Kesintide kalan lansman');
  await restored.getByRole('link',{name:'Lansman Arşivim',exact:true}).click();
  await expect(restored.getByRole('link',{name:/Kesintide kalan lansman/})).toBeVisible();
});

test('Çevrimdışı seçilen görsel dosyası sayfa kapandıktan sonra aynı cihazda korunmalı',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible(); const url=page.url();
  await context.setOffline(true);await page.getByPlaceholder('Örn: Kıstas').fill('Görselli arşiv');
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Proje logosu yükle',exact:true}).click();
  await (await chooser).setFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2n0AAAAASUVORK5CYII=','base64')});
  await expect(page.getByAltText('Logo Önizleme')).toHaveAttribute('src',/^blob:/);
  await page.close();await context.setOffline(false);
  const restored=await context.newPage();await restored.goto(url,{waitUntil:'domcontentloaded'});
  await expect(restored.getByPlaceholder('Örn: Kıstas')).toHaveValue('Görselli arşiv');
  await expect(restored.getByAltText('Logo Önizleme')).toHaveAttribute('src',/^blob:/);
});

test('Hesap değişiminde başka kullanıcının yerel ve sunucu arşivi gösterilmemeli; çapraz origin yazma reddedilmeli',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible(); const id=new URL(page.url()).searchParams.get('archive')!;
  await page.getByPlaceholder('Örn: Kıstas').fill('A hesabının özel lansmanı');
  await expect.poll(async()=> (await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(200);
  await signIn(context,baseURL!,launchUsers[1]);await page.goto('/launch-archive',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Lansman Arşivim'})).toBeVisible();
  await expect(page.getByRole('link',{name:/A hesabının özel lansmanı/})).toHaveCount(0);
  expect((await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(404);
  expect((await context.request.post('/api/launch-drafts',{headers:{Origin:'https://evil.example'},data:{}})).status()).toBe(403);
});

test('Hesaba kaydedilen taslak başka cihazdan devam ettirilmeli; her yeni lansman ayrı arşiv açmalı',async({page,context,browser,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();const url=page.url();const id=new URL(url).searchParams.get('archive')!;
  await page.getByPlaceholder('Örn: Kıstas').fill('Başka cihazdan devam');
  await expect.poll(async()=> (await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(200);
  const other=await browser.newContext();try{
    await signIn(other,baseURL!);const tab=await other.newPage();await tab.goto(url,{waitUntil:'domcontentloaded'});
    await expect(tab.getByPlaceholder('Örn: Kıstas')).toHaveValue('Başka cihazdan devam');
    await tab.goto('/create-listing',{waitUntil:'domcontentloaded'});await expect(tab.getByPlaceholder('Örn: Kıstas')).toHaveValue('');
    expect(new URL(tab.url()).searchParams.get('archive')).not.toBe(id);
  }finally{await other.close();}
});

test('Arşiv kaydı tamamlanıp yanıt kaybolursa yeniden açılışta aynı içerik güvenle uzlaştırılmalı',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();const url=page.url();
  let saved!:()=>void;const committed=new Promise<void>(resolve=>{saved=resolve;});
  await page.route('**/api/launch-drafts',async route=>{
    if(route.request().method()!=='POST') return route.continue();
    const response=await route.fetch();expect(response.ok()).toBe(true);saved();await route.abort('failed');
  });
  await page.getByPlaceholder('Örn: Kıstas').fill('Yanıtı kaybolan arşiv');await committed;
  await page.unroute('**/api/launch-drafts');await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toHaveValue('Yanıtı kaybolan arşiv');
  await expect(page.getByRole('button',{name:'Bu kopyayı yeni lansman olarak aç'})).toHaveCount(0);
  expect(page.url()).toBe(url);
});

test('İki cihaz aynı arşivi değiştirirse son kopya kaybolmamalı ve yeni lansman olarak açılabilmeli',async({page,context,browser,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();const url=page.url();const id=new URL(url).searchParams.get('archive')!;
  await page.getByPlaceholder('Örn: Kıstas').fill('Ortak arşiv');
  await expect.poll(async()=> (await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(200);
  const other=await browser.newContext();try{
    await signIn(other,baseURL!);const tab=await other.newPage();await tab.goto(url,{waitUntil:'domcontentloaded'});
    await expect(tab.getByPlaceholder('Örn: Kıstas')).toHaveValue('Ortak arşiv');
    await page.getByPlaceholder('Örn: Kıstas').fill('Birinci cihazın değişikliği');
    await expect.poll(async()=> (await (await context.request.get(`/api/launch-drafts?id=${id}`)).json()).payload.title).toBe('Birinci cihazın değişikliği');
    await tab.getByPlaceholder('Örn: Kıstas').fill('İkinci cihazın korunacak kopyası');
    await tab.getByRole('button',{name:'Bu kopyayı yeni lansman olarak aç'}).click();
    await expect.poll(()=>new URL(tab.url()).searchParams.get('archive')).not.toBe(id);
    await expect(tab.getByPlaceholder('Örn: Kıstas')).toHaveValue('İkinci cihazın korunacak kopyası');
    expect(new URL(tab.url()).searchParams.get('archive')).not.toBe(id);
    expect((await (await context.request.get(`/api/launch-drafts?id=${id}`)).json()).payload.title).toBe('Birinci cihazın değişikliği');
  }finally{await other.close();}
});

test('Başka cihazdan gönderilen arşiv bu cihazdaki yeni çevrimdışı değişiklikleri silmemeli',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();const id=new URL(page.url()).searchParams.get('archive')!;
  await page.getByPlaceholder('Örn: Kıstas').fill('Gönderilecek eski kopya');
  await expect.poll(async()=> (await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(200);
  await context.setOffline(true);await page.getByPlaceholder('Örn: Kıstas').fill('Cihazdaki yeni çalışma');
  await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`)!).payload.title,id)).toBe('Cihazdaki yeni çalışma');
  await page.route('**/api/launch-drafts',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
  await page.route('**/api/launch-drafts?*',async route=>{
    const response=await route.fetch();const body=await response.json();
    await route.fulfill({response,json:{...body,state:'submitted'}});
  });
  await context.setOffline(false);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toHaveValue('Cihazdaki yeni çalışma');
  await expect(page.getByRole('button',{name:'Bu kopyayı yeni lansman olarak aç'})).toBeVisible();
  expect(await page.evaluate(id=>localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`)!==null,id)).toBe(true);
});

test('Cihaz depolaması doluysa yanlış saklama güvencesi verilmemeli ve online hesap kaydı devam etmeli',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);
  await context.addInitScript(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key.startsWith('kistas:launch:')) throw new DOMException('Test quota','QuotaExceededError');original.call(this,key,value);};
  });
  await page.goto('/create-listing',{waitUntil:'domcontentloaded'});await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();
  const id=new URL(page.url()).searchParams.get('archive')!;
  await page.getByPlaceholder('Örn: Kıstas').fill('Cihaz doluyken hesap arşivi');
  await expect.poll(async()=>{const response=await context.request.get(`/api/launch-drafts?id=${id}`);return response.ok()?(await response.json()).payload.title:null;}).toBe('Cihaz doluyken hesap arşivi');
  await expect(page.getByRole('status')).toContainText('Hesap arşivinde kaydedildi');
  await expect(page.getByRole('status')).toContainText('cihaz depolaması dolu veya kapalı');
});

test('72 saati geçmiş cihaz arşivi ve dosyaları temizlenmeli; eski URL arşivi yeniden oluşturmamalı',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();const url=page.url();const id=new URL(url).searchParams.get('archive')!;
  await context.setOffline(true);await page.getByPlaceholder('Örn: Kıstas').fill('Süresi dolacak cihaz arşivi');
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Proje logosu yükle',exact:true}).click();
  await (await chooser).setFiles({name:'old.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2n0AAAAASUVORK5CYII=','base64')});
  await expect(page.getByAltText('Logo Önizleme')).toHaveAttribute('src',/^blob:/);
  await page.evaluate(({id,lifetime})=>{
    const key=`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`;
    const value=JSON.parse(localStorage.getItem(key)!);value.updatedAt=new Date(Date.now()-lifetime-1000).toISOString();localStorage.setItem(key,JSON.stringify(value));
  },{id,lifetime:archiveLifetime});
  await page.close();await context.setOffline(false);const restored=await context.newPage();
  await restored.goto(url,{waitUntil:'domcontentloaded'});
  await expect(restored.getByRole('status')).toContainText('72 saatlik saklama süresi doldu');
  expect(await restored.evaluate(id=>localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`),id)).toBeNull();
  await expect.poll(()=>restored.evaluate(id=>new Promise<number>((resolve,reject)=>{
    const request=indexedDB.open('kistas-launch-assets',1);request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result;const tx=db.transaction('images','readonly');const keys=tx.objectStore('images').getAllKeys();keys.onsuccess=()=>{resolve(keys.result.filter(key=>String(key).startsWith(`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}:`)).length);db.close();};};
  }),id)).toBe(0);
  expect((await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(404);
});

test('72 saatlik süre düzenlemeyle yenilenmeli; açık form sessiz kaldığında süresi dolmalı',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.clock.install();
  await page.goto('/create-listing',{waitUntil:'domcontentloaded'});await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();
  const id=new URL(page.url()).searchParams.get('archive')!;await context.setOffline(true);
  await page.getByPlaceholder('Örn: Kıstas').fill('İlk kayıt');
  await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`)!).payload.title,id)).toBe('İlk kayıt');
  await page.clock.fastForward(archiveLifetime-60000);
  await page.getByPlaceholder('Örn: Kıstas').fill('Son düzenleme süreyi yeniledi');
  await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`)!).payload.title,id)).toBe('Son düzenleme süreyi yeniledi');
  await page.clock.fastForward(120000);
  await expect(page.getByPlaceholder('Örn: Kıstas')).toHaveValue('Son düzenleme süreyi yeniledi');
  expect(await page.evaluate(id=>localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`)!==null,id)).toBe(true);
  await page.clock.fastForward(archiveLifetime);
  await expect(page.getByRole('status')).toContainText('72 saatlik saklama süresi doldu');
  expect(await page.evaluate(id=>localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`),id)).toBeNull();
});

test('Arşiv listesi art arda duran birden çok süresi dolmuş cihaz kaydını atlamadan temizlemeli',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();await context.setOffline(true);
  await page.getByPlaceholder('Örn: Kıstas').fill('Liste temizliği için şablon');const id=new URL(page.url()).searchParams.get('archive')!;
  const expired=await page.evaluate(({id,lifetime})=>{
    const prefix='kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:';const source=JSON.parse(localStorage.getItem(prefix+id)!);
    const ids=[crypto.randomUUID(),crypto.randomUUID()];for(const item of ids)localStorage.setItem(prefix+item,JSON.stringify({...source,id:item,updatedAt:new Date(Date.now()-lifetime-1000).toISOString(),payload:{...source.payload,title:'Eski ve silinecek kayıt'}}));
    return ids;
  },{id,lifetime:archiveLifetime});
  await page.close();await context.setOffline(false);const archive=await context.newPage();await archive.goto('/launch-archive',{waitUntil:'domcontentloaded'});
  await expect(archive.getByRole('link',{name:/Liste temizliği için şablon/})).toBeVisible();
  await expect(archive.getByRole('link',{name:/Eski ve silinecek kayıt/})).toHaveCount(0);
  expect(await archive.evaluate(ids=>ids.every(id=>localStorage.getItem(`kistas:launch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${id}`)===null),expired)).toBe(true);
});

test('Hesaptaki arşivin süresi dolsa da cihazda daha yeni çevrimdışı çalışma korunmalı',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);await page.goto('/create-listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toBeVisible();const id=new URL(page.url()).searchParams.get('archive')!;
  await page.getByPlaceholder('Örn: Kıstas').fill('Hesapta eski çalışma');
  await expect.poll(async()=> (await context.request.get(`/api/launch-drafts?id=${id}`)).status()).toBe(200);
  await context.setOffline(true);await page.getByPlaceholder('Örn: Kıstas').fill('Cihazda daha yeni çalışma');
  await page.route('**/api/launch-drafts',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
  await page.route('**/api/launch-drafts?*',route=>route.fulfill({status:410,json:{error:'DRAFT_EXPIRED'}}));
  await context.setOffline(false);await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByPlaceholder('Örn: Kıstas')).toHaveValue('Cihazda daha yeni çalışma');
  await expect(page.getByRole('button',{name:'Bu kopyayı yeni lansman olarak aç'})).toBeVisible();
});

test('Cihaz kopyası yokken hesap arşivine ulaşılamazsa aynı kimlikle boş arşiv oluşturulmamalı',async({page,context,baseURL})=>{
  await signIn(context,baseURL!);let saves=0;
  await page.route('**/api/launch-drafts?*',route=>route.fulfill({status:503,json:{error:'ARCHIVE_UNAVAILABLE'}}));
  await page.route('**/api/launch-drafts',route=>{if(route.request().method()==='POST')saves++;return route.continue();});
  await page.goto('/create-listing?archive=99999999-9999-4999-8999-999999999999',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('status')).toContainText('Bağlantınızı kontrol edip sayfayı yeniden açın');
  await expect(page.getByPlaceholder('Örn: Kıstas')).toHaveCount(0);expect(saves).toBe(0);
});
