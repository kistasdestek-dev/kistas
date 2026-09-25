'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Clock,
  MessageSquare,
  Eye,
  LayoutGrid,
  Users,
  FileText,
  TrendingUp,
  ShieldAlert,
  Search,
  X,
  ArrowRight,
  Megaphone,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { KistasLogo } from '../KistasLogo';
import { AdminModerationView } from './AdminModerationView';
import { AdminListingsView } from './AdminListingsView';
import { AdminSponsorsView } from './AdminSponsorsView';
import { AdminUsersView, type AdminUserItem } from './AdminUsersView';
import { AdminThreatIntelView } from './AdminThreatIntelView';
import { AdminBlogView } from './AdminBlogView';
import { AdminSupportView } from './AdminSupportView';
import { AdminAnnouncementsView } from './AdminAnnouncementsView';
import { createClient } from '@/lib/supabase/browser';
import type { Listing } from '@kistas/shared';

export interface AdminDashboardStats {
  total_listings: number;
  active_listings: number;
  sponsored_listings: number;
  pending_listings: number;
  total_votes: number;
  total_users: number;
  circulating_credits: number;
}

export interface AdminAccessInfo {
  is_admin: boolean;
  is_owner: boolean;
  email?: string;
  admin_tier?: string;
  permissions?: string[];
}

interface AdminDashboardClientProps {
  initialStats: AdminDashboardStats;
  initialListings: Listing[];
  initialUsers: AdminUserItem[];
  adminAccess: AdminAccessInfo;
}

export type AdminTab =
  | 'moderation'
  | 'support'
  | 'sponsors'
  | 'listings'
  | 'users'
  | 'blog'
  | 'announcements'
  | 'analytics'
  | 'threat_intel';

export const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
  initialStats,
  initialListings,
  initialUsers,
  adminAccess,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('sponsors');
  const [stats, setStats] = useState<AdminDashboardStats>(initialStats);
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();
  const canSendAnnouncements = adminAccess.is_owner || adminAccess.permissions?.includes('community');

  // Verileri canlı tazeleme
  const handleRefresh = async () => {
    try {
      const { data: statsData } = await supabase.rpc('get_admin_dashboard_stats');
      if (statsData) {
        setStats({
          total_listings: Number(statsData.total_projects ?? statsData.total_listings ?? 0),
          active_listings: Number(statsData.active_projects ?? statsData.active_listings ?? 0),
          sponsored_listings: Number(statsData.sponsored_projects ?? statsData.sponsored_listings ?? 0),
          pending_listings: Number(statsData.pending_projects ?? statsData.pending_listings ?? 0),
          total_votes: Number(statsData.total_upvotes ?? statsData.total_votes ?? 0),
          total_users: Number(statsData.total_users ?? 0),
          circulating_credits: Number(statsData.circulating_credits ?? 0),
        });
      }

      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (listingsData) {
        setListings(listingsData as Listing[]);
      }

      const { data: usersData } = await supabase.rpc('get_admin_users');
      if (usersData && Array.isArray(usersData)) {
        const mappedUsers: AdminUserItem[] = usersData.map((u: any) => ({
          id: u.id,
          fullName: u.full_name || u.fullName || 'İsimsiz Üye',
          email: u.email,
          role: u.role || 'user',
          adminPermissions: u.admin_permissions || [],
          isAdminOwner: Boolean(u.is_admin_owner),
          boostCredits: Number(u.boost_credits || 0),
          balance: Number(u.balance || 0),
          isVerified: Boolean(u.is_verified),
          projectsCount: Number(u.projects_count || 0),
          commentMutedUntil: u.comment_muted_until || null,
          createdAt: u.created_at || new Date().toISOString(),
        }));
        setUsers(mappedUsers);
      }

      router.refresh();
    } catch (err) {
      console.error('Yönetim verileri tazelenirken hata:', err);
    }
  };

  // 8'li Metrik Kartları Konfigürasyonu (Kıstas Siber-Obsidyen Cam Sistemi)
  const metricCards = useMemo(() => [
    {
      id: 'moderation' as AdminTab,
      label: 'Onay bekleyen',
      value: stats.pending_listings,
      icon: Clock,
      color: '#FBBF24',
      accentBg: 'rgba(251,191,36,0.15)',
    },
    {
      id: 'support' as AdminTab,
      label: 'Açık destek',
      value: 5,
      icon: MessageSquare,
      color: '#60A5FA',
      accentBg: 'rgba(96,165,250,0.15)',
    },
    {
      id: 'sponsors' as AdminTab,
      label: 'Aktif Vitrin Desteği',
      value: stats.sponsored_listings,
      icon: Eye,
      color: '#38BDF8',
      accentBg: 'rgba(56,189,248,0.15)',
    },
    {
      id: 'listings' as AdminTab,
      label: 'Toplam proje',
      value: stats.total_listings,
      icon: LayoutGrid,
      color: '#60A5FA',
      accentBg: 'rgba(96,165,250,0.15)',
    },
    {
      id: 'users' as AdminTab,
      label: 'Topluluk',
      value: stats.total_users,
      icon: Users,
      color: '#34D399',
      accentBg: 'rgba(52,211,153,0.15)',
    },
    {
      id: 'blog' as AdminTab,
      label: 'Blog yazıları',
      value: 3,
      icon: FileText,
      color: '#A78BFA',
      accentBg: 'rgba(167,139,250,0.15)',
    },
    {
      id: 'analytics' as AdminTab,
      label: 'Toplam etkileşim',
      value: stats.total_votes,
      icon: TrendingUp,
      color: '#CBD5E1',
      accentBg: 'rgba(203,213,225,0.15)',
    },
    {
      id: 'threat_intel' as AdminTab,
      label: 'Siber Tehdit Radarı',
      value: 1,
      icon: ShieldAlert,
      color: '#F43F5E',
      accentBg: 'rgba(244,63,94,0.15)',
    },
    ...(canSendAnnouncements ? [{
      id: 'announcements' as AdminTab,
      label: 'Topluluk duyurusu',
      value: 'Yayınla',
      icon: Megaphone,
      color: '#60A5FA',
      accentBg: 'rgba(96,165,250,0.15)',
    }] : []),
  ], [canSendAnnouncements, stats]);

  // Arama filtresi
  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const q = searchQuery.toLowerCase();
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.tagline && l.tagline.toLowerCase().includes(q))
    );
  }, [listings, searchQuery]);

  return (
    <div className="min-h-screen text-white pb-24 font-sans antialiased">
      {/* Üst Bar (Header) - Kıstas Tasarım Sistemi */}
      <header className="sticky top-0 z-40 bg-[#080C14]/75 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GlassIconButton
              icon={ChevronLeft}
              size={42}
              iconSize={20}
              onClick={() => router.back()}
              title="Geri dön"
            />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center">
                <KistasLogo size={28} showWordmark={false} glow />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Yönetim Merkezi
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Ana Çalışma Alanı */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Operasyon Özeti - Hero Kartı (Kıstas İmzalı Mavi Geçişli Cam Kart) */}
        <div className="relative rounded-[28px] border border-white/15 bg-gradient-to-r from-[#1746A2] via-[#1E3A8A] to-[#0E1E44] p-6 sm:p-8 text-white shadow-[0_20px_50px_rgba(23,70,162,0.25)] overflow-hidden">
          {/* Arka plan dekoratif neon parlamalar */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Genel bakış
              </h2>
              <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed">
                Platformun yayın, topluluk ve destek akışını tek merkezden yönetin.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-white/60">
                  8 yönetim alanı
                </span>
              </div>
            </div>

            {/* Sağ Üst Yetki Rozeti */}
            <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {adminAccess.is_owner
                  ? 'Süper Yönetici'
                  : adminAccess.is_admin
                  ? 'Ekip Yetkilisi'
                  : 'Yetkili'}
              </span>
            </div>
          </div>
        </div>

        {/* 8'li Metrik Kartları Izgarası (Kıstas Sıvı Cam Dizilim) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            const isSelected = activeTab === card.id;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setActiveTab(card.id);
                  setSearchQuery('');
                }}
                className={`relative text-left p-4 sm:p-5 rounded-[24px] backdrop-blur-xl transition-all duration-200 cursor-pointer group border ${
                  isSelected
                    ? 'border-[#3269C7] border-t-2 border-t-[#4882E7] bg-[#1746A2]/25 shadow-[0_0_30px_rgba(50,105,199,0.35)] -translate-y-0.5'
                    : 'border-white/10 bg-[#0E1626]/75 hover:border-white/20 hover:bg-[#131F36]/90 hover:-translate-y-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'
                }`}
              >
                {/* Sol Üst İkon Tablası */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    style={{ backgroundColor: card.accentBg }}
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 shadow-xs"
                  >
                    <Icon size={18} color={card.color} />
                  </div>
                </div>

                {/* Büyük Kalın Değer */}
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {card.value}
                </div>

                {/* Alt Başlık & Yön Oku */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-[#94A3B8]">
                    {card.label}
                  </span>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#3269C7] text-white shadow-xs'
                        : 'bg-white/[0.06] text-slate-400 group-hover:bg-white/15 group-hover:text-white'
                    }`}
                  >
                    <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Arama Çubuğu (Kıstas Cam Arama Alanı) */}
        {activeTab !== 'analytics' && activeTab !== 'threat_intel' && activeTab !== 'announcements' && (
          <div className="rounded-2xl border border-white/10 bg-[#0E1626]/70 px-4 py-3 backdrop-blur-xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] flex items-center gap-3">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'users'
                  ? 'İsim veya e-posta ara...'
                  : activeTab === 'blog'
                  ? 'Blog yazısı veya kategori ara...'
                  : 'Proje veya geliştirici ara...'
              }
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* Seçili Yönetim Sekmesi İçeriği */}
        <div className="pt-2">
          {/* 1. Vitrin Desteği Sekmesi (Fotoğraftaki aktif sekme) */}
          {activeTab === 'sponsors' && (
            <AdminSponsorsView
              listings={filteredListings}
              onRefresh={handleRefresh}
            />
          )}

          {/* 2. Lansman Moderasyonu Sekmesi */}
          {activeTab === 'moderation' && (
            <AdminModerationView
              listings={filteredListings}
              onRefresh={handleRefresh}
            />
          )}

          {/* 3. Tüm Projeler Sekmesi */}
          {activeTab === 'listings' && (
            <AdminListingsView
              listings={filteredListings}
              onRefresh={handleRefresh}
            />
          )}

          {/* 4. Topluluk / Kullanıcılar Sekmesi */}
          {activeTab === 'users' && (
            <AdminUsersView
              users={users}
              onRefresh={handleRefresh}
            />
          )}

          {/* 5. Pars DevState Siber Tehdit Radarı */}
          {activeTab === 'threat_intel' && (
            <AdminThreatIntelView />
          )}

          {/* 6. Açık Destek / Görüşmeler */}
          {activeTab === 'support' && (
            <AdminSupportView
              onRefresh={handleRefresh}
              searchQuery={searchQuery}
            />
          )}

          {/* 7. Blog Yazıları */}
          {activeTab === 'blog' && (
            <AdminBlogView
              onRefresh={handleRefresh}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'announcements' && canSendAnnouncements && (
            <AdminAnnouncementsView projects={listings} />
          )}

          {/* 8. Toplam Etkileşim / Analitik */}
          {activeTab === 'analytics' && (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#3269C7]/20 border border-[#3269C7]/30 text-[#8DB9FF] flex items-center justify-center mx-auto shadow-xs">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-base font-bold text-white">
                Platform Etkileşim & Destek İstatistikleri
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                Toplam {stats.total_votes} destek oyu ve {stats.circulating_credits} dolaşımdaki kredi verisiyle platform büyümesini izleyin.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
