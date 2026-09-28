import { requireUser } from '@/lib/auth';
import { LaunchArchiveClient } from '@/components/LaunchArchiveClient';
export const metadata = { title: 'Lansman Arşivim | Kıstas', robots: { index: false, follow: false } };
export default async function LaunchArchivePage() {
  const { user } = await requireUser();
  return <LaunchArchiveClient userId={user.id} />;
}
