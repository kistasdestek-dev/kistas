export const KISTAS_DEFAULT_AVATAR = '/kistas-logo-256.webp';
export const KISTAS_AVATAR_PATHS = [
  '/avatars/kistas-avatar-1.webp',
  '/avatars/kistas-avatar-2.webp',
  '/avatars/kistas-avatar-3.webp',
  '/avatars/kistas-avatar-4.webp',
] as const;

const KISTAS_PUBLIC_ORIGIN = 'https://www.kistas.com.tr';

export function toStoredAvatarUrl(avatarUrl: string): string {
  return KISTAS_AVATAR_PATHS.includes(avatarUrl as (typeof KISTAS_AVATAR_PATHS)[number])
    ? `${KISTAS_PUBLIC_ORIGIN}${avatarUrl}`
    : avatarUrl;
}

export function toLocalKistasAvatarPath(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  const path = avatarUrl.startsWith(KISTAS_PUBLIC_ORIGIN)
    ? avatarUrl.slice(KISTAS_PUBLIC_ORIGIN.length)
    : avatarUrl;
  return KISTAS_AVATAR_PATHS.includes(path as (typeof KISTAS_AVATAR_PATHS)[number]) ? path : null;
}

/**
 * Checks whether an avatar URL represents the default Kıstas system logo
 * or a deprecated / unreachable R2 asset URL.
 */
export function isKistasDefaultAvatar(avatarUrl?: string | null): boolean {
  if (!avatarUrl || !avatarUrl.trim()) return true;
  if (avatarUrl === KISTAS_DEFAULT_AVATAR) return true;
  if (avatarUrl.includes('r2.dev') && avatarUrl.includes('kistas-logo')) return true;
  if (avatarUrl.includes('system/kistas-logo')) return true;
  return false;
}

/**
 * Safely resolves an avatar URL, falling back to the local high-res Kıstas logo.
 */
export function resolveAvatarUrl(avatarUrl?: string | null): string {
  const localKistasAvatar = toLocalKistasAvatarPath(avatarUrl);
  if (localKistasAvatar) return localKistasAvatar;
  if (isKistasDefaultAvatar(avatarUrl)) {
    return KISTAS_DEFAULT_AVATAR;
  }
  return avatarUrl!.trim();
}
