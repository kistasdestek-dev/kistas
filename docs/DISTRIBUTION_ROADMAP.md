# KISTAS Topluluk & Dağıtım Motoru Yol Haritası (Distribution & Community Roadmap)

> **Temel İlke:** Kıstas pasif bir proje dizini (directory) değildir. Kıstas, Türkiye'deki bağımsız yazılımcıların, mikro-SaaS üreticilerinin ve dijital girişimcilerin ilk kullanıcılarını, ilk müşterilerini ve sektör itibarını kazandığı **aktif bir Dağıtım ve Topluluk Motorudur (Distribution Engine)**.

---

## 🎯 Vizyon ve Büyüme Felsefesi
Bir ürün vitrini kendi kendine trafik üretmez. Trafik, **geliştiricilerin kendi kitlelerini Kıstas'a taşımasıyla** ve **Kıstas'ın geliştiriciye gerçek değer (medya gücü, rozet, kullanıcı) sunmasıyla** organik bir çarka dönüşür.

```text
[Geliştirici Ürününü Ekler] 
       │
       ▼
[Kıstas Canlı Rozetini Sitesine Gömür] ────► [Kendi Ziyaretçileri Kıstas'a Akar]
       │                                                 │
       ▼                                                 ▼
[Lansman Günü Rekabeti (24 Saat)] ◄────────── [Oy & Topluluk Desteği Verir]
       │
       ▼
[Günün #1 Projesi Altın Rozeti + Bülten Manşeti] ────► [Kalıcı İtibar & Yeni Müşteriler]
```

---

## 🚀 Faz 1: Dışa Açılan Virallik & Embed Silahları (Viral Loops) [TAMAMLANDI]
*Hedef: Geliştiricileri Kıstas'ın gönüllü pazarlamacısı haline getirmek.*

- [x] **1.1. Canlı Embed Rozet Motoru (Embeddable Badge Engine):**
  - Geliştiricilerin kendi web sitelerine, GitHub README'lerine ve dokümantasyonlarına ekleyebileceği SVG rozetler:
    - *Dark & Light tema seçenekleri*
    - *Canlı oy sayısı ve sıra göstergesi (`/api/badge/[id]`)*
    - *Tıklanınca doğrudan projenin Kıstas sayfasına yönlendiren SEO dostu link yapısı.*
    - *Proje detay sayfasında (`ProjectDetailExperienceClient`) "Rozet Kodu Al" stüdyosu.*
- [x] **1.2. Dinamik Sosyal Medya Lansman Kartları (Dynamic OG Image):**
  - Next.js `@vercel/og` altyapısıyla her proje için anlık üretilen 1200x630px sosyal medya kartı (`/api/og?id=[id]`):
    - *Proje başlığı, sloganı, kategorisi, canlı oy sayısı ve "Kıstas'ta Lansmanda! 🚀" damgası.*
    - *X (Twitter) ve LinkedIn'de paylaşıldığında dikkat çeken karanlık cam (Dark Luxury) estetiği.*
- [x] **1.3. "Tek Tıkla Lansman Tweeti" (One-Click Launch Kit):**
  - Proje detay sayfasında ve vitrinde tek tıkla açılan hazır paylaşım kiti (`ShareLaunchKitModal`):
    - *Önceden optimize edilmiş, ilgi çekici Türkçe tweet ve bülten taslağı.*
    - *Doğrudan X, LinkedIn ve WhatsApp paylaşım butonları.*

---

## 🏆 Faz 2: Lansman Günü & Dijital Kupa Heyecanı (Gamification)
*Hedef: 24 saatlik zaman kısıtı ile geliştiriciyi tüm çevresini Kıstas'a çağırmaya teşvik etmek.*

- [ ] **2.1. 24 Saatlik Lansman Döngüsü (Daily Launch Sprint):**
  - Her gece 00:00'da sıfırlanan veya 24 saatlik süreye sahip adil yarış mekanizması.
  - "Günün Projeleri" sekmesinde anlık sıralama ve geri sayım sayacı.
- [ ] **2.2. Dijital Şampiyonluk Rozetleri (Makers Trophy):**
  - Günü ilk 3 sırada tamamlayan projelere kalıcı rozetler:
    - 🥇 *Günün #1 Projesi (Altın Rozet)*
    - 🥈 *Günün #2 Projesi (Gümüş Rozet)*
    - 🥉 *Günün #3 Projesi (Bronz Rozet)*
  - Bu rozet hem proje detay sayfasında hem de geliştiricinin web sitesindeki embed rozetinde ömür boyu kalır.
- [ ] **2.3. Geliştirici Karnesi & Maker Profili:**
  - Geliştiricinin Kıstas üzerinde kazandığı madalyalar, toplam topluluk desteği ve yayınladığı projelerin sergilendiği saygın "Maker Kimliği".

---

## 📢 Faz 3: Medya Gücü & Makers Ağı (Distribution Channels)
*Hedef: Siteye girmeyen insanlara bile Kıstas projelerini ulaştırmak.*

- [x] **3.0. Platform İçi Topluluk Duyuruları:**
  - Topluluk yetkili yöneticisinin yeni, popüler ve keşfedilmeyi bekleyen projeleri tüm kayıtlı üyelere glass bildirimle ulaştırdığı güvenli dağıtım kanalı.
  - Duyurular izinli Kıstas rotalarına yönlenir, kullanıcı bildirim merkezinde saklanır ve gönderim denetim izi üretir.

- [ ] **3.1. Haftalık "Kıstas Seçkisi" E-Posta Bülteni:**
  - Her Pazar günü abonelere gönderilen, haftanın en iyi 5 bağımsız projesini anlatan editoryal bülten.
  - Geliştirici için en büyük ödül: Binlerce teknoloji meraklısının e-posta kutusuna girmek.
- [ ] **3.2. Sürüm Günlüğü (Changelog ile Yeniden Lansman):**
  - Projeler sadece bir kere yayınlanıp unutulmaz.
  - Önemli bir güncelleme (v2.0, yeni özellik) yapan geliştirici, bir "Changelog Lansmanı" yaparak tekrar vitrine çıkabilir.
- [ ] **3.3. Yapıcı Geri Bildirim Hattı (Maker AMA / Feedback):**
  - Kuru oylama yerine; "Bu projeyi geliştiren kişiye 1 tavsiye ver" kutusu.
  - Geliştirici için en değerli şey olan gerçek kullanıcı geri bildiriminin platformda toplanması.

---

## 🤝 Faz 4: Yerli Ekosistem Birlikteliği & Teşvikler
*Hedef: Kıstas'ı Türkiye'nin bağımsız geliştirici sendikası/üssü haline getirmek.*

- [ ] **4.1. Girişimcilik Kulüpleri & Kuluçka Merkezleri:**
  - Üniversitelerin yazılım/girişimcilik kulüpleriyle ortak "Lansman Günleri".
- [ ] **4.2. Topluluk Teşvikleri (Community Karma):**
  - Projelere yapıcı yorum yapan, hata bulan ve destek veren kullanıcılara "Erken Destekçi" ve "Topluluk Dedektifi" itibar puanları.
