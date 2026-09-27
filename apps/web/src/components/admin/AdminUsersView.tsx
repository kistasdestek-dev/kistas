'use client';

import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  VolumeX,
  Volume2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { GrantCreditsModal } from './GrantCreditsModal';
import { createClient } from '@/lib/supabase/browser';

export interface AdminUserItem {
  id: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'staff' | 'user';
  adminPermissions: string[];
  isAdminOwner: boolean;
  boostCredits: number;
  balance: number;
  isVerified: boolean;
  projectsCount: number;
  commentMutedUntil?: string | null;
  createdAt: string;
}

interface AdminUsersViewProps {
  users: AdminUserItem[];
  onRefresh: () => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  users,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creditModalTarget, setCreditModalTarget] = useState<{ id: string; name: string; credits: number } | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const filtered = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const handleToggleMute = async (userId: string, isMuted: boolean) => {
    setActionBusyId(userId);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('admin_set_comment_mute', {
        p_user_id: userId,
        p_muted: !isMuted,
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Yorum yetkisi güncellenemedi.');
      }

      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası.');
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık Alanı (Kıstas Stili) */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          <GlassIconButton icon={Users} size={44} iconSize={22} iconColor="#3269C7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Kullanıcı ve Ekip Yönetimi
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5 font-medium">
            Hesapları, ekip görevlerini, kredi bakiyelerini ve yorum yetkilerini yönetin.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İsim veya e-posta ara..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#3269C7] transition-all"
          />
        </div>

        <span className="text-xs font-bold text-[#94A3B8]">
          Toplam {users.length} Kayıtlı Kullanıcı
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/15 text-xs text-rose-300 font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-12 text-center text-xs text-slate-400 backdrop-blur-2xl">
          Aramanıza uygun kullanıcı bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((u) => {
            const isBusy = actionBusyId === u.id;
            const isMuted = Boolean(u.commentMutedUntil && new Date(u.commentMutedUntil).getTime() > Date.now());
            const roleLabel = u.isAdminOwner ? 'Kurucu Admin' : u.role === 'admin' || u.role === 'staff' ? 'Yönetim Ekibi' : 'Topluluk Üyesi';

            return (
              <article key={u.id} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.025] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-5">
                <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B74D8] to-[#163B7A] text-sm font-black text-white shadow-[0_8px_20px_rgba(50,105,199,0.3)]">
                    {u.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-black text-white">{u.fullName}</h3>
                      {u.isVerified && <CheckCircle2 size={14} className="shrink-0 text-[#8DB9FF]" aria-label="Doğrulanmış" />}
                    </div>
                    <p className="truncate text-[11px] text-[#94A3B8]">{u.email || 'E-posta yalnız süper yöneticiye görünür'}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#B9CCE9]">
                    {roleLabel}
                  </span>
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Kredi</p>
                    <p className="mt-1 truncate text-sm font-black text-amber-300">{u.boostCredits.toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Projeler</p>
                    <p className="mt-1 text-sm font-black text-white">{u.projectsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Yorum</p>
                    <p className={`mt-1 text-xs font-black ${isMuted ? 'text-rose-300' : 'text-emerald-300'}`}>{isMuted ? 'Kapalı' : 'Aktif'}</p>
                  </div>
                </div>

                <div className="relative mt-3 grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-white/10 bg-[#091326]/75 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    onClick={() => setCreditModalTarget({ id: u.id, name: u.fullName, credits: u.boostCredits })}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 text-xs font-black text-[#A9CAFF] transition hover:bg-blue-500/20"
                  >
                    <Sparkles size={15} /> Kredi Ver
                  </button>
                  {!u.isAdminOwner && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleMute(u.id, isMuted)}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:opacity-50 ${isMuted ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' : 'border-rose-400/20 bg-rose-500/[0.08] text-rose-300'}`}
                      title={isMuted ? 'Yorum engelini kaldır' : 'Yorum yazmasını engelle'}
                      aria-label={isMuted ? 'Yorum engelini kaldır' : 'Yorum yazmasını engelle'}
                    >
                      {isBusy ? <Loader2 size={15} className="animate-spin" /> : isMuted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Grant Credits Modal */}
      {creditModalTarget && (
        <GrantCreditsModal
          isOpen={Boolean(creditModalTarget)}
          userId={creditModalTarget.id}
          userName={creditModalTarget.name}
          currentCredits={creditModalTarget.credits}
          onClose={() => setCreditModalTarget(null)}
          onSuccess={() => onRefresh()}
        />
      )}
    </div>
  );
};
