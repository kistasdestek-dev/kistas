export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  author_name: string;
  author_title: string;
  author_avatar_url?: string | null;
  reading_time_minutes: number;
  is_published: boolean;
  view_count: number;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  published_at: string;
  created_at?: string;
  updated_at?: string;
}

export const BLOG_CATEGORIES = [
  'Tümü',
  'Girişimcilik',
  'Yapay Zekâ',
  'SaaS',
  'Ürün Tasarımı',
  'Geliştirici Rehberi',
  'Büyüme & Lansman',
] as const;

export type BlogCategory = typeof BLOG_CATEGORIES[number];

/**
 * Türkçe karakterleri normalize ederek SEO dostu temiz URL slug'ı üretir.
 */
export function generateSlug(text: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
  };

  const normalized = text
    .split('')
    .map(char => trMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'yazi-' + Date.now().toString(36);
}

/**
 * İçerikten tahmini okuma süresi hesaplar (ortalama 180 kelime/dk)
 */
export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 180));
}
