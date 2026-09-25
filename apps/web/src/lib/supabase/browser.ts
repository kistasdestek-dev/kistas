import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Returns a cached browser Supabase client singleton.
 * Prevents multiple instances, duplicate auth state listeners,
 * and concurrent WebSocket socket connection proliferation.
 */
export function createClient() {
  if (client) {
    return client;
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iojgqicgeztqwkbetboa.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC'
  );

  return client;
}
