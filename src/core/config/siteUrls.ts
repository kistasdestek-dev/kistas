export const SITE_ORIGIN = 'https://www.kistas.com.tr';

export const blogPostUrl = (slug: string): string =>
  `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}/`;
