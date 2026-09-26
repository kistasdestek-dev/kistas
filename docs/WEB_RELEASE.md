# Kıstas Web Yayın Akışı — Next.js / Cloudflare Workers

Canlı adres `https://www.kistas.com.tr` artık `apps/web` içindeki Next.js 16 uygulamasını Cloudflare Workers üzerinde çalıştırır. Worker adı `kistas-next`; `apps/web/wrangler.jsonc` dosyasındaki `www.kistas.com.tr/*` route'u trafiği bu Worker'a yönlendirir. Kök alan adı `www` adresine 301 yönlendirmesini sürdürür.

Eski Expo/Cloudflare Pages projesi `kistas` yalnız geçici geri dönüş noktası olarak korunur; `www` trafiğine hizmet etmez. Eski `npm run release:web`, `scripts/publish-web.ps1` ve `YAYINLA.cmd` bu yeni mimarinin yayın komutları değildir. Pages projesi, geri dönüş ihtiyacı ve yeni sürümün işlevsel doğrulaması tamamlanmadan silinmez.

## Her yayın paketi için kapı

1. GitHub Actions `Quality Gate` kontrolü ilgili commit için başarılı olmalı. Root dizinde `pnpm sayos:audit` aynı fail-closed kapıyı yerel olarak çalıştırır; bağımlılık, repository secret, XSS, SQL enjeksiyonu, dört workspace lint/tip kontrolleri, 15 deterministik test dosyası ve Next üretim derlemesinden biri başarısız olduğunda yayını durdurur.
2. Canlı Supabase erişimi gerektiren `pnpm test:live`, yalnız uygun güvenli ortam ve ağ erişimi doğrulandıktan sonra ayrıca çalıştırılmalıdır; varsayılan CI/yayın kapısının deterministik parçası değildir.
3. `docs/SECURITY_ROADMAP.md` içinde açık P0/P1 bulunmamalı. Depoya alınacak dosyalarda gizli anahtar taraması yapılmalı; `apps/web/.env.local` ve diğer `.env` dosyaları asla commit edilmemeli. Migration geçmişi ayrıca incelenmeden `supabase db push` çalıştırılmamalı.
4. `pnpm --filter @kistas/web build:vinext` ile Workers paketi hazırlanmalı; `pnpm --filter @kistas/web exec wrangler deploy --dry-run --outdir .wrangler/dry-run` ile yapılandırma ve gerçek yükleme paketi denetlenmeli.
5. Cloudflare oturumu açıkken `pnpm --filter @kistas/web exec vinext-cloudflare deploy --skip-build` çalıştırılmalı. Bu komut `www` route'unu da günceller. GitHub `main` dalına gönderim, mevcut Pages Git entegrasyonu nedeniyle bu Workers dağıtımının yerine geçmez.
6. Canlı `www` adresinde ana sayfa, giriş, Keşfet, kayıt, blog, auth callback, proje detay, OG/rozet API'leri, mesajlaşma ve yönetici yetki sınırları uygun test hesaplarıyla doğrulanmalı. OAuth, şifre sıfırlama, mesaj gönderimi ve proje yayınlama oturumlu uçtan uca testler yapılmadan tamamlandı sayılmaz.

CI yalnız doğrulama yapar; Cloudflare API tokenı veya Supabase servis anahtarı almaz ve otomatik deploy çalıştırmaz. Canlı yayın, başarılı kalite kapısından sonra bu belgedeki yetkili manuel adımla yapılır.

## Geri dönüş

Yeni Worker kaynaklı kritik sorun çıkarsa Cloudflare Workers & Pages panelinde `kistas-next` Worker'ının `www.kistas.com.tr/*` route'unu kaldır. Mevcut Pages custom domain'i ve DNS kaydı korunduğu sürece `www` yeniden eski Pages yayınına döner. Geri dönüşten önce/sonra yanıtı ve yönlendirmeleri doğrula. Pages projesini veya veritabanı verilerini silme.

## Geçiş notları

- `apps/web/public/index.html` içindeki eski Expo HTML'i kaldırıldı; aksi halde Workers statik varlık yönlendirmesi yeni Next ana sayfasını gölgeliyordu.
- `sitemap.xml` ve `llms.txt` mevcut Next rotalarına güncellendi. Dinamik yanıtlara `Content-Security-Policy` dahil güvenlik başlıkları Next yapılandırmasından uygulanır.
- Supabase Site URL `https://www.kistas.com.tr` olarak kalır. Bu yayın sırasında veritabanı migration'ı uygulanmadı ve özel servis anahtarları Worker'a eklenmedi.
- Yeni monorepo dosyalarının önemli kısmı hâlen yerel çalışma ağacında izlenmiyor. Ayrı bir inceleme ve sır taraması yapılmadan toplu `git add .` veya eski Pages otomatik yayın akışı kullanılmamalı.

## 2026-09-24 Google hesap seçimi paketi

- Google OAuth isteğine `prompt=select_account` eklendi; GitHub OAuth isteği değişmedi. Yetkilendirme URL'si iki sağlayıcı için ayrı doğrulandı; canlı Supabase yönlendirmesi parametreyi Google'a HTTP 302 ile iletiyor.
- Next ve Workers üretim derlemeleri, TypeScript, XSS ve SQL kontrolleri geçti. Canlı `/login` HTTP 200; dağıtılan istemci paketi `select_account` değerini içeriyor.
- Gerçek Google hesap seçme ekranı kullanıcı tarayıcısında ayrıca doğrulanmalı. Sorun çıkarsa Cloudflare Workers panelindeki önceki `kistas-next` sürümüne geri dön; Pages route'unu kaldırmak bu küçük paket için gerekli değildir.

## 2026-09-24 Google Identity Services geçişi

- Google girişinde Supabase OAuth yönlendirmesi yerine eski web sürümündeki ücretsiz Google Identity Services düğmesi ve Supabase `signInWithIdToken` kullanılır. Böylece Google ekranında Supabase proje alan adını gösteren OAuth onay yönlendirmesi kullanılmaz. GitHub ve şifre akışları değişmez.
- Google Web Client ID herkese açık istemci tanımlayıcısıdır; gizli anahtar değildir. Google Cloud'da `https://www.kistas.com.tr` yetkili JavaScript kaynağı olarak bulunmalıdır. Gizli anahtar eklenmez.
- Her giriş denemesinde 32 baytlık rastgele nonce üretilir; SHA-256 özeti Google'a, asıl nonce Supabase doğrulamasına verilir. Otomatik hesap seçimi kapalıdır. Oturum hatasında yeni nonce ile düğme hazırlanır. `redirect` yalnız site içi yol olabilir.
- Geri dönüş: Cloudflare Workers panelinden önceki `kistas-next` sürümünü geri yükle. Yayın sonrası gerçek mobil Google hesap seçimi ve oturum açma 2026-09-24 tarihinde kullanıcı cihazında başarıyla doğrulandı.
- Yayın: Worker sürümü `2b1ba39d-92d8-43a7-8414-5c55ae76f30b`. Web TypeScript, Next ve vinext derlemesi, XSS/SQL taramaları, çekirdek testler (84/84), sohbet kimliği (4/4), bağımlılık denetimi ve Cloudflare dry-run başarılı. Canlı `/login` ile yeni istemci paketi HTTP 200; pakette GIS ve `signInWithIdToken` mevcut, eski `select_account` yönlendirmesi yok. Gerçek mobil hesap seçimi ve oturum testi kullanıcı doğrulamasını bekliyor.

## 2026-09-24 Google butonu görünüm paketi

- Eski web uygulamasındaki yöntem, Google'ın oluşturduğu giriş alanını çok düşük opaklıkta Kıstas cam butonunun üstüne yerleştirerek referanstaki Google/GitHub eşleşmesini sağlıyordu. Aynı görünüm Next giriş ekranına taşındı; nonce, hesap seçimi ve Supabase oturum doğrulaması değişmedi.
- Google bu özel buton katmanını resmen desteklemiyor; kullanıcı riski kabul ederek eski görünümün geri getirilmesini onayladı. Google ileride etkileşimi kısıtlarsa desteklenen `renderButton` görünümüne dönülmeli.
- Geri dönüş: Cloudflare Workers panelinde bir önceki `kistas-next` sürümünü yükle; veritabanı veya Google Cloud ayarı değişmedi.
- Yayın: Worker sürümü `bf6a24f6-563f-4de8-9e6c-54fac2c1eb9d`. TypeScript, Next/vinext derlemeleri, XSS/SQL taramaları, çekirdek testler (84/84), sohbet kimliği (4/4), bağımlılık denetimi ve Workers dry-run başarılı. Canlı `/login` ve yeni cam butonlu istemci paketi HTTP 200; mobil görünüm, dokunma, hesap seçimi ve gerçek oturum açma 2026-09-24 tarihinde kullanıcı cihazında başarıyla doğrulandı.

## 2026-09-25 Kurumsal proje bildirimleri

- Yönetim merkezindeki proje yayınları emojisiz kurumsal metinlere geçirildi. Proje kimliği ve logosu canlı veritabanından sunucu tarafında doğrulanır; yalnız aktif projeler toplu bildirim olarak gönderilebilir.
- Anlık bildirim kartı navbar ile aynı glass CSS yüzeyini kullanır ve reduced-motion uyumlu üstten düşme animasyonuna sahiptir. Aynı proje logosu bildirim merkezinde de gösterilir.
- Migration `20260925000003` canlıya uygulandı. Yayınlanan uygulama commit’i `f02d7d3`, Worker sürümü `0e1a2474-d584-4376-807f-e0a77a477fce` olarak `www.kistas.com.tr/*` rotasına dağıtıldı.
- Canlı kanıt: `/`, `/browse`, `/new`, `/popular`, `/blog` ve `/login` HTTP 200; anonim `/admin`, `/messages` ve `/profile` istekleri girişe HTTP 307 ile yönlendirildi. Yayın paketinde ortak glass sınıfı, proje logo payload’ı, spring animasyonu ve kurumsal metin doğrulandı.

## 2026-09-25 Web Vitrin Yönetimi, Temiz Logo ve Güvenli CSP Paketi

- Profil içindeki Vitrin Yönetimi penceresi (`VisibilityManagementModal.tsx`), Kıstas liquid glass yüzeyi, `GlassIconButton`, `ShinyButton` ve çerçevesiz proje logolarıyla üç adımlı güvenli akışa yükseltildi. Satın alma işlemi doğrudan tablo güncellemesi yerine güvenli `boost_listing_scoped` RPC'si üzerinden atomik kredi düşümü, satır kilidi ve paket allowlist'iyle yürütülür.
- `KistasTopBrandBar.tsx` üzerindeki gereksiz arka plan plaka kutusu kaldırılarak logo saf ve hafif ışıltılı şekilde doğrudan zemin üzerinde konumlandırıldı; `ProfileExperienceClient` ve `ProfileEditModal` dairesel avatar görünümleriyle hizalandı.
- `next.config.ts` Content-Security-Policy (CSP) direktifleri çevre bazlı ayrıştırıldı (`next-csp-environment.test.mjs`); yerel geliştirmede hata ayıklama için `'unsafe-eval'` izinli kılınırken, canlı üretim derlemesinde `'unsafe-eval'` tamamen engellenerek en katı güvenlik seviyesi korundu.
- `supabase/migrations/20260925000004_remove_admin_announcement_hourly_limit.sql` ve `supabase/manual-sql/remove_admin_announcement_hourly_limit.sql` ile topluluk yöneticisi saatlik duyuru sınırı kaldırılarak aktif proje duyuruları desteklendi.
## 2026-09-26 Rota İskeletleri, Akıcı Gezinme ve Yorum Lazy-Loading Paketi

- Genel ekranı kilitleyen `NavigationLoadingOverlay` ve `KistasRouteLoader` bileşenleri kaldırıldı; yerlerine rota özelinde yerel iskeletler (`RouteSkeletons.tsx`) ve rota `loading.tsx` sınırları (`/browse/[slug]`, `/browse/platform/[platform]`, `/listings/[id]`) entegre edildi.
- `ProjectDetailExperienceClient.tsx` optimize edildi; yorumlar bölümü `ProjectCommentsLazySection.tsx` ve modüler `ProjectCommentsSection.module.css` ile kritik render yolundan ayrılarak lazy-loading mimarisine geçirildi.
- `packages/supabase/src/queries/listings.ts` ve `apps/web/src/app/actions/listings.ts` sorguları hafifletildi; `KistasGlassDock` mobil dokunma ve gezinme gecikmeleri minimize edildi.
- 14/14 test (`project-detail-performance.test.mjs`, `route-loading.test.mjs`), %100 Kale Sağlık Puanı ve 0 tip hatası doğrulandı.
