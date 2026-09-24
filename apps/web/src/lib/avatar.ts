export const KISTAS_DEFAULT_AVATAR = '/kistas-logo-transparent.png';

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
  if (isKistasDefaultAvatar(avatarUrl)) {
    return KISTAS_DEFAULT_AVATAR;
  }
  return avatarUrl!.trim();
}
