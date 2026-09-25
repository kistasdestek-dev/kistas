# VERİTABANI VE RLS KURALLARI (DATABASE)

## Next.js Monorepo Uyum Notu (2026-09-24)

- Web uygulamasi mevcut Supabase projesini kullanir; Expo kodunun depoda bulunmasi ikinci bir veritabani olusturmaz.
- Canli semada `listings.upvotes_count` ve `listings.web_url` bulunur. Web'in paylasilan `Listing` modeline donusum `packages/supabase/src/queries/listings.ts` icinde yapilir; dogrudan API sorgulari canli kolon adlarini kullanmalidir.
- Canli `profiles_public` gorunumunde `id` yoktur. Bu gorunumu `id` ile filtreleyen eski, kullanilmayan sorgu kaldirildi. Konusma katilimcisi profilleri yetkili oturumun `profiles` RLS politikasiyla okunur.
- 2026-09-24 tarihli `supabase migration list --linked` kontrolunde uzak migration gecmisi `20260918000003` surumunde biter; bundan sonraki 19 yerel migration uzak gecmiste kayitli degildir. Bunlarin bazilari canlida dogrudan uygulanmistir. Sema ve gecmis ayrica uzlastirilmadan toplu `db push`, `migration repair` veya `db reset --linked` calistirilmamalidir.
- `supabase db diff --linked --schema public` salt okunur denemesi Docker/Podman bulunmadigi icin tamamlanamadi; migration gecmisi farki tam sema farki olarak yorumlanmamalidir.
- Bu uyum calismasinda canli veritabani veya migration gecmisi degistirilmedi. Sonraki adim, her kayitsiz migration icin canli sema ve davranis farkini tek tek denetlemek; gerekiyorsa veri koruyan yeni bir migration hazirlamaktir.

> **Kaynak DDL Dosyaları:** 
> * [20260903000002_production_security_schema.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260903000002_production_security_schema.sql)
> * [20260903000004_boosting_credits_reviews_categories.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260903000004_boosting_credits_reviews_categories.sql)
> * [20260903000005_pivot_to_app_showcase.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260903000005_pivot_to_app_showcase.sql)
> * [20260905000004_fair_sponsored_rotation.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260905000004_fair_sponsored_rotation.sql)
> * [20260905000005_phase6_admin_hardening_and_scale.sql](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/supabase/migrations/20260905000005_phase6_admin_hardening_and_scale.sql)

## 1. Temel Tablolar
* `profiles`: Geliştirici profili, `boost_credits` (Sponsorlu Vitrin görünürlük kredisi), `rating_average`, `rating_count`.
* `categories`: Yalnızca resmi App Store kataloğundaki 15 oyun + 23 uygulama kategorisi aktiftir. Okuma sorguları `is_active = true` ve merkezi slug allowlistini birlikte uygular; eski e-ticaret kategorileri pasiftir.
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
* `project_comments`: Proje vitrini topluluk yorumları; yazma yalnızca `create_project_comment` RPC'si üzerinden yapılır. `likes_count` ve `dislikes_count` denormalize sayaçlarını içerir.
* `project_comment_reactions`: Yorum beğeni/beğenmeme tepkileri (`reaction`: 1 = beğeni, -1 = beğenmeme; `UNIQUE (comment_id, user_id)` ile kullanıcı başına tek tepki). Doğrudan yazma mühürlüdür; yalnızca `toggle_project_comment_reaction` RPC'si yazar.
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
* `toggle_project_comment_reaction(p_comment_id, p_reaction)`: Yorum beğeni/beğenmeme toggle motoru; aynı tepki geri alınır, zıt tepki değiştirilir, sayaçlar tablodan atomik yeniden hesaplanır. Oturum, doğrulama, moderasyon ve adaptif hız limiti kalkanlarına tabidir.
