export const KISTAS_DEFAULT_AVATAR_URL =
  'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png';

const PROVIDER_GENERATED_AVATAR_HOSTS = [
  'lh3.googleusercontent.com/a/',
];

export const isProviderGeneratedAvatar = (avatarUrl?: string | null): boolean => {
  if (!avatarUrl) return false;
  return PROVIDER_GENERATED_AVATAR_HOSTS.some((host) => avatarUrl.includes(host));
};

export const resolveProfileAvatarUrl = (avatarUrl?: string | null): string => {
  if (!avatarUrl || isProviderGeneratedAvatar(avatarUrl)) {
    return KISTAS_DEFAULT_AVATAR_URL;
  }
  return avatarUrl;
};

export const usesKistasDefaultAvatar = (avatarUrl?: string | null): boolean =>
  resolveProfileAvatarUrl(avatarUrl) === KISTAS_DEFAULT_AVATAR_URL;
