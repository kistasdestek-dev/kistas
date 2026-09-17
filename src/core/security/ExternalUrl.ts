import { Linking, Platform } from 'react-native';
import { SafeUrlOptions, toSafeHttpsUrl } from './SafeUrl';

export { isPrivateOrReservedHost, toSafeHttpsUrl } from './SafeUrl';

/**
 * SEC-036: Reverse Tabnabbing & Referrer Leakage Shield
 * Harici bağlantıları 'noopener,noreferrer' ile ve opener referansı sıfırlanarak açar.
 */
export const openSafeExternalUrl = async (
  url?: string | null,
  options: SafeUrlOptions = {}
): Promise<boolean> => {
  if (!url) return false;
  const safeUrl = toSafeHttpsUrl(url, options);
  if (!safeUrl) return false;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const targetWindow = window.open(safeUrl, '_blank', 'noopener,noreferrer');
      if (targetWindow) {
        targetWindow.opener = null;
      }
      return true;
    }
    return await Linking.openURL(safeUrl).then(() => true).catch(() => false);
  } catch {
    return false;
  }
};
