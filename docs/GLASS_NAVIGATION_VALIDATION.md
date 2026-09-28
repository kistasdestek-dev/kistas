# Glass yönetim ve geri navigasyonu — 2026-09-29

Mimar uygulama, main push ve production deploy işlemlerini açıkça onayladı.

## Mimari genel bakış ve klasör yapısı

- `AdminListingsView.tsx`: Topluluk ile aynı tek/iki sütun glass proje kartları. Arama, beş durum filtresi, gerçek destek/görüntülenme sayıları ve mevcut yönetim RPC/modal işlemleri korunur. Eski beş sütunlu tablo tamamen kaldırıldı.
- `GlassIconButton.tsx`, `DiscoverySectionHeading.tsx`: beyaz yüzey ve belirgin çerçeve taşımayan glass varyant; Keşfet bölüm okları aynı filtreli rotaları açar.
- `SiteNavigation.tsx`, `lib/route-navigation.ts`, kök layout: ortak geri davranışı, güvenli üst rota, modal/galeri/dikey hareket koruması ve route observer.
- Mevcut yönetim, giriş, lansman, detay, mesaj, hakkında, nasıl çalışır ve vitrin geri okları `SiteBackButton` kullanır. Diğer alt sayfalarda ortak üst-sol kontrol vardır; ana sayfada gereksiz geri oku gösterilmez.

## Veri akışı ve tam implementasyon

Tam uygulama yukarıdaki kaynak dosyalarındadır. URL commit olduğunda mevcut framework history state alanları korunarak dahili sayfa yolu ve geri derinliği eklenir. Geri aksiyonu önce gerçek browser history kullanır; doğrudan girişte güvenli dahili üst rota seçilir. Filtreli URL ve scroll restorasyonu router/tarayıcı tarafından korunur.

Vinext bazı history yazmalarında önceden yakaladığı native yöntemleri kullanır; bu nedenle global push/replace metotları override edilmez. `usePathname/useSearchParams` observer ayrı Suspense sınırındadır; server içerik ve public SSR korunur. Yenileme kurtarması sekme sessionStorage'ında yalnız pathname/derinlik tutar; query, form, kullanıcı veya oturum bilgisi yazılmaz. Storage kapalıysa navigation çalışır, yenileme kurtarması güvenli üst rotaya düşebilir.

## Uç durum ve hata yönetimi

- Hızlı çift geri isteği tek navigasyonla sınırlanır; timer/animation/listener unmount temizliği vardır.
- iPhone/iPad yerleşik geri hareketi engellenmez; uygulama aynı hareket için ikinci geri isteği üretmez. Diğer touch cihazlarda ilk 24 px'den başlayan yeterli yatay sürükleme kullanılır.
- Kısa/dikey/çok parmaklı/iptal edilen hareket, yatay scroll alanı, form alanı, slider, açık dialog ve lightbox navigasyon üretmez.
- 160 ms, 8 px ve hafif opacity geri animasyonu; reduced-motion tercihinde geçiş beklemesi/animasyonu kaldırılır.
- SessionStorage JSON/erişim hataları yakalanır. Yeni RPC, migration, dış servis, kullanıcı girdisi veya yetkilendirme yolu yoktur; mevcut admin sunucu yetkisi ve silme onayı korunur.

## Performans değerlendirmeleri

Yeni bağımlılık ve ağ çağrısı yoktur. Route observer yalnız URL değişiminde çalışır; tek touch listener grubu ve mevcut Framer Motion/GlassIconButton kullanılır. Scroll restorasyonu için ikinci global scroll listener veya tam ekran loader eklenmez. Özel bundle/hacim artışı veya gerçek cihaz FPS garantisi ölçülmedi.

## Doğrulama

- Son kaynak tip/lint, 21 web regresyon dosyası, Next/Vinext production build ve Wrangler dry-run geçti. Workspace kalite kapısında domain/Supabase/UI kontrolleri ve dependency audit de başarılıdır. Son staged secret/XSS/SQL taramaları temizdir.
- Workers Chromium: filtreli geri URL, scroll toleransı, çift tıklama, forward/reload sonrası geri, doğrudan giriş, reduced-motion ve touch çakışma testleri geçti.
- Admin gerçek üretim verisine yazmayan Auth/PostgREST fixture ile incelendi. Arama/filtre, destek modalı, 320/390/768/1440 px yatay taşma ve 1/2 kolon kontrolü geçti.
- Görseller: `reports/admin-projects-mobile.png`, `reports/admin-projects-desktop.png`; iki görsel de incelendi.
- Workers paketi 47 senaryo çalıştırdı: 46 geçti; mevcut cursor testi çerez/dock örtüşmesinde tıklayamadı. Test gerçek Reddet aksiyonuyla bağımsız consent tercihini tamamlayacak şekilde düzeltildi; hedefli yeniden koşuda geçti. Sonuç: 47 senaryonun tamamı doğrulandı; tek temiz tam koşu iddiası değildir. Loglar: `reports/navigation-e2e.log`, `reports/navigation-pagination-e2e.log`.
- Gerçek iPhone Safari yerleşik hareketi ve gerçek admin oturumuyla canlı kabul bu testlerden ayrı kalır.

## Yayın, geri dönüş ve handoff

Uygulama commit'i `2d3e277`, `origin/main` dalına pushlandı ve Cloudflare production yayını tamamlandı. Yeni Worker: `dd788b28-4607-4450-b3de-4287d559369e`. Canlı adres: https://www.kistas.com.tr.

Canlı HTTP kontrolünde `/`, `/popular`, `/new`, `/browse` 200 döndü; anonim `/admin` isteği 307 ile girişe yönlendi. CSP, HSTS ve nosniff başlıkları korundu. Kanıt: `reports/navigation-live-smoke.json`. Canlı tarayıcıda `/?platform=Web` → `/popular?platform=Web&sort=top_voted` → Geri dön akışı kaynak URL ve Web filtresini korudu. Gerçek iPhone Safari hareketi ve gerçek admin oturumunda son kabul kontrolü ayrıca yapılmalıdır.

Önceki production Worker: `b78cd1a9-5b98-44d8-b8f8-17ae7dfc5dcc`. UI değişiklikleri uygulama commit'iyle geri alınabilir; DB migration/rollback gerekmiyor. Önceki Worker sürümüne dönüş uygulama yayınını geri alır.

```text
Handoff State: KISTAS / main
Uygulama: 2d3e277 — push ve production deploy tamamlandı.
Worker: dd788b28-4607-4450-b3de-4287d559369e
Kontroller: build, 21 web regresyonu, 47 tarayıcı senaryosu (tam koşu + hedefli tekrar), canlı filtreli geri dönüş.
Kalan kabul: fiziksel iPhone Safari ve gerçek admin oturumu.
DB değişikliği yok. Yedek henüz alınmadı.
```
