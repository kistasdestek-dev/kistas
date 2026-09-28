# M1 — Sunucu tarafında keşif motoru

Tarih: 2026-09-28. Mimar'ın M1'e geçiş onayıyla uygulandı. Yerel doğrulama ve public read-only sorgu uyumu kanıtıdır; production deploy veya RLS sertifikası değildir.

## Mimari genel bakış

Ana sayfa, kategori ve platform rotaları popüler/yeni/sponsor verisini ayrı sunucu sorgularından alır. Popüler ilk 40 kaydı bütün keşif akışlarının doğruluk kaynağı olarak kullanmak kaldırıldı. Arama, kategori, platform ve sıralama URL durumundan okunur; istemci önceden yüklenmiş bir listeyi filtrelemek yerine sunucuya gezinir.

Popüler ve yeni tam listeleri 30'luk keyset sayfalarıdır. Oy/tarih eşitliğinde ID son sıralama anahtarıdır. Cursor arama/kategori/platform/sıralama kapsamıyla eşleşir; tarih ve oy alanları doğrulanır. İlk sayfanın oluşturulma zamanı üst sınırı sonraki sayfalara taşınır; daha sonra oluşturulan kayıtlar aynı gezinmeye dahil edilmez.

## Klasör yapısı ve tam implementasyon

- `packages/shared/src/discovery.ts`: ortak kart/filtre tipleri, URL sözleşmesi, cursor doğrulaması ve güvenli PostgREST koşulları.
- `packages/supabase/src/queries/discovery.ts`: ayrı popüler/yeni kart sorguları, sponsor sayımı/saatlik pencere ve minimal kart eşleme.
- `apps/web/src/lib/discovery.ts`: anonim sunucu istemcisi, kategori doğrulama, 60 saniyelik data cache ve hata sınırı.
- `apps/web/src/app/page.tsx`, public kategori/platform/popüler/yeni sayfaları: sunucu verisini ortak akışa bağlar.
- `DiscoverExperienceClient.tsx`: URL gezinmesi, 300ms arama debounce'u, yükleniyor durumu ve server sonuçlarının görünümü; önceki local filtre/sıralama motoru kaldırıldı.
- `DiscoveryPagination.tsx`: mevcut ShinyButton ile sonraki sayfa/başa dön bağlantıları.
- Ortak kart/vitrin/arama bileşenleri: `DiscoveryCard` kabul eder; tam Listing ve özel profil alanları taşınmaz.
- `scripts/tests/discovery-query.test.mjs`, `discovery-fixture.mjs`, Workers fixture ve `apps/web/e2e/discovery-server.spec.ts`: gerçek Supabase query builder ile 74 kayıt senaryosu ve tarayıcı regresyonları.

Eski `getCuratedListings` ve filtre arayüzü, tüketicileri yeni sorgulara taşındıktan sonra kaldırıldı. Proje detaylarının `getListingById`/tam Listing sözleşmesi korunur. Yeni bağımlılık, tablo, migration veya RPC eklenmedi.

## Veri akışı

`URL → ortak doğrulama → kategori kontrolü → anonim/RLS public sorgu → kart projection → RSC → mevcut kartlar ve küçük URL etkileşimi`.

Ana sayfa altışar popüler ve yeni kartla ayrı sponsor penceresini gönderir. Sponsor havuzu oylardan bağımsız bir sorguyla belirlenir: status active ve boosted_until > aynı referans zamanı. Bütün uygun havuzun sayımı, `floor(hour) % count` başlangıcı ve gerektiğinde başa sarılan 12 kartlık pencere mevcut saatlik rotasyon kuralını sürdürür. Havuz sabitse her sponsor sıraya girer; bir sayım/okuma sırasında havuz değişirse pencere kısalabilir. Aynı pencere ID bazında tekrarları ayıklar.

Kartlar 180 karakterlik açıklama ve en fazla bir kapak görseliyle serileştirilir; seller_id/fiyat/profil ve tüm görsel galerisi gönderilmez. DB sorgusunda arama için tam description sütunu hâlâ okunur; 180 karakter sınırı browser payload'ına uygulanır, DB wire/scan maliyetinde aynı tasarruf iddia edilmez.

## Uç durum ve hata yönetimi

- Arama en fazla 100 karakter; enum, UUID, tekrar eden parametre ve 1000 karakterlik cursor sınırı doğrulanır. UI input da 100 karakterle sınırlıdır.
- Arama title/tagline/description/developer_name içinde literal, büyük-küçük harf duyarsız regex aramasıdır. Regex özel karakterleri kaçışlanır; PostgREST değerleri JSON çift tırnakla sınırlandırılır. Komut/operatör enjekte edilemez. Accent-insensitive/full-text arama ve indeksleri M3 kapsamıdır.
- Kategori/platform boş sonuçları mevcut vitrin düzenini korur; arama eşleşmesi yoksa filtre temizleme görünümü çıkar.
- Geçersiz filtre/cursor ve başka scope'a taşınan cursor notFound akışına gider. Akışlı yanıt HTTP 200/404 olabilir; gerçek hata ekranı ve noindex kontrolü M0 sözleşmesidir.
- DB/schema/yetki hatası boş listeye çevrilmez; hata koduyla üst hata sınırına gider. İstemciye raw request, token veya satır içeriği loglanmaz.
- Cursor imzalı yetki belgesi değildir; public sıralama konumudur. Güvenlik sınırı daima active filtresi ve Supabase RLS'dir. Geçerli başka bir konuma atlamak public veriden başka erişim sağlamaz.
- Eşit oy/tarih/ID sırası, silinen cursor kaydı ve sonradan eklenen kayıt test edilir. Popüler listede mevcut kaydın oyları değişirse keyset gezinmesi tam transaction snapshot değildir; kayıtlar yer değiştirebilir. Bu sınır çözülmüş sayılmaz.
- Giriş gerektiren yazma, admin/ödeme/upload akışları değişmedi. Yeni RPC/secret/private profil erişimi yok.

## Doğrulama

Son komutların kanıtı ve sayılar aşağıdaki makine okunabilir raporlarda tutulur. Kontroller: dört workspace tip/lint, 32 regresyon dosyası (domain 84), 21 Workers E2E, Next/vinext build ve Wrangler dry-run; dependency audit ve mevcut secret/XSS/SQL scanner. Tarayıcı testlerinde retry/skip yok.

`reports/m1-validation.json`: son kontrol sonuçları, son Workers giriş dosyasının SHA-256 özeti ve doğrulanmayan alanlar. Önbelleksiz workspace kapısı 15/15 görevle geçti. GitHub Actions'ın uzakta çalıştığı bu oturumda gözlenmedi.

`reports/m1-query-conformance.json`: canlı Supabase üzerinde anonim GET/HEAD ile özel karakterli arama, images embedding limit/sıralama, sponsor HEAD ve search+cursor PostgREST birleşimi HTTP 200. Veri yazılmadı; hiçbir satır içeriği rapora alınmadı. Bu kontrol query planı, yüksek hacim, gerçek oturumlu RLS veya üretim sayfa cache izolasyonu kanıtı değildir. Fixture bağımsız PostgREST alt kümesidir; gerçek DB parser'ı olarak sunulmaz.

## Performans değerlendirmeleri

`reports/m1-card-payload.json`: aynı 74 kayıt fixture'ında eski 40 popüler tam model 183.074 bayt, yeni ayrı kart bölümleri 6.864 bayt JSON. Bu örnekte açıklamalar 4000 karakterdir; fark model projection ve gönderilen kayıt sayısını gösterir. Gerçek RSC transferi, tüm veri kümeleri veya DB işlem süresi hakkında yüzde iddiası değildir.

`reports/m1-performance-baseline.json`: M0 cihaz/ağ profiliyle üç yerel mobil koşu. M0 fixture'ı tek projeydi; M1 fixture'ı 74 kayıttır. Farklı veri kümeleri nedeniyle LCP/JS farkını doğrudan mimari hız kazanımı olarak yorumlama. Gerçek kullanıcı INP ve yavaş PostgreSQL query planları ölçülmedi.

M1 son ölçümü: medyan LCP 1.432 ms, CLS 0, TTFB 58,8 ms; her koşuda ilk yük JS 699.207 bayt ham / 213.696 bayt tahmini Brotli. Pixel 5, 4× CPU yavaşlatma, 150 ms ağ gecikmesi ve 1,6 Mbps indirme profili kullanıldı. Son Workers paketinde 21/21 E2E ve dry-run başarılı; paket canlıya gönderilmedi.

URL searchParams okuyan bu rotalar standart Next build'de dinamik render'a geçti. Sınırlı kategori/platform akışları ve ilk liste sayfası için anonim data cache 60 saniye; kategori cache'i de 60 saniyedir. Serbest arama ve cursor devam sayfaları kalıcı data cache'e alınmaz; kullanıcı girdisi ve saat her istekte yeni cache anahtarı biriktirmez. Bu davranış loader/cache sınır testinde doğrulanır. Workers/vinext'in static analiz tablosu ISR gösterebilir; runtime/edge davranışını tabloya bakarak garanti etme. Deploy sonrası gerçek Cloudflare vary/cache/yenileme kontrolü M5'te yapılmalıdır. Daha fazla bağımsız sorgu ve sponsor HEAD sayımı gerçek DB'de maliyet ekler; kapasite/query planı M3'te ölçülmelidir. Cache revalidate hedefi 60 saniyedir; sponsor bitişi/yeniden yayın görünürlüğü gecikebilir. Stale-while-revalidate veya yenileme hatası bu süreyi uzatabilir; kesin tazelik garantisi M5 kanıtı gerektirir.

## Yeniden çalıştırma ve geri dönüş

```powershell
pnpm exec turbo run type-check lint test --force
pnpm build:web
pnpm --filter @kistas/web build:vinext
pnpm test:e2e
pnpm measure:performance m1
```

Next tip üretimi ve vinext build aynı `.next/types` dosyalarını günceller; bu iki işi eşzamanlı çalıştırma. CI zaten sırayla çalıştırır. M0 tarihi baseline korunur; ölçüm komutunun güncel varsayılanı M1 raporudur.

Geri dönüş DB işlemi gerektirmez. Yalnız M1 kaynak/query/tip/test diff'ini birlikte geri al; M0 radar/CI dosyalarını ve kullanıcıya ait diğer değişiklikleri koru. Eski client ve yeni server filtre motorunu paralel bırakma. Canlı deploy/commit/migration yapılmadı.

## Handoff State

```text
Proje: C:\Users\mehmet.ozdemir\Desktop\KISTAS
M0: yerelde tamamlandı; M0 raporları geçmiş başlangıç kanıtıdır.
M1: yerelde tamamlandı; server keşif, URL filtreleri, ayrı sponsor/yeni/popüler sorguları ve 30 kayıt cursor sayfalaması.
Kaynak: packages/shared/src/discovery.ts, packages/supabase/src/queries/discovery.ts, apps/web/src/lib/discovery.ts
Kanıt: docs/M1_VALIDATION.md ve reports/m1-*.json
Doğrulama: 32 regresyon dosyası, domain 84; 21/21 Workers E2E; tip/lint, Next/vinext build ve dry-run geçti.
Mobil lab: medyan LCP 1432 ms; ilk JS 699207 bayt ham / 213696 bayt tahmini Brotli; farklı fixture ile M0 hız kıyası yapma.
Sınırlar: live oy değişiminde tam snapshot yok; gerçek query planı/INP ve production cache henüz ölçülmedi.
Deploy/commit/migration: yapılmadı. M0+M1 diff'leri çalışma ağacında; ilgisiz dosyaları geri alma.
Sonraki: M2 — proje/görsel kayıtlarını atomik ve idempotent transaction/RPC sınırına taşıma planı.
M2 başında: ZERO_CODE_POLICY, SECURITY_ROADMAP, DISTRIBUTION_ROADMAP ve M1 kaydını oku; somut planı sun.
Yedek: faz sonu yeni yedek önerilir; alınmış sayılmaz. Temiz oturumda bu blokla devam et.
```
