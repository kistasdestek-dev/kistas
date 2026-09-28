# Profil, lansman arşivi ve logo düzenlemesi — 2026-09-28

Mimar'ın beş maddelik planı `yes` ile onaylandı. Bu çalışma yerel uygulama ve doğrulamadır.

## Mimari genel bakış

Next.js web arayüzü mevcut ortak avatar/logo ve GlassIconButton bileşenlerini kullanır. Proje logosu yüzde 22 yumuşak köşe standardındadır; kullanıcı avatarları daire kalır. Lansman arşivi özel taslak alanıdır; yayımlanmış projeyi silme işlemi değildir.

## Klasör yapısı ve tam implementasyon

- `apps/web/src/components/GlobalNotificationCard.tsx`: avatar çerçevesi, gölgesi ve mesaj rozeti kaldırıldı.
- `MessageNotificationProvider.tsx`: snapshot eksikse `profiles_public` üzerinden yalnız gönderen `avatar_url` alanı okunur; dört saniye sınırı ve oturum değişimi kontrolü vardır.
- `chat/ChatAvatar.tsx`: ortak URL çözümleme ve varsayılan avatar sözleşmesi kullanılır.
- `ProfileExperienceClient.tsx`: arşiv bağlantısı kaldırıldı, Sponsor Yap'a animasyonsuz Citrus varyantı verildi.
- `AppStoreProjectList.tsx`, `ProjectDetailExperienceClient.tsx`: ortak soft-corner logo; detay kapsayıcısı da yüzde 22 köşe kullanır.
- `RouteAwareFooter.tsx`: `/create-listing` ve `/launch-archive` footer göstermez.
- `LaunchArchiveClient.tsx`: GlassIconButton silme kontrolü, tarayıcı onayı, busy durumu, hesap ve cihaz temizliği.
- `apps/web/src/app/api/launch-drafts/route.ts`: DELETE origin, Auth, UUID ve integer revision doğrulaması.
- `supabase/migrations/20260928000005_owner_delete_launch_draft.sql`: authenticated owner-only RPC; sabit boş search_path; advisory lock ve satır kilidi; editing/revision koşulu.

## Veri akışı

Bildirim → snapshot avatarı veya public profil avatarı → ChatAvatar → hata/eksik fotoğrafta yerel Kıstas görseli.

Arşiv → silme onayı → same-origin DELETE → doğrulanmış kullanıcı RPC → owner/state/revision kontrolü → taslak silme → IndexedDB dosyaları ve localStorage metadata temizliği → liste güncellemesi. Mevcut Storage medyası ve yayımlanmış proje silinmez; başka projelerde referans olabilir.

## Uç durum ve hata yönetimi

- İptal hiçbir kayıt silmez; ağ/sunucu başarısı olmadan cihaz kopyası kaldırılmaz.
- Başka hesap, gönderilmiş taslak veya yeni revision genel conflict döndürür. UI yenileme ister.
- Aynı silme isteğinin tekrarı eksik kayıt için başarılıdır. Doğrudan authenticated tablo DELETE izni açılmaz.
- Senkronize bir taslağın açık sekmedeki eski revision ile tekrar kaydı conflict verir. Farklı cihazdaki çevrimdışı kopyalar uzaktan silinmez; tekrar çalışma yeni taslak olarak devam edebilir.
- Silme bağlantı ister. Cihaz temizliği hata verirse başarı ilan edilmez ve kullanıcı tekrar deneyebilir; hesap kaydı o sırada silinmiş olabilir.
- Tarayıcı testi fixture kullanır; gerçek Supabase Auth/RLS veya bağımsız bağlantı yarış testi olduğu iddia edilmez.

## Performans değerlendirmeleri

Snapshot taşıyan bildirim ek profil sorgusu yapmaz; eski payload geri dönüşü tek alan/tek satırla sınırlıdır. Yeni bağımlılık yoktur. Sponsor butonunun kendi ve pseudo-element animasyonları/transition'ları kapatılmıştır; diğer CTA'lar korunur. Mevcut 30 kayıtlık sayfalama devam eder.

## Doğrulama

- Web regresyonları: 20/20; PostgreSQL transaction/role senaryoları: 14/14.
- Chromium keşif ve arşiv E2E: 18/18. Silme onayı iptal/kabul, hesap/localStorage/IndexedDB temizliği, farklı hesap/origin, geçersiz integer ve anonim DELETE doğrulandı. Mevcut çevrimdışı, çoklu cihaz ve 72 saat saklama akışları geçti.
- Mobil tarayıcı ölçümü (390×844): Popüler ve Yeni logoları 58×58, `borderRadius: 22%`; detay logosu 62×62, hem görsel hem kapsayıcı yüzde 22. Ek manuel `/new` kontrolünün ilk denemesinde `load` beklemesi timeout verdi; `domcontentloaded` ile aynı rota ve logo ölçümü başarılıdır.
- Web TypeScript, ESLint, bağımlılık audit ve repository secret/XSS/SQLi taramaları başarılı.
- Next.js ve Vinext production build başarılı. İlk paralel build rota tip çıktılarında çakıştı; iki araç sırayla çalıştırılarak doğrulandı. Bu araçların aynı `.next` tip alanını kullanması nedeniyle bundan sonra da sırayla çalıştırılmalı.
- Gerçek bir kullanıcıdan canlı bildirim alınmadı; avatar snapshot/geri dönüş davranışı kaynak sözleşmesi ve tip kontrolüyle doğrulandı. Canlı gönderen-avatar kabulü migration/deploy sonrası yapılmalı.

## Yayın ve geri dönüş

Production değişmedi. M2'nin bekleyen `20260928000001`–`20260928000003` migration'ları ve bu `000004` migration birlikte sıralı olarak değerlendirilmelidir; yeni arşiv UI'sı silme RPC'si olmadan yayımlanmaz. Yerel uygulama onayı production migration/deploy onayı sayılmadı.

Geri dönüş: UI/API diff'i geri alınabilir. RPC yeni ileri migration ile revoke edilir; silinen taslaklar otomatik geri gelmez. Kayıp taslağın geri kazanılması ancak uygun erişim kontrollü yedekten mümkündür. Kaynak ZIP'i kullanıcıların DB taslaklarını yedeklemez.

## Handoff State

```text
Proje: C:\Users\mehmet.ozdemir\Desktop\KISTAS
Onay: Mesaj avatarı, arşiv yerleşimi/silme, footer, Sponsor Yap animasyonu ve ortak soft-corner logo.
Durum: Yerel değişiklikler doğrulandı; web 20/20, PostgreSQL 14/14, Chromium 18/18; production migration/deploy yapılmadı.
Migration: 20260928000005_owner_delete_launch_draft.sql (M2 önceki migration'larına bağlı).
Kanıt/ayrıntı: docs/PROFILE_LAUNCH_UI_VALIDATION.md
Sonraki oturum: bu belgeyi ve mevcut M2/retention yayın kapılarını oku; kullanıcı onayı olmadan canlıya uygulama.
Yedek ve clear context: yerel iş kapanışında önerilir; bu çalışmada yedek alınmadı.
```
