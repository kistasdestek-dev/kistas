export const SITE_ORIGIN = 'https://www.xn--kstas-n4a.com';

export const blogPostUrl = (slug: string): string =>
  `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}`;
