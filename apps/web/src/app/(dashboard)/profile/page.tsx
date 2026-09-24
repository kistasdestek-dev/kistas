import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getOwnProfile } from '@kistas/supabase';
import { ProfileExperienceClient } from '@/components/ProfileExperienceClient';
import type { Listing } from '@kistas/shared';

export const metadata: Metadata = {
  title: 'Profilim — Kıstas',
  description: 'Kıstas profilinizi, projelerinizi ve cüzdan bakiyenizi yönetin.',
};

export default async function ProfilePage() {
  const { user, supabase } = await requireUser();
  const [
    profile,
    adminCheck,
    listingsRes,
    notificationsRes,
    upvotesCountRes,
    creditTransactionsRes,
  ] = await Promise.all([
    getOwnProfile(supabase, user.id),
    supabase.rpc('is_platform_admin'),
    supabase
      .from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('project_upvotes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const isAdmin =
    user.email === 'kistasdestek@gmail.com' ||
    user.email === 'visionprefabrik@gmail.com' ||
    Boolean(adminCheck.data);

  const userListings: Listing[] = (listingsRes.data as Listing[]) || [];
  const initialNotifications = (notificationsRes.data as any[]) || [];
  const supportedCount = upvotesCountRes.count || 0;
  const initialCreditTransactions = (creditTransactionsRes.data as any[]) || [];

  return (
    <ProfileExperienceClient
      user={{ id: user.id, email: user.email }}
      profile={profile}
      isAdmin={isAdmin}
      initialListings={userListings}
      initialNotifications={initialNotifications}
      initialSupportedCount={supportedCount}
      initialCreditTransactions={initialCreditTransactions}
    />
  );
}
