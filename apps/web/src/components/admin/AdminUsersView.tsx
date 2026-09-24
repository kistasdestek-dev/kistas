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
  const [creditModalTarget, setCreditModalTarget] = useState<{ id: string; name: string } | null>(null);
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
          <GlassIconButton icon={Users} size={44} iconSize={22} iconColor="#187657" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#25364E] tracking-tight">
            Kullanıcı ve Ekip Yönetimi
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
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
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-white/90 bg-[#EAF0F7]/70 text-xs font-semibold text-[#25364E] shadow-[inset_2px_2px_6px_rgba(130,146,168,0.12)] focus:outline-none focus:border-[#3269C7]"
          />
        </div>

        <span className="text-xs font-bold text-[#64748B]">
          Toplam {users.length} Kayıtlı Kullanıcı
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl border border-[#ba0816]/20 bg-[#ba0816]/10 text-xs text-[#ba0816] font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-[28px] border border-white/90 bg-white/90 shadow-[-6px_-6px_16px_rgba(255,255,255,0.9),6px_6px_20px_rgba(130,146,168,0.14)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3269C7]/12 bg-[#F7FAFE] text-[10px] font-bold text-[#627590] uppercase tracking-wider">
                <th className="py-4 px-6">Kullanıcı</th>
                <th className="py-4 px-4">Rol & Yetki</th>
                <th className="py-4 px-4">Vitrin Kredisi</th>
                <th className="py-4 px-4">Lansmanlar</th>
                <th className="py-4 px-4">Durum</th>
                <th className="py-4 px-6 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3269C7]/8 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#686474]">
                    Aramanıza uygun kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isBusy = actionBusyId === u.id;
                  const isMuted = Boolean(u.commentMutedUntil && new Date(u.commentMutedUntil).getTime() > Date.now());

                  return (
                    <tr key={u.id} className="hover:bg-[#F9FBFE] transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#3269C7] to-[#1e4a94] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-[#25364E]">{u.fullName}</p>
                              {u.isVerified && (
                                <span title="Doğrulanmış">
                                  <CheckCircle2 size={13} className="text-[#3269C7]" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#64748B]">{u.email || 'E-posta gizli'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Permissions */}
                      <td className="py-4 px-4">
                        {u.isAdminOwner ? (
                          <span className="rounded-md bg-[#173866] text-amber-300 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black tracking-wide">
                            KURUCU ADMİN
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="rounded-md bg-[#3269C7]/15 text-[#3269C7] border border-[#3269C7]/20 px-2 py-0.5 text-[10px] font-bold">
                            YÖNETİCİ
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 text-[#64748B] px-2 py-0.5 text-[10px] font-semibold">
                            ÜYE
                          </span>
                        )}
                      </td>

                      {/* Boost Credits */}
                      <td className="py-4 px-4 font-bold text-[#25364E]">
                        <span className="inline-flex items-center gap-1 text-[#B98916]">
                          <Sparkles size={13} />
                          <span>{u.boostCredits.toLocaleString('tr-TR')} kredi</span>
                        </span>
                      </td>

                      {/* Projects count */}
                      <td className="py-4 px-4 text-[#25364E] font-semibold">
                        {u.projectsCount} proje
                      </td>

                      {/* Comment Mute Status */}
                      <td className="py-4 px-4">
                        {isMuted ? (
                          <span className="rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                            Yorum Susturuldu
                          </span>
                        ) : (
                          <span className="rounded-md bg-green-50 text-green-700 px-2 py-0.5 text-[10px] font-semibold">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* Grant Credits */}
                          <button
                            type="button"
                            onClick={() => setCreditModalTarget({ id: u.id, name: u.fullName })}
                            className="h-8 px-3 rounded-lg border border-[#B98916]/30 bg-[#FFFDF5] text-xs font-bold text-[#8A6414] shadow-xs hover:bg-[#FFF8E7] transition-all cursor-pointer"
                          >
                            +Kredi Ver
                          </button>

                          {/* Mute / Unmute Comments */}
                          {!u.isAdminOwner && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleMute(u.id, isMuted)}
                              className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                                isMuted
                                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              }`}
                              title={isMuted ? 'Yorum Engelini Kaldır' : 'Yorum Yazmasını Engelle'}
                            >
                              {isBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : isMuted ? (
                                <Volume2 size={13} />
                              ) : (
                                <VolumeX size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Credits Modal */}
      {creditModalTarget && (
        <GrantCreditsModal
          isOpen={Boolean(creditModalTarget)}
          userId={creditModalTarget.id}
          userName={creditModalTarget.name}
          onClose={() => setCreditModalTarget(null)}
          onSuccess={() => onRefresh()}
        />
      )}
    </div>
  );
};
