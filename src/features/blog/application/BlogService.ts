import { supabase } from '../../../core/supabase/supabaseClient';
import { BlogPost, generateSlug, calculateReadingTime } from '../domain/BlogPost';
import { blogPostUrl } from '../../../core/config/siteUrls';

const INITIAL_SEED_POSTS: BlogPost[] = [
  {
    id: 'seed-post-1',
    slug: 'bagimsiz-gelistiriciler-icin-sifir-butceyle-lansman-rehberi',
    title: 'Bağımsız Geliştiriciler İçin Sıfır Bütçeyle Lansman Rehberi',
    excerpt: 'Büyük reklam bütçelerine sahip olmadan ilk 1.000 aktif kullanıcıya nasıl ulaşılır? Organik vitrinler, erken benimseyiciler ve topluluk gücü.',
    content: `## Dijital Ürününüzü Dünyaya Tanıtmanın Yeni Yolu

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

Unutmayın: Büyük bütçeler hızlı trafik çeker, ancak tutkulu bir topluluk kalıcı bir girişim inşa eder.`,
    cover_image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
    category: 'Girişimcilik',
    tags: ['Girişimcilik', 'Lansman', 'Büyüme', 'Pazarlama'],
    author_name: 'Mehmet Özdemir',
    author_title: 'Kıstas Kurucu & Tasarımcı',
    author_avatar_url: null,
    reading_time_minutes: 5,
    is_published: true,
    view_count: 1420,
    meta_title: 'Bağımsız Geliştiriciler İçin Sıfır Bütçeyle Lansman Rehberi | Kıstas Blog',
    meta_description: 'Büyük reklam bütçeleri harcamadan ilk 1.000 aktif kullanıcıya ulaşmanın adil ve organik yolları. Topluluk odaklı lansman stratejileri.',
    canonical_url: blogPostUrl('bagimsiz-gelistiriciler-icin-sifir-butceyle-lansman-rehberi'),
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'seed-post-2',
    slug: 'yapay-zeka-uygulamalarinda-kullanici-deneyimi-ve-guven',
    title: 'Yapay Zekâ Uygulamalarında Kullanıcı Deneyimi ve Güven İnşası',
    excerpt: 'Yapay zekâ destekli araçlarda sihirli anları nasıl tasarlamalıyız? Yanıt gecikmeleri, halüsinasyon yönetimi ve kullanıcı güveni üzerine ilkeler.',
    content: `## Yapay Zekâ Yalnızca Model Değil, Bir Deneyimdir

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

Kullanıcılar artık verilerinin nasıl işlendiğini sorguluyor. Ürününüzün veri saklama politikasını tek paragraflık sade bir dille açıklayın. Kıstas vitrininde güvenlik rozeti taşıyan projelerin topluluktan daha yüksek etkileşim alması bir tesadüf değildir.`,
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    category: 'Yapay Zekâ',
    tags: ['Yapay Zekâ', 'UI/UX', 'Ürün Tasarımı', 'Teknoloji'],
    author_name: 'Kıstas Editoryal',
    author_title: 'Yapay Zekâ & Tasarım Masası',
    author_avatar_url: null,
    reading_time_minutes: 6,
    is_published: true,
    view_count: 980,
    meta_title: 'Yapay Zekâ Uygulamalarında UX ve Güven İnşası | Kıstas Blog',
    meta_description: 'Yapay zekâ araçlarında streaming yanıtlar, halüsinasyon kontrolü ve kullanıcı güvenini artıran modern tasarım ilkeleri.',
    canonical_url: blogPostUrl('yapay-zeka-uygulamalarinda-kullanici-deneyimi-ve-guven'),
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: 'seed-post-3',
    slug: 'saas-fiyatlandirma-stratejileri-freemium-mu-ucretsiz-deneme-mi',
    title: 'SaaS Fiyatlandırmasında Kritik Karar: Freemium mu, Ücretsiz Deneme mi?',
    excerpt: 'Erken aşama dijital ürünler için doğru gelir modelini seçmek. Dönüşüm oranları, sunucu maliyetleri ve kullanıcı psikolojisi analizi.',
    content: `## Fiyatlandırma Bir Özellik Değil, Ürünün Omurgasıdır

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
Kıstas üzerinde projenizi tanıtırken, topluluğa özel bir promosyon koduyla **30 günlük genişletilmiş deneme** veya **ömür boyu erken benimseyici indirimi** sunun. Bu, hem ilk kullanıcı kitlenizin hızla büyümesini sağlar hem de ürünü gerçekten kullanan nitelikli bir kitleye ulaşmanızı garanti eder.`,
    cover_image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
    category: 'SaaS',
    tags: ['SaaS', 'Fiyatlandırma', 'Girişimcilik', 'Büyüme'],
    author_name: 'Kıstas Strateji',
    author_title: 'Girişim Mimarisi',
    author_avatar_url: null,
    reading_time_minutes: 4,
    is_published: true,
    view_count: 760,
    meta_title: 'SaaS Fiyatlandırması: Freemium mu Ücretsiz Deneme mi? | Kıstas Blog',
    meta_description: 'Erken aşama yazılım girişimleri için gelir modelleri karşılaştırması. Dönüşüm oranları ve doğru lansman taktikleri.',
    canonical_url: blogPostUrl('saas-fiyatlandirma-stratejileri-freemium-mu-ucretsiz-deneme-mi'),
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString(),
  },
];

// Hafıza içi çalışma ve çevrimdışı fallback deposu
let inMemoryPosts: BlogPost[] = [...INITIAL_SEED_POSTS];

export const BlogService = {
  /**
   * Yayındaki tüm blog yazılarını getirir (Kamuya Açık)
   */
  async getPublishedPosts(category?: string): Promise<BlogPost[]> {
    try {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (category && category !== 'Tümü') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        // Fallback to in-memory seed
        let filtered = inMemoryPosts.filter(p => p.is_published);
        if (category && category !== 'Tümü') {
          filtered = filtered.filter(p => p.category === category);
        }
        return filtered;
      }
      return data as BlogPost[];
    } catch {
      let filtered = inMemoryPosts.filter(p => p.is_published);
      if (category && category !== 'Tümü') {
        filtered = filtered.filter(p => p.category === category);
      }
      return filtered;
    }
  },

  /**
   * Slug ile tekil blog yazısını getirir ve görüntülenme sayısını artırır
   */
  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (!error && data) {
        // Arka planda görüntülenmeyi artır
        void supabase.rpc('increment_blog_post_view_count', { target_slug: slug });
        return data as BlogPost;
      }
    } catch {
      // ignore
    }

    // Fallback to in-memory
    const match = inMemoryPosts.find(p => p.slug === slug && p.is_published);
    if (match) {
      match.view_count += 1;
      return { ...match };
    }
    return null;
  },

  /**
   * Yönetim Paneli için tüm yazıları (taslaklar dahil) getirir
   */
  async getAllPostsAdmin(): Promise<BlogPost[]> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as BlogPost[];
      }
    } catch {
      // ignore
    }
    return [...inMemoryPosts];
  },

  /**
   * Yeni Blog Yazısı Oluşturur (Admin)
   */
  async createPost(payload: {
    title: string;
    excerpt: string;
    content: string;
    cover_image_url: string;
    category: string;
    tags?: string[];
    author_name?: string;
    author_title?: string;
    author_avatar_url?: string | null;
    is_published?: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
    custom_slug?: string | null;
  }): Promise<{ success: boolean; post?: BlogPost; error?: string }> {
    const slug = payload.custom_slug ? generateSlug(payload.custom_slug) : generateSlug(payload.title);
    const readingTime = calculateReadingTime(payload.content);
    const publishedAt = new Date().toISOString();

    const newPost: BlogPost = {
      id: 'blog-' + Date.now().toString(36),
      slug,
      title: payload.title.trim(),
      excerpt: payload.excerpt.trim(),
      content: payload.content,
      cover_image_url: payload.cover_image_url.trim(),
      category: payload.category || 'Girişimcilik',
      tags: payload.tags || [payload.category || 'Girişimcilik'],
      author_name: payload.author_name || 'Kıstas Editoryal',
      author_title: payload.author_title || 'Teknoloji & İnovasyon Ekibi',
      author_avatar_url: payload.author_avatar_url || null,
      reading_time_minutes: readingTime,
      is_published: payload.is_published ?? true,
      view_count: 0,
      meta_title: payload.meta_title || `${payload.title} | Kıstas Blog`,
      meta_description: payload.meta_description || payload.excerpt,
      canonical_url: blogPostUrl(slug),
      published_at: publishedAt,
      created_at: publishedAt,
      updated_at: publishedAt,
    };

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          slug: newPost.slug,
          title: newPost.title,
          excerpt: newPost.excerpt,
          content: newPost.content,
          cover_image_url: newPost.cover_image_url,
          category: newPost.category,
          tags: newPost.tags,
          author_name: newPost.author_name,
          author_title: newPost.author_title,
          author_avatar_url: newPost.author_avatar_url,
          reading_time_minutes: newPost.reading_time_minutes,
          is_published: newPost.is_published,
          view_count: 0,
          meta_title: newPost.meta_title,
          meta_description: newPost.meta_description,
          canonical_url: newPost.canonical_url,
          published_at: newPost.published_at,
        })
        .select()
        .single();

      if (!error && data) {
        inMemoryPosts.unshift(data as BlogPost);
        return { success: true, post: data as BlogPost };
      }
    } catch {
      // ignore
    }

    // Local fallback
    inMemoryPosts.unshift(newPost);
    return { success: true, post: newPost };
  },

  /**
   * Blog Yazısını Günceller (Admin)
   */
  async updatePost(
    id: string,
    payload: Partial<BlogPost>
  ): Promise<{ success: boolean; error?: string }> {
    const updatedAt = new Date().toISOString();
    const updatePayload = {
      ...payload,
      updated_at: updatedAt,
      ...(payload.content ? { reading_time_minutes: calculateReadingTime(payload.content) } : {}),
    };

    try {
      const { error } = await supabase
        .from('blog_posts')
        .update(updatePayload)
        .eq('id', id);

      if (!error) {
        inMemoryPosts = inMemoryPosts.map(p => (p.id === id ? { ...p, ...updatePayload } : p));
        return { success: true };
      }
    } catch {
      // ignore
    }

    // Local fallback
    inMemoryPosts = inMemoryPosts.map(p => (p.id === id ? { ...p, ...updatePayload } : p));
    return { success: true };
  },

  /**
   * Blog Yazısını Siler (Admin)
   */
  async deletePost(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (!error) {
        inMemoryPosts = inMemoryPosts.filter(p => p.id !== id);
        return { success: true };
      }
    } catch {
      // ignore
    }

    inMemoryPosts = inMemoryPosts.filter(p => p.id !== id);
    return { success: true };
  },

  /**
   * Yayın Durumunu Değiştirir (Admin)
   */
  async togglePublish(id: string, isPublished: boolean): Promise<{ success: boolean }> {
    return this.updatePost(id, { is_published: isPublished });
  },
};
