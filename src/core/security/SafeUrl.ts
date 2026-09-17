const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export interface SafeUrlOptions {
  allowedHosts?: readonly string[];
  allowLocalhost?: boolean;
}

/** SEC-037: Reject private, loopback, link-local and local-network hosts. */
export const isPrivateOrReservedHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase().trim();
  if (BLOCKED_HOSTS.has(lower) || lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.lan') || lower.endsWith('.home.arpa')) return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(lower) || /^10\.\d+\.\d+\.\d+$/.test(lower) || /^192\.168\.\d+\.\d+$/.test(lower) || /^169\.254\.\d+\.\d+\.\d+$/.test(lower) || lower === '0.0.0.0') return true;

  const match172 = lower.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (match172 && Number.parseInt(match172[1], 10) >= 16 && Number.parseInt(match172[1], 10) <= 31) return true;

  return lower === '::1' || lower === '[::1]' || lower.startsWith('fc00:') || lower.startsWith('fe80:') || lower.startsWith('[fc00:') || lower.startsWith('[fe80:');
};

export const toSafeHttpsUrl = (value: string, options: SafeUrlOptions = {}): string | null => {
  try {
    const trimmedValue = value.trim();
    if (!trimmedValue || /[\\\u0000-\u001f\u007f]/.test(trimmedValue) || trimmedValue.startsWith('//')) return null;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    if (!options.allowLocalhost && isPrivateOrReservedHost(hostname)) return null;
    if (options.allowedHosts && !options.allowedHosts.some(host => host.toLowerCase() === hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};
