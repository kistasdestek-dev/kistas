# Sponsorlu vitrin — uygulama ve devir teslim

Tarih: 2026-09-29. Mimar'ın onayladığı kapsam: web kategori sponsorluğu, saatlik canlı rotasyon, süre dolumu ve satın alma sonrası yenileme. Tasarım, paket fiyatları, üç büyük kart ve Expo/RPC okuma akışı korunur. Production yayını ve migration yapılmaz.

## Mimari, klasör yapısı ve veri akışı

- `packages/shared/src/discovery.ts`: ortak kartta kategori bitişi, `SponsorSnapshot` ve seçili kapsamdaki son geçerlilik tarihini hesaplayan `sponsorExpiry`.
- `packages/supabase/src/queries/discovery.ts`: active durumunu, kategori/platform/arama kapsamını ve sponsor sürelerini tek doğrulanmış sorguda uygular. Kategori yoksa genel; kategori varsa o kategorinin genel veya kategori sponsorları. Çift paket tek satırdır. Mevcut destek/tarih/id taban sırası korunur; saatlik kaydırma bütün uygun havuzda hesaplanır, web en fazla 12 kayıt getirir.
- `apps/web/src/lib/discovery.ts`: yalnız popüler/yeni bölümleri 60 saniyelik önbellekte kalır; sponsor verisi her SSR yüklemesinde ayrı sorgulanır. Arama önbelleğe alınmaz.
- `apps/web/src/app/api/discovery/sponsors/route.ts`: GET, q/category/platform/sort parser'ı, sunucu zamanı, en fazla 12 public kart, `Cache-Control: no-store`. Geçersiz girdi 400, sorgu hatası ayrıntı sızdırmadan 503. Next/Workers ek Cache-Control yönergeleri koyabilir; no-store korunur.
- `apps/web/src/lib/sponsor-refresh.ts` ve `hooks/useSponsoredDiscovery.ts`: server timestamp + monotonic clock, tek istek ve tek zamanlayıcı. İlk hydration, görünürken 60 saniye, saat sınırı, gelen kartın son geçerlilik tarihi ve sekmeye dönüşte yenileme. Gizli sekmede polling yok. Filtre/unmount cleanup abort eder, eski yanıt yeni kapsamı değiştiremez.
- `apps/web/src/app/actions/sponsors.ts`: istemci yalnız listingId/packageId gönderir; sunucu paket süresi ve fiyatını sabit listeden seçer, getUser ile oturumu doğrular ve mevcut oturumlu `boost_listing_scoped` RPC'sini çağırır. Yetki/kredi/aktif durum/atomik ledger kuralları RPC'de kalır.
- `VisibilityManagementModal` başarıdan sonra yerel olay ve BroadcastChannel ile vitrine haber verir; profil bakiyesi yerel güncellenir ve router.refresh ile proje/ledger yenilenir. Modal veri değişince başarı durumunu sıfırlamaz. Aynı anda yinelenen tıklama ref ile engellenir. Action içinde kredi harcamasından sonra yeniden render yapan işlem yoktur.

## Uç durumlar, hata yönetimi ve performans

- Çift sponsorun etkin bitişi seçili kategoride iki tarihinin maksimumudur; genel vitrinde yalnız genel tarih kullanılır. Tam bitiş anı aktif kabul edilmez.
- Yenileme başarısızsa geçerli kartlar korunur, süre dolanlar kaldırılır. İstek sürerken bile süre dolumu zamanlayıcısı işler. Ağ isteği 10 saniyede kesilir, sonraki zamanlayıcı tekrar okur; kredi harcaması otomatik tekrarlanmaz.
- Satın alma bildirimi mevcut istek sırasında gelirse bildirimler tek takip isteğinde birleştirilir; yeni veri alınması atlanmaz. Başka sekmenin bildirimi yalnız yeniden public veri okumayı tetikler; özel profil/bakiye yayınlanmaz.
- Toplu havuz istemciye indirilmez: count ve bir/iki sınırlı pencere okuması. İstemci en fazla 12 kartı tutar, ilk üçü büyük vitrinde gösterir. Yeni bağımlılık, tablo, RLS grant, RPC veya dış servis eklenmez.
- Sabit sponsor havuzunda tam döngü eşit kart pozisyonları sağlar. Havuz veya destek sırası değiştiğinde döngü yeniden şekillenir; gerçek trafik/gösterim eşitliği garanti edilmez.

## Doğrulama

- `node --experimental-strip-types scripts/tests/discovery-query.test.mjs`: genel/kategori/çift paket, kategori/platform/arama, birleşik ifadede enjeksiyon, passive/expiry sınırı, 0/1/3/17 sponsorun tam döngüsü, tekrarsız pencere ve organik cache/sponsor tazeliği geçti.
- `node --experimental-strip-types scripts/tests/run-workspace-suite.mjs web`: 23/23 geçti; yeni refresh ve purchase testleri suite'e kayıtlı.
- `node --experimental-strip-types scripts/tests/core-domain.test.mjs`: 84/84 geçti.
- `pnpm --filter @kistas/web lint`, `type-check` ve `build`: geçti. Son production build TypeScript kontrolünü de içerir.
- XSS, SQL injection ve repository secret taramaları geçti.
- İlk Workers derlemesi geçti. Son Workers yeniden derlemesi, başka test sürecinin kilitlediği dist klasöründe EPERM ile durdu; o süreç durdurulmadı. Son kodun tarayıcı doğrulaması ayrı Next.js production fixture sunucusunda yapılır.
- Tarayıcı: Next.js production fixture sunucusunda 10 senaryonun tamamı geçti (ilk koşuda 9; çerez paneli nedeniyle tıklanamayan satın alma testi paneli kapatarak tekrar çalıştırıldığında 1/1). Endpoint/kategori birleşimi, saat sınırı, ağ hatasında expiry, eski filtre yanıtı, gizli sekme/dönüş ve satın alma/bakiye/diğer sekme bildirimi doğrulandı. Aynı tick içinde iki satın alma tıklaması bir POST üretti; profil yenilenince başarı mesajı korundu ve modal yeniden açılınca kategori bitişi görünüyordu.
- Yerel tekrar: `node scripts/tests/start-next-test-server.mjs` (127.0.0.1:8791); başka terminalde `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8791` ile `pnpm --filter @kistas/web exec playwright test sponsors.spec.ts discovery-server.spec.ts --reporter=list` çalıştırılır. Test fixture'ları canlı dış servis isteklerine fallback yapmaz. Yeni test sunucusu iş sonunda kapatıldı.
- PGlite gerçek PostgreSQL fonksiyonunu minimal şema ve sentetik auth ile çalıştırır: başka hesap, geçersiz paket/scope, pasif proje, bakiye reddi, iki kapsamın bağımsızlığı, süre uzatma ve atomik ledger doğrulandı. Tek bağlantıdır; canlı Supabase Auth/RLS veya bağımsız bağlantılı yarış kanıtı değildir.

## Geri dönüş ve Handoff State

Yalnız bu sponsor değişiklikleri geri alınır; başlangıçtan beri mevcut Günün Vitrini/tasarım/carousel değişiklikleri korunur. DB değişmediğinden geri dönüş migration gerektirmez. Yeni endpoint/hook/controller/action kaldırılırken modalın eski çağrısı, shared kart alanları ve loader birlikte geri alınmalıdır; eski/yeni yol yan yana bırakılmaz.

```text
Handoff State — KISTAS / Sayra
Kapsam: Web sponsor vitrini; kategori genel+kategori birleşimi, canlı yenileme, sunucu action satın alma.
Ürün kararları: Genel sayfada yalnız genel paket; kategori sayfasında iki paket tekrarsız/eşit havuz.
Korunanlar: Tasarım, üç kart, 12 kayıt penceresi, paket fiyatları, Expo RPC, mevcut ilgisiz değişiklikler.
Sunucu: Mevcut RPC atomik spend; yeni migration/grant/secret yok.
Dağıtım: Commit/push/production deploy yapılmadı.
Kaynak ve kanıt: docs/SPONSORED_SHOWCASE_VALIDATION.md.
Doğrulama: web suite 23/23, core-domain 84/84, discovery-query, 10 tarayıcı senaryosu, lint/type-check/Next build ve güvenlik taramaları geçti.
Devam: Yayın ayrıca değerlendirilir; son Workers build ve canlı Auth/RLS kanıtı bu yerel testlerden ayrı tutulur.
Oturum: Yeni faz öncesi yedek alınması ve context temizlenmesi önerilir; bu görevde yedek istenmedi/alınmadı.
```
