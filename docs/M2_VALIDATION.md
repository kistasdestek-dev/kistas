# M2 — Atomik lansman ve kesintiye dayanıklı özel arşiv

Güncel saklama kuralı: Mimar'ın sonraki onayıyla arşiv son düzenlemeden 72 saat sonra sona erer. Bildirim 72 saat, son gerçek mesajdan sonra sessiz görüşme 30 gün; [RETENTION_VALIDATION.md](RETENTION_VALIDATION.md) bu devam paketinin tek kaynağıdır. Önceki M2 raporu saklama süresi eklenmeden önceki baseline'dır.

2026-09-28. Mimar'ın değiştirdiği kapsam: lansman adedi/sıklığı kısıtlanmaz; içerik tekilleştirme ve gönderim idempotency mekanizması yoktur. Kullanıcı bilinçli olarak aynı içeriği yeniden paylaşabilir. Taslak eşitleme ve proje düzenleme sürüm kontrolü, paylaşım kotasından ayrıdır.

Durum: uygulama ve yerel doğrulama paketi hazır. Yalnızca canlı Supabase ortamı bulunduğu Mimar tarafından belirtildi. Production migration/deploy ve gerçek oturumlarla canlı kabul testi yapılmadı; M2 production tamamlandı sayılmaz.

## Mimari genel bakış ve klasör yapısı

- `packages/shared/src/launch-drafts.ts`: tamamlanmamış formun sınırlı, özel veri sözleşmesi. Gönderilmiş projenin `draft` moderasyon durumundan farklıdır.
- `apps/web/src/lib/launch-archive.ts`: kullanıcı/draft kimliğiyle cihaz metadata kaydı; IndexedDB dosyaları, önizleme, sahipli upload, kopyalama ve yalnız kesin başarı sonrası yerel temizlik.
- `LaunchEditor.tsx`: cihazdan geri yükleme, 800 ms debounce, sıralı hesap eşitlemesi, online olunca tekrar deneme, çakışma/kayıp arşiv yanıtı yönetimi.
- `CreateListingExperienceClient.tsx`: mevcut form ve ortak tasarım; arşiv durumu/bağlantısı, kalıcı dosya seçimi ve açık paylaşım işlemi.
- `api/launch-drafts/route.ts`: kimlik kontrolü, aynı origin POST, 64 KiB body sınırı, payload doğrulama, özel/no-store okuma ve kontrollü taslak güncelleme.
- `launch-archive/page.tsx`, `LaunchArchiveClient.tsx`, profil bağlantısı: yarım kalan lansmanları gösterir; sunucu sayfaları 30 kayıt ve kısa başlık projection kullanır.
- `app/actions/listings.ts`: proje/görsel yazma zinciri kaldırıldı; yalnız `submit_launch` RPC. Diğer oy/yorum aksiyonları korunur.
- `supabase/migrations/20260928000002_atomic_launch_and_private_archive.sql`: proje sürümü, özel arşiv RLS, Storage origin ayarı, sahiplik/sürüm/atomik yazma RPC'leri ve inceleme temizliği.
- `scripts/tests/launch-atomic.test.mjs`: PostgreSQL WASM motorunda gerçek migration/functions, hata enjeksiyonu ve rol kontrolleri. `@electric-sql/pglite` yalnız geliştirme bağımlılığıdır; istemci/Worker çalışma zamanı bağımlılığı değildir.
- `apps/web/e2e/launch-archive.spec.ts`, `private-launch-fixture.mjs`: gerçek Workers/UI/API ile test Auth/PostgREST yanıtları. Dış servisler kapalı; fixture JWT gerçek bir oturum değildir.

Tam implementasyon bu kaynak dosyalarında; eski doğrudan create/update/delete-image zinciri kaldırıldı. Yeni API veya SQL hatası boş başarıya dönüştürülmez. Form gönderimi otomatik tekrarlanmaz.

## Veri akışı

`Form değişikliği → kullanıcıya ait localStorage metadata → 800 ms sonra yerel dosyaları upload → özel hesap arşivi`.

Dosya önce IndexedDB transaction'ı tamamlanarak saklanır. Referanslar `draft-asset:UUID`; cihaz Blob URL'leri veritabanına veya submit payload'ına yazılmaz. Upload tamamlanırsa URL cihazdaki dosya kaydına da yazılır; aynı eşitlemede yeniden upload edilmez. Upload yolu kullanıcı UUID'si + rastgele UUID'dir, `upsert:false` kullanır. Dosya/metadata cihazda kaldığı sürece bağlantı kesintisinden sonra devam edilir.

`Paylaş → arşivin hesap kaydını bekle → son formu doğrula → submit_launch transaction → proje + görsel ilişkileri + gerekirse review/audit + arşivi submitted yap → başarıdan sonra yerel kopyaları temizle`.

Veritabanı yeni lansmanda sahibini `auth.uid()` ile belirler ve moderasyon durumunu `draft` yapar. Düzenlemede satır kilidi/sürüm kontrolü; yeni görsel referanslarında izinli Storage origin ve nesne sahipliği; eski medyada yalnız mevcut sahip olunan projenin referansını koruma vardır. İnceleme/audit başarısızsa önceki proje ve görseller geri gelir. Önceki ayrı resubmit RPC mevcut moderasyon kurallarıyla aynı transaction içinde çağrılır; scoped trigger inceleme alanlarının temizlenmesine izin verir.

## Uç durum ve hata yönetimi

- Sayfadan çıkış/kapanma/kesinti: kaydedilmiş metin ve dosyalar aynı cihazda korunur. Upload/eşitleme tamamlandıysa başka cihazda da devam edilir. Henüz upload edilmemiş dosya diğer cihazda bulunamaz; gönderimde açık hata verilir.
- Cihaz depolaması kapalı/doluysa görünür uyarı çıkar. Tarayıcı depolamasının kullanıcı/işletim sistemi tarafından silinmesine veya yazma tamamlanmadan ani güç kaybına karşı mutlak garanti yoktur. Offline app shell/Service Worker bu faza eklenmedi; yeniden açılışta sayfanın yüklenebilmesi için bağlantı gerekir.
- Hesap değiştirme: cihaz anahtarları kullanıcı bazında, DB satırları owner RLS ile ayrılır. Yerel veriler cihaz üzerinde uygulama şifrelemesiyle korunmaz; paylaşılan cihaz/devtools güven sınırı ayrı değerlendirilir.
- Arşiv metni/metadata özeldir; mevcut `kistas` Storage bucket public olduğundan upload edilmiş taslak görselleri URL'yi bilen kişiden gizlenmez. Gizli taslak medyası için private bucket/signed URL geçişi ayrı çalışma gerektirir; mevcut public proje medyası bu fazda taşınmadı.
- Başka cihazdan gönderilen arşivin bu cihazda farklı, eşitlenmemiş içeriği varsa metin/dosyalar silinmez; yeni lansman olarak devam edilebilir. Gönderim sürerken form alanları kilitlenir; gönderilen snapshot sonrası yeni yazılan içeriğin başarı temizliğiyle kaybolması önlenir.
- Hesap eşitlemesinde eski yanıt yeni formu ezmez; değişen payload sıradaki eşitlemeye taşınır. İki farklı düzenleme çakışırsa cihaz kopyası korunur ve yeni lansman olarak açılabilir; eski kayıt silinmez.
- Taslak kaydı tamamlanıp yanıt kaybolursa aynı içerik yeniden açılışta uzlaştırılır. Lansman submit yanıtı kaybolursa server archive state ile gönderildiği anlaşılır; otomatik submit yoktur. İstemciyi atlayıp aynı submit RPC'sini yeniden çağırmak yeni lansman oluşturabilir; Mimar'ın gönderim idempotency mekanizması istemediği kapsamla uyumludur.
- Paylaşım kotası yoktur. Alan/görsel/body boyutları teknik doğrulama sınırıdır. Güncel retention paketinde arşiv son düzenlemeden 72 saat sonra sona erer; yeni düzenleme süreyi yeniler.
- Blob URL'leri önizleme kapanınca geri bırakılır. Başarı kesinleşmeden cihaz dosyaları veya Storage nesneleri silinmez. Kaldırılmış/yerine yenisi seçilmiş ve daha önce upload edilmiş dosyalar için fiziksel Storage temizlik işi bu pakette çalıştırılmaz; DB referanslarına/arşivlere bakmadan silme yapılmaz. Saklama/temizlik politikası ayrıca belirlenmelidir.
- RPC/route hata mesajları raw satır/credential içermez. SQL sabit tablo/sütunlarla çalışır, dinamik SQL yoktur. Fonksiyonlar `search_path=''` ve authenticated-only grant kullanır.

## Performans değerlendirmeleri

Proje ve görsel ilişkilerinin kritik kayıt yolu bir RPC'ye indirildi: önce create için iki, düzenleme için okuma/update/delete/insert ve resubmit HTTP zinciri vardı. Upload/cihaz arşivi/eşitleme hâlâ ayrı maliyetlerdir; toplam paylaşım süresinde kanıtsız hız artışı iddia edilmez.

800 ms debounce ve tek eşitleme döngüsü istekleri birleştirir; arşiv listesi dosya Blob'larını veya tam proje galerilerini çekmez. Arşiv modülleri dashboard akışında; keşif için özel arşiv okuması yoktur. Ana sayfa mobil lab raporu `reports/m2-performance-baseline.json` olarak ayrı tutuldu; M0/M1 raporları değiştirilmedi. Gerçek kullanıcı INP, yüksek hacimli DB planları ve canlı yükleme gecikmesi ölçülmedi.

Aynı 74 kayıt fixture, Pixel 5, 4× CPU, 150 ms / 1.6 Mbps ve üç koşuda medyan LCP 1360 ms, CLS 0, TTFB 61.9 ms. M1 LCP 1432 ms; bu küçük lab farkı genel hız kazanımı olarak yorumlanmaz. Gözlem penceresi/prefetch dahil JS 639956–826598 byte ham, 199280–256650 byte tahmini Brotli; üç koşu medyanı 826598/256650. M1 medyanı 699207/213696 idi; M2 gözleminde JS arttı. Bütçe geçse de bu artış açık performans takibidir; M4 istemci sınırı/chunk/prefetch ölçümü gerektirir. Ölçüm gerçek CDN transferi veya yalnız kritik render JS ayrımı değildir. Önceki büyük chunk/Edge Runtime uyarıları da kapanmış sayılmaz.

## Doğrulama ve canlıya geçiş

Yerel PostgreSQL testleri: aynı içerikle iki yeni lansman, özel/eksik arşiv, anon/başka kullanıcı erişimi, sahipliksiz medya, sınır/korumalı alan girdileri, görsel insert hatasında create/update rollback, eşit sürümlü iki sıraya alınmış düzenleme, audit hatasında rollback/inceleme alanlarının temizlenmesi ve başarısız kayıtta arşivin korunması. PGlite tek connection kullanır; gerçek bağımsız connection yarışları ve canlı Auth/Storage politikaları staging/canlı kabul kontrolünün yerine geçmez.

Yerel Workers testleri: offline metin ve dosya geri yükleme, kullanıcı ayrımı, CSRF, başka cihazdan devam, her yeni lansmana ayrı arşiv, kayıp taslak yanıtı, iki cihaz çakışması, başka cihazdan gönderilmiş arşivde farklı yerel içeriğin korunması ve cihaz kota hatasında hesap kaydı doğrulandı. 30/30 E2E başarılı; atlama/yeniden deneme yok. Next.js TypeScript üretim derlemesi, web lint, vinext derlemesi ve Workers dry-run başarılı. 33 regresyon dosyası ve 84 domain kontrolü başarılı; son değişiklikten sonra web/shared/supabase hedefli testleri tekrar geçti. Bağımlılık denetimi, tracked/staged secret ve XSS kontrolü temiz; legacy SQL pattern scanner sonucu yeni SQL testlerinin yerine sayılmadı. Kesin kayıt `reports/m2-validation.json`.

PostgreSQL motoru PGlite 0.5.8 / PostgreSQL 18.3; canlı PostgreSQL sürümü ve tüm gerçek Supabase tetikleyicileri/politikaları bu sonuçla doğrulanmış sayılmaz. Migration sürümü mevcut `20260928000001_message_notification_sender_avatar.sql` ile çakışmaması için `20260928000002` seçildi; diğer migration değiştirilmedi.

Yalnız canlı ortam bulunduğu için hazırlanmış sıra:

1. Güncel kaynak ve DB yedeği. `supabase/tests/m2-preflight.sql` read-only çalıştırılır; constraints/policies/trigger sonuçları ve gerçek eski trigger fonksiyonu kaydedilir. Geçmiş migration'ların tamamı canlıda yeniden oynatılmaz.
2. Canlı şema farkı yoksa yalnız yeni M2 migration'ı uygulanır. `launch_configuration.media_origin` seçilen Supabase projesinin gerçek Storage origin'iyle doğrulanır. Öteki environment'a mevcut origin ile sessiz fallback yapılmaz.
3. Migration sonrası fonksiyon izinleri ve özel arşiv RLS kontrol edilir; ardından yeni web paketi yayınlanır. Yeni kaynak migration olmadan yayınlanmaz.
4. İki kullanıcıyla özel arşiv/giriş/normal create/edit/onaya gönderme kabul kontrolü. Destructive hata enjeksiyonu ve sahte kayıt spam'ı production'da yapılmaz. Gerçek bağlantılarla yarış testi için izole DB ortamı hâlâ gereklidir.

Bu sıralamanın hazır olması canlı uygulama yetkisi veya tamamlanma kanıtı değildir. Migration/deploy/commit/yeni yedek bu oturumda yapılmadı.

## Geri dönüş

Önceki web paketine dönmek eski HTTP zincirini de geri getirir; atomiklik güvencesi kaybolur. Arşiv tabloları/verileri geri dönüşte silinmez. Yeni RPC grant'leri gerektiğinde kapatılabilir. `handle_listing_status_protection` geri alınacaksa preflight'ta kaydedilen gerçek önceki fonksiyon kullanılır; repo sürümü canlıyla aynı varsayılmaz. M0/M1 ve kullanıcıya ait diğer değişiklikler korunur.

## Handoff State

```text
Proje: C:\Users\mehmet.ozdemir\Desktop\KISTAS
M0/M1: yerelde tamamlandı; önceki raporlar korunuyor.
M2 kapsam: atomik proje/görsel/review; özel cihaz+hesap arşivi; kesintiden sonra devam.
M2 durum: yerel paket hazır; 30/30 E2E, 11 PostgreSQL senaryosu; canlı kabul bekliyor.
Kural: lansman kotası, içerik tekilleştirme ve submit idempotency yok; otomatik submit yok.
Migration: supabase/migrations/20260928000002_atomic_launch_and_private_archive.sql
Preflight: supabase/tests/m2-preflight.sql (read-only; canlı şemayı incelemek için hazırlanmış).
Kanıt: docs/M2_VALIDATION.md ve reports/m2-*.json.
Canlı ortam: yalnız production var; migration/deploy/commit ve yeni yedek yapılmadı.
Açık: gerçek Auth/Storage/RLS ve bağımsız bağlantı yarışları; arşiv Storage saklama/temizlik politikası.
Sonraki: önce M2 canlı geçiş/kabul adımları; ardından M3 veri katmanı/ortam/tip/sorgu planları.
Yeni oturum: proje kuralları, bu belge ve güncel raporu oku; M0/M1/M2 diff'lerini koru.
Faz sonu: yeni yedek önerilir; alınmış sayılmaz. Temiz oturumda bu blokla devam et.
```
