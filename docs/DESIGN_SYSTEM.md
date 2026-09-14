# TASARIM SİSTEMİ VE MOBİL ETKİLEŞİMLER (DESIGN SYSTEM)

## Güncel Tema — 7 Eylül 2026

Bu bölüm aşağıdaki eski görsel tariflerin önüne geçer. Bütün sayfalar ve ortak bileşenler koyu yüzeylere geçirildi. Web arka planı `PremiumBackdrop.web.tsx` içindeki statik siyah zemin, beş çapraz camgöbeği ışık katmanı, hafif doku ve nokta desenidir. Animasyon döngüsü içermez.

- Ana renk kaynağı: `src/core/theme/colors.ts`; zemin `#020609`, yüzey `#0C171D`, yazı `#EAF7FB`, ikincil yazı `#A7BDC7`, vurgu `#6DE4FF`.
- Formlar, kartlar, diyaloglar, arama/filtreler, proje detayı, sohbet, profil, kredi ve yönetim ekranları koyu temayı kullanır. Başarı, uyarı ve hata renkleri ayrı kalır.
- Mobil alt navbarın açık cam zemini ve koyu ikon/yazı renkleri kullanıcı tercihiyle korunur. Web telefon navigasyonunun renkleri ortak koyu tema değişikliklerinden bağımsızdır; `MobileBottomNav.tsx` değiştirilmemiştir.
- Tablet ve masaüstü navigasyonu koyu temayı kullanır. Proje görselleri ve marka logosunun özgün renkleri korunur.


## 1. Tasarım Dili & Renk Paleti (Cyber-Luxury Mesh & Obsidian Glass)
* **Karakter:** Canlı, nefes alan ipeksi morphing mesh gradient + Obsidian gece lüksü + Apple App Store kristal cam zarafeti.
* **Ana Renkler:**
  * **Obsidian Zemin:** `#0A0A16` (Ultra derin gece siyahı / baz katman)
  * **Kristal Cam Paneller:** `rgba(14, 18, 36, 0.68)`, ince kristal kenarlıklar `rgba(148, 163, 184, 0.14)`
  * **Living Mesh Spektrumu:**
    * **Electric Indigo:** `#7860F0` (Ana marka ve aksiyon rengi)
    * **Azure Ocean Blue:** `#4A9DFD` (İkincil gradyan ve teknoloji mavisi)
    * **Violet Orchid:** `#965CE8` (Yaratıcı ve yapay zeka tonu)
    * **Neon Cyan:** `#34C4D6` (Aktif sekme, bildirim ve parıltılar)
    * **Vibrant Magenta:** `#CE4EB0` (Öne çıkan lansmanlar ve rozetler)
    * **Deep Cobalt:** `#2E68E0` (Derinlik ve kontrast rengi)
  * **Accent (Sponsorlu Vitrin):** `#F59E0B` (Sponsorlu proje altını)
  * **Success (Kupon / Bakiye):** `#10B981` (Zümrüt Yeşili)
  * **Glassmorphism & Specular:** `rgba(255, 255, 255, 0.14)` üst parlama çizgisi

## 2. Saf Mobil Etkileşim Kuralları
* **Yaşayan Mesh Arka Plan (Silky Morphing Mesh Gradient):**
  * Uygulamanın arkasında yumuşak yörüngelerde salınan ve fizik kurallarıyla etkileşime giren 6 dinamik renk blobu.
  * Web üzerinde sıfır gecikmeli Canvas 2D ara bellek ve film greni; mobilde donanım hızlandırmalı pürüzsüz animasyonlu orblar.
* **Floating Bottom Navigation Bar:**
  * Altta sabit, iOS/Android uyumlu ultra-koyu cam çubuk (`MobileBottomNav.tsx`).
  * Ortada parlayan yüzen **[＋ Lansman]** roket butonu.
  * Aktif sekmede elektrik indigo/azure parıltılı çip.
* **Product Hunt Stili Upvote Etkileşimi:**
  * Her proje kartında sağ üstte üçgen ok ve sayaçlı dikey Upvote butonu (`▲ 384`).
  * Dokunulduğunda anında neon mor/indigo tonuna dönüşen iyimser animasyon.
* **Store & Harici Bağlantı Aksiyonları:**
  * Proje kartı altındaki "İncele / İndir ↗" butonu ile doğrudan App Store, Google Play veya Web sitesine tek dokunuşla sıçrama.
* **Buzlu Cam (Frosted Glass) Kartlar:**
  * Tüm kartlar ve paneller opak mat renkler yerine transparan kristal cam olarak inşa edilir; böylece arkadaki yaşayan mesh gradyanı tüm arayüze ferah ve lüks bir derinlik kazandırır.

## 3. Standart Buton Mimarisi (Aurora Border Button - `Button.tsx`)
Tasarım sistemimizdeki ve bundan sonraki tüm ekranlardaki tek ana buton standardı:
* **Bileşen:** [`Button.tsx`](file:///c:/Users/mehmet.ozdemir/Desktop/KISTAS/src/shared/components/Button.tsx) (veya `AuroraButton`)
* **Görsel Dinamikler:**
  * **Dönen Konik Aurora Kenarlığı:** Okyanus mavisi (`#4A9DFD`) ve holografik beyaz yayların butonu 360 derece çevreleyerek dönmesi.
  * **Dış Aurora Halesi (Bloom):** Butonun arkasından taşan, alfa 0'a yumuşakça sönen atmosferik ışık parıltısı.
  * **İç Çekirdek Işığı (Core Glow):** Butonun altından vuran radyal mavi derinlik ışığı.
  * **Tıklama Şok Dalgası (Pulse Wave):** Dokunulduğunda butondan dışa doğru genişleyip sönen neon halka darbesi (`scale: 1.16`).
  * **Hız ve Parlaklık İnterpolasyonu (Speed Lerp):** Boşta 56°/sn hızında sakin dönüş, hover/focus durumunda 172°/sn hızına ivmelenme ve parıltı derinleşmesi.
  * **Mikro Etkileşim:** Hover'da yukarı hafif kalkış (`translateY(-1px)`) ve ok simgesinin ileri kayması (`translateX(3px)`).
* **Varyantlar:** `primary` (varsayılan aurora), `aurora`, `secondary`, `outline`, `gold`, `danger`.
* **Boyutlar:** `sm`, `md`, `lg`.
