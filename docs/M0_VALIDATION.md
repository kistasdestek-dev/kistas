# M0 — Workers test kapısı ve ölçüm altyapısı

> 28 Eylül 2026 canlı yayın güncellemesi: M0/M1/M2 web paketi yayınlandı; 000002/000003/000004 migration’ları uygulandı, RLS/grant ve üç aktif cron doğrulandı. Bu belgedeki yerel aşama/handoff kayıtları tarihsel sonuçlardır. Güncel canlı durum ve sınırlar: [RELEASE_2026-09-28.md](RELEASE_2026-09-28.md).

Tarih: 2026-09-28. Yerel doğrulama kaydı; production release sertifikası değildir. Mimar faz başlamadan önce yedek aldığını bildirdi. Bu fazda deploy, migration veya commit yapılmadı.

## Mimari genel bakış

Ürün iş mantığı korunarak CI, derlenmiş Workers paketini Miniflare üzerinde sabit public verilerle çalıştırır. Browser üçüncü tarafları izole eder; uygulama istekleri ve yerel assetler gerçek pakete gider. Font/emoji örnekleri yalnız test sunucusunda karşılanır; görsel testi piksel eşitliği değil PNG formatı ve 1200×630 boyut sözleşmesidir.

## Klasör yapısı ve tam implementasyon

- `apps/web/e2e/`: rıza, misafir yönlendirmeleri, bulunamayan proje, keşif, OG ve rozet testleri; ortak dış istek izolasyonu.
- `scripts/tests/start-workers-test-server.mjs`: pinli Wrangler'ın Miniflare seçenekleri, JS/WASM/Data modülleri, named Worker exportları ve asset binding'i.
- `scripts/tests/public-workers-fixture.mjs`: sabit proje/kategori; yalnız public GET okumaları, bilinmeyen tablo/hedef ve yazmalar için varsayılan ret.
- `scripts/system-check.mjs`, `scripts/engine/system-health.mjs`: monorepo envanteri, TypeScript AST metrikleri, komut sonuçları ve ölçüm kapsamı.
- `scripts/engine/bundle-budget.mjs`: Next/Workers client chunk envanteri, ayrı rota bütçesi; Brotli quality=4 tahmini.
- `scripts/tests/system-radar.test.mjs`: boş build, sıkıştırma, ayrı Brotli sınırı, kaynak kapsamı, AST ve eksik kanıt puanı; fixture yazma/hedef ret testleri.
- `scripts/measure-performance.mjs`: üç mobil laboratuvar koşusu; başlangıç JS, LCP/CLS/TTFB ve rıza tıklaması Event Timing gözlemi.
- `.github/workflows/quality.yml`: derleme/dry-run ardından Chromium kurulumu ve başarısızlığı yutmayan Workers E2E kapısı.
- `reports/m0-performance-baseline.json`, `reports/system-health.json`: tarihli makine okunabilir ölçümler.

Eski otomatik silme/healing akışı ve artık çağrılmayan regex tabanlı self-healing motoru kaldırıldı. Onu yalnız mevcut sayılmasına göre onaylayan eski test de kaldırıldı. Eski asenkron bundle testi senkron hale getirildi; kontrol artık gerçekten çalışıyor. Legacy uygulama kaynakları bu fazda topluca silinmedi; bazı mevcut regresyonlar onları halen kullanıyor.

## Veri akışı

`vinext build → dist/server + dist/client → test sunucusu → Supabase dış GET fixture → gerçek SSR/hydration → Playwright assertions`.

Sunucu dış GET'lerini taklit etmek, Supabase RLS/transaction doğrulaması değildir. Yeni tablo/RPC/Edge Function/yükleme/ödeme akışı eklenmedi. Test sunucusu secret binding'lerini kullanmaz ve hiçbir canlı yazmaya izin vermez.

## Uç durum ve hata yönetimi

Build veya fixture hazır değilse test sunucusu hata verir; production verisine geri düşmez. Bilinmeyen hedefler ve yazmalar reddedilir. Test sunucusu portu doluysa başka sunucuyu sessizce kullanmaz. Eksik tarama/ölçüm `unmeasured` olarak yazılır; hata veren komut sistem radarının exit code'unu başarısız yapar. Varsayılan radar dosya silmez; `--heal`/`--fix` reddedilir. Build/tip araçları üretilmiş cache dosyalarını güncelleyebilir.

Bulunamayan projede akış başladıktan sonra HTTP 200 görülebilir. Test 200/404 yanında gerçek 404 ekranını, `noindex` ve proje içeriğinin yokluğunu doğrular. Bu [Next.js'in belgelenmiş akış davranışıdır](https://nextjs.org/docs/app/api-reference/file-conventions/not-found); HTTP 200 tek başına başarılı proje sayılmaz. SEO için akış başlamadan 404 verme ihtiyacı M5'te ayrıca değerlendirilmelidir.

## Doğrulama

- Workers E2E: 16/16 başarılı; test atlama/retry yok. Sonuçlar yerel Windows/Chromium içindir. GitHub Actions Linux çalıştırması henüz gerçekleşmedi.
- Workspace TypeScript/lint: dört pakette önbelleksiz başarılı.
- Workspace regresyonları: 31 test dosyası; domain 84/84. Bir legacy healing varlık testi kaldırıldı, yeni davranış testleri eklendi.
- Next.js build, vinext build ve Wrangler deploy dry-run başarılı. Next build edge runtime kullanımı için deprecation uyarısı veriyor; burada runtime değişikliği yapılmadı.
- Dependency audit, tracked/staged secret taraması, XSS ve mevcut SQL pattern taraması başarılı. Pattern taramaları pentest değildir.
- Yeni SQL kapsamı hâlâ ölçülmemiştir: SQL scanner `src` ve Edge Functions/migration'ları tarıyor; web/packages kapsamının genişletilmesi ve bulguların ayrıştırılması M3'e kaydedildi. Secret taraması yeni untracked dosyaları henüz taramaz; yeni test/ölçüm dosyaları elle kontrol edildi, canlı credential içermez.
- Canlı public CDN okumaları ayrı `system-health.json` kanıtıdır; tarayıcıya gelen private başlık CDN cache başarısızlığı sayılmaz. HIT, yenileme ve kullanıcı izolasyonunun kanıtı değildir.

## Performans değerlendirmeleri

Güncel sayılar `reports/m0-performance-baseline.json` içinde tutulur. Pixel 5, 4× CPU, 150ms gecikme, 1,6Mbps indirme, 750Kbps yükleme; boş browser cache, hazır yerel Workers sunucusu, tek public fixture proje, dış browser istekleri engelli. Sunucu hazır olma isteği ve önceki koşular sunucu cache'ini ısıtabilir. Ana sayfa `Popüler Projeler` başlığı hazır + 2 saniyelik pencerede gözlenen scriptler sayılır; prefetch penceredeki JS sayısını değiştirebilir.

Son üç koşu: LCP medyanı 1.684ms, CLS 0, TTFB medyanı yaklaşık 103ms. Gözlenen JS 608.922–833.237 bayt; Brotli q=4 tahmini 189.173–259.421 bayt. Bunlar gözlem penceresine ve fixture'a aittir. Radar check puanı 69/100, kapsam %85; 7 başarılı, 4 uyarı, 2 ölçülmemiş, 0 başarısız. Uyarılar: geçici dizin envanteri, toplam chunk/rota ayrımı, büyük/hook yoğun bileşenler ve ana sayfa CDN `UPDATING`. OG/rozet HIT; ana sayfa yenileme tutarlılığı M5'te takip edilmeli.

LCP/CLS/TTFB laboratuvar gözlemidir. Event Timing ölçülen rıza tıklamasına aittir, gerçek kullanıcı INP'si değildir. PostgreSQL yavaş sorguları ve gerçek kullanıcı INP henüz ölçülmedi. Toplam client chunk boyutu lazy sayfaları da içerir; ilk yük bütçesiyle karşılaştırılmaz. Brotli yerel tahminidir, canlı transfer değildir. Sağlık puanı ölçüm/check puanıdır; güvenlik veya üretim hazır olma oranı değildir.

## Tekrar çalıştırma

```powershell
pnpm --filter @kistas/web build:vinext
pnpm test:e2e
pnpm measure:performance
pnpm check:system --e2e --live --report
```

`--live` yalnız production public GET yapar; RLS hesabı kullanmaz. `--static` komutları çalıştırmadan envanter çıkarır ve atlanan kontrolü başarılı saymaz. E2E varsayılan portu 8787, ölçüm portu 8788. `PLAYWRIGHT_TEST_BASE_URL`/`PERFORMANCE_BASE_URL` açık hedef verilirse yalnız o hedef kullanılır; CI varsayılanı fixture'dır.

## Geri dönüş ve Handoff State

M0 değişiklikleri test/CI/radar/ölçüm dosyalarıyla sınırlı; DB migration yok. Geri dönüşte yalnız M0 diff'i incelenerek geri alınır; eski radarın otomatik silme davranışını tekrar açmak yerine read-only radar korunmalıdır. Başka çalışma ağacı değişikliklerini topluca geri alma.

```text
Proje: C:\Users\mehmet.ozdemir\Desktop\KISTAS
Faz: M0 ölçüm ve Workers test kapısı tamamlandı; ürün mimarisi fazları M1-M6 bekliyor.
Plan: docs/ARCHITECTURE_ROADMAP.md
Kanıt: docs/M0_VALIDATION.md ve reports/*.json
M0: 16 Workers E2E, 31 regresyon dosyası, domain 84; Next/Workers build ve dry-run başarılı.
Sınırlar: local lab/fixture; gerçek INP, DB sorguları, RLS/ödeme/OAuth/eşzamanlılık ölçülmedi.
CI kodu hazır; remote Actions sonucu henüz yok. Deploy/commit/migration yapılmadı.
Sonraki: M1 — keşif akışlarını ilk popüler 40 kayıttan ayır, filtre/sıralama/arama sunucu + URL sözleşmesini planla.
Çalışma ağacı: M0 dosyaları henüz commit edilmedi; kullanıcı değişikliklerini koru.
Yeni oturum: bu belgeyi ve roadmap'i oku; M1 plan-first kapsamında somut planı sun.
Yedek: Mimar faz öncesi aldı; faz sonu yeni yedek önerilir, alınmış sayılmaz.
```
