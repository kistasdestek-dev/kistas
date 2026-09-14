const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

interface SafeUrlOptions {
  allowedHosts?: readonly string[];
  allowLocalhost?: boolean;
}

export const toSafeHttpsUrl = (
  value: string,
  options: SafeUrlOptions = {}
): string | null => {
  try {
    const trimmedValue = value.trim();
    if (!trimmedValue || /[\\\u0000-\u001f\u007f]/.test(trimmedValue)) return null;
    if (trimmedValue.startsWith('//')) return null;

    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmedValue)
      ? trimmedValue
      : `https://${trimmedValue}`;
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    if (!options.allowLocalhost && BLOCKED_HOSTS.has(hostname)) return null;
    if (options.allowedHosts && !options.allowedHosts.some((host) => host.toLowerCase() === hostname)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};
