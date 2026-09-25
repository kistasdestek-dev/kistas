import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const SUPABASE_URL = 'https://iojgqicgeztqwkbetboa.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Creates a strongly-typed Supabase client with anon key
 */
export function createAnonClient(url = SUPABASE_URL, key = SUPABASE_ANON_KEY): TypedSupabaseClient {
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Creates a strongly-typed Supabase client with user JWT
 */
export function createAuthClient(accessToken: string, url = SUPABASE_URL, key = SUPABASE_ANON_KEY): TypedSupabaseClient {
  return createClient<Database>(url, key, {
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
 * Creates a strongly-typed admin Supabase client (SERVER-ONLY)
 */
export function createAdminClient(serviceRoleKey: string, url = SUPABASE_URL): TypedSupabaseClient {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
