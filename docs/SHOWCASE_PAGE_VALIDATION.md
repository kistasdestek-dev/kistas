# Keşfet başlıkları ve bağımsız Günün Vitrini — 2026-09-28

Mimar güncel tasarımı ve önceki iki navigasyon/footer planını açıkça onayladı.

## Mimari genel bakış

Next.js `/gunun-vitrini` sayfası mevcut `loadDiscovery` üzerinden public aktif proje seçkisini ve cache snapshot zamanını alır; Keşfet ile aynı `rotateListingsByHour` sözleşmesini uygular. Ayrı popüler sıralaması veya yeni veri modeli oluşturulmaz. Shared heading ve shared rail/grid kartları aynı ürün kimliğini korur.

## Klasör yapısı ve tam implementasyon

- `apps/web/src/app/(public)/gunun-vitrini/page.tsx`: server okuma, metadata, canonical/Open Graph ve 60 saniye revalidation.
- Aynı dizindeki `showcase.css`: yalnız bu rota için hero, card grid, mobile/tablet/desktop ve logo-only sunum.
- `apps/web/src/components/ShowcaseExperienceClient.tsx`: başlık, İstanbul zamanında snapshot tarihi, filtre kapsamı, proje adedi ve glass geri bağlantısı; gerçek boş durum.
- `DiscoverySectionHeading.tsx`: başlık ve ChevronRight ikonu için aynı href; GlassIconButton dekoratif çocuk, Link klavye/erişilebilir isim sahibi.
- `TodayShowcaseRow.tsx`: ortak rail/grid kartı; kapak/eksik kapak, kategori/platform, gerçek destek, projeyi keşfet rotası.
- `DiscoverExperienceClient.tsx`: ayrı vitrin rotası; q/category/platform/sort mevcut discoveryHref ile taşınır.
- `AppStoreProjectList.tsx`: ortak başlık; Tümünü Gör butonu ve kullanılmayan onOpenAll kaldırıldı.
- `RouteAwareFooter.tsx`: `/popular`, `/new`, `/gunun-vitrini` footer göstermez.
- `apps/web/public/sitemap.xml`: yeni public rota.
- `apps/web/e2e/showcase.spec.ts`: başlık/ikon hedefi, filtre/cohort, invalid/empty durum, responsive görünüm ve ekran görüntüleri.

## Veri akışı

Keşfet → başlık veya glass ikon → scope taşıyan href → validated discovery server helper → cache snapshot → hourly rotation → aynı projelerin grid kartları → mevcut proje detay rotası. Destek sayaçları mevcut gerçek alanlardan okunur; yeni oy RPC'si veya yazma eklenmez.

## Uç durum ve hata yönetimi

Geçersiz kategori/platform/sort/arama mevcut allowlist ve bounded parser tarafından reddedilir. Boş seçki başarı gibi uydurma kartlarla doldurulmaz. Veri okuma hatası mevcut route error sınırına ulaşır. Kapak yoksa bulanık logo arka planı ve yumuşak köşeli logo gösterilir; logo da yoksa baş harfler kullanılır. Ödül veya kategori liderliği icat edilmez. Saat başı değişen sıra, ilgili snapshot zamanıyla deterministiktir; sınır anında iki ziyaretin snapshot'ı farklı olabilir.

## Performans değerlendirmeleri

Yeni bağımlılık/migration yok. Mevcut bounded discovery sorguları ve 60 saniyelik cache korunur; arama için sınırsız cache anahtarı açılmaz. Grid kartları rail kodunu tekrar kullanır. Yeni stiller rota içinde import edilir; ortak global CSS'e yeni sayfa stilleri eklenmedi ve eski view-all/header CSS temizlendi. İlk grid görseli eager/high, kalanları lazy/auto yüklenir. Hareket azaltma mevcut ortak kart CSS'i tarafından uygulanır. Bundle/gerçek production gecikmesi bu işte ayrıca ölçülmedi.

## Doğrulama

- Web regresyonları 20/20; Chromium keşif/vitrin E2E 9/9 geçti.
- Başlık ve glass ikon için üç ayrı hedef doğrulandı; eski Tümünü Gör yok; üç rotanın footer'ı yok.
- Keşfet ve vitrin proje kimliği seçkisi eşleşti; kategori/platform kapsamı ve detay bağlantısı korundu. Geçersiz kategori HTTP 404, eşleşmeyen arama gerçek boş durum verdi.
- 390/768/1440 px viewport'larda 1/2/3 kolon ve sıfır yatay taşma doğrulandı. Önizlemeler `reports/showcase-mobile.png`, `showcase-tablet.png`, `showcase-desktop.png`; test verisi kullanır. Analitik onayı testte reddedilip popup kapatılarak temiz görüntü alındı; uygulamanın consent akışı değiştirilmedi.
- TypeScript, ESLint, repository secret/XSS/SQLi taramaları, Next.js ve Vinext production derlemeleri başarılı. İki derleme rota tip çıktılarının çakışmaması için sırayla çalıştırıldı.
- Ekran görüntüleri görsel olarak incelendi. Tarayıcı fixture çalışması gerçek production veri/oturum doğrulaması değildir. Production deploy veya veri yazma yapılmadı.

## Güvenlik ve geri dönüş

Yeni tablo/RLS/RPC/ödeme/upload/secret/servis yok; helper yalnız mevcut anonim active kapsamını okur. Kullanıcı girdisi React düz metin render edilir, rota hedefleri sabittir ve filtreler mevcut encoder ile URL'ye taşınır. Yeni doğrulanmış güvenlik bulgusu yok; SEC statüleri değiştirilmez.

UI/rota/SEO/CSS değişiklikleri kendi diff'iyle geri alınabilir; önceki profil/arşiv paketi ayrı tutulur. Production deploy yapılmadı. Önceki M2 kaynak migration'ları uygulanmadan birleşik çalışma ağacı canlıya yayımlanmamalı.

## Handoff State

```text
Proje: C:\Users\mehmet.ozdemir\Desktop\KISTAS
Onay: Keşfet başlık/ikon navigasyonu, bağımsız Günün Vitrini kart sayfası, üç rotanın footer kaldırılması.
Yeni rota: /gunun-vitrini
Durum: Yerel uygulama doğrulandı; web 20/20, Chromium 9/9, responsive 1/2/3 kolon. Production deploy yapılmadı.
Kanıt: docs/SHOWCASE_PAGE_VALIDATION.md
Önceki iş: docs/PROFILE_LAUNCH_UI_VALIDATION.md; profil/arşiv değişiklikleri korunuyor.
Sonraki oturum: iki doğrulama belgesini ve M2 yayın kapılarını oku; canlı geçiş ayrı onay gerektirir.
Yedek ve clear context: iş kapanışında önerilir; bu işte yedek alınmadı.
```
