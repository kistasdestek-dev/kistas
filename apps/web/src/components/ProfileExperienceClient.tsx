'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Pencil,
  Rocket,
  MessageSquare,
  Headphones,
  Wallet,
  Receipt,
  Plus,
  Shield,
  ShieldCheck,
  LogOut,
  Sparkles,
  Eye,
  Trash2,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { GlassIconButton } from './GlassIconButton';
import { ShinyButton } from './ui/shiny-button';
import { KistasLogo } from './KistasLogo';
import { KistasTopBrandBar } from './KistasTopBrandBar';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { InstagramVerifiedBadge } from './InstagramVerifiedBadge';
import { createClient } from '@/lib/supabase/browser';
import { ChatService } from '@/lib/services/chat';
import { isValidAnnouncementPath } from '@/lib/notifications';
import { resolveAvatarUrl } from '@/lib/avatar';

// Modals
import { ProfileEditModal } from './profile/ProfileEditModal';
import { CreditHistoryModal, CreditTransactionItem } from './profile/CreditHistoryModal';
import { NotificationsModal, NotificationItem } from './profile/NotificationsModal';
import { ProjectDeleteModal } from './profile/ProjectDeleteModal';
import { SignOutConfirmModal } from './profile/SignOutConfirmModal';
import { AccountSecurityModal } from './profile/AccountSecurityModal';
import { VisibilityManagementModal } from './profile/VisibilityManagementModal';

import type { Profile, Listing } from '@kistas/shared';

export interface ProfileExperienceClientProps {
  user?: {
    id: string;
    email?: string | null;
  } | null;
  profile?: Profile | null;
  isAdmin: boolean;
  initialListings?: Listing[];
  initialNotifications?: NotificationItem[];
  initialSupportedCount?: number;
  initialCreditTransactions?: CreditTransactionItem[];
  submissionNotice?: 'created' | 'updated' | null;
}

export const ProfileExperienceClient: React.FC<ProfileExperienceClientProps> = ({
  user,
  profile: initialProfile,
  isAdmin,
  initialListings = [],
  initialNotifications = [],
  initialSupportedCount = 0,
  initialCreditTransactions = [],
  submissionNotice = null,
}) => {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Local State
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [myListings, setMyListings] = useState<Listing[]>(initialListings);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const supportedCount = initialSupportedCount;
  const creditTransactions = initialCreditTransactions;

  // Listing filter tab
  const [listingFilter, setListingFilter] = useState<'all' | 'pending' | 'revision' | 'active' | 'banned'>('all');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreditHistoryOpen, setIsCreditHistoryOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [visibilityListingId, setVisibilityListingId] = useState<string | null>(null);
  const [isStartingSupport, setIsStartingSupport] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const item = (event as CustomEvent<NotificationItem>).detail;
      if (!item?.id) return;
      setNotifications((current) => (
        current.some((notification) => notification.id === item.id)
          ? current
          : [item, ...current]
      ));
    };
    window.addEventListener('kistas:notification-received', handleNotification);
    return () => window.removeEventListener('kistas:notification-received', handleNotification);
  }, []);

  // Computed values
  const isGuest = !user;
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Kıstas Üyesi';
  const boostCredits = profile?.boost_credits ?? 0;
  const isVerified = Boolean(profile?.is_verified) || isAdmin;
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const isItemPending = (s: string) => s === 'pending_review' || s === 'draft';
  const isItemRevision = (s: string) => s === 'rejected' || s === 'inactive';
  const isItemActive = (s: string) => s === 'approved' || s === 'active';
  const isItemBanned = (s: string) => s === 'suspended' || s === 'banned';

  const pendingCount = useMemo(() => myListings.filter((i) => isItemPending(i.status as string)).length, [myListings]);
  const revisionCount = useMemo(() => myListings.filter((i) => isItemRevision(i.status as string)).length, [myListings]);
  const activeCount = useMemo(() => myListings.filter((i) => isItemActive(i.status as string)).length, [myListings]);
  const bannedCount = useMemo(() => myListings.filter((i) => isItemBanned(i.status as string)).length, [myListings]);

  const totalUpvotesReceived = useMemo(() => {
    return myListings.reduce((sum, item) => sum + (Number((item as any).upvotes_count || item.upvote_count || 0)), 0);
  }, [myListings]);

  const filteredListings = useMemo(() => {
    return myListings.filter((item) => {
      if (listingFilter === 'pending') return isItemPending(item.status as string);
      if (listingFilter === 'revision') return isItemRevision(item.status as string);
      if (listingFilter === 'active') return isItemActive(item.status as string);
      if (listingFilter === 'banned') return isItemBanned(item.status as string);
      return true;
    });
  }, [myListings, listingFilter]);

  const handleOpenSupport = async () => {
    if (isStartingSupport) return;

    setIsStartingSupport(true);
    setSupportError(null);
    try {
      const result = await ChatService.getOrCreateSupportConversation(supabase);
      if (!result.success || !result.conversationId) {
        setSupportError(result.error || 'Destek görüşmesi açılamadı. Lütfen tekrar deneyin.');
        return;
      }

      router.push(`/messages?conversationId=${encodeURIComponent(result.conversationId)}`);
    } finally {
      setIsStartingSupport(false);
    }
  };

  // Sign out handler
  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setIsSigningOut(false);
      setIsSignOutModalOpen(false);
    }
  };

  // Delete project handler
  const handleConfirmDeleteProject = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id);
      if (!error) {
        setMyListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Notification actions
  const handleMarkAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDeleteAllNotifications = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const handleDeleteSingleNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // -------------------------------------------------------------
  // GUEST STATE
  // -------------------------------------------------------------
  if (isGuest) {
    return (
      <div className="min-h-screen bg-transparent text-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
        <KistasTopBrandBar className="w-full max-w-lg mb-6" />
        <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl text-center">
          <KistasLogo size={58} showWordmark={false} className="mx-auto mb-4" />
          <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
            KISTAS MEMBER
          </p>
          <h2 className="mt-1 text-2xl font-black text-white tracking-tight">
            Üreticiler için özel alan.
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#94A3B8] max-w-sm mx-auto">
            Projelerinizi yayınlayın, vitrinde öne çıkarın ve dijital ekosistemle doğrudan bağlantı kurun.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-98 transition-all"
          >
            <span>Giriş Yap veya Kayıt Ol</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED USER STATE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] selection:bg-blue-500/20 pb-36">
      <main className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Brand Bar */}
        <KistasTopBrandBar className="mb-4" />

        {/* Page Header */}
        <div className="flex items-center justify-between min-h-[62px] mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Profil
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <GlassIconButton
              icon={Bell}
              size={42}
              iconSize={18}
              active={unreadNotificationsCount > 0}
              badge={unreadNotificationsCount > 0 ? (unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount) : undefined}
              onClick={() => setIsNotificationsModalOpen(true)}
              ariaLabel="Bildirimler"
            />
            <GlassIconButton
              icon={Pencil}
              size={42}
              iconSize={18}
              onClick={() => setIsEditModalOpen(true)}
              ariaLabel="Profili düzenle"
            />
          </div>
        </div>

        {submissionNotice && (
          <div role="status" className="mb-6 rounded-[22px] border border-[#E4FD97]/25 bg-[linear-gradient(145deg,rgba(228,253,151,.12),rgba(9,19,38,.82))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_10px_30px_rgba(228,253,151,.08)] backdrop-blur-xl">
            <p className="text-xs font-black text-[#E4FD97]">
              {submissionNotice === 'created' ? 'Projen onaya gönderildi.' : 'Değişikliklerin onaya gönderildi.'}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">Yönetici incelemesi tamamlandığında durum burada ve bildirimlerinde güncellenecek.</p>
          </div>
        )}

        <Link href="/launch-archive" className="mb-6 block rounded-2xl border border-blue-400/20 bg-white/5 px-4 py-3 text-sm font-semibold text-blue-300">Lansman Arşivim · Yarım kalan lansmanlara devam et</Link>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-7">
          {/* ========================================================= */}
          {/* LEFT MAIN COLUMN */}
          {/* ========================================================= */}
          <div className="w-full flex-1 min-w-0 space-y-7">
            {/* 1. Identity Card */}
            <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 shadow-xl flex flex-col justify-between gap-5">
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img
                    src={resolveAvatarUrl(profile.avatar_url)}
                    alt={fullName}
                    className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <KistasLogo size={58} showWordmark={false} className="shrink-0" />
                )}

                {/* Identity Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                      {fullName}
                    </h2>
                    {isVerified && (
                      <InstagramVerifiedBadge size={19} title="Doğrulanmış Hesap" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-[#94A3B8]">
                    {isAdmin ? 'Kıstas yönetim ekibi' : 'Kıstas topluluğu'}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {profile?.bio && (
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-[610px]">
                  {profile.bio}
                </p>
              )}

              {/* Stats Bar (Glass Inset) */}
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 flex items-center divide-x divide-white/10">
                <div className="flex-1 text-center px-1">
                  <p className="text-xl font-bold text-white tracking-tight">
                    {myListings.length}
                  </p>
                  <p className="text-[10px] font-medium text-[#94A3B8] mt-0.5">
                    Lansmanlar
                  </p>
                </div>
                <div className="flex-1 text-center px-1">
                  <p className="text-xl font-bold text-white tracking-tight">
                    {totalUpvotesReceived.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-[10px] font-medium text-[#94A3B8] mt-0.5">
                    Alınan destek
                  </p>
                </div>
                <div className="flex-1 text-center px-1">
                  <p className="text-xl font-bold text-white tracking-tight">
                    {supportedCount.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-[10px] font-medium text-[#94A3B8] mt-0.5">
                    Destekledikleri
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Kıstas Cüzdan Kartı */}
            <div className="rounded-[28px] border border-blue-500/25 bg-gradient-to-br from-[#0E182A] to-[#0A101D] p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <GlassIconButton icon={Wallet} size={38} iconSize={18} ariaLabel="Cüzdan" />
                  <p className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
                    KISTAS CÜZDAN
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-[#94A3B8]">
                  Kullanılabilir bakiye
                </span>
              </div>

              {/* Credit Value */}
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  {boostCredits.toLocaleString('tr-TR')}
                </span>
                <span className="text-xs font-bold text-[#94A3B8]">kredi</span>
              </div>

              {/* Wallet Action Buttons */}
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreditHistoryOpen(true)}
                  className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10 active:scale-98 transition-all cursor-pointer"
                >
                  <Receipt size={15} className="text-blue-400" />
                  <span>Hareketler</span>
                </button>

                <ShinyButton href="/credits" className="shiny-cta--citrus flex-1 !h-11 !rounded-xl !px-4 !py-0 !text-xs">
                  <span className="inline-flex items-center justify-center gap-2">
                    <Plus size={15} aria-hidden="true" />
                    Kredi al
                  </span>
                </ShinyButton>
              </div>
            </div>

            {/* 3. Primary Actions Row (3'lü Hızlı Aksiyon) */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/create-listing"
                className="flex-1 min-h-[88px] flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-md text-white shadow-lg hover:border-blue-500/40 hover:bg-white/[0.08] active:scale-98 transition-all"
              >
                <GlassIconButton icon={Rocket} size={36} iconSize={17} />
                <span className="text-[11px] font-bold text-center leading-tight">Yeni lansman</span>
              </Link>

              <Link
                href="/messages"
                className="flex-1 min-h-[88px] flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-md text-white shadow-lg hover:border-blue-500/40 hover:bg-white/[0.08] active:scale-98 transition-all"
              >
                <GlassIconButton icon={MessageSquare} size={36} iconSize={17} />
                <span className="text-[11px] font-bold text-center leading-tight">Mesajlar</span>
              </Link>

              <button
                type="button"
                onClick={() => void handleOpenSupport()}
                disabled={isStartingSupport}
                aria-busy={isStartingSupport}
                className="flex-1 min-h-[88px] flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-md text-white shadow-lg hover:border-blue-500/40 hover:bg-white/[0.08] active:scale-98 transition-all disabled:cursor-wait disabled:opacity-65"
              >
                <GlassIconButton icon={Headphones} size={36} iconSize={17} />
                <span className="text-[11px] font-bold text-center leading-tight">
                  {isStartingSupport ? 'Bağlanıyor…' : 'Destek'}
                </span>
              </button>
            </div>
            {supportError && (
              <p role="alert" className="mt-2 text-center text-xs font-medium text-rose-300">
                {supportError}
              </p>
            )}

            {/* 4. Lansmanlarım Takip Bölümü */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Lansmanlarım
                </h3>
              </div>

              {/* Segmented Filter Bar (Horizontal Scroller) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {([
                  ['all', `Tümü (${myListings.length})`],
                  ['pending', `İncelemede (${pendingCount})`],
                  ['revision', `Düzeltme (${revisionCount})`],
                  ['active', `Yayında (${activeCount})`],
                  ['banned', `Askıda (${bannedCount})`],
                ] as const).map(([key, label]) => {
                  const selected = listingFilter === key;
                  const isPendingTab = key === 'pending' && pendingCount > 0;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setListingFilter(key)}
                      className={`h-9 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selected
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                          : isPendingTab
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/40'
                            : 'bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Listings List */}
              {filteredListings.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 shadow-xl text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                    <Rocket size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {listingFilter === 'pending'
                      ? 'Şu anda onay bekleyen bir projeniz yok.'
                      : listingFilter === 'revision'
                        ? 'Düzeltme bekleyen bir projeniz yok.'
                        : listingFilter === 'active'
                          ? 'Şu anda vitrinde yayında olan bir projeniz yok.'
                          : listingFilter === 'banned'
                            ? 'Askıya alınan herhangi bir projeniz yok.'
                            : 'Henüz sisteme kayıtlı bir lansmanınız yok.'}
                  </h4>
                  <p className="mt-1 text-xs text-[#94A3B8] max-w-sm mx-auto">
                    Yeni projenizi Kıstas vitrinine taşımak için lansman oluşturup yönetici onayına gönderebilirsiniz.
                  </p>
                  <Link
                    href="/create-listing"
                    className="mt-5 inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-98 transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>İlk Lansmanını Yap</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredListings.map((item) => {
                    const isPending = isItemPending(item.status as string);
                    const isRevision = isItemRevision(item.status as string);
                    const isActive = isItemActive(item.status as string);
                    const isBanned = isItemBanned(item.status as string);
                    const reviewSteps = [
                      { label: 'Onaya gönderildi', state: 'complete' as const },
                      {
                        label: isRevision ? 'Düzeltme istendi' : 'Yönetici inceliyor',
                        state: isActive ? 'complete' as const : 'current' as const,
                      },
                      {
                        label: isActive ? 'Onaylandı · Yayında' : 'Onaylandı',
                        state: isActive ? 'complete' as const : 'upcoming' as const,
                      },
                    ];

                    return (
                      <div
                        key={item.id}
                        className="rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 shadow-xl transition-all hover:border-blue-500/30 hover:bg-white/[0.07]"
                      >
                        {/* Header: Logo, Title, Date, Status Pill */}
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                            {item.logo_url ? (
                              <AutoTransparentLogo
                                src={item.logo_url}
                                alt={`${item.title} logosu`}
                                className="h-11 w-11 object-contain drop-shadow-[0_7px_14px_rgba(0,0,0,0.34)]"
                              />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-sm font-black text-blue-400">
                                {item.title.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-[#94A3B8] truncate">
                              {item.tagline || 'Dijital proje'}
                            </p>
                            <p className="text-[10px] text-[#64748B] mt-0.5">
                              {new Intl.DateTimeFormat('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }).format(new Date(item.created_at))}
                            </p>
                          </div>

                          {/* Status Badge Pill */}
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shrink-0 border ${
                              isPending
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : isRevision
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : isBanned
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                      : 'bg-white/5 text-[#94A3B8] border-white/10'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isPending
                                  ? 'bg-amber-400'
                                  : isRevision
                                    ? 'bg-amber-300'
                                    : isActive
                                      ? 'bg-emerald-400'
                                      : isBanned
                                        ? 'bg-rose-400'
                                        : 'bg-slate-500'
                              }`}
                            />
                            <span>
                              {isPending
                                ? 'İncelemede'
                                : isRevision
                                  ? 'Düzeltme İstendi'
                                  : isActive
                                    ? 'Yayında'
                                    : isBanned
                                      ? 'Askıda'
                                      : 'Taslak'}
                            </span>
                          </div>
                        </div>

                        {!isBanned && (
                          <div aria-label="Proje onay süreci" className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/15 p-1.5">
                            {reviewSteps.map((step) => (
                              <div key={step.label} className="flex min-w-0 flex-col items-center gap-1.5 px-1.5 py-2 text-center">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    step.state === 'complete'
                                      ? 'bg-[#E4FD97] shadow-[0_0_10px_rgba(228,253,151,.45)]'
                                      : step.state === 'current'
                                        ? isRevision
                                          ? 'bg-amber-300'
                                          : 'bg-blue-300'
                                        : 'bg-slate-700'
                                  }`}
                                />
                                <span className={`truncate text-[9px] font-bold sm:text-[10px] ${step.state === 'upcoming' ? 'text-slate-500' : 'text-slate-200'}`}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Revision Notice Banner */}
                        {isRevision && (item as any).review_feedback && (
                          <div className="mt-3.5 flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-950/30">
                            <Wrench size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-bold text-amber-300">Yönetici notu</p>
                              <p className="text-[#94A3B8] mt-0.5">{(item as any).review_feedback}</p>
                              <p className="text-[10px] text-amber-400 font-semibold mt-1">
                                Düzenlemeleri tamamlayıp projeyi yeniden incelemeye gönderin.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Project Action Dock */}
                        <div className="mt-4 border-t border-white/10 pt-3.5">
                          <div
                            aria-label="Proje işlemleri"
                            className={`grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.012))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_10px_24px_rgba(0,0,0,.12)] backdrop-blur-2xl ${isActive ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}
                          >
                          <Link
                            href={`/create-listing?edit=${item.id}`}
                            className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-center text-[10px] font-bold text-[#DCE8F8] transition-all duration-200 hover:border-[#78ADFF]/25 hover:bg-[#3269C7]/10 hover:text-white active:scale-[0.98] sm:text-xs"
                          >
                            <Pencil size={14} className="shrink-0 text-[#78ADFF] transition-transform duration-200 group-hover:-rotate-6" />
                            <span>{isRevision ? 'Düzelt ve Gönder' : 'Düzenle'}</span>
                          </Link>

                          {isActive && (
                            <Link
                              href={`/listings/${item.id}`}
                              className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-center text-[10px] font-bold text-slate-300 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] sm:text-xs"
                            >
                              <Eye size={14} className="shrink-0 text-slate-400 transition-colors group-hover:text-slate-200" />
                              <span>Vitrinde Gör</span>
                            </Link>
                          )}

                          {isActive && (
                            <ShinyButton
                              onClick={() => {
                                setVisibilityListingId(item.id);
                                setIsVisibilityModalOpen(true);
                              }}
                              className="shiny-cta--citrus !min-h-11 !rounded-xl !px-3 !py-2 !text-[10px] sm:!text-xs"
                            >
                              <span className="inline-flex items-center justify-center gap-2">
                                <Sparkles size={14} className="shrink-0" />
                                <span>Sponsor Yap</span>
                              </span>
                            </ShinyButton>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/10 bg-rose-400/[0.025] px-3 py-2 text-center text-[10px] font-bold text-[#D99AA9] transition-all duration-200 hover:border-rose-400/20 hover:bg-rose-400/[0.07] hover:text-rose-300 active:scale-[0.98] sm:text-xs"
                          >
                            <Trash2 size={14} className="shrink-0 text-rose-300/90 transition-transform duration-200 group-hover:scale-105" />
                            <span>Sil</span>
                          </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ========================================================= */}
          {/* RIGHT ASIDE COLUMN (370px) */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[370px] shrink-0 space-y-6">
            {/* Hesap ve Araçlar Menüsü */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white ml-1">
                Hesap ve araçlar
              </h4>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] backdrop-blur-md p-2 shadow-xl divide-y divide-white/10">
                {/* Admin Dashboard */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-2xl transition-all"
                  >
                    <GlassIconButton icon={Shield} size={38} iconSize={18} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">Yönetim Merkezi</p>
                      <p className="text-[10px] text-[#94A3B8]">Yönetim panelini aç</p>
                    </div>
                    <ChevronRight size={16} className="text-blue-400" />
                  </Link>
                )}

                {/* Vitrin Yönetimi */}
                <button
                  type="button"
                  onClick={() => setIsVisibilityModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <GlassIconButton icon={Sparkles} iconColor="#F59E0B" size={38} iconSize={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">Vitrin Yönetimi</p>
                    <p className="text-[10px] text-[#94A3B8]">Kıstas Vitrin Kredilerini ve sponsor seçeneklerini yönet</p>
                  </div>
                  <ChevronRight size={16} className="text-blue-400" />
                </button>

                {/* Hesap Güvenliği */}
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <GlassIconButton icon={ShieldCheck} size={38} iconSize={18} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">Hesap güvenliği</p>
                      {isVerified && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                          Doğrulandı
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#94A3B8]">Kimlik, oturum ve parola ayarları</p>
                  </div>
                  <ChevronRight size={16} className="text-blue-400" />
                </button>

                {/* Bildirimler */}
                <button
                  type="button"
                  onClick={() => setIsNotificationsModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <GlassIconButton icon={Bell} size={38} iconSize={18} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">Bildirimler</p>
                      {unreadNotificationsCount > 0 && (
                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-400">
                          {unreadNotificationsCount} yeni
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#94A3B8]">Lansman, destek ve mesaj hareketleri</p>
                  </div>
                  <ChevronRight size={16} className="text-blue-400" />
                </button>

                {/* Oturumu Kapat */}
                <button
                  type="button"
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-rose-500/10 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <GlassIconButton icon={LogOut} iconColor="#F43F5E" size={38} iconSize={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-rose-400">Oturumu Kapat</p>
                    <p className="text-[10px] text-rose-400/75">Bu cihazdaki güvenli oturumu sonlandır</p>
                  </div>
                  <ChevronRight size={16} className="text-rose-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* ALL MODALS */}
      {/* ========================================================= */}

      {/* 1. Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        profile={profile}
        isAdmin={isAdmin}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setProfile((prev) => (prev ? { ...prev, ...updated } : null));
          router.refresh();
        }}
      />

      {/* 2. Credit History Modal */}
      <CreditHistoryModal
        isOpen={isCreditHistoryOpen}
        boostCredits={boostCredits}
        transactions={creditTransactions}
        isLoading={false}
        onClose={() => setIsCreditHistoryOpen(false)}
      />

      {/* 3. Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        notifications={notifications}
        isLoading={false}
        onClose={() => setIsNotificationsModalOpen(false)}
        onMarkAllRead={handleMarkAllRead}
        onDeleteAll={handleDeleteAllNotifications}
        onDeleteSingle={handleDeleteSingleNotification}
        onSelectNotification={(notif) => {
          setIsNotificationsModalOpen(false);
          if (!notif.is_read) {
            void supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
            setNotifications((current) => current.map((item) => (
              item.id === notif.id ? { ...item, is_read: true } : item
            )));
          }
          if (notif.type === 'message' && notif.data?.conversation_id) {
            router.push(`/messages?conversationId=${encodeURIComponent(String(notif.data.conversation_id))}`);
            return;
          }
          const actionPath = typeof notif.data?.action_path === 'string' ? notif.data.action_path : '';
          if (notif.type === 'admin_announcement' && isValidAnnouncementPath(actionPath)) {
            router.push(actionPath);
            return;
          }
          if (notif.data?.listing_id) {
            router.push(`/listings/${encodeURIComponent(String(notif.data.listing_id))}`);
          }
        }}
      />

      {/* 4. Project Delete Confirmation Modal */}
      <ProjectDeleteModal
        project={deleteTarget}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteProject}
      />

      {/* 5. Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        isSigningOut={isSigningOut}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
      />

      {/* 6. Account Security Modal */}
      <AccountSecurityModal
        isOpen={isSecurityModalOpen}
        email={user.email}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* 7. Visibility Management Modal */}
      <VisibilityManagementModal
        isOpen={isVisibilityModalOpen}
        listings={myListings}
        initialListingId={visibilityListingId}
        boostCredits={boostCredits}
        onClose={() => {
          setIsVisibilityModalOpen(false);
          setVisibilityListingId(null);
        }}
        onSuccess={(newCredits) => {
          if (typeof newCredits === 'number') {
            setProfile((currentProfile) => (
              currentProfile ? { ...currentProfile, boost_credits: newCredits } : currentProfile
            ));
          }
          router.refresh();
        }}
      />
    </div>
  );
};
