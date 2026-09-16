import { SITE_ORIGIN } from '../config/siteUrls';

type PublicPage = 'home' | 'browse' | 'showcase' | 'popular' | 'new' | 'about' | 'how-it-works' | 'privacy';

interface PageDefinition {
  path: string;
  title: string;
  description: string;
  schemaType: 'WebPage' | 'AboutPage' | 'CollectionPage';
}

const DEFAULT_IMAGE = `${SITE_ORIGIN}/social-preview.png`;
const PUBLIC_PAGES: Record<PublicPage, PageDefinition> = {
  home: {
    path: '/',
    title: 'Kıstas | Dijital Projeleri Keşfet ve Destekle',
    description: "Kıstas'ta bağımsız dijital projeleri keşfet, beğendiğin girişimleri destekle ve kendi projeni toplulukla buluştur.",
    schemaType: 'WebPage',
  },
  browse: {
    path: '/browse/',
    title: 'Dijital Projeleri Keşfet | Kıstas',
    description: 'Mobil uygulama, SaaS, oyun, web ve yapay zekâ projelerini kategori ve platforma göre keşfedin.',
    schemaType: 'CollectionPage',
  },
  showcase: {
    path: '/showcase/',
    title: 'Günün Öne Çıkan Dijital Projeleri | Kıstas',
    description: 'Kıstas topluluğunun desteğiyle öne çıkan bağımsız dijital projeleri ve yeni ürünleri inceleyin.',
    schemaType: 'CollectionPage',
  },
  popular: {
    path: '/popular/',
    title: 'Popüler Dijital Projeler | Kıstas',
    description: "Kıstas'ta kalıcı topluluk desteğine göre en popüler dijital projeleri keşfedin.",
    schemaType: 'CollectionPage',
  },
  new: {
    path: '/new/',
    title: 'Yeni Çıkan Dijital Projeler | Kıstas',
    description: "Kıstas'ta topluluğa son 30 günde katılan yenilikçi ve bağımsız projeleri inceleyin.",
    schemaType: 'CollectionPage',
  },
  about: {
    path: '/about/',
    title: 'Kıstas Nedir? | Yeni Fikirleri Keşfet ve Destekle',
    description: "Kıstas'ta yeni uygulamaları, oyunları ve dijital ürünleri keşfedin; beğendiğiniz projelere destek verin.",
    schemaType: 'AboutPage',
  },
  'how-it-works': {
    path: '/how-it-works/',
    title: 'Kıstas Nasıl Çalışır? | Keşfet, Destekle, Büyüt',
    description: "Kıstas'ta yeni projeleri keşfedin, beğendiğinize kalıcı destek verin veya kendi projenizi doğru insanlarla buluşturun.",
    schemaType: 'WebPage',
  },
  privacy: {
    path: '/privacy/',
    title: 'KVKK ve Gizlilik Politikası | Kıstas',
    description: "Kıstas'ın kişisel verileri nasıl işlediğini, koruduğunu ve kullanıcı tercihlerini nasıl yönettiğini inceleyin.",
    schemaType: 'WebPage',
  },
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(url: string) {
  let element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = url;
}

function setSchema(page: PageDefinition, canonical: string) {
  let script = document.getElementById('kistas-page-schema-jsonld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'kistas-page-schema-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'Kıstas',
        url: `${SITE_ORIGIN}/`,
        logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 1024, height: 1024 },
        email: 'kistasdestek@gmail.com',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: 'Kıstas',
        url: `${SITE_ORIGIN}/`,
        inLanguage: 'tr-TR',
      },
      {
        '@type': page.schemaType,
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: page.title,
        description: page.description,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        inLanguage: 'tr-TR',
      },
    ],
  });
}

export function applyPublicPageSeo(pageKey: PublicPage): void {
  if (typeof document === 'undefined') return;
  const page = PUBLIC_PAGES[pageKey];
  if (!page) return;
  const canonical = page.path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${page.path}`;
  document.title = page.title;
  setMeta('name', 'description', page.description);
  setMeta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  setCanonical(canonical);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', 'Kıstas');
  setMeta('property', 'og:title', page.title);
  setMeta('property', 'og:description', page.description);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:image', DEFAULT_IMAGE);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', page.title);
  setMeta('name', 'twitter:description', page.description);
  setMeta('name', 'twitter:image', DEFAULT_IMAGE);
  setSchema(page, canonical);
}

export function applyPrivatePageSeo(): void {
  if (typeof document === 'undefined') return;
  document.title = 'Kıstas';
  setMeta('name', 'robots', 'noindex,nofollow');
}
