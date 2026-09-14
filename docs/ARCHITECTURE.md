# MİMARİ STANDARTLAR (ARCHITECTURE)

## 1. Mimari Desen: Feature-Driven Clean Architecture
Uygulama klasörleri teknik değil, özellik (feature) bazlı ayrıştırılır. Her özellik 3 katmana sahiptir:
* **domain:** Saf TypeScript tipleri, kuralları ve interface'ler (`Listing.ts`, `User.ts`, `Category.ts`).
* **application / data:** Supabase sorguları, RPC çağrıları ve use-case servisleri (`ListingService.ts`, `AuthService.ts`, `CategoryService.ts`).
* **presentation:** Ekranlar, mobil hook'lar ve bileşenler (`DiscoverScreen.tsx`, `CreateListingScreen.tsx`, `LoginScreen.tsx`).

## 2. Ports & Adapters (Plug & Play Kuralı)
* Mobil UI ve use-case sınıfları **asla** doğrudan somut bir 3. parti servisi hardcoded çağırmaz.
* Tüm harici servisler (Ödeme, SMS Gateway, Bildirim) Adapter arayüzleri ve Factory yapılarıyla soyutlanır.
* Değişim yalnızca Factory veya `.env` üzerinden yapılır.

## 3. Dijital Proje Vitrini, Organik Destek ve Sponsor Mimarisi
* **Keşif Vitrini (Product Hunt + App Store Modeli):**
  * Projeler; Başlık, Tagline, Logo, Platformlar, Dikey Ekran Görüntüleri ve Mağaza Linkleri (`App Store`, `Play Store`, `Web`) ile listelenir.
* **Sponsorlu Vitrin:**
  * Geliştiriciler kredileriyle yalnızca görünürlük süresi satın alır: 24 saat, 3 gün veya 7 gün.
  * Aktif sponsorlar `boosted_until` doğruluk kaynağıyla sunucuda belirlenir ve saatlik deterministik eşit rotasyona girer.
  * Harcanan kredi miktarı sıralama üstünlüğü sağlamaz; süresi dolan proje otomatik olarak sponsor akışından çıkar.
* **Topluluk Etkileşimi (Community Dynamics):**
  * Her kullanıcı projelere atomik olarak `Upvote` verebilir veya geri çekebilir.
  * İnceleme ve 1-5 yıldız puanlaması doğrudan geliştirici profiline ve projeye işlenir.
  * Doğrudan İletişim (Realtime Chat): Yatırımcılar ve test kullanıcıları geliştiriciyle anında iletişime geçebilir.
