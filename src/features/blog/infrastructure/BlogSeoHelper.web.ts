import { BlogPost } from '../domain/BlogPost';
import { SITE_ORIGIN, blogPostUrl } from '../../../core/config/siteUrls';

const SCHEMA_SCRIPT_ID = 'kistas-page-schema-jsonld';

interface PreviousMetaState {
  title: string;
  description: string;
  canonical: string;
}

let originalState: PreviousMetaState | null = null;

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function removeMetaTag(attrName: 'name' | 'property', attrValue: string) {
  if (typeof document === 'undefined') return;
  const element = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function setCanonicalUrl(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function injectJsonLd(data: object) {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(SCHEMA_SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = SCHEMA_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  if (typeof document === 'undefined') return;
  const script = document.getElementById(SCHEMA_SCRIPT_ID);
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
}

export const BlogSeoHelper = {
  /**
   * Blog ana sayfası için Google SEO meta etiketlerini ve Schema.org yapısını enjekte eder.
   */
  applyBlogListSeo() {
    if (typeof document === 'undefined') return;

    if (!originalState) {
      originalState = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      };
    }

    const title = 'Kıstas Blog | Yapay Zekâ, SaaS ve Girişimcilik';
    const description = 'Bağımsız geliştiriciler ve girişimciler için yapay zekâ, SaaS, ürün tasarımı, sıfır bütçeyle lansman ve organik büyüme rehberleri.';
    const canonical = `${SITE_ORIGIN}/blog/`;
    const coverImage = `${SITE_ORIGIN}/social-preview.png`;

    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setCanonicalUrl(canonical);

    // OpenGraph
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', 'Kıstas');
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonical);
    setMetaTag('property', 'og:image', coverImage);

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', coverImage);

    // Google Schema.org JSON-LD
    injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Blog',
          '@id': `${SITE_ORIGIN}/blog/#blog`,
          'name': 'Kıstas Blog & Perspektif',
          'description': description,
          'url': canonical,
          'publisher': {
            '@type': 'Organization',
            '@id': `${SITE_ORIGIN}/#organization`,
            'name': 'Kıstas',
            'url': SITE_ORIGIN,
            'logo': {
              '@type': 'ImageObject',
              'url': `${SITE_ORIGIN}/social-preview.png`,
              'width': 1024,
              'height': 1024,
            },
          },
          'inLanguage': 'tr-TR',
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Ana Sayfa',
              'item': SITE_ORIGIN,
            },
            {
              '@type': 'ListItem',
              'position': 2,
              'name': 'Blog',
              'item': canonical,
            },
          ],
        },
      ],
    });
  },

  /**
   * Tekil blog yazısı için Google uyumlu derinlemesine SEO ve BlogPosting Schema.org enjekte eder.
   */
  applyBlogPostSeo(post: BlogPost) {
    if (typeof document === 'undefined') return;

    if (!originalState) {
      originalState = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      };
    }

    const title = post.meta_title || `${post.title} | Kıstas Blog`;
    const description = post.meta_description || post.excerpt;
    const canonical = blogPostUrl(post.slug);
    const coverImage = post.cover_image_url;

    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setCanonicalUrl(canonical);

    // OpenGraph Article
    setMetaTag('property', 'og:type', 'article');
    setMetaTag('property', 'og:site_name', 'Kıstas');
    setMetaTag('property', 'og:title', post.title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonical);
    setMetaTag('property', 'og:image', coverImage);
    setMetaTag('property', 'article:published_time', post.published_at);
    setMetaTag('property', 'article:author', post.author_name);
    setMetaTag('property', 'article:section', post.category);

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', post.title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', coverImage);

    // Google Schema.org BlogPosting Structured Data
    injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BlogPosting',
          '@id': `${canonical}#article`,
          'mainEntityOfPage': { '@type': 'WebPage', '@id': canonical },
          'headline': post.title,
          'description': description,
          'image': [coverImage],
          'datePublished': post.published_at,
          'dateModified': post.updated_at || post.published_at,
          'author': {
            '@type': post.author_name === 'Mehmet Özdemir' ? 'Person' : 'Organization',
            'name': post.author_name,
            ...(post.author_name === 'Mehmet Özdemir' ? { jobTitle: post.author_title } : {}),
          },
          'publisher': {
            '@type': 'Organization',
            '@id': `${SITE_ORIGIN}/#organization`,
            'name': 'Kıstas',
            'url': SITE_ORIGIN,
            'logo': {
              '@type': 'ImageObject',
              'url': `${SITE_ORIGIN}/social-preview.png`,
              'width': 1024,
              'height': 1024,
            },
          },
          'articleSection': post.category,
          'keywords': post.tags,
          'timeRequired': `PT${post.reading_time_minutes}M`,
          'inLanguage': 'tr-TR',
          'isAccessibleForFree': true,
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Ana Sayfa', 'item': `${SITE_ORIGIN}/` },
            { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': `${SITE_ORIGIN}/blog/` },
            { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': canonical },
          ],
        },
      ],
    });
  },

  /**
   * Blog sayfasından ayrılınca orijinal meta etiketlerini geri yükler.
   */
  restoreOriginalSeo() {
    if (typeof document === 'undefined') return;

    removeJsonLd();
    removeMetaTag('property', 'article:published_time');
    removeMetaTag('property', 'article:author');
    removeMetaTag('property', 'article:section');

    if (originalState) {
      document.title = originalState.title;
      setMetaTag('name', 'description', originalState.description);
      if (originalState.canonical) {
        setCanonicalUrl(originalState.canonical);
      }
      originalState = null;
    }
  },
};
