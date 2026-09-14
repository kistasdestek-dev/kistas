const CLOUDFLARE_IMAGE_ORIGIN = 'https://www.xn--kstas-n4a.com';
const TRUSTED_REMOTE_IMAGE_HOSTS = new Set([
  'iojgqicgeztqwkbetboa.supabase.co',
]);

export const buildOptimizedImageUrl = (source: string | undefined, width: number): string | undefined => {
  if (!source) return source;
  try {
    const url = new URL(source);
    if (!TRUSTED_REMOTE_IMAGE_HOSTS.has(url.hostname)) return source;

    const safeWidth = Math.min(1600, Math.max(32, Math.round(width)));
    return `${CLOUDFLARE_IMAGE_ORIGIN}/cdn-cgi/image/width=${safeWidth},quality=76,format=auto,onerror=redirect/${url.href}`;
  } catch {
    return source;
  }
};

export const getOptimizedImageUrl = (source: string | undefined, width: number): string | undefined => {
  if (typeof window === 'undefined') return source;
  return buildOptimizedImageUrl(source, width);
};
