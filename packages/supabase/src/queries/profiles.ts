import { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@kistas/shared';

/**
 * Get user's own full profile with balances (requires auth JWT matching userId)
 */
export async function getOwnProfile(client: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Profile;
}
