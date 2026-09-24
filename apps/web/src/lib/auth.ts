import { createClient } from './supabase/server';
import { redirect } from 'next/navigation';

/**
 * Ensures the caller is authenticated on the server side via getUser()
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return { user, supabase };
}

/**
 * Ensures the caller is an authenticated admin on the server side via RPC check
 */
export async function requireAdmin() {
  const { user, supabase } = await requireUser();

  const { data: adminAccess, error } = await supabase.rpc('get_current_admin_access');

  if (error || !adminAccess || !(adminAccess as { is_admin?: boolean }).is_admin) {
    redirect('/');
  }

  return { user, supabase, adminAccess };
}
