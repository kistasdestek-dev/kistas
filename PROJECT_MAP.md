# PROJE HARİTASI VE ÇALIŞMA PROTOKOLÜ (PROJECT MAP)

> **Amaç:** Geliştiricilerin ve yapay zeka modellerinin projeyi asgari token tüketimiyle, eksiksiz ve senkronize anlamasını sağlayan ana yönlendirici dizindir.
> **Kural:** Bu dosyaya kod blokları ve uzun açıklamalar eklenmez. Detaylar `docs/` altındaki ilgili referans dosyalarındadır.

---

## 1. Proje Özeti
* **Tür:** Responsive Web öncelikli, iOS/Android devamlılığı korunan "App & Dijital Proje Tanıtım ve Keşif Vitrini" (Product Hunt + App Store + Organik Keşif Hibriti).
* **Teknoloji:** React Native Web + Expo SDK 57 + TypeScript + Supabase (PostgreSQL, RLS, Storage, Realtime WebSocket).
* **Temel Dinamikler:**
  * **Proje Kartı:** Başlık, Slogan (Tagline), Logo, 4:5 Dikey Ekran Görüntüleri, Kategori, Platform Etiketleri ([iOS], [Android], [Web], [macOS], [SaaS]), Mağaza ve Web Bağlantıları, Promosyon Kodu.
  * **Sponsorlu Vitrin:** Krediyle görünürlük süresi satın alma; aktif sponsorlar saatlik ve eşit rotasyonla gösterilir, kredi miktarı sıra satın almaz.
  * **Topluluk Etkileşimi:** Atomik Upvote (Destek Oyu), 1-5 Yıldız Puanlama & İncelemeler, Geliştiriciyle Anlık Realtime İletişim (Yatırım, test, iş birliği).

---

## 2. Aktif Durum (State Tracker)
* **Mevcut Faz:** Web Adaptasyonu Faz 4 - Proje Detayı ve Lansman Akışı
* **Son Tamamlanan:** 
  * Veritabanı şeması App Showcase modeline taşındı (`20260903000005_pivot_to_app_showcase.sql`).
  * Upvote tablosu ve atomik RPC fonksiyonu canlı Supabase'e basıldı.
  * Dijital proje kategorileri (AI, Oyun, Verimlilik, Fintech, vb.) tanımlandı.
  * `CreateListingScreen.tsx` "Projeni Tanıt / Lansman Yap" formuna dönüştürüldü.
  * `DiscoverScreen.tsx` Product Hunt + App Store vitrinine dönüştürüldü.
  * Web Adaptasyonu Faz 1 tamamlandı: native/web ödeme sınırı ve responsive token altyapısı kuruldu.
  * Web Adaptasyonu Faz 2 tamamlandı: telefon alt menüsü, tablet navigasyon rayı ve masaüstü sidebar fiziksel olarak ayrıldı.
  * Web Adaptasyonu Faz 3 tamamlandı: Keşfet/Göz At responsive düzene alındı ve webde boşta çalışan vitrin/filtre animasyonları kaldırıldı.
* **Detaylı Takip:** [ROADMAP_STATUS.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/ROADMAP_STATUS.md)

---

## 3. Modüler Belge Dizini (On-Demand References)

İhtiyaç anında yalnızca ilgili belgeyi okuyun:

| Konu | Referans Dosyası | Açıklama |
| :--- | :--- | :--- |
| **Yol Haritası & Durum** | [ROADMAP_STATUS.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/ROADMAP_STATUS.md) | Hangi adımdayız, sırada ne var? |
| **Codex UI Direktifi** | [CODEX_UI_PROMPT.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/CODEX_UI_PROMPT.md) | Diğer yapay zeka için tasarım promptu |
| **Mimari Standartları** | [ARCHITECTURE.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/ARCHITECTURE.md) | Clean architecture, organik sıralama ve Sponsorlu Vitrin servisleri |
| **Veritabanı & RLS** | [DATABASE.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/DATABASE.md) | Tablolar, enumlar, upvotes ve boost şeması |
| **Build & Güvenlik** | [SECURITY_AND_BUILD.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/SECURITY_AND_BUILD.md) | App Store/Play Store build & güvenlik kuralları |
| **Güvenlik Yol Haritası** | [SECURITY_ROADMAP.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/SECURITY_ROADMAP.md) | Tehdit modeli, 50 bulguluk kayıt, faz kapıları ve zorunlu değişiklik kontrolleri |
| **Tasarım Sistemi** | [DESIGN_SYSTEM.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/DESIGN_SYSTEM.md) | Cyber-Luxury Obsidian Dark mobil UI tokenları |
| **Web Adaptasyon Planı** | [WEB_ADAPTATION_PLAN.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/WEB_ADAPTATION_PLAN.md) | Telefon, tablet ve masaüstü fazları ile platform sınırları |
