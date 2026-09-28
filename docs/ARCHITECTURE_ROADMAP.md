# KISTAS Mimari Gelişim Yol Haritası

Tarih: 2026-09-28. Durum: M0/M1/M2 ve retention canlıya yayınlandı; gerçek oturum/eşzamanlılık kabul sınırları devam ediyor; M3-M6 bekliyor. Güncel yayın: [RELEASE_2026-09-28.md](RELEASE_2026-09-28.md). Kanıt ve sınırlar: [M0_VALIDATION.md](M0_VALIDATION.md), [M1_VALIDATION.md](M1_VALIDATION.md), [M2_VALIDATION.md](M2_VALIDATION.md).

## Amaç ve çalışma şekli

Next.js App Router, Cloudflare Workers/vinext, Supabase ve mevcut monorepo üzerinde keşif doğruluğunu, mobil performansı ve veri bütünlüğünü geliştirmek.

- M0 bir hazırlık fazıdır; M1-M6 onaylanan altı mimari öneriyi kapsar. Bu numaralar önceki monorepo geçiş fazlarından bağımsızdır.
- Her fazda kapsam, başlangıç ölçümü, değişiklik, doğrulama, geri dönüş ve devir teslim kaydı tutulur. Kanıt olmadan faz tamamlandı sayılmaz.
- UI değişiklikleri ortak tasarım sistemini kullanır; mimari çalışma ayrı bir görsel yeniden tasarım değildir.
- Kullanıcıya ait ilgisiz değişiklikler korunur. Değişiklik öncesinde ZERO_CODE_POLICY ve ilgili güvenlik/dağıtım belgeleri okunur.
- Yerel geliştirme ve doğrulama, production migration veya dağıtım yetkisi anlamına gelmez. Canlı işlem için hazırlanmış paket ayrıca değerlendirilir.
- Her faz sonunda yedek ve temiz oturum için devir teslim önerilir; alınmamış yedek alınmış gibi kaydedilmez.

## Başlangıç kanıtı ve sınırları

Bu oturumun ilk incelemesinde dört workspace için önbelleksiz tip/lint kontrolleri, 30 test dosyası, Next ve vinext derlemeleri ve Workers dry-run başarılıydı. Domain paketi 85/85 başarılıydı. Sabitlenmiş yerel Workers paketinde Playwright 2 başarılı / 8 başarısız sonuçlandı.

- Beş gezinme testi `load` beklerken zaman aşımına uğradı; nedenleri ayrı ölçülmeli.
- İki cache testi vinext'in tarayıcıya dönen başlığıyla uyuşmuyor. Canlı OG, rozet ve ana sayfada CDN HIT görüldü; bu bulgu cache'in çalışmadığı anlamına gelmez.
- Analitik E2E testi artık bulunmayan tercih butonunu bekliyor. Mevcut kaynak testi bu butonun bulunmamasını bekliyor; test sözleşmeleri çelişiyor.
- Yetki testi `/create` adresini kullanıyor; gerçek korumalı rota `/create-listing`.
- Eski sistem radarı `src/`, bundle radarı Expo çıktısını inceliyor; yeni web kapsamı ve ölçülmeyen alanlar görünür olmalı.
- Aynı oturumda başka bir yayın süreci çalışma ağacını/build çıktılarını değiştirdi. Bu sonuçlar son commit'in release sertifikası değildir.
- Gerçek hesaplarla RLS izolasyonu, ödeme/OAuth yolculukları, eşzamanlı harcama ve kapasite testi henüz bu çalışmada doğrulanmadı.

## Fazlar

| Faz | Kapsam | Tamamlanma kanıtı | Durum |
|---|---|---|---|
| M0 | Ölçüm ve Workers test kapısı | 16/16 Workers E2E, monorepo radar, üç mobil lab koşusu; canlı/eksik kapsam açık | Yerelde tamamlandı |
| M1 | Sunucu tarafında keşif motoru | 74 kayıt fixture, ayrı akışlar, URL filtreleri, 30 kayıt cursor; 21/21 Workers E2E | Yerelde tamamlandı |
| M2 | Atomik proje/görsel kayıtları, özel arşiv ve saklama süreleri | 13 atomik + 15 retention PostgreSQL senaryosu, 35/35 Workers E2E; gerçek cron/Auth/Storage ve bağımsız bağlantı yarışları açık | Yerel paket hazır; canlı kabul bekliyor |
| M3 | Veritabanı, tipler ve ortam ayrımı | Sorgu planı kanıtı, tipli istemciler, tek ortam sözleşmesi | Bekliyor |
| M4 | Sunucu/istemci bileşen sınırları | Aynı davranışla ölçülmüş ilk yük JS ve etkileşim sonuçları | Bekliyor |
| M5 | İş olaylarına bağlı cache yenileme | Yayın/düzenleme/sponsorluk sonrası doğru içerik ve kullanıcı izolasyonu | Bekliyor |
| M6 | Güvenilir arka plan dağıtım işleri | Tekrar deneme, çökme ve mükerrer teslim testleri | Bekliyor |

### M0 — Ölçüm ve test kapısı

Hedef dosyalar: `apps/web/e2e/*`, `apps/web/playwright.config.ts`, `.github/workflows/quality.yml`, `scripts/system-check.mjs`, `scripts/engine/bundle-budget.mjs` ve ilgili mevcut testler.

1. E2E gezinmelerini gerekli içerik hazır olana kadar bekletecek şekilde düzenle; harici kaynak yüzünden bekleyen istekleri teşhis et. Zaman aşımını artırarak veya başarısız testleri atlayarak kapatma.
2. Gerçek korumalı rotaları misafir olarak dene; yalnız sayfanın açılmasını değil doğru giriş yönlendirmesini ve korumalı içeriğin yokluğunu doğrula.
3. Analitik testlerini mevcut ürün sözleşmesiyle tutarlı yap: rıza öncesi yüklememe, kabul/red ve tercih kalıcılığı. Tercihi yeniden yönetme davranışını sessizce ekleme veya eski teste uymak için kaldırılmış UI'ı geri getirme.
4. API içeriği, tarayıcı cache politikası ve Cloudflare edge HIT/yenileme kanıtını ayrı doğrula. Yerel emülatörde edge HIT bekleme; canlı/staging kanıtını ayrı kaydet.
5. Radarları yeni kaynak ve Workers çıktıları için ölçüm yapacak şekilde uyarlayıp eksik ölçümü açıkça bildir. Denetimin varsayılan modu kaynak/geçici dosya silmesin; temizliği açık seçenekle ayır.
6. Workers paketi üzerinde E2E'yi CI kapısına ekle. Dış servis verisi için güvenli ve tekrar üretilebilir test ortamı oluştur; erişilemeyen kontrolü başarılı sayma. Başarısız test yayın kapısını başarısız kılsın.
7. Belirlenmiş mobil cihaz/ağ profiliyle ilk yük JS, LCP/INP, sunucu yanıtı ve yavaş sorgular için başlangıç kaydı çıkar. Yerel süreleri gerçek kullanıcı ölçümü olarak sunma.

Çıkış: kapsam içindeki E2E temiz, kontrol kapsamı doğru, CI hatayı yutmuyor, başlangıç ölçümü belgeli. Production yetkisi gerektiren kontroller ayrı ve açıkça işaretli.

### M1 — Keşif motoru

Hedefler: `apps/web/src/app/page.tsx`, public keşif rotaları, `DiscoverExperienceClient.tsx`, `packages/supabase/src/queries/listings.ts` ve gerekli ortak kart tipleri.

- Sponsor, yeni ve popüler akışları sunucuda ayrı sorgula. İlk popüler 40 kayıt bütün akışların doğruluk kaynağı olmasın.
- Arama/kategori/platform/sıralama durumunu URL ve sunucu sorgularıyla ilişkilendir; uygun akışlarda cursor ve kararlı eşitlik sıralaması kullan.
- Kartlar için gereken minimum veri sözleşmesini çıkar. Mevcut sponsor süreleri ve deterministik adil rotasyon kurallarını koru.
- Sonuç bulunamaması, sınır tarihleri, eşit oy/tarih, silinen kayıt ve sayfalama sırasında değişen veri için test yaz.

Çıkış: 40 kayıt sınırının dışında kalan uygun projeler erişilebilir; geçersiz filtre/cursor güvenle reddedilir; art arda sayfalarda kararlı sonuç ve ölçülmüş payload vardır.

M1 sınırı: oyları değişmeyen kayıtlarda eşitlik ve silinme/eklenme senaryoları doğrulandı. Canlı oy değişimi tam transaction snapshot değildir; popüler sayfalarda kayıtlar yer değiştirebilir. DB query planı, kapasite ve production cache doğrulaması M3/M5 kapsamında sürer. Ayrıntılı kanıt ve geri dönüş: [M1_VALIDATION.md](M1_VALIDATION.md).

### M2 — Atomik yazma akışları

Hedefler: `apps/web/src/app/actions/listings.ts`, ilgili migration/RPC ve veri bütünlüğü testleri.

- Proje, görsel referansları ve inceleme durumunu tek PostgreSQL transaction içinde tamamla; RLS, sahiplik ve girdi sınırlarını uygula. Mimar'ın 2026-09-28 düzeltmesi: lansman kotası, içerik tekilleştirme ve gönderim idempotency mekanizması ekleme; her bilinçli paylaşım yeni lansman olabilir. Düzenleme sürüm kontrolü bu kuraldan ayrıdır.
- Formdan çıkış, internet kesintisi ve kapanma sonrası tamamlanmamış lansmanları özel arşivde koru. Metin cihazda, dosyalar IndexedDB'de tutulur; bağlantıda hesaba eşitlenir. Fiziksel dosya yüklemesi DB transaction'ına dahil değildir. Belirsiz/başarısız gönderimde dosyaları otomatik silme.
- Kredi/sponsorluk işlemlerindeki mevcut atomik ve tekrar gönderim korumalarını incele; çalışan kuralları tekrar uygulama.

Çıkış: görsel kaydı başarısızsa eski kayıt korunur; yarım inceleme/kayıt oluşmaz; özel arşiv kesintiden sonra devam eder. Farklı kullanıcı ve eşzamanlı düzenleme gerçek DB testleriyle doğrulanır; bilinçli tekrar paylaşım kısıtlanmaz. Yerel PostgreSQL/Workers kanıtı, staging ve canlı yayın kanıtından ayrı tutulur.

### M3 — Veri katmanı ve tip sözleşmeleri

M0 kapsam notu: mevcut SQL pattern scanner web/packages kaynaklarını henüz taramıyor. Kapsamı genişlet, yeni bulguları gerçek girdi/yetki sınırlarıyla ayrıştır; mevcut legacy tarama başarısını yeni katmanın doğrulaması sayma.

- Yavaş sorguları gerçek query planlarıyla ölç; gerekli birleşik/partial indeksleri sonuçlara göre seç. İndekslerin yazma maliyetini kaydet.
- Browser/server/query/RPC sınırlarında `Database` tipini bağla; değişen akışlardaki `any` ve gereksiz cast'leri kaldır.
- Public sorgular ve oturum istemcileri için tek ortam çözümleme sözleşmesi kur; yanlış ortamda production'a sessiz fallback olmasın.

Çıkış: ilgili sorgularda önce/sonra ölçümü; geliştirme/test/production hedeflerinin tutarlılığı; tip/lint ve yetki regresyonları temiz.

### M4 — Server Component ve küçük istemci sınırları

- Keşif sayfasının sunucuda üretilebilen içeriklerini Server Component yap; filtre, form, modal ve etkileşimleri küçük istemci sınırlarında tut.
- Profil/proje oluşturmayı sorumluluklarına göre böl. Dosyayı bölmenin tek başına JS boyutunu azaltmadığını ölçümlerde dikkate al.
- Mevcut 3D lazy-loading, erişilebilirlik, ortak glass bileşenleri ve kullanıcı durumunu koru.

Çıkış: M0 ile aynı cihaz/ağda ilk yük JS ve etkileşim karşılaştırması; hydration hatası ve davranış regresyonu yok. Ölçülmeyen FPS/hız kazanımı iddia edilmez.

### M5 — Cache ve yenileme

- Proje/kategori/akış etiketlerini ve güncellik hedeflerini tanımla; yayın, düzenleme ve sponsorluk işlemlerinin doğru kapsamı yenilemesini sağla.
- Kurulu vinext sürümünde etiket purge/yenileme desteğini gerçek Workers ortamında doğrula; süreye bağlı güvenli yenileme yolunu belgeleyerek koru.
- Kullanıcı profili, kredi ve mesaj verisini public cache'e sokma. OG/rozetin oy sayısını ne kadar gecikmeyle yansıtacağına açık bütçe koy.

Çıkış: mutation sonrası güncellik, CDN HIT/yenileme ve iki kullanıcı arasında cache izolasyonu testleri; kesinti/yenileme hatası davranışı belgeli.

### M6 — Arka plan dağıtım işleri

- Ölçümle ihtiyaç doğrulanırsa OG hazırlama, toplu bildirim ve mevcut dağıtım işleri için transaction ile yazılan olay kaydı + kuyruk tüketicisi kur.
- Retry/backoff, işlem kimliği, mükerrer teslim koruması, başarısız iş kuyruğu ve görünür hata kaydı tanımla.
- Kuyrukta aynı iş birden çok kez teslim edilebilir; aynı bildirimin/iş sonucunun çoğalmasını tüketici engellesin. Dışa mesaj gönderimi ayrıca yetkilendirilir.

Çıkış: DB commit ile kuyruk yayını arasındaki çökme, tüketici hatası ve mükerrer teslim testleri başarılı; desteklenmeyen operasyonel ihtiyaç için kuyruk eklenmez.

## Her fazın teslim kaydı

Faz / durum / ilgili commit ve dosyalar / başlangıç ve son ölçüm / çalıştırılan testler / açık riskler / migration ve geri dönüş / alınan yedek veya alınmadı / sonraki adım.

Bir fazın rollback'i sonraki şema değişikliklerini bozmayacak şekilde planlanır; canlı veritabanında kayıt kaybettiren geri alma uygulanmaz. Migration'lar staging kanıtı ve geri dönüş değerlendirmesi olmadan production'a taşınmaz.

## Devir teslim

2026-09-28: M0 ve M1 yerelde tamamlandı. Sıradaki M2 için proje/görsel yazma akışı ve mevcut atomik RPC'ler incelenip somut plan sunulacak. M0+M1 değişiklikleri çalışma ağacında; commit, deploy ve migration yapılmadı. Faz sonu yeni yedek alınmadı; temiz oturum için M1_VALIDATION.md devir teslim bloğunu kullan.
