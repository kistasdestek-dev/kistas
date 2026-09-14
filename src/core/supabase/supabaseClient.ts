import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SecureStorageAdapter } from '../security/SecureStorage';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iojgqicgeztqwkbetboa.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

/**
 * SecOps Standard: Hardened Mobile & Web Supabase Client
 * - Web'de OAuth callback'lerini algılamak için detectSessionInUrl etkindir.
 * - Session tokenları donanım düzeyinde şifreli depolamada saklanır.
 * - AutoRefreshToken etkindir.
 * - İstemciye asla servis anahtarı (admin key) verilmez.
 */
export const supabase = createClient(SUPABASE_URL, supabaseAnonKey, {
  auth: {
    storage: SecureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
