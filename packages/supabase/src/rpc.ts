import { SupabaseClient } from '@supabase/supabase-js';

export interface AdminAccessResponse {
  is_admin: boolean;
  email?: string | null;
}

export interface BoostResult {
  success: boolean;
  message: string;
  boosted_until?: string | null;
}

export interface OrderResult {
  success: boolean;
  order_id?: string;
  error?: string;
}

/**
 * Checks if the caller has admin privileges server-side via email/role
 */
export async function getCurrentAdminAccess(client: SupabaseClient): Promise<AdminAccessResponse> {
  const { data, error } = await client.rpc('get_current_admin_access');
  if (error) {
    return { is_admin: false };
  }
  return data as AdminAccessResponse;
}

/**
 * Executes atomic listing boost with boost_credits
 */
export async function boostListingRpc(
  client: SupabaseClient,
  listingId: string,
  credits: number,
  requestId: string
): Promise<BoostResult> {
  const { data, error } = await client.rpc('boost_listing', {
    p_listing_id: listingId,
    p_credits: credits,
    p_request_id: requestId,
  });

  if (error) {
    return { success: false, message: error.message };
  }
  return data as BoostResult;
}

/**
 * Creates an atomic order with double-entry idempotency
 */
export async function createOrderRpc(
  client: SupabaseClient,
  sellerId: string,
  listingId: string,
  amount: number,
  requestId: string
): Promise<OrderResult> {
  const { data, error } = await client.rpc('create_order', {
    p_seller_id: sellerId,
    p_listing_id: listingId,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as OrderResult;
}
