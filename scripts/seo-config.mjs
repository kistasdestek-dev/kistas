export const SITE_ORIGIN = 'https://www.kistas.com.tr';
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/social-preview.png`;

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: 'Kıstas',
  url: `${SITE_ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 1024, height: 1024 },
  email: 'kistasdestek@gmail.com',
};

const website = {
  '@type': 'WebSite',
  '@id': `${SITE_ORIGIN}/#website`,
  name: 'Kıstas',
  url: `${SITE_ORIGIN}/`,
  inLanguage: 'tr-TR',
  publisher: { '@id': organization['@id'] },
};

const breadcrumb = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], index) => ({
    '@type': 'ListItem', position: index + 1, name, item,
  })),
});

const article = ({ path, title, description, image, author, authorType = 'Organization', datePublished, dateModified, section, keywords }) => {
  const url = `${SITE_ORIGIN}${path}`;
  return {
    path,
    title,
    description,
    image,
    ogType: 'article',
    heading: title.replace(/ \| Kıstas$/, ''),
    lead: description,
    lastmod: dateModified.slice(0, 10),
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        website,
        {
          '@type': 'BlogPosting',
          '@id': `${url}#article`,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          headline: title.replace(/ \| Kıstas$/, ''),
          description,
          image: [image],
          datePublished,
          dateModified,
          author: { '@type': authorType, name: author },
          publisher: { '@id': organization['@id'] },
          articleSection: section,
          keywords,
          inLanguage: 'tr-TR',
          isAccessibleForFree: true,
        },
        breadcrumb([['Ana Sayfa', `${SITE_ORIGIN}/`], ['Blog', `${SITE_ORIGIN}/blog/`], [title.replace(/ \| Kıstas$/, ''), url]]),
      ],
    },
  };
};

const collection = ({ path, title, description, heading, lead }) => {
  const url = `${SITE_ORIGIN}${path}`;
  return {
    path,
    title,
    description,
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading,
    lead,
    lastmod: '2026-09-15',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        website,
        {
          '@type': 'CollectionPage',
          '@id': `${url}#webpage`,
          url,
          name: heading,
          description,
          isPartOf: { '@id': website['@id'] },
          mainEntity: {
            '@type': 'ItemList',
            name: heading,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
          },
          inLanguage: 'tr-TR',
        },
        breadcrumb([['Ana Sayfa', `${SITE_ORIGIN}/`], [heading, url]]),
      ],
    },
  };
};

export const SEO_ROUTES = [
  {
    path: '/',
    title: 'Kıstas | Dijital Projeleri Keşfet ve Destekle',
    description: "Kıstas'ta bağımsız dijital projeleri keşfet, beğendiğin girişimleri destekle ve kendi projeni toplulukla buluştur.",
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading: 'Kıstas: Bağımsız dijital projeleri keşfet ve destekle',
    lead: 'Yeni mobil uygulamaları, SaaS ürünlerini, oyunları ve yapay zekâ araçlarını keşfet. Beğendiğin projeleri destekle veya kendi dijital ürününü toplulukla buluştur.',
    lastmod: '2026-09-14',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [organization, website, {
        '@type': 'WebPage',
        '@id': `${SITE_ORIGIN}/#webpage`,
        url: `${SITE_ORIGIN}/`,
        name: 'Kıstas | Dijital Projeleri Keşfet ve Destekle',
        description: "Kıstas'ta bağımsız dijital projeleri keşfet, beğendiğin girişimleri destekle ve kendi projeni toplulukla buluştur.",
        isPartOf: { '@id': website['@id'] },
        about: { '@id': organization['@id'] },
        inLanguage: 'tr-TR',
      }],
    },
  },
  collection({
    path: '/browse/',
    title: 'Dijital Projeleri Keşfet | Kıstas',
    description: 'Mobil uygulama, SaaS, oyun, web ve yapay zekâ projelerini kategori ve platformlara göre keşfedin; bağımsız üreticilerin yeni ürünlerini inceleyin.',
    heading: 'Bağımsız dijital projeleri keşfet',
    lead: 'Mobil uygulamalardan SaaS ürünlerine, oyunlardan yapay zekâ araçlarına kadar bağımsız geliştiricilerin projelerini tek vitrinde keşfedin.',
  }),
  collection({
    path: '/popular/',
    title: 'Popüler Dijital Projeler | Kıstas',
    description: "Kıstas topluluğunun kalıcı desteğine göre öne çıkan popüler mobil uygulamaları, SaaS ürünlerini ve oyunları keşfedin.",
    heading: 'Popüler dijital projeler',
    lead: 'Topluluğun kalıcı desteğiyle yükselen bağımsız dijital ürünleri ve en çok desteklenen projeleri inceleyin.',
  }),
  collection({
    path: '/new/',
    title: 'Yeni Çıkan Dijital Projeler | Kıstas',
    description: "Kıstas'a son 30 günde katılan mobil uygulamaları, SaaS ürünlerini, oyunları ve yapay zekâ araçlarını keşfedin; bağımsız üreticileri erkenden destekleyin.",
    heading: 'Yeni çıkan dijital projeler',
    lead: 'Topluluğa yeni katılan yenilikçi uygulamaları ve dijital ürünleri ilk keşfedenlerden biri olun.',
  }),
  {
    path: '/about/',
    title: 'Kıstas Nedir? | Yeni Fikirleri Keşfet ve Destekle',
    description: "Kıstas'ta yeni uygulamaları, oyunları ve dijital ürünleri keşfedin; beğendiğiniz projelere destek verin.",
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading: 'Kıstas hakkında',
    lead: 'Yeni dijital ürünleri kolayca keşfedin, beğendiğiniz projelere destek verin ve iyi fikirlerin büyümesine ortak olun.',
    lastmod: '2026-09-16',
    schema: { '@context': 'https://schema.org', '@graph': [organization, website, {
      '@type': 'AboutPage', '@id': `${SITE_ORIGIN}/about/#webpage`, url: `${SITE_ORIGIN}/about/`, name: 'Kıstas Hakkında',
      description: "Kıstas'ta yeni dijital ürünleri keşfedin, beğendiğiniz projelere destek verin ve iyi fikirlerin büyümesine ortak olun.",
      isPartOf: { '@id': website['@id'] }, about: { '@id': organization['@id'] }, inLanguage: 'tr-TR',
    }, breadcrumb([['Ana Sayfa', `${SITE_ORIGIN}/`], ['Hakkımızda', `${SITE_ORIGIN}/about/`]])] },
  },
  {
    path: '/how-it-works/',
    title: 'Kıstas Nasıl Çalışır? | Keşfet, Destekle, Büyüt',
    description: "Kıstas'ta yeni projeleri keşfedin, beğendiğinize kalıcı destek verin veya kendi projenizi doğru insanlarla buluşturun.",
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading: 'Kıstas nasıl çalışır?',
    lead: 'Yeni projeleri bul, beğendiğine destek ver veya kendi projenin doğru insanlar tarafından fark edilmesini sağla.',
    lastmod: '2026-09-16',
    schema: { '@context': 'https://schema.org', '@graph': [organization, website, {
      '@type': 'WebPage', '@id': `${SITE_ORIGIN}/how-it-works/#webpage`, url: `${SITE_ORIGIN}/how-it-works/`, name: 'Kıstas Nasıl Çalışır?',
      description: "Kıstas'ta yeni projeleri keşfedin, kalıcı destek verin ve kendi projenizi doğru insanlarla buluşturun.",
      isPartOf: { '@id': website['@id'] }, inLanguage: 'tr-TR',
    }, breadcrumb([['Ana Sayfa', `${SITE_ORIGIN}/`], ['Nasıl Çalışır?', `${SITE_ORIGIN}/how-it-works/`]])] },
  },
  {
    path: '/sss/',
    title: 'Sıkça Sorulan Sorular | Kıstas',
    description: "Kıstas'ta proje keşfetme, kalıcı destek, proje yayınlama, Vitrin Kredisi ve hesap konularındaki sorularınıza kısa yanıtlar bulun.",
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading: 'Sıkça sorulan sorular',
    lead: "Kıstas'ı kullanırken merak ettiğiniz temel konuları kısa ve açık yanıtlarla inceleyin.",
    lastmod: '2026-09-16',
    schema: { '@context': 'https://schema.org', '@graph': [organization, website, {
      '@type': 'FAQPage', '@id': `${SITE_ORIGIN}/sss/#webpage`, url: `${SITE_ORIGIN}/sss/`, name: 'Kıstas Sıkça Sorulan Sorular',
      isPartOf: { '@id': website['@id'] }, inLanguage: 'tr-TR',
      mainEntity: [
        ['Projeler nerede görünür?', 'Onaylanan projeler Göz At alanında kendi kategorisinde yer alır ve ilk 30 gün Yeni Çıkanlar bölümünde de görünür.'],
        ['Popüler sıralama nasıl oluşur?', 'Popüler projeler kullanıcılardan aldıkları kalıcı destek sayısına göre sıralanır.'],
        ['Vitrin kredisi ne işe yarar?', 'Vitrin kredisi projenin Sponsorlu Vitrin rotasyonuna katılmasını sağlar ve abonelik değildir.'],
      ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
    }, breadcrumb([['Ana Sayfa', `${SITE_ORIGIN}/`], ['SSS', `${SITE_ORIGIN}/sss/`]])] },
  },
  {
    path: '/blog/',
    title: 'Kıstas Blog | Yapay Zekâ, SaaS ve Girişimcilik',
    description: 'Bağımsız geliştiriciler ve girişimciler için yapay zekâ, SaaS, ürün tasarımı, sıfır bütçeyle lansman ve organik büyüme rehberleri.',
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading: 'Kıstas Blog: Yapay zekâ, SaaS ve girişimcilik',
    lead: 'Bağımsız geliştiriciler için özgün ürün deneyimleri, karşılaştırmalar ve uygulamalı büyüme rehberleri.',
    lastmod: '2026-09-14',
    schema: { '@context': 'https://schema.org', '@graph': [organization, website, {
      '@type': 'Blog', '@id': `${SITE_ORIGIN}/blog/#blog`, url: `${SITE_ORIGIN}/blog/`, name: 'Kıstas Blog',
      description: 'Yapay zekâ, SaaS, ürün tasarımı ve organik büyüme rehberleri.', publisher: { '@id': organization['@id'] }, inLanguage: 'tr-TR',
    }, breadcrumb([['Ana Sayfa', `${SITE_ORIGIN}/`], ['Blog', `${SITE_ORIGIN}/blog/`]])] },
  },
  article({
    path: '/blog/bagimsiz-gelistiriciler-icin-sifir-butceyle-lansman-rehberi/',
    title: 'Sıfır Bütçeyle Ürün Lansmanı Rehberi | Kıstas',
    description: 'Büyük reklam bütçeleri harcamadan ilk 1.000 aktif kullanıcıya ulaşmanın adil ve organik yolları. Topluluk odaklı lansman stratejileri.',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
    author: 'Mehmet Özdemir', authorType: 'Person', datePublished: '2026-09-08T05:10:55.706012+00:00', dateModified: '2026-09-10T05:10:55.706012+00:00', section: 'Girişimcilik',
    keywords: ['girişimcilik', 'ürün lansmanı', 'bağımsız geliştirici', 'organik büyüme'],
  }),
  article({
    path: '/blog/yapay-zeka-uygulamalarinda-kullanici-deneyimi-ve-guven/',
    title: 'Yapay Zekâ Uygulamalarında UX ve Güven | Kıstas',
    description: 'Yapay zekâ araçlarında akışkan yanıtlar, halüsinasyon kontrolü, kaynak gösterimi ve kullanıcı güvenini artıran ürün tasarımı ilkeleri.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    author: 'Kıstas Editoryal', datePublished: '2026-09-05T05:10:55.706012+00:00', dateModified: '2026-09-10T05:10:55.706012+00:00', section: 'Yapay Zekâ',
    keywords: ['yapay zekâ', 'kullanıcı deneyimi', 'güven', 'ürün tasarımı'],
  }),
  article({
    path: '/blog/saas-fiyatlandirma-stratejileri-freemium-mu-ucretsiz-deneme-mi/',
    title: 'SaaS Fiyatlandırması: Freemium mu Deneme mi? | Kıstas',
    description: 'Erken aşama yazılım girişimleri için freemium ve ücretsiz deneme modellerinin dönüşüm, maliyet ve kullanıcı kazanımı açısından karşılaştırması.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
    author: 'Kıstas Strateji', datePublished: '2026-09-02T05:10:55.706012+00:00', dateModified: '2026-09-10T05:10:55.706012+00:00', section: 'SaaS',
    keywords: ['SaaS', 'fiyatlandırma', 'freemium', 'ücretsiz deneme'],
  }),
  {
    path: '/privacy/',
    title: 'KVKK ve Gizlilik Politikası | Kıstas',
    description: "Kıstas'ın kişisel verileri nasıl işlediğini, koruduğunu ve kullanıcı tercihlerini nasıl yönettiğini inceleyin.",
    image: DEFAULT_IMAGE,
    ogType: 'website',
    heading: 'KVKK ve Gizlilik Politikası',
    lead: "Kıstas'ın kişisel veri işleme, saklama, güvenlik ve kullanıcı haklarına ilişkin açıklamalarını inceleyin.",
    lastmod: '2026-09-14',
    includeInSitemap: false,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [organization, website, {
        '@type': 'WebPage',
        '@id': `${SITE_ORIGIN}/privacy/#webpage`,
        url: `${SITE_ORIGIN}/privacy/`,
        name: 'KVKK ve Gizlilik Politikası',
        description: "Kıstas'ın kişisel veri işleme ve güvenlik açıklamaları.",
        isPartOf: { '@id': website['@id'] },
        inLanguage: 'tr-TR',
      }],
    },
  },
];

export const SITEMAP_ROUTES = SEO_ROUTES.filter((route) => route.includeInSitemap !== false);
