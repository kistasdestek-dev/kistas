# PROJE HARİTASI VE ÇALIŞMA PROTOKOLÜ (PROJECT MAP)

> **Amaç:** Geliştiricilerin ve yapay zeka modellerinin projeyi asgari token tüketimiyle, eksiksiz ve senkronize anlamasını sağlayan ana yönlendirici dizindir.
> **Kural:** Bu dosyaya kod blokları ve uzun açıklamalar eklenmez. Detaylar `docs/` altındaki ilgili referans dosyalarındadır.

---

## 1. Proje Özeti
* **Tür:** Bağımsız dijital ürünler, mikro-SaaS girişimleri ve mobil/web projeleri için vitrin, oylama ve doğrudan dağıtım motoru (Product Hunt + App Store + Dağıtım Ekosistemi Hibriti).
* **Mimari:** Turborepo + pnpm Workspace Monorepo
* **Web Frontend (`apps/web`):** Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS + Framer Motion.
* **Paylaşımlı Paketler (`packages/*`):**
  * `@kistas/shared`: Çekirdek modeller, tipler, Zod şemaları ve yardımcı fonksiyonlar.
  * `@kistas/ui`: Kıstas Tasarım Sistemi ortak primitifleri.
  * `@kistas/supabase`: Supabase istemci konfigürasyonu ve veri katmanı.
* **Backend / Veritabanı:** Supabase (PostgreSQL, Row Level Security - RLS, Realtime WebSocket, Storage, Edge Functions).
* **Tasarım Sistemi:** Obsidyen Sıvı Buzlu Cam (Obsidian Liquid Frosted Glass) + Saf Siyah `#000000` + Safir Neon & İndigo Vurgular.
* **Temel Dinamikler:**
  * **Proje Kartı:** Başlık, Slogan, Logo, Dikey Ekran Görüntüleri, Kategori, Platform Etiketleri ([iOS], [Android], [Web], [macOS], [SaaS]), Mağaza/Web Bağlantıları, Promosyon Kodu.
  * **Sponsorlu Vitrin:** Krediyle görünürlük süresi satın alma; aktif sponsorlar saatlik ve eşit rotasyonla gösterilir, kredi miktarı sıra satın almaz.
  * **Topluluk Etkileşimi:** Atomik Upvote (Destek Oyu), 1-5 Yıldız Puanlama & İncelemeler, Geliştiriciyle Anlık Realtime İletişim (Yatırım, test, iş birliği).
  * **Dağıtım Motoru:** Dinamik Lansman Kartları (OG Görselleri), Doğrulanmış Kıstas Rozetleri (Badges) ve Günün Vitrini rekabeti.

---

## 2. Aktif Dizin ve Paket Yapısı

```
KISTAS/ (Kök Dizin - Monorepo)
├── apps/
│   └── web/                   # Next.js 16 App Router (Canlı Web Platformu)
│       ├── src/
│       │   ├── app/           # Sayfa Rotaları (/, /browse, /messages, /profile, /admin...)
│       │   ├── components/    # Sıvı Cam Bileşenler, Modallar, Vitrinler
│       │   │   ├── chat/      # Canlı Mesajlaşma & Realtime Sohbet
│       │   │   └── ui/        # Kıstas UI (chat-messages, shiny-button, Spotlight...)
│       │   ├── lib/           # Supabase SSR/Browser istemcileri, servisler, depolama
│       │   └── proxy.ts       # Next.js 16 Middleware & Güvenlik Kalkanı
│       └── package.json       # @kistas/web bağımlılıkları
├── packages/
│   ├── shared/                # @kistas/shared (Ortak tipler & Zod şemaları)
│   ├── ui/                    # @kistas/ui (Kıstas Tasarım Sistemi primitifleri)
│   └── supabase/              # @kistas/supabase (Veri erişim katmanı)
├── supabase/
│   ├── migrations/            # Canlı PostgreSQL DDL, RLS ve RPC göçleri
│   └── functions/             # Deno Edge Functions (Webhooklar & Harici Entegrasyonlar)
├── scripts/                   # Kıstas Kale (Fortress) v3.0 Sistem Kontrolü & Testleri
└── docs/                      # Mimari ve güvenlik yol haritası dökümantasyonu
```

---

## 3. Aktif Durum (State Tracker)
* **Mevcut Faz:** Monorepo Modern Web Mimarisi & Topluluk Dağıtım Motoru
* **Son Tamamlanan:** 
  * Next.js 16 (Turbopack, App Router) + React 19 tam monorepo geçişi mühürlendi.
  * Veritabanı şeması App Showcase & Dağıtım Motoru modeline taşındı.
  * Upvote tablosu ve atomik RPC fonksiyonu canlı Supabase'e basıldı.
  * App Store standartlarında 20 kategori kataloğu sınırlandırıldı.
  * Obsidyen Sıvı Buzlu Cam (Liquid Frosted Glass) tasarım sistemi, KistasGlassDock ve Kıstas Glass Buton platform genelinde uygulandı.
  * Mesajlaşma (`/messages`) ekranı saf siyah, sıvı cam ve Framer Motion animasyon fiziğiyle baştan aşağı yenilendi.
* **Detaylı Takip:** [ROADMAP_STATUS.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/ROADMAP_STATUS.md)

---

## 4. Modüler Belge Dizini (On-Demand References)

| Konu | Referans Dosyası | Açıklama |
| :--- | :--- | :--- |
| **Yol Haritası & Durum** | [ROADMAP_STATUS.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/ROADMAP_STATUS.md) | Hangi adımdayız, sırada ne var? |
| **Dağıtım Yol Haritası** | [DISTRIBUTION_ROADMAP.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/DISTRIBUTION_ROADMAP.md) | Topluluk ve virallik stratejisi |
| **Güvenlik Yol Haritası** | [SECURITY_ROADMAP.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/SECURITY_ROADMAP.md) | Tehdit modeli, 50 bulguluk kayıt, faz kapıları ve Pars DevState kontrolleri |
| **Veritabanı & RLS** | [DATABASE.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/DATABASE.md) | Tablolar, enumlar, upvotes ve boost şeması |
| **Tasarım Sistemi** | [DESIGN_SYSTEM.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/docs/DESIGN_SYSTEM.md) | Cyber-Luxury Obsidian Dark UI tokenları |
| **Yedekleme Kılavuzu** | [backups/README.md](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/backups/README.md) | Tüm arşivlenmiş kilometre taşları |
