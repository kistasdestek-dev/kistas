-- ============================================================================
-- Migration: 20260909000001_blog_system.sql
-- Description: SEO Uyumlu Blog Sistemi ve Yonetim Paneli Entegrasyonu
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Girişimcilik',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  author_name TEXT NOT NULL DEFAULT 'Kıstas Editoryal',
  author_title TEXT NOT NULL DEFAULT 'Teknoloji & İnovasyon Ekibi',
  author_avatar_url TEXT,
  reading_time_minutes INTEGER NOT NULL DEFAULT 4,
  is_published BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeksler (Hızlı SEO ve Filtreleme Performansı)
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);

-- RLS (Row Level Security)
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 1. Herkes yayınlanmış yazıları okuyabilir
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (is_published = true);

-- 2. Adminler tüm yazıları (taslaklar dahil) görebilir ve yönetebilir
DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage all blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Görüntülenme Sayısını Atomik Artıran Fonksiyon
CREATE OR REPLACE FUNCTION public.increment_blog_post_view_count(target_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE slug = target_slug AND is_published = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_view_count(TEXT) TO anon, authenticated;

-- Başlangıç Tohum (Seed) Yazıları
INSERT INTO public.blog_posts (
  slug,
  title,
  excerpt,
  content,
  cover_image_url,
  category,
  tags,
  author_name,
  author_title,
  reading_time_minutes,
  is_published,
  meta_title,
  meta_description,
  published_at
) VALUES 
(
  'bagimsiz-gelistiriciler-icin-sifir-butceyle-lansman-rehberi',
  'Bağımsız Geliştiriciler İçin Sıfır Bütçeyle Lansman Rehberi',
  'Büyük reklam bütçelerine sahip olmadan ilk 1.000 aktif kullanıcıya nasıl ulaşılır? Organik vitrinler, erken benimseyiciler ve topluluk gücü.',
  '## Dijital Ürününüzü Dünyaya Tanıtmanın Yeni Yolu

Günümüzde harika bir yazılım ürünü veya yapay zekâ aracı geliştirmek teknik olarak her zamankinden daha erişilebilir. Ancak asıl zorluk kod yazmak değil; ürünü onu gerçekten kullanacak, geri bildirim verecek ve sahiplenecek kitleyle buluşturmaktır.

Geleneksel reklam kanalları (Google Ads, Meta Ads) yüksek maliyetler nedeniyle bağımsız girişimcilerin bütçesini hızla tüketebilir. Peki tek bir kuruş harcamadan ilk 1.000 kullanıcı nasıl elde edilir?

---

### 1. Radikal Şeffaf Hikâye Anlatımı (Build in Public)

İnsanlar şirket logosuna değil, o logonun arkasındaki insan hikâyesine bağlanır. 
- Karşılaştığınız teknik zorlukları paylaşın.
- Ürünün hangi spesifik acı noktayı çözdüğünü net bir dille aktarın.
- Topluluktan gelen ilk geri bildirimlerle ürünü nasıl şekillendirdiğinizi gösterin.

---

### 2. Kıstas Gibi Adil Vitrinleri Doğru Kullanmak

Geleneksel platformlarda parayı basan en üst sırayı kapatırken, **Kıstas** gibi bağımsız ekosistemler doğrulanmış topluluk oylarını (upvote) esas alır.

- **Dikey Görseller**: Ürününüzün mobil veya web arayüzünü en net yansıtan dikey önizlemeler hazırlayın.
- **Tek Cümlelik Değer Önerisi**: "Yapay zekâ destekli finans takipçisi" yerine "Serbest çalışanlar için saniyeler içinde fatura kesen akıllı asistan" deyin.
- **Topluluk Teşviki**: Lansman gününde erken benimseyicilere özel ücretsiz deneme veya indirim kuponları tanımlayın.

---

### 3. İlk Kullanıcılarla Birebir Sohbet Edin

İlk 50 kullanıcınız birer veri satırı değil; ürününüzün geleceğini belirleyecek yol arkadaşlarınızdır. Kıstas üzerindeki yerleşik mesajlaşma özelliğini kullanarak geri bildirim veren herkese kişisel teşekkür edin ve onların ürün içindeki deneyimlerini dinleyin.

Unutmayın: Büyük bütçeler hızlı trafik çeker, ancak tutkulu bir topluluk kalıcı bir girişim inşa eder.',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
  'Girişimcilik',
  ARRAY['Girişimcilik', 'Lansman', 'Büyüme', 'Pazarlama'],
  'Mehmet Özdemir',
  'Kıstas Kurucu & Tasarımcı',
  5,
  true,
  'Bağımsız Geliştiriciler İçin Sıfır Bütçeyle Lansman Rehberi | Kıstas Blog',
  'Büyük reklam bütçeleri harcamadan ilk 1.000 aktif kullanıcıya ulaşmanın adil ve organik yolları. Topluluk odaklı lansman stratejileri.',
  NOW() - INTERVAL '2 days'
),
(
  'yapay-zeka-uygulamalarinda-kullanici-deneyimi-ve-guven',
  'Yapay Zekâ Uygulamalarında Kullanıcı Deneyimi ve Güven İnşası',
  'Yapay zekâ destekli araçlarda sihirli anları nasıl tasarlamalıyız? Yanıt gecikmeleri, halüsinasyon yönetimi ve kullanıcı güveni üzerine ilkeler.',
  '## Yapay Zekâ Yalnızca Model Değil, Bir Deneyimdir

LLM ve üretken yapay zekâ API’leri hayatımıza girdiğinden beri her gün yüzlerce yeni AI aracı doğuyor. Ancak kullanıcıların çoğu, ilk heyecanın ardından bu araçları terk ediyor. Neden?

Çünkü yapay zekâ ürünlerinde kullanıcı deneyimi (UX) geleneksel CRUD uygulamalarından tamamen farklı prensipler gerektirir.

---

### 1. Bekleme Süresini Değere Dönüştürün (Streaming & Skeleton)

Bir model yanıt üretirken geçen 3-5 saniyelik boşluk, kullanıcıda "bozuldu mu?" endişesi yaratır.
- Yanıtları mutlaka **harf harf (streaming)** akıtarak verin.
- Model düşünürken ne yaptığını şeffafça bildirin: *"Piyasa verileri taranıyor...", "Özet hazırlanıyor..."*
- Mikro-animasyonlarla kullanıcının göz temasını canlı tutun.

---

### 2. Halüsinasyonu ve Hata Durumlarını Zarafetle Karşılayın

Hiçbir yapay zekâ modeli %100 hatasız değildir. Güven, hata yapılmadığında değil, hata yapıldığında dürüst olunduğunda kazanılır.
- Üretilen çıktının yanında her zaman bir "Düzenle" veya "Tekrar Dene" butonu sunun.
- Kaynak referanslarını dipnot olarak ekleyin.
- Kullanıcıya modelin bir yardımcı pilot olduğunu, son kararın kendisinde olduğunu hissettirin.

---

### 3. Gizlilik ve Veri Güvencesi

Kullanıcılar artık verilerinin nasıl işlendiğini sorguluyor. Ürününüzün veri saklama politikasını tek paragraflık sade bir dille açıklayın. Kıstas vitrininde güvenlik rozeti taşıyan projelerin topluluktan daha yüksek etkileşim alması bir tesadüf değildir.',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
  'Yapay Zekâ',
  ARRAY['Yapay Zekâ', 'UI/UX', 'Ürün Tasarımı', 'Teknoloji'],
  'Kıstas Editoryal',
  'Yapay Zekâ & Tasarım Masası',
  6,
  true,
  'Yapay Zekâ Uygulamalarında UX ve Güven İnşası | Kıstas Blog',
  'Yapay zekâ araçlarında streaming yanıtlar, halüsinasyon kontrolü ve kullanıcı güvenini artıran modern tasarım ilkeleri.',
  NOW() - INTERVAL '5 days'
),
(
  'saas-fiyatlandirma-stratejileri-freemium-mu-ucretsiz-deneme-mi',
  'SaaS Fiyatlandırmasında Kritik Karar: Freemium mu, Ücretsiz Deneme mi?',
  'Erken aşama dijital ürünler için doğru gelir modelini seçmek. Dönüşüm oranları, sunucu maliyetleri ve kullanıcı psikolojisi analizi.',
  '## Fiyatlandırma Bir Özellik Değil, Ürünün Omurgasıdır

Birçok geliştirici aylar boyunca kusursuz bir ürün kodlar, ancak fiyatlandırma sayfasını lansmandan bir gece önce alelacele tasarlar. Oysa SaaS dünyasında başarının en belirleyici faktörü, sunduğunuz değer ile talep ettiğiniz ücretin psikolojik uyumudur.

Bu yazıda, özellikle bağımsız girişimcilerin en çok ikilemde kaldığı iki modeli masaya yatırıyoruz: **Freemium** ve **Kredi Kartı İstemeyen Ücretsiz Deneme (Free Trial)**.

---

### Freemium Modeli Ne Zaman İşe Yarar?

Freemium, ürününüz doğal bir ağ etkisi (network effect) veya viral döngü içeriyorsa mükemmeldir.
- **Artıları**: Çok hızlı kullanıcı kazanımı, yüksek marka bilinirliği, düşük giriş bariyeri.
- **Eksileri**: Ücret ödemeyen kullanıcıların yarattığı sunucu ve destek yükü, düşük ücretli abonelik dönüşüm oranları (%2 - %5 civarı).
- **Kimler İçin Uygun**: Sosyal araçlar, iş birliği platformları, tekil kullanıcı maliyeti sıfıra yakın yazılımlar.

---

### 14 Günlük Ücretsiz Deneme Ne Zaman Tercih Edilmeli?

Eğer ürününüz işletmelere (B2B) yönelikse ve net bir ROI (yatırım getirisi) vadediyorsa, ücretsiz deneme modeli genellikle daha sağlıklıdır.
- **Artıları**: Ciddi alıcıları çeker, dönüşüm oranları daha yüksektir (%10 - %25), sunucu maliyetlerini kontrol altında tutar.
- **Eksileri**: Giriş bariyeri daha yüksektir, viral yayılım daha yavaş gerçekleşir.

---

### Hibrit Model: Kıstas Lansman Stratejisi

Erken aşamada olan ürünler için önerimiz hibrit bir yaklaşımdır:
Kıstas üzerinde projenizi tanıtırken, topluluğa özel bir promosyon koduyla **30 günlük genişletilmiş deneme** veya **ömür boyu erken benimseyici indirimi** sunun. Bu, hem ilk kullanıcı kitlenizin hızla büyümesini sağlar hem de ürünü gerçekten kullanan nitelikli bir kitleye ulaşmanızı garanti eder.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
  'SaaS',
  ARRAY['SaaS', 'Fiyatlandırma', 'Girişimcilik', 'Büyüme'],
  'Kıstas Strateji',
  'Girişim Mimarisi',
  4,
  true,
  'SaaS Fiyatlandırması: Freemium mu Ücretsiz Deneme mi? | Kıstas Blog',
  'Erken aşama yazılım girişimleri için gelir modelleri karşılaştırması. Dönüşüm oranları ve doğru lansman taktikleri.',
  NOW() - INTERVAL '8 days'
)
ON CONFLICT (slug) DO NOTHING;
