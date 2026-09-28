# M2 devamı — Arşiv, bildirim ve görüşme saklama süreleri

2026-09-28. Mimar tarafından seçilen kapsam: arşiv **son düzenlemeden 72 saat**, bildirim **oluşturulmadan 72 saat**, görüşme **son gerçek mesajdan 30 gün**. Yeni düzenleme/mesaj kendi süresini yeniler. Bu belge M2'nin önceki sınırsız arşiv saklama davranışının yerine geçer.

Durum: yerel uygulama ve doğrulama tamamlandı; 35/35 Workers E2E ve 28 PostgreSQL senaryosu başarılı. Yalnız production ortamı var. Canlı migration, cron çalıştırma, veri silme, deploy, commit ve yeni yedek yapılmadı.

## Mimari genel bakış

Temizlik tarayıcıya bağlı değildir: üç owner-only PostgreSQL fonksiyonu saatlik `pg_cron` işlerine bağlanır. Arşiv RLS/API süre dolunca okuma erişimini kapatır; cihaz metni ve IndexedDB dosyaları uygulama açıldığında veya açık formun süre sayacı dolduğunda temizlenir. Uygulama kapalıyken tarayıcı depolamasını sunucu fiziksel olarak silemez.

Arşiv silme yalnız tamamlanmamış taslak/submit acknowledgement metadata kaydını siler. Bağlı yayınlanmış proje, kredi/sponsorluk verisi veya ortak Storage nesnesi silinmez. Yüklenmiş Storage görsellerinin referans kontrollü fiziksel temizliği bu paket kapsamında değildir; önceki M2 sınırı devam eder.

Bildirimler okunmuş/okunmamış ayrımı olmadan `created_at` ile temizlenir. Var olan fonksiyon ve cron adı yeniden kullanılır; paralel bildirim temizliği eklenmez.

Görüşmelerde kayıt tarihi yalnız hiç gerçek mesaj yoksa başlangıçtır. Gerçek mesajlardan herhangi biri son 30 gün içindeyse bütün sohbet geçmişi korunur. Okuma, yazıyor durumu, arayüzü açma, son mesaj önizlemesini değiştirme ve `system` mesajları süreyi uzatmaz. Proje sohbetleri ve destek görüşmeleri aynı kurala dahildir. Silinen görüşmenin mesajları ve varsa typing state kayıtları mevcut cascade FK üzerinden silinir; denetim/audit kayıtları topluca silinmez.

## Klasör yapısı ve tam implementasyon

- `supabase/migrations/20260928000003_archive_notification_and_idle_chat_retention.sql`: FK ön koşulu, mevcut indekslerin tekrar kullanımı, arşiv süre RLS/trigger, mesaj parent kilidi ve üç temizlik fonksiyonu.
- `supabase/migrations/20260928000004_schedule_retention_cleanup.sql`: bildirim `:17`, arşiv `:27`, görüşme `:37` olmak üzere saatlik üç iş. Mevcut aynı adlı işler kaldırılıp tekilleştirilir; migration içinde temizlik çağrılmaz.
- `packages/shared/src/retention.ts`: cihaz/API için tek 72 saat sınırı ve geçersiz tarihte güvenli kapanma.
- `apps/web/src/lib/launch-archive.ts`: süresi dolmuş cihaz metadata/dosyalarının temizliği; silme sırasında liste öğesi atlanmaması.
- `LaunchEditor.tsx`, `LaunchArchiveClient.tsx`: açılış/sayaç/liste temizlikleri, düzenlemeyle yenileme, süresi dolmuş arşiv URL'sinde boş kopya oluşturmama ve yakın tarihli offline çalışmayı yeni lansmana taşıma.
- `app/api/launch-drafts/route.ts`, `app/actions/listings.ts`: süre dolması için güvenli hata/410 ve özel okuma filtreleri.
- `supabase/tests/retention-preflight.sql`: read-only şema/FK/policy/trigger/indeks incelemesi ve silinecek kayıtların sadece toplam sayısı.
- `scripts/tests/retention-cleanup.test.mjs`, `launch-atomic.test.mjs`, `apps/web/e2e/launch-archive.spec.ts`: tarih, yetki, rollback, kayıt/dosya geri kazanım sınırları ve UI sayaç testleri.

## Veri akışı

`Form değişir → cihaz updatedAt yenilenir → hesap save RPC → server updated_at → 72 saat deadline`.

`Yeni mesaj → BEFORE INSERT parent FOR UPDATE → server created_at → mevcut mesaj/önizleme/bildirim tetikleyicileri → commit`.

`Cron → tarih filtresi → görüşme parent FOR UPDATE SKIP LOCKED → yeni statement snapshot ile gerçek mesajı tekrar kontrol et → görüşme DELETE → mesajlar cascade → commit`.

Yeni mesaj parent kilidini önce alıp commit ederse temizlik güncel mesajı görür ve görüşmeyi korur. Temizlik önce silmeyi kesinleştirirse bekleyen gönderim `CONVERSATION_NOT_FOUND` ile başarısız olur; yeni mesaj kaydedilmiş gibi bildirilmez. Aynı transaction içindeki cascade hatası görüşme ve mesaj silmelerini geri alır. Kilitli görüşmeler sonraki tura bırakılır.

## Uç durum ve hata yönetimi

- Süreler cihazda milisaniye, veritabanında `timestamptz` üzerinden hesaplanır. Arşivde tam 72 saat sınırında süre dolmuştur; 1 ms önce geçerlidir. Cihaz saati değişiklikleri/clock skew için server başarı zamanına göre tekrar ayarlanır; server RLS/trigger son otoritedir.
- Sunucu arşivi sona erdiğinde cihazda daha yakın tarihli offline düzenleme varsa çalışma silinmez; otomatik eşitleme durur, yeni lansman olarak açma seçeneği sunulur. Süresi dolmuş eski cihaz snapshot'ı yeni kayıt gibi otomatik gönderilmez.
- Cihaz kopyası olmayan bir arşiv URL'sinde hesap kontrolü başarısızsa boş form/kopya oluşturulmaz; bağlantı ve yeniden açma mesajı gösterilir.
- Kesinti testinde, form alanları görünmüşken gizli kategori/feedback pencerelerinin gecikmiş chunk isteği kesilince tüm formun hata ekranına düştüğü tekrar üretildi. Bu iki gerekli bileşen lansman modülüne statik bağlandı; form düzenlenebilir olduğunda bağımlılıkları da hazırdır. Çevrimdışı ilk sayfa açılışı için Service Worker garantisi eklenmedi.
- Arşiv save/submit expired kaydı canlandıramaz. Süresi dolmuş submit sırasında yeni proje/görsel yazımları aynı transaction'da geri alınır.
- Fiziksel DB temizliği saatliktir: normal çalışan görevde eşik aşıldıktan sonraki turda silinir, tam 72 saat/30 gün anında cron silmesi iddia edilmez. Arşiv RLS/API hemen süreyi uygular. Cron hatası, kilit beklemesi veya offline tarayıcı fiziksel temizliği geciktirebilir; job run sonuçları izlenmelidir.
- Var olan süreyi doldurmuş canlı kayıtlar görev etkinleştirildikten sonraki ilk turda adaydır. Silinmiş veriyi yalnız cron'u kapatarak veya eski kodu yayınlayarak geri getirmek mümkün değildir; DB yedeği gerekir.
- Public/anon/authenticated temizlik fonksiyonlarını çağıramaz. Yeni service role/secret, dış servis, kullanıcı paylaşım kotası veya submit idempotency eklenmedi.

## Performans değerlendirmeleri

Temizlik işi istemci istek zincirine eklenmez. Önceki bildirim tarihi ve mesaj conversation/date indeks adları yeniden kullanılır; aynı indeksin farklı isimle kopyası eklenmez. Arşiv updated_at ve görüşme created_at indeksleri tarih seçimini destekler. Çocuk kayıtlar mesaj gönderilirken parent'tan önce kilitlenmez; temizlik kilitli parent'ları bekletmez.

Bu faz için canlı hacim/query planı/yük testi ve yeni ana sayfa hız artışı ölçümü yoktur. İlk temizlik hacmi preflight toplamlarıyla değerlendirilir; büyük hacimli ilk silme için işlem süresi ve job timeout operasyonel olarak gözlenmelidir.

## Doğrulama

PostgreSQL: 15 retention senaryosu + 13 atomik lansman senaryosu başarılı. Bunlar PGlite/PostgreSQL 18.3, minimal schema ve sentetik role/claims ile çalışır. Tek bağlantıdaki iki işlem sırası doğrulandı; bağımsız bağlantı yarışı kanıtı değildir. `pg_cron` SQL kayıt API'si testte simüle edildi; gerçek extension/timer çalışması production kabul kontrolüdür.

Next.js TypeScript üretim derlemesi, web lint, vinext derlemesi ve Workers dry-run başarılı. Shared 2 / Supabase 8 / Web 20 regresyon dosyası ve 84 domain kontrolü geçti. Son UI/build sonuçları `reports/retention-validation.json` ve tarih/SQL sonuçları `reports/retention-postgres-validation.json` içinde tutulur. Önceki M0/M1/M2 performans raporları yerinde kalır; yeni sonucu eski hız ölçümü diye sunma.

## Canlı geçiş ve geri dönüş

1. Güncel kaynak ve **DB** yedeği; M2 `000002` şeması yoksa önce M2 preflight/uygulama sırası tamamlanır. Kaynak zip'i DB yedeği yerine geçmez.
2. `supabase/tests/retention-preflight.sql` read-only çalıştırılır. Cascade FK, gerçek policy/trigger/grant/index tanımları, cron extension kullanılabilirliği ve aday toplamları incelenir; mevcut cron job tanımları ayrıca kaydedilir.
3. Yalnız `000003` ve `000004` retention migration'ları uygulanır; tarihçe migration'ları topluca yeniden oynatılmaz. Ardından yeni web paketi yayınlanır. Cron sahipliği/aktiflik ve sonraki job run success kontrol edilir.
4. Production'da hata enjeksiyonu/örnek görüşme spam'ı yapılmaz. Gerçek Supabase Auth/RLS/Storage ve bağımsız bağlantı kilit sırası için ayrıca izole doğrulama gerekir.
5. Geri dönüşte üç cron job durdurulur. Arşiv policy/trigger ve değiştirilmiş notification fonksiyonu kaydedilmiş gerçek eski tanımlarla geri alınabilir. Yeni mesaj parent trigger kaldırılacaksa cleanup önce durdurulur. Silinmiş kayıtlar yalnız DB yedeğinden geri yüklenebilir; audit/iş ilişkileri korunur.

## Handoff State

```text
Proje: C:\Users\mehmet.ozdemir\Desktop\KISTAS
M2 yerel paket + retention: arşiv son düzenleme 72h, bildirim oluşturulma 72h, son gerçek mesaj 30 gün.
Yeni düzenleme/mesaj süreyi yeniler; okuma/system/typing yenilemez.
Migration sırası: M2 20260928000002 → retention 000003 → cron 000004 → yeni web.
Preflight: supabase/tests/retention-preflight.sql; kanıt: docs/RETENTION_VALIDATION.md ve reports/retention-*.json.
Canlı: yalnız production var; migration/deploy/cron çalıştırma/silme/commit/yeni yedek yapılmadı.
Sınırlar: DB fiziksel temizlik saatlik, cihaz kapalıyken cihaz dosyası silinmez; Storage orphan temizliği ayrı.
Açık kabul: gerçek cron job run, tam canlı FK/policy/trigger, bağımsız bağlantı yarışı ve ilk temizlik hacmi.
Çalışma ağacındaki M0/M1/M2 ve kullanıcı değişikliklerini koru; mevcut yedek var sayma.
Faz sonu: kaynak ve DB yedeği önerilir; temiz oturumda bu blok ve raporla devam et.
```
