import type { Metadata } from 'next';
import { getOwnProfile } from '@kistas/supabase';
import { requireUser } from '@/lib/auth';
import { CreditStoreExperienceClient } from '@/components/credits/CreditStoreExperienceClient';

export const metadata: Metadata = {
  title: 'Kredi Mağazası — Kıstas',
  description: 'Kıstas Vitrin Kredisi paketlerini inceleyin ve görünürlüğünüzü planlayın.',
};

export default async function CreditsPage() {
  const { user, supabase } = await requireUser();
  const profile = await getOwnProfile(supabase, user.id);

  return (
    <CreditStoreExperienceClient
      userId={user.id}
      accountEmail={user.email_confirmed_at ? user.email || '' : ''}
      initialBalance={Number(profile?.boost_credits || 0)}
    />
  );
}
