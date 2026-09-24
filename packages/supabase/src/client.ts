import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://iojgqicgeztqwkbetboa.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

/**
 * Creates a typed Supabase client with anon key
 */
export function createAnonClient(url = SUPABASE_URL, key = SUPABASE_ANON_KEY): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Creates a typed Supabase client with user JWT
 */
export function createAuthClient(accessToken: string, url = SUPABASE_URL, key = SUPABASE_ANON_KEY): SupabaseClient {
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Creates an admin Supabase client (SERVER-ONLY)
 */
export function createAdminClient(serviceRoleKey: string, url = SUPABASE_URL): SupabaseClient {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
