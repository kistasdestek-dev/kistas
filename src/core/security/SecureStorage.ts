import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * SecOps Standard: Hardware-Backed Secure Storage Adapter
 * iOS Keychain ve Android Keystore kullanarak Auth JWT ve hassas tokenları saklar.
 * Standart AsyncStorage yerine Supabase Auth client'ına enjekte edilir.
 */
export const SecureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        // Web sürümü olmayacaktır, ancak test ortamı uyumluluğu için guard
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (error) {
      console.error(`[SecureStore Error] Key reading failed: ${key}`, error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        requireAuthentication: false,
      });
    } catch (error) {
      console.error(`[SecureStore Error] Key writing failed: ${key}`, error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[SecureStore Error] Key deletion failed: ${key}`, error);
    }
  },
};
