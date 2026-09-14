# VERİTABANI VE RLS KURALLARI (DATABASE)

> **Kaynak DDL Dosyaları:** 
> * [20260903000002_production_security_schema.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260903000002_production_security_schema.sql)
> * [20260903000004_boosting_credits_reviews_categories.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260903000004_boosting_credits_reviews_categories.sql)
> * [20260903000005_pivot_to_app_showcase.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260903000005_pivot_to_app_showcase.sql)
> * [20260905000004_fair_sponsored_rotation.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260905000004_fair_sponsored_rotation.sql)
> * [20260905000005_phase6_admin_hardening_and_scale.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260905000005_phase6_admin_hardening_and_scale.sql)

## 1. Temel Tablolar
* `profiles`: Geliştirici profili, `boost_credits` (Sponsorlu Vitrin görünürlük kredisi), `rating_average`, `rating_count`.
* `categories`: Dijital proje kategorileri (Yapay Zeka & ML, Oyun, Verimlilik, Fintech, Sosyal, DevTools, SaaS, Tasarım).
* `listings` (Dijital Projeler / Uygulamalar):
  * `title`: Uygulama Adı
  * `tagline`: Kısa Vurucu Slogan (Tagline)
  * `logo_url`: Kare/Yuvarlak Uygulama İkonu
  * `app_store_url`, `play_store_url`, `web_url`: Harici mağaza ve proje linkleri
  * `platforms`: Desteklenen platformlar (`['iOS', 'Android', 'Web', 'macOS', 'SaaS']`)
  * `promo_code`: Kıstas topluluğuna özel indirim/beta kodu
  * `pricing_model`: `free`, `freemium`, `paid`, `subscription`
  * `upvotes_count`: Toplam destek oyu sayısı
  * `boosted_until`: Aktif sponsor görünürlüğünün tek doğruluk kaynağı
* `project_upvotes`: Kullanıcıların projelere verdiği atomik oylar (`project_id`, `user_id`, `created_at`).
* `credit_transactions`: Kredi harcama, yükleme ve hediye günlüğü.
* `reviews`: Uygulama ve geliştirici değerlendirmeleri (1-5 yıldız ve geri bildirim yorumları).
* `conversations`, `messages`, `blocked_users`, `reports`: Geliştirici ile kullanıcılar/yatırımcılar arası anlık şifreli mesajlaşma.

## 2. Güvenlik ve İşlevsel Fonksiyonlar
* `toggle_project_upvote()`: Kullanıcının oyunu atomik olarak ekler veya çeker, projenin `upvotes_count` sayacını anında günceller.
* `boost_listing_with_credits()`: Kullanıcı kredisini kilitler, yalnızca sunucuda tanımlı paketleri kabul eder, sponsor süresini uzatır ve işlemi loglar.
* `get_sponsored_listings()`: Aktif sponsorları kredi miktarından bağımsız, saatlik deterministik eşit rotasyonla döndürür.
* `is_platform_admin()`: Yönetici yetkisini doğrulanmış Auth hesabı ve sunucu allowlisti üzerinden denetler.
* `admin_*` RPC'leri: Moderasyon, sponsor süresi ve kredi tanımlama işlemlerini denetim kaydıyla yürütür.
* `update_user_rating_stats()`: Yeni inceleme eklendiğinde geliştiricinin genel puan ortalamasını ve yorum sayısını atomik günceller.
