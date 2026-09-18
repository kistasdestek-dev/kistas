# YOL HARİTASI VE GÜNCEL DURUM (ROADMAP STATUS)

> **Kural:** Yalnızca aktif durum ve değişmez maddeler tutulur. Eski tartışmalar ve çöp loglar eklenmez.

---

## Web Adaptasyonu — Faz 3 Tamamlandı

- [x] RevenueCat servisi `.native.ts` ve `.web.ts` platform sınırlarına ayrıldı; iOS/Android satın alma davranışı korundu.
- [x] Web fallback istemciden kredi üretmez ve native mağaza SDK'sını web bundleına taşımaz.
- [x] Telefon (`<=767`), tablet (`768–1199`) ve masaüstü (`>=1200`) responsive tokenları eklendi.
- [x] TypeScript, web üretim exportu ve Android üretim exportu başarıyla tamamlandı.
- [x] Native ve web navigasyon kabukları fiziksel platform dosyalarıyla ayrıldı.
- [x] Web telefonda cam alt menü, tablette 84 px navigasyon rayı, masaüstünde 252 px kurumsal sidebar kullanır.
- [x] Masaüstü sidebar tüm ana bölümlere doğrudan erişim ve sade bir durum footer'ı sunar.
- [x] Geniş web içerik alanı sidebar altında kalmadan en fazla 1600 px genişliğe sınırlandı.
- [x] Keşfet üst alanı, arama, sıralama, kategori ve platform filtreleri geniş web düzenine uyarlandı.
- [x] Göz At kategori grid'i telefon/tablet/masaüstünde sırasıyla 2/3/4 kolon kullanır.
- [x] Günün Vitrini webde statik premium kartlara ayrıldı; native animasyonlu bileşen korunur.
- [x] Sponsorlu Vitrin'in sıralama ve kredi mantığı değişmeden, boşta çalışan web animasyon döngüleri kaldırıldı.
- [x] Web filtre marquee'si, otomatik arama yazısı ve buton RAF döngüleri kaldırıldı; ilk içerik native lansman katmanı beklenmeden gösterilir.
- [ ] Sıradaki çalışma: proje detayı ve lansman formunun adaptive web yerleşimi.

Detaylı sıra: `docs/WEB_ADAPTATION_PLAN.md`.

## Mobil Kredi Ödemeleri — Sandbox Temeli

- [x] RevenueCat React Native SDK ile Apple IAP / Google Play Billing ürün ve satın alma katmanı eklendi.
- [x] Mağaza fiyatları cihazın mağazasından okunuyor; anahtar veya ürün yoksa güvenli yapılandırılmadı durumu gösteriliyor.
- [x] RevenueCat kredi webhook'u, izinli ürün/tutar kontrolü ve tekrar işlemeyi engelleyen atomik Supabase kredi günlüğü hazırlandı.
- [ ] Canlı anahtarlar, mağaza ürünleri, migration/function deploy ve gerçek cihaz sandbox testleri dış panel kurulumu bekliyor.

## Genel İlerleme Özeti

### Organik Keşif ve Adil Vitrin Dönüşümü

- [x] **Faz 1: Veri Güvenliği ve Destek Kuralları**
  - Lansman formu yalnızca Supabase'deki gerçek dijital kategori UUID'lerini kullanır.
  - Destek işlemi; doğrulanmış e-posta, aktif proje, öz-destek yasağı ve tek destek/kullanıcı kurallarıyla sunucuda korunur.
  - Aktif sponsorlu projelerde destek verme ve geri alma kilitlidir; doğruluk kaynağı `boosted_until` alanıdır.
  - `project_upvotes` tablosuna istemciden doğrudan yazma kapatılmış, işlemler atomik RPC'ye alınmıştır.
  - TypeScript lint ile iOS ve Android üretim export kontrolleri tamamlanmıştır.
- [x] **Faz 2: Sunucu Taraflı Organik Sıralama**
  - Son 7 günlük doğrulanmış destek sayısı ile global ve kategori bazlı Popüler sıralaması hazırlandı.
  - Eşitlik sırası: ömür boyu destek, yayın tarihi ve kararlı proje kimliği.
  - Global Popüler en fazla 50 proje; aktif sponsorlar organik sonuçlardan sunucuda çıkarılır.
  - İlk 7 günlük sponsorlu olmayan projeler için Yeni Çıkanlar RPC'si hazırlandı.
  - Sorgu indeksleri ve `ListingService.getPopularListings()` / `getNewListings()` eklendi.
  - Canlı şemada bulunmayan eski `is_boosted` ve `boost_credits_spent` istemci bağımlılığı kaldırıldı.
  - TypeScript lint ile iOS ve Android üretim export kontrolleri tamamlandı.
- [x] **Faz 3: Organik Keşif Arayüzü**
  - Keşfet ekranındaki istemci taraflı momentum/yenilik puan formülü kaldırıldı.
  - Popüler bölümü sunucunun global ilk 50 veya seçili kategori sırasını, üç proje/sayfa App Store düzeninde gösterir.
  - Yeni Çıkanlar bölümü ilk 7 gün RPC'sine bağlandı; Öne Çıkan akışında Popüler ile birlikte sunulur.
  - Destek sonrasında organik listeler sunucudan tekrar alınarak haftalık sayaç ve sıra doğrulanır.
  - Keşfet, Göz At ve kategori filtresi yalnızca canlı Supabase kategori UUID'lerini kullanır.
  - Sponsorlu Vitrin ve Günün Vitrini bu fazda değiştirilmemiştir.
  - TypeScript lint ile iOS ve Android üretim export kontrolleri tamamlanmıştır.
- [x] **Faz 4: Haftalık Kategori Liderleri ve Günün Vitrini**
  - Her aktif dijital kategori için önceki haftanın doğrulanmış destek lideri seçilir.
  - Minimum 5 haftalık destek ve aynı proje için 14 günlük tekrar kazanma engeli uygulanır.
  - Aktif sponsorlar seçim dışında kalır; uygun aday yoksa sahte kazanan üretilmez.
  - Seçim pazartesi 00:05 Europe/Istanbul saatine karşılık gelen pg_cron göreviyle otomatik ve idempotent çalışır.
  - Kazanan, oyları sonradan değişse bile sabit kayıtla 7 gün vitrinde kalır.
  - Günün Vitrini artık ilk dört genel projeyi değil, uygun bütün kategori liderlerini gösterir.
  - Organik vitrindeki kredi mağazası çağrısı kaldırılmış, haftalık kategori liderliği dili uygulanmıştır.
  - TypeScript lint ile iOS ve Android üretim export kontrolleri tamamlanmıştır.
- [x] **Faz 5: Adil Sponsor Rotasyonu**
  - Sponsorlu Vitrin yalnızca aktif `boosted_until` kayıtlarını sunucudan alır; süresi dolan projeler otomatik çıkar.
  - Kredi yalnızca 24 saat, 3 gün veya 7 günlük görünürlük süresi satın alır; kredi tutarı sıra satın alamaz.
  - Global ve kategori bazlı aktif sponsorlar her saat deterministik eşit rotasyonla sıralanır.
  - İstemciden gönderilen paket süresi ve maliyeti sunucuda sabit eşleşmelerle doğrulanır; anonim sponsor işlemleri kapalıdır.
  - Sponsor kartlarındaki yanıltıcı kredi/sıra vaatleri kaldırılmış, adil rotasyon dili uygulanmıştır.
  - TypeScript lint ile canlı RPC yetki/doğrulama kontrolleri tamamlanmıştır.
- [x] **Faz 6: Temizlik, Sertleştirme ve Büyük Veri Testleri**
  - Keşfet ve yönetim panelindeki örnek proje/kullanıcı cache'leri ile eski birleşik sıralama servisi kaldırıldı.
  - Yönetici rolü istemci e-posta kontrolünden çıkarılıp doğrulanmış Auth hesabı ve sunucu allowlistine taşındı.
  - Yönetim işlemleri yetkili RPC'lere alındı; durum, sponsorluk, silme ve kredi hareketleri denetim tablosuna kaydedilir.
  - Kullanıcıların `boosted_until`, `upvotes_count`, `boost_credits` ve finansal sayaçları doğrudan değiştirmesi kolon yetkileriyle kapatıldı.
  - Sahte kredi satın alma/iyimser bakiye tanımlama kaldırıldı; doğrulanmış ödeme sağlayıcısı bağlanana kadar ücret ve kredi hareketi oluşturulmaz.
  - Sponsor sorguları için global ve kategori bileşik indeksleri eklendi.
  - Migration içinde 10.000 sponsor/tam rotasyon çevrimi; yerel stres testinde 100.000 proje ve 10.000 sponsor kalıcı veri oluşturmadan doğrulandı.
  - TypeScript lint, canlı RPC yetki kontrolleri ile iOS ve Android üretim exportları tamamlandı.

- [x] **Adım 0: Çekirdek Mimari & Supabase Kurulumu**
  - PostgreSQL / Supabase şeması, RLS güvenlik politikaları ve donanım şifreli SecureStore adaptörü kuruldu.
- [x] **Adım 1: Kimlik Doğrulama (Auth) & Canlı Veritabanı Bağlantısı**
  - E-posta ve telefon OTP ile resmi Supabase oturum altyapısı bağlandı.
  - Canlı CLI bağlantısı ve otomatik migration yönetimi sağlandı.
- [x] **Adım 2: Tasarım Devrimi (Cyber-Luxury Obsidian Dark Modu)**
  - Tüm uygulama `#070A12` derin uzay siyahı, koyu cam paneller ve Electric Neon ışıltılarıyla giydirildi.
  - Saf mobil `MobileBottomNav.tsx` ve modern kart bileşenleri hazırlandı.
- [x] **Adım 3: DİJİTAL PROJE VE UYGULAMA VİTRİNİNE PİVOT (Product Hunt + App Store)**
  - `listings` şeması dijital proje formatına uyarlandı (`tagline`, `logo_url`, `app_store_url`, `play_store_url`, `web_url`, `platforms`, `promo_code`).
  - Topluluk oy mekanizması (`project_upvotes`) ve atomik `toggle_project_upvote` RPC fonksiyonu canlı veritabanına uygulandı.
  - Dijital proje kategorileri (AI, Oyun, Verimlilik, Fintech, Sosyal, DevTools, SaaS, Tasarım) entegre edildi.
  - `CreateListingScreen.tsx` "Projeni Tanıt / Lansman Yap" formuna dönüştürüldü.
  - `DiscoverScreen.tsx` Product Hunt + App Store vitrinine dönüştürüldü (Upvote butonu, mağaza indirme yönlendirmesi, sponsorlu boost rozetleri).
- [x] **Adım 4: Kredi & Sponsorlu Vitrin Motoru Entegrasyonu**
  - `boost_listing_with_credits()` yalnızca sabit görünürlük paketlerini kabul edecek şekilde sertleştirildi.
  - Geliştiriciler kredileriyle Sponsorlu Vitrin süresi satın alır; bütün aktif sponsorlar eşit rotasyona katılır.
- [x] **Adım 5: Geliştirici & Maker İletişimi (Realtime Chat)**
  - Yatırımcılar, test kullanıcıları ve iş ortakları için geliştiriciyle birebir şifreli sohbet bağlantısı kuruldu.
- [ ] **Adım 6: Geliştirici Profili & Cüzdan Yönetimi Mükemmelleştirmesi**
  - Maker profilinde yayınlanan projeler, kazanılan toplam upvote'lar ve kalan lansman kredisi bakiyesi.
- [ ] **Adım 7: Canlıya Hazırlık & Mağaza Çıktıları (EAS Build / TestFlight / Play Store)**

---

## 🛡️ Güvenlik Yol Haritası — Faz 19 (Pars DevState 6 Aşamalı Kalkan) TAMAMLANDI
- [x] **Aşama 1: Savunma Mekanizmasının Silahlaştırılması Engeli (Self-DoS Prevention)**: `is_safe_whitelisted_ip()` ile loopback/RFC 1918 koruması, anon karantina manipülasyonu engeli.
- [x] **Aşama 2: Race Condition & Finansal Bütünlük Kalkanı**: `profiles` pozitif bakiye kısıtları, `orders` tekil aktif sipariş indeksi, `project_upvotes` çift oy engeli, 3 sn spam cooldown.
- [x] **Aşama 3: Webhook Uç Noktaları DoS & Kaynak Tüketimi**: Deno Edge Functions bellek içi IP throttling (`isThrottled`), 64 KB tavan boyutu, constant-time imza doğrulaması.
- [x] **Aşama 4: PostgREST Doğrudan API Kazıma & IDOR İzolasyonu**: 9 hassas tablodan `anon` ve `public` erişimi tamamen kaldırıldı (REVOKE ALL). Katı `auth.uid()` ve taraf RLS mühürlendi.
- [x] **Aşama 5: Depolama (Storage) Polyglot Dosya & Stored XSS Kalkanı**: SVG/HTML/XML kesin engeli, `name !~ '\.\.'` path traversal koruması, dosya sahibi izolasyonu (`owner = auth.uid()`).
- [x] **Aşama 6: WebSocket Realtime CDC Sniffing & Dinleme Kaçağı İzolasyonu**: 17 hassas tablonun `supabase_realtime` yayınından koşulsuz düşürülmesi.
- [x] **Konsolide Canlı Göç**: `supabase/migrations/FAZ19_CONSOLIDATED_DEFENSE_SHIELD_MIGRATION.sql` tek tıkla canlıya uygulanabilir hale getirildi.
- [x] **Regresyon Testleri & Fortress Check**: 102/102 test tam başarılı, 0 TypeScript hatası, %100 / 100 [A+] kale skoru.
- Detaylı iş akışı ve kapanış kaydı: `docs/FAZ19_DEFENSE_WORKFLOW.md` ve `docs/SECURITY_ROADMAP.md` (SEC-064 - SEC-069).

