import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import {
  AdminDashboardClient,
  type AdminDashboardStats,
  type AdminAccessInfo,
} from '@/components/admin/AdminDashboardClient';
import type { AdminUserItem } from '@/components/admin/AdminUsersView';
import type { Listing } from '@kistas/shared';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Yönetim Merkezi | Kıstas',
  description: 'Kıstas ekosistemi yönetim, moderasyon ve Pars siber savunma konsolu.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  // 1. Zero-Trust Sunucu Tarafı Güvenlik ve Admin Yetki Kontrolü
  const { user, supabase, adminAccess } = await requireAdmin();

  const typedAdminAccess = adminAccess as {
    is_admin?: boolean;
    is_owner?: boolean;
    email?: string;
    admin_tier?: string;
    permissions?: string[];
  };

  const adminAccessInfo: AdminAccessInfo = {
    is_admin: Boolean(typedAdminAccess?.is_admin),
    is_owner: Boolean(typedAdminAccess?.is_owner),
    email: user.email || typedAdminAccess?.email,
    admin_tier: typedAdminAccess?.admin_tier || 'admin',
    permissions: typedAdminAccess?.permissions || [],
  };

  // 2. Paralel Veri Çekimi (İstatistikler, Projeler, Kullanıcılar)
  const [statsRes, listingsRes, usersRes] = await Promise.all([
    supabase.rpc('get_admin_dashboard_stats'),
    supabase.from('listings').select('*').order('created_at', { ascending: false }),
    supabase.rpc('get_admin_users'),
  ]);

  // 3. İstatistikleri güvenli normalize et
  const rawStats = statsRes.data || {};
  const stats: AdminDashboardStats = {
    total_listings: Number(rawStats.total_projects ?? rawStats.total_listings ?? 0),
    active_listings: Number(rawStats.active_projects ?? rawStats.active_listings ?? 0),
    sponsored_listings: Number(rawStats.sponsored_projects ?? rawStats.sponsored_listings ?? 0),
    pending_listings: Number(rawStats.pending_projects ?? rawStats.pending_listings ?? 0),
    total_votes: Number(rawStats.total_upvotes ?? rawStats.total_votes ?? 0),
    total_comments: Number(rawStats.total_comments ?? 0),
    total_views: Number(rawStats.total_project_views ?? 0),
    total_interactions: Number(rawStats.total_interactions ?? rawStats.total_upvotes ?? 0),
    total_users: Number(rawStats.total_users ?? 0),
    circulating_credits: Number(rawStats.circulating_credits ?? 0),
  };

  // 4. Projeleri normalize et
  const listings = (listingsRes.data as Listing[]) || [];

  // 5. Kullanıcıları normalize et
  const rawUsers = (usersRes.data as any[]) || [];
  const users: AdminUserItem[] = rawUsers.map((u: any) => ({
    id: u.user_id || u.id,
    fullName: u.full_name || u.fullName || 'İsimsiz Üye',
    email: u.email,
    role: u.user_role || u.role || 'user',
    adminPermissions: u.admin_permissions || [],
    isAdminOwner: Boolean(u.is_admin_owner),
    boostCredits: Number(u.boost_credits || 0),
    balance: Number(u.available_balance ?? u.balance ?? 0),
    isVerified: Boolean(u.is_verified),
    projectsCount: Number(u.projects_count || 0),
    commentMutedUntil: u.comment_muted_until || null,
    createdAt: u.created_at || new Date().toISOString(),
  }));

  return (
    <AdminDashboardClient
      initialStats={stats}
      initialListings={listings}
      initialUsers={users}
      adminAccess={adminAccessInfo}
    />
  );
}
