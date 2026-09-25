'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  RotateCw,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();
  const canSendAnnouncements = adminAccess.is_owner || adminAccess.permissions?.includes('community');

  // Verileri canlı tazeleme
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data: statsData } = await supabase.rpc('get_admin_dashboard_stats');
      if (statsData) {
        setStats({
          total_listings: Number(statsData.total_listings || 0),
          active_listings: Number(statsData.active_listings || 0),
          sponsored_listings: Number(statsData.sponsored_listings || 0),
          pending_listings: Number(statsData.pending_listings || 0),
          total_votes: Number(statsData.total_votes || 0),
          total_users: Number(statsData.total_users || 0),
          circulating_credits: Number(statsData.circulating_credits || 0),
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

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error('Yönetim verileri tazelenirken hata:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 8'li Metrik Kartları Konfigürasyonu (Fotoğraf ile birebir eşleşme)
  const metricCards = useMemo(() => [
    {
      id: 'moderation' as AdminTab,
      label: 'Onay bekleyen',
      value: stats.pending_listings,
      icon: Clock,
      color: '#936413',
      bgGradient: 'from-[#FFF9EE] to-white',
      accentBg: 'rgba(147,100,19,0.12)',
    },
    {
      id: 'support' as AdminTab,
      label: 'Açık destek',
      value: 5,
      icon: MessageSquare,
      color: '#3269C7',
      bgGradient: 'from-[#EFF7FF] to-white',
      accentBg: 'rgba(50,105,199,0.1)',
    },
    {
      id: 'sponsors' as AdminTab,
      label: 'Aktif Vitrin Desteği',
      value: stats.sponsored_listings,
      icon: Eye,
      color: '#3269C7',
      bgGradient: 'from-[#EFF5FF] to-white',
      accentBg: 'rgba(50,105,199,0.12)',
    },
    {
      id: 'listings' as AdminTab,
      label: 'Toplam proje',
      value: stats.total_listings,
      icon: LayoutGrid,
      color: '#3269C7',
      bgGradient: 'from-[#EFF7FF] to-white',
      accentBg: 'rgba(50,105,199,0.1)',
    },
    {
      id: 'users' as AdminTab,
      label: 'Topluluk',
      value: stats.total_users,
      icon: Users,
      color: '#187657',
      bgGradient: 'from-[#EFFAF6] to-white',
      accentBg: 'rgba(24,118,87,0.1)',
    },
    {
      id: 'blog' as AdminTab,
      label: 'Blog yazıları',
      value: 3,
      icon: FileText,
      color: '#3269C7',
      bgGradient: 'from-[#F6F1FF] to-white',
      accentBg: 'rgba(50,105,199,0.1)',
    },
    {
      id: 'analytics' as AdminTab,
      label: 'Toplam etkileşim',
      value: stats.total_votes,
      icon: TrendingUp,
      color: '#5c576b',
      bgGradient: 'from-[#F4F5F8] to-white',
      accentBg: 'rgba(92,87,107,0.1)',
    },
    {
      id: 'threat_intel' as AdminTab,
      label: 'Siber Tehdit Radarı',
      value: 1,
      icon: ShieldAlert,
      color: '#BD354C',
      bgGradient: 'from-[#FFF2F4] to-white',
      accentBg: 'rgba(189,53,76,0.12)',
    },
    ...(canSendAnnouncements ? [{
      id: 'announcements' as AdminTab,
      label: 'Topluluk duyurusu',
      value: 'Yayınla',
      icon: Megaphone,
      color: '#3269C7',
      bgGradient: 'from-[#EFF7FF] to-white',
      accentBg: 'rgba(50,105,199,0.12)',
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
    <div className="min-h-screen bg-[#F5F8FC] text-[#25364E] pb-24 font-sans antialiased">
      {/* Üst Bar (Header) - Kıstas Tasarım Sistemi */}
      <header className="sticky top-0 z-40 bg-[#F5F8FC]/90 backdrop-blur-md border-b border-[#CBD9EC]/40">
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
                <KistasLogo size={28} showWordmark={false} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#25364E] tracking-tight">
                Yönetim Merkezi
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlassIconButton
              icon={RotateCw}
              size={42}
              iconSize={19}
              onClick={handleRefresh}
              disabled={isRefreshing || isPending}
              title="Verileri yenile"
              className={isRefreshing || isPending ? 'animate-spin' : ''}
            />
          </div>
        </div>
      </header>

      {/* Ana Çalışma Alanı */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Operasyon Özeti - Hero Kartı (Kıstas Mavi Degrade) */}
        <div className="relative rounded-[28px] bg-gradient-to-r from-[#173866] via-[#285EA5] to-[#347FC3] p-6 sm:p-8 text-white shadow-[0_12px_32px_rgba(23,56,102,0.18)] overflow-hidden">
          {/* Arka plan dekoratif hafif parlamalar */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-[11px] font-extrabold tracking-widest text-blue-200 uppercase">
                OPERASYON ÖZETİ
              </span>
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

        {/* 8'li Metrik Kartları Izgarası (Fotoğraf ile Birebir 4x2 Dizilim) */}
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
                className={`relative text-left p-4 sm:p-5 rounded-[24px] bg-gradient-to-b ${card.bgGradient} transition-all duration-200 cursor-pointer group border ${
                  isSelected
                    ? 'border-[#3269C7] border-t-[3px] border-t-[#3269C7] shadow-[0_10px_24px_rgba(50,105,199,0.16)] -translate-y-0.5'
                    : 'border-white/90 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)] hover:shadow-[-2px_-2px_8px_rgba(255,255,255,0.8),2px_4px_12px_rgba(130,146,168,0.16)] hover:-translate-y-0.5'
                }`}
              >
                {/* Sol Üst İkon Tablası */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    style={{ backgroundColor: card.accentBg }}
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-xs"
                  >
                    <Icon size={18} color={card.color} />
                  </div>
                </div>

                {/* Büyük Kalın Değer */}
                <div className="text-2xl sm:text-3xl font-black text-[#25364E] tracking-tight">
                  {card.value}
                </div>

                {/* Alt Başlık & Yön Oku */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-[#64748B]">
                    {card.label}
                  </span>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#1746A2] text-white shadow-xs'
                        : 'bg-[#F0F4FA] text-[#69758A] group-hover:bg-[#E3EFFF] group-hover:text-[#3269C7]'
                    }`}
                  >
                    <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Arama Çubuğu (Kıstas Neumorphic İç Bükey Arama Alanı) */}
        {activeTab !== 'analytics' && activeTab !== 'threat_intel' && activeTab !== 'announcements' && (
          <div className="rounded-2xl border border-white/90 bg-[#EAF0F7]/80 px-4 py-3 shadow-[inset_2px_2px_4px_rgba(130,146,168,0.14)] flex items-center gap-3">
            <Search size={16} className="text-[#64748B] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'users'
                  ? 'İsim veya e-posta ara...'
                  : activeTab === 'blog'
                  ? 'Blog yazısı veya kategori ara...'
                  : 'Proje veya geliştirici ara'
              }
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#25364E] placeholder:text-[#64748B] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#64748B] hover:text-[#25364E]"
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
            <AdminAnnouncementsView />
          )}

          {/* 8. Toplam Etkileşim / Analitik */}
          {activeTab === 'analytics' && (
            <div className="rounded-[24px] border border-white/90 bg-white p-8 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-[#5c576b] flex items-center justify-center mx-auto shadow-xs">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-base font-bold text-[#25364E]">
                Platform Etkileşim & Destek İstatistikleri
              </h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Toplam {stats.total_votes} destek oyu ve {stats.circulating_credits} dolaşımdaki kredi verisiyle platform büyümesini izleyin.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
