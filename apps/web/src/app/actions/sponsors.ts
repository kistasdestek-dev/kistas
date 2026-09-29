'use server';

import { createClient } from '@/lib/supabase/server';
import { getVisibilityErrorMessage, VISIBILITY_PACKAGES } from '@/lib/visibility';

export async function purchaseSponsorAction(listingId: string, packageId: string) {
  if (typeof listingId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId)) {
    return { success: false as const, error: 'Geçersiz proje kimliği.' };
  }
  const selected = [...VISIBILITY_PACKAGES.global, ...VISIBILITY_PACKAGES.category].find((item) => item.id === packageId);
  if (!selected) return { success: false as const, error: getVisibilityErrorMessage('INVALID_BOOST_PACKAGE') };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false as const, error: getVisibilityErrorMessage('UNAUTHORIZED') };
  const { data, error } = await supabase.rpc('boost_listing_scoped', {
    p_listing_id: listingId, p_scope: selected.scope,
    p_duration_hours: selected.durationHours, p_credit_cost: selected.creditCost,
  });
  if (error || !data?.success) return { success: false as const, error: getVisibilityErrorMessage(error?.message) };
  // No re-render/cache operation after committing credit spend: refresh cannot turn success into failure.
  return { success: true as const, newCredits: Number(data.new_credits), expiresAt: String(data.boosted_until), scope: selected.scope };
}
