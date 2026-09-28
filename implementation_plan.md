# KISTAS Monorepo Mimarisi Sertleştirme Planı

## Keşfet navigasyonu ve bağımsız Günün Vitrini — Mimar onayı: 2026-09-28

- Popüler/Yeni/Günün Vitrini başlıkları ve yanlarındaki ortak ChevronRight GlassIconButton aynı filtreli rotayı açar; Tümünü Gör kaldırılır.
- Günün Vitrini `/gunun-vitrini` rotasına ayrılır; mevcut discovery snapshot ve saatlik rotasyon kullanılır.
- Mevcut vitrin kartı rail/grid varyantıyla paylaşılır; kategori, platform, gerçek destek ve logo-only/kapak durumları sunulur.
- Sayfaya özel CSS ile mobil/tablet/masaüstü 1/2/3 kolon, lacivert zemin, safir detaylar, glass geri bağlantısı ve SEO metadata/sitemap eklenir.
- Popüler, Yeni ve Günün Vitrini rotalarında footer render edilmez; eski başlık/buton CSS ve kullanılmayan onOpenAll sözleşmesi temizlenir.
- Doğrulama/devir: `docs/SHOWCASE_PAGE_VALIDATION.md`; önceki profil/arşiv değişiklikleri korunur, production deploy kapsam dışıdır.

## Profil, mesaj avatarı ve lansman arşivi — Mimar onayı: 2026-09-28

- Mesaj avatarının çerçeve/rozetini kaldır; snapshot eksikse yalnız public profil avatarını oku.
- Profil arşiv bağlantısını kaldır; Lansman Paylaş bağlantısı kalsın. Lansman ve arşiv footer'ını gizle.
- Arşive owner-only, revision kontrollü RPC/API ve onaylı silme ekle; başarıdan sonra cihaz metadata/dosyalarını temizle.
- Sponsor Yap Citrus renklerini koru; yalnız bu butondaki CSS animasyonlarını kapat.
- Popüler/Yeni ve detay proje logolarını vitrindeki yüzde 22 yumuşak köşeye eşitle.
- Doğrulama: tip/lint/web, PostgreSQL negatif yetki ve stale revision, tarayıcı silme/CSRF/cihaz temizliği, production derlemeleri.
- Canlı migration/deploy bu yerel değişiklik onayına dahil değildir. Kanıt ve devir: `docs/PROFILE_LAUNCH_UI_VALIDATION.md`.

## Güncel mimari geliştirme programı — 2026-09-28

Altı mimari önerinin uygulama sırası, hazırlık fazı ve çıkış ölçütleri [docs/ARCHITECTURE_ROADMAP.md](docs/ARCHITECTURE_ROADMAP.md) içinde tek kaynak olarak tutulur. Yeni program M0-M6 olarak numaralandırılır; aşağıdaki önceki monorepo geçiş fazlarının tamamlanma kayıtlarıyla karıştırılmaz. Güncel durum: M0/M1 yerelde tamamlandı; M2 yerel paketi doğrulandı, canlı geçiş/kabul bekliyor. Yalnız production ortamı var; yeni kaynak migration uygulanmadan yayınlanmaz. Kanıt, sınırlar ve devir teslim: [docs/M0_VALIDATION.md](docs/M0_VALIDATION.md), [docs/M1_VALIDATION.md](docs/M1_VALIDATION.md), [docs/M2_VALIDATION.md](docs/M2_VALIDATION.md).

## Hedef

M2 saklama süresi devamı (Mimar onayı, 2026-09-28): arşiv son düzenlemeden 72 saat; bildirim oluşturulmadan 72 saat; görüşme son gerçek mesajdan 30 gün sessizlikte silinir. Yeni düzenleme/mesaj süreyi yeniler. Saatlik DB işleri, owner-only yetki, parent kilidi/cascade ve cihaz metadata/dosya TTL uygulanır. Uygulama/kanıt/devir teslim: [docs/RETENTION_VALIDATION.md](docs/RETENTION_VALIDATION.md). Canlı uygulama bekler.

Next.js 16, Cloudflare Workers ve Supabase tabanlı KISTAS web uygulamasını; güvenli yayın kapıları, açık paket sınırları, tekrar üretilebilir testler ve SEO uyumlu sunucu render mimarisiyle ölçeklenebilir bir monorepo standardına taşımak.

## İlkeler

- Canlı davranış her fazda korunur.
- İlgisiz çalışma ağacı değişiklikleri değiştirilmez veya temizlenmez.
- Gizli anahtarlar kaynak kod, istemci paketi, log veya paylaşılan yedeklere girmez.
- Her faz kendi doğrulama kanıtı ve geri dönüş adımıyla kapanır.
- Yeni özellikler dağıtım motoru, indekslenebilirlik ve paylaşılabilir içerik üretimi açısından değerlendirilir.

## Fazlar

1. **Monorepo temel sabitleme** — kaynak ve üretilmiş dosya sınırları, secret taraması, workspace/build doğrulaması.
2. **Lint ve kalite kapısı** — Next.js 16 uyumlu lint, başarısızlıkları yutmayan komutlar.
3. **Test görev grafiği** — domain, güvenlik ve sohbet testlerini Turbo workspace görevlerine bağlama.
4. **CI güvenlik ve build kapısı** — temiz kurulum, tip, lint, test, audit ve üretim build kontrolleri.
5. **Paket sınırları** — `shared`, `supabase` ve `ui` paketlerinde açık API/exports ve bağımlılık yönü.
6. **Tasarım sistemi tekilleştirme** — ortak bileşen ve tokenların tek doğruluk kaynağına taşınması.
7. **Büyük bileşenlerin ayrıştırılması** — davranışı değiştirmeden domain hook, form ve görünüm sınırları.
8. **Üretim E2E ve SEO kapanışı** — kritik oturumlu akışlar, metadata, yapılandırılmış veri ve indekslenebilirlik kanıtları.

## Faz 1 Çıkış Kriterleri

- Next.js/Turbo/Workers çıktı ve cache klasörleri Git aday listesinden çıkarılmıştır.
- `.env` ve yüksek güvenli secret kalıpları kaynak adaylarında temizdir.
- Workspace çözümlemesi ve TypeScript kontrolü başarılıdır.
- Next.js ve vinext üretim derlemeleri başarılıdır.
- XSS, SQL enjeksiyonu, çekirdek domain ve sohbet kimliği testleri başarılıdır.
- Yüksek/kritik bağımlılık açığı bulunmaz.
- Commit ve deploy ayrıca onaylanmadan çalıştırılmaz.

## Faz 1 Doğrulama Kaydı — 2026-09-24

- Git aday kayıtları framework cache kurallarıyla 5.513'ten 402'ye indirildi; dosya silinmedi.
- Workspace çözümlemesi: `@kistas/web`, `@kistas/shared`, `@kistas/supabase`, `@kistas/ui` başarılı.
- TypeScript/Turbo: 7/7 görev başarılı.
- Güvenlik: XSS ve SQL enjeksiyonu kontrolleri başarılı; aday kaynaklarda gerçek secret bulunmadı.
- Regresyon: çekirdek domain 84/84, sohbet kimliği 4/4 başarılı.
- Bağımlılık denetimi: bilinen açık bulunmadı.
- Üretim: Next.js ve vinext derlemeleri ile Workers dry-run başarılı; deploy yapılmadı.
- Takip notu: Edge Runtime deprecation, 500 KB üzeri istemci chunk'ları ve Cloudflare görsel optimizasyonu eksikliği sonraki performans/SEO fazlarına kaydedildi.
- Depo temizliği: Kullanılmayan 128 ham PNG/JPG kategori varlığı (88,23 MB) kaldırıldı. Çalışma zamanında kullanılan 38 WebP varlığının tamamı doğrulandı; eksik referans yok. Yeni monorepo aday kapsamı 208 dosya ve yaklaşık 8,31 MB'a indirildi.

## Faz 2 — Lint ve Kalite Kapısı

- Next.js 16 tarafından kaldırılan `next lint`, ESLint 9 flat config ile değiştirilecektir.
- Web uygulamasında `core-web-vitals` ve TypeScript kuralları uyarı toleransı olmadan çalışacaktır.
- Root lint görevi dört workspace paketini Turbo üzerinden doğrulayacaktır.
- Bağımlılık güvenlik denetimi hata kodunu yutmayacak; yüksek/kritik bulgu kalite kapısını durduracaktır.
- Faz; lint, TypeScript, güvenlik/regresyon testleri ve üretim build kanıtlarıyla kapatılacaktır.
- Geçiş istisnaları: mevcut Supabase adaptörlerindeki açık `any` tipleri, davranış değiştiren React saflık/efekt refactorları ve Cloudflare Images bağlanmadan önceki `<img>` kullanımları ayrı teknik borç olarak tutulacaktır. Hook bağımlılıkları, navigasyon, kullanılmayan kod ve JSX güvenliği bu fazda düzeltilir.

## Faz 2 Doğrulama Kaydı — 2026-09-24

- Next.js 16 uyumlu ESLint 9 flat config, Core Web Vitals ve TypeScript kuralları kuruldu.
- Web lint: 0 hata, 0 uyarı; Turbo workspace lint: 4/4 başarılı.
- TypeScript/Turbo: 7/7 görev başarılı.
- Bağımlılık denetimi fail-closed çalıştı; bilinen açık bulunmadı.
- XSS ve SQL enjeksiyonu kontrolleri başarılı.
- Regresyon: çekirdek domain 84/84, sohbet kimliği 4/4 başarılı.
- Next.js ve vinext üretim derlemeleri başarılı; deploy yapılmadı.
- Düzeltmeler: kararlı Supabase istemci referansları, eksiksiz hook bağımlılıkları, render dışında Google callback ref güncellemesi, güvenli iç navigasyon ve sıralı sohbet animasyonu.
- Windows üzerinde Turbo build görevleri tamamlandıktan sonra süreç askıda kaldığı için root build kapısı topolojik ve tek eşzamanlı `pnpm -r` çalıştırıcısına geçirildi; lint ve type-check Turbo önbelleğini kullanmayı sürdürür.

## Faz 3 — Test Görev Grafiği

- Mevcut yerel regresyon testleri `shared`, `supabase`, `ui` ve `web` sorumluluklarına ayrılır.
- Her workspace gerçek bir `test` görevi çalıştırır; eksik veya var olmayan görev başarı sayılmaz.
- Test dosyaları Turbo global girdisi olarak izlenir ve başarılı sonuçlar önbelleğe alınır.
- Ağ ve canlı Supabase erişimi gerektiren Pars Defender testi deterministik kapıdan ayrılarak yalnız `pnpm test:live` ile çalıştırılır.
- `pnpm sayos:audit`, üretim derlemesinden önce bütün deterministik testleri fail-closed çalıştırır.
- Eski Expo `dist` çıktısına bağlı SEO ve tipografi testleri Next.js App Router ile ortak UI token sözleşmesine taşınır.

## Faz 3 Doğrulama Kaydı — 2026-09-24

- Dört workspace’in tamamında test görevi mevcut; Turbo test grafiği 7/7 başarılıdır.
- 15 deterministik test dosyası çalıştı; çekirdek domain 84/84 ve sohbet kimliği 4/4 başarılı, atlanan test yoktur.
- İkinci çalıştırmada 7/7 görev Turbo önbelleğinden geldi; kök test dosyaları `globalDependencies` ile cache invalidation kapsamındadır.
- Next.js SEO sözleşmesi 8 kaynak rota ve 11 sitemap URL’sini; UI tipografi sözleşmesi ortak Kıstas tokenını ve sistem font zincirini doğrular.
- `pnpm sayos:audit`: bilinen yüksek/kritik açık yok, lint 4/4, tip kontrolü 7/7, test grafiği 7/7 ve Next üretim derlemesi başarılıdır. XSS/SQL korumaları ve vinext Workers derlemesi ayrıca geçmiştir.
- Canlı ağ testi bilinçli olarak otomatik kapıya alınmadı; deploy veya veritabanı değişikliği yapılmadı.

## Faz 4 — CI Güvenlik ve Build Kapısı

- GitHub Actions kalite kapısı `main` push, pull request ve manuel tetiklemede temiz Linux ortamında çalışır.
- Workflow yalnız `contents: read` yetkisi alır; PR koduna secret veya deploy yetkisi verilmez.
- Node.js ve pnpm sürümleri sabitlenir; bağımlılıklar mevcut `pnpm-lock.yaml` değiştirilmeden kurulur.
- Kullanılan GitHub Actions tam commit SHA’larına kilitlenerek hareketli etiket kaynaklı tedarik zinciri riski azaltılır.
- Birleşik güvenlik kapısı bağımlılık, repository secret, XSS ve SQL enjeksiyonu kontrollerini fail-closed uygular.
- Lint, tip kontrolü, deterministik testler, Next üretim buildi, vinext Workers buildi ve Wrangler dry-run zorunludur.
- pnpm store ve Turbo sonuçları önbelleğe alınır; Turbo cache yalnız başarılı `main` push çalışmasında kaydedilir.
- CI hiçbir koşulda otomatik deploy, migration veya canlı Supabase testi çalıştırmaz.

## Faz 4 Doğrulama Kaydı — 2026-09-24

- Workflow YAML yapısı ayrıştırıldı; `quality` işi ve adımları doğrulandı. Action referansları güncel resmi etiketlerin tam commit SHA’larıyla eşleştirildi.
- `pnpm install --frozen-lockfile` beş workspace için başarılı; lockfile değiştirilmedi ve tedarik zinciri politikalarından geçti.
- Birleşik kapı başarılı: bilinen açık yok, repository secret/XSS/SQL temiz, lint 4/4, tip kontrolü 7/7, test grafiği 7/7 ve Next üretim buildi başarılı.
- vinext Workers buildi ve Wrangler dry-run başarılı; 327 modül ile 2,41 MiB gzip yükleme paketi doğrulandı, deploy yapılmadı.
- GitHub üzerindeki ilk gerçek workflow koşusu commit uzak depoya gönderildikten sonra doğrulanacaktır.
- Takip notu: Edge Runtime deprecation ve 500 KB üzeri istemci chunk uyarıları sonraki performans fazlarında ele alınacaktır.

## Geri Dönüş

Faz 1 yalnız depo hijyeni ve belgeleri değiştirir. Sorun halinde bu fazda değiştirilen `.gitignore` ve dokümantasyon satırları geri alınır; canlı Worker, Supabase ve eski Pages yayınına dokunulmaz.

Faz 4 geri dönüşünde kalite workflow’u ve `sayos:security` zincirindeki ek kontroller geri alınır. CI’nın deploy yetkisi olmadığı için bu geri dönüş canlı Worker, veritabanı veya Pages yayını üzerinde işlem gerektirmez.

## 2026-09-27 — Destek ve Analitik Onarım Fazı

### Hedef

- Profildeki Destek eylemini e-posta yerine resmî Kıstas Destek görüşmesine bağlamak.
- Faz 18 savunma migration’ının bozduğu destek görüşmesi sonlandırma yaşam döngüsünü ileri yönlü bir migration ile onarmak.
- Footer’daki Analitik Tercihi bağlantısını kaldırırken ilk ziyarette çalışan consent-first analitik sorusunu korumak.

### Mimari ve veri akışı

1. Profil istemcisi `get_or_create_support_conversation()` RPC’sini çağırır.
2. Başarılı sonuç yalnız güvenli `conversationId` query parametresiyle `/messages` rotasına taşınır.
3. Sonlandırma RPC’si `community` iznini sunucuda doğrular, hedef satırı kilitler ve yalnız `listing_id IS NULL` destek görüşmesini kapatır.
4. Kapanış; `closed_at`, `closed_by`, sistem mesajı ve append-only yönetici denetim kaydını aynı transaction içinde üretir.
5. Analitik sağlayıcı yalnız yerel tercih bulunmadığında ilk ziyaret sorusunu göstermeyi sürdürür; footer tekrar-açma bağlantısı ve kullanılmayan event sözleşmesi kaldırılır.

### Etkilenecek alanlar

- `apps/web/src/components/ProfileExperienceClient.tsx`
- `apps/web/src/components/CinematicFooter.tsx`
- `apps/web/src/components/AnalyticsProvider.tsx`
- `apps/web/src/lib/analytics.ts`
- yeni Supabase onarım migration’ı ve konsolide manuel SQL
- destek/analitik regresyon testleri ve güvenlik yol haritası kanıtı

### Edge case, hata ve güvenlik kontrolleri

- Çift tıklama tek istemci isteğine indirgenecek; hata halinde kullanıcı profil ekranında erişilebilir geri bildirim görecek.
- Kapanmış görüşmenin tekrar kapatılması idempotent başarı döndürecek.
- Proje/özel görüşmesi destek RPC’siyle kapatılamayacak.
- Anonim veya `community` izni olmayan hesap sunucuda reddedilecek.
- Var olmayan görüşme başarı gibi gösterilmeyecek; istemci boş/bozuk RPC yanıtını hata kabul edecek.
- Yeni secret, istemci tarafı rol kararı veya doğrudan tablo yazımı eklenmeyecek.

### Çıkış ölçütü

- Hedefli TypeScript, lint, destek yaşam döngüsü, analitik consent ve güvenlik testleri başarılı.
- Değiştirilen alanda `is_archived`, footer analitik event’i ve `mailto:` destek aksiyonu kalmamış.
- Production migration/deploy ayrıca uygulanıp doğrulanmadan bu faz canlıda tamamlandı sayılmaz.

### Yerel doğrulama kaydı — 2026-09-27

- Profil Destek eylemi resmî RPC akışına bağlandı; e-posta bağlantısı ve çift tıklama riski kaldırıldı.
- Destek kapanış onarım migration’ı ile `community` yetkisi, satır kilidi, destek kapsamı, idempotency, sistem mesajı ve denetim izi geri getirildi.
- Footer analitik bağlantısı ve kullanılmayan event sözleşmesi kaldırıldı; ilk ziyaret consent sorusu ve fail-closed GA davranışı korundu.
- Web TypeScript ve ESLint, web testleri 14/14, core-domain 85/85, Supabase TypeScript, secret/XSS/SQLi taramaları ve Next production build başarılıdır.
- `20260925000004` ve `20260927000001` canlı Supabase'e başarıyla uygulandı; yerel/canlı migration geçmişi eşleşti ve anonim destek kapanış RPC çağrısı HTTP 401/forbidden ile reddedildi.
- Worker deploy beklemektedir.

---

# Kompakt Proje Aksiyonlari Uygulama Plani

## Kapsam

- Profildeki proje aksiyon dock'unu daha az yer kaplayan yatay ikon/metin duzenine gecir.
- `Sponsor Yap` aksiyonunu ortak `ShinyButton` ile Citrus Glass varyantina tasi.
- Vitrin yonetimi modalindaki atomik islem bilgilendirme metnini kaldir.
- Davranis, rota ve guvenli `boost_listing_scoped` RPC akislarini degistirme.

## Uygulama

1. `ProfileExperienceClient.tsx` icinde aktif projelerde mobil 2, genis ekranda 4 sutun yapisini koruyan kompakt bir glass dock kur.
2. Duzenle, vitrinde gor ve sil aksiyonlarini 44 px sinifinda, yatay ikon/metinli sade glass kontrollere indir.
3. Sponsor aksiyonunu ayni boyut sinirinda `shiny-cta--citrus` kullanan `ShinyButton` olarak uygula.
4. `VisibilityManagementModal.tsx` footer altindaki aciklama paragrafini kaldir.
5. Hedefli regresyon testlerini yeni tasarim sozlesmesine gore guncelle; TypeScript, lint ve ilgili testi calistir.

## Cikis Olcutleri

- Eski 72 px dikey aksiyon kartlari ve bunlara ait test beklentileri kalmaz.
- Sponsor aksiyonu ortak Citrus Glass bileşenini kullanir.
- Kaldirilmasi istenen metin kaynakta ve arayuzde bulunmaz.
- Proje rotalari, modal acma ve silme davranislari korunur.
- Hedefli testler, TypeScript ve lint temizdir.

## Dogrulama Kaydi — 2026-09-27

- Web TypeScript kontrolu basarili.
- Web ESLint kontrolu 0 hata ve 0 uyariyla basarili.
- Web regresyon paketi 19/19 dosyada basarili.
- Next.js production build basarili; mevcut Edge Runtime deprecation uyarisi bu UI degisikliginden bagimsizdir.


---

# WhatsApp Tarzi Mesaj Bildirimi Uygulama Plani

## Kapsam

- Yeni mesaj glass bildirimini WhatsApp/iOS banner hiyerarsisiyle yeniden tasarla.
- Gonderenin profil fotografini, adini, mesaj onizlemesini ve anlik zaman etiketini goster.
- Yonetici `Yayinla` duyurularinin mevcut kurumsal gorunum ve davranisini koru.
- Mesaj tercihi, `/messages` rotasinda bastirma, iki kart siniri ve konusmaya yonlendirme davranislarini degistirme.

## Mimari, klasor ve veri akisi

1. Yeni ileri yonlu Supabase migration'i, mevcut `trg_notify_chat_message()` fonksiyonunda gonderenin `full_name` ve `avatar_url` alanlarini ayni profil okumasinda alir.
2. Avatar URL'si bildirim `data` JSON'una `sender_avatar_url` olarak snapshot edilir; istemci ek profil sorgusu yapmaz.
3. `MessageNotificationProvider`, yalniz mesaj bildirimlerinde bu alani `GlobalNotificationCard` bilesenine aktarir.
4. `GlobalNotificationCard`, mesaj icin yuvarlak `ChatAvatar`, ad, `simdi`, iki satir onizleme ve birikmis mesaj sayaci kullanir; yonetici duyurusu `AutoTransparentLogo` ile mevcut dalda kalir.
5. `globals.css`, ortak glass tabanini bozmadan mesaj varyantina parlak ust katman, daha yumusak kapsul formu ve mobil dokunma geri bildirimi ekler.

## Edge case, hata, guvenlik ve performans

- Eksik veya yuklenemeyen avatar `ChatAvatar` icindeki yerel Kistas logosuna duser.
- Uzun ad ve mesajlar tasma olmadan kirpilir; metin HTML olarak calistirilmaz.
- Profil verisi guvenilir tetikleyicide okunur; alici, tercih, sahiplik ve Realtime RLS sinirlari degismez.
- Fonksiyon `SECURITY DEFINER` ve bos `search_path` korumasini surdurur; istemciye secret veya yeni yazma yetkisi verilmez.
- Avatar snapshot'i mevcut insert transaction'inda uretilir; bildirim basina ek istemci sorgusu ve render dongusu eklenmez.
- Migration geri alimi gerekirse fonksiyon yeni bir ileri migration ile onceki JSON payload'ina dondurulur; kalici bildirim kayitlari silinmez.

## Etkilenecek alanlar

- `supabase/migrations/20260928000001_message_notification_sender_avatar.sql`
- `apps/web/src/components/MessageNotificationProvider.tsx`
- `apps/web/src/components/GlobalNotificationCard.tsx`
- `apps/web/src/app/globals.css`
- mesaj/bildirim regresyon testleri

## Cikis olcutleri

- Mesaj karti fotograf, ad, `simdi` ve onizleme ile WhatsApp benzeri yatay kompozisyondadir.
- Eski `Mesaji ac` alt satiri ve mesaj icin genel ikon fallback dali kalmaz.
- Yonetici duyurusu, tiklama, kapatma, gruplayarak sayma ve erisilebilirlik davranislari korunur.
- TypeScript, ESLint, web regresyon paketi, guvenlik kontrolleri ve production build temizdir.

## Dogrulama Kaydi — 2026-09-28

- Mesaj bildirim karti gonderen avatari, ad, `simdi`, iki satir onizleme ve Citrus mesaj rozetiyle ayri WhatsApp/iOS kompozisyonuna tasindi.
- Avatar profil kaydindan guvenilir tetikleyicide okunup bildirim payload'ina eklendi; istemciye yeni sorgu veya yazma yetkisi eklenmedi.
- Eski `Mesaji ac` alt satiri kaldirildi; yonetici duyurusu ve mevcut bildirim davranislari korundu.
- Web TypeScript, ESLint ve 20/20 regresyon paketi basarili.
- Supabase TypeScript, bagimlilik, repository secret, XSS ve SQL enjeksiyonu kontrolleri temiz.
- Next.js production build basarili; mevcut Edge Runtime deprecation uyarisi bu degisiklikten bagimsizdir.
- Migration ve web degisikligi canliya uygulanmadi; production yayin ayri onay gerektirir.



---

# App Store Kesif Listeleri Uygulama Plani

## Kapsam

- `/popular` rotasinin Krediler sekmesini aktif gostermesini duzelt.
- Populer, Yeni Cikanlar ve Kesfet bolumlerini tek App Store liste sistemiyle birlestir.
- Proje logolarini cercevesiz ve seffaf yuzeyde goster.
- Destek sayilarini ortak Citrus Glass sayaciyla sun.
- Mevcut public Supabase okuma, ISR, proje rotasi ve destek is mantigini degistirme.

## Mimari ve veri akisi

1. `getCuratedListings` sunucuda aktif projeleri mevcut siralamayla okumaya devam eder.
2. Public sayfalar veriyi ortak `AppStoreProjectList` bilesenine aktarir.
3. Kesfet ana sayfasi ayni bileseni alti ogelik ozet modunda kullanir.
4. Populer tam sayfada toplam destege gore sira, Yeni sayfasinda yeni etiketi ve tarih gosterilir.
5. Tum satirlar dahili `/listings/[id]` rotasina gider; destek sayaci salt okunur kalir.

## Uygulama

- Navbar aktif rota eslemesini `/popular` ve `/new` icin Kesfet, `/credits` icin Krediler olacak sekilde ayir.
- `PopularProjectPager` yerine semantik ortak `AppStoreProjectList` bilesenini koy ve eski dosyayi sil.
- Logolarda arka kutu, kenarlik ve yapay cerceveyi kaldir; `AutoTransparentLogo` ile `shape="none"` kullan.
- Sponsor durumunu destek sayisinin yerine gecirmeden ayri, kucuk bir isaret olarak goster.
- Populer ve Yeni sayfalarindaki tekrarli legacy kart JSX'ini ortak bilesenle degistir.
- Haftalik olmayan mevcut sorgu icin yaniltici `Haftalik` metnini `Topluluk Siralamasi` olarak duzelt.

## Edge case ve cikis olcutleri

- Bos listeler anlamli CTA ile gorunur; eksik logo bas harf fallback'i kullanir.
- Uzun baslik/aciklama satiri bozmaz; mobil tek, genis ekranda iki sutun calisir.
- Eski yesil sayac, cerceveli logo ve tekrarli kart kodu kalmaz.
- Navbar, logo, Citrus Glass, public performans, TypeScript, lint, web testleri ve production build temizdir.

## Dogrulama Kaydi — 2026-09-28

- Populer ve Yeni sayfalari mobil ve masaustu Chromium render'inda gorundu; navbar Kesfet aktif durumunu korudu.
- Gercek logolar cercevesiz, destek sayilari sponsor durumundan bagimsiz Citrus Glass olarak dogrulandi.
- Web TypeScript ve ESLint kontrolleri basarili.
- Web regresyon paketi 19/19 dosyada basarili.
- Next.js production build basarili; mevcut Edge Runtime deprecation uyarisi bu UI degisikliginden bagimsizdir.


---

# Kredi Hareketleri ve Ortak Modal Kilidi Uygulama Plani

## Kapsam

- Kredi Hareketleri penceresini mobil cüzdan/hesap ozeti mantigiyla yeniden tasarla.
- Dokunma kaydirma hareketinin modal sinirindan arka sayfaya zincirlenmesini engelle.
- Profil overlay'lerinde tekrarlanan body kilidi kodunu tek, sayacli bir hook'ta birlestir.
- Kredi verisi, odeme, RPC, RLS ve bakiye hesaplama mantigini degistirme.

## Mimari ve veri akisi

1. Profil istemcisi mevcut kullaniciya ait kredi hareketlerini yuklemeye devam eder.
2. `CreditHistoryModal` yalniz yuklenmis listeyi Tumu/Gelen/Kullanilan olarak istemcide filtreler ve tarihe gore gruplar.
3. `useBodyScrollLock` ilk acilan overlay'de sayfa konumunu ve inline stilleri kaydeder.
4. Birden cok overlay kilidi varsa referans sayaci erken geri yuklemeyi engeller.
5. Son overlay kapandiginda tum stiller ve onceki scroll konumu geri yuklenir.

## Tasarim

- Mobil bottom sheet, masaustunde merkez glass modal.
- Kompakt bakiye karti, Citrus Glass Kredi Al aksiyonu ve islem adedi.
- Tarih gruplari, okunabilir islem satirlari, giris/cikis yonu ve islem sonrasi bakiye.
- Ic liste `touch-pan-y`, momentum scroll ve `overscroll-contain` kullanir; backdrop `overscroll-none` kalir.

## Cikis olcutleri

- Profil overlay'lerinde paralel body-lock implementasyonu kalmaz.
- Modal acikken arka sayfa mobil dokunmayla hareket etmez; kapanista konum korunur.
- Bos, yukleniyor ve filtre sonucu bos durumlari erisilebilir gorunur.
- TypeScript, lint, hedefli scroll-lock/kredi testleri, web paketi ve production build temizdir.

## Dogrulama Kaydi — 2026-09-28

- Sekiz profil overlay'i ortak, referans sayacli `useBodyScrollLock` sistemine tasindi.
- Eski ProfileEdit ve Visibility kopya body-lock implementasyonlari kaldirildi.
- Kredi Hareketleri filtre, tarih grubu, Citrus Glass Kredi Al ve mobil ic-scroll sozlesmeleriyle dogrulandi.
- Web TypeScript ve ESLint kontrolleri basarili.
- Web regresyon paketi 20/20 dosyada basarili.
- Next.js production build basarili; mevcut Edge Runtime deprecation uyarisi bu UI degisikliginden bagimsizdir.
