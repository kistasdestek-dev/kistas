'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Heart,
  Eye,
  Trash2,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { GrantSupportModal } from './GrantSupportModal';
import { ProjectDeleteModal } from '../profile/ProjectDeleteModal';
import { createClient } from '@/lib/supabase/browser';
import type { Listing } from '@kistas/shared';

interface AdminListingsViewProps {
  listings: Listing[];
  onRefresh: () => void;
}

export const AdminListingsView: React.FC<AdminListingsViewProps> = ({
  listings,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'revision' | 'banned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [supportModalTarget, setSupportModalTarget] = useState<{ id: string; title: string; type: 'support' | 'views' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const supabase = createClient();

  const isPending = (s: string) => s === 'pending_review' || s === 'draft';
  const isRevision = (s: string) => s === 'rejected' || s === 'inactive';
  const isActive = (s: string) => s === 'approved' || s === 'active';
  const isBanned = (s: string) => s === 'suspended' || s === 'banned';

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      // 1. Status filter
      if (filter === 'active' && !isActive(item.status as string)) return false;
      if (filter === 'pending' && !isPending(item.status as string)) return false;
      if (filter === 'revision' && !isRevision(item.status as string)) return false;
      if (filter === 'banned' && !isBanned(item.status as string)) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesTagline = (item.tagline || '').toLowerCase().includes(q);
        return matchesTitle || matchesTagline;
      }
      return true;
    });
  }, [listings, filter, searchQuery]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await supabase.rpc('admin_delete_listing', { p_listing_id: deleteTarget.id });
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (listingId: string, currentStatus: string) => {
    setActionBusyId(listingId);
    const newStatus = isActive(currentStatus) ? 'banned' : 'active';
    try {
      await supabase.rpc('admin_update_listing_status', {
        p_listing_id: listingId,
        p_status: newStatus,
      });
      onRefresh();
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık Alanı (Kıstas Stili) */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          <GlassIconButton icon={LayoutGrid} size={44} iconSize={22} iconColor="#3269C7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Proje Moderasyonu
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5 font-medium">
            Yayın durumlarını denetleyin, destek tanımlayın ve içerikleri inceleyin.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Proje adı veya slogan ara..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#3269C7] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {([
            ['all', `Tümü (${listings.length})`],
            ['active', 'Yayında'],
            ['pending', 'Bekleyen'],
            ['revision', 'Düzeltmede'],
            ['banned', 'Askıda'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                filter === key
                  ? 'border-[#3269C7] bg-[#3269C7] text-white shadow-xs'
                  : 'border-white/10 bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Table / Card List */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold text-[#8DB9FF] uppercase tracking-wider">
                <th className="py-4 px-6">Proje Bilgisi</th>
                <th className="py-4 px-4">Durum</th>
                <th className="py-4 px-4">Destek</th>
                <th className="py-4 px-4">Görünürlük</th>
                <th className="py-4 px-6 text-right">Yönetim Aksiyonları</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Filtreye uygun proje bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const active = isActive(item.status as string);
                  const isBusy = actionBusyId === item.id;
                  const upvotes = (item as any).upvotes_count || item.upvote_count || 0;
                  const views = (item as any).view_count || 0;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      {/* Title & Logo */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 flex items-center justify-center">
                            {item.logo_url ? (
                              <AutoTransparentLogo src={item.logo_url} alt={item.title} className="h-9 w-9 object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.35)]" />
                            ) : (
                              <span className="text-xs font-black text-[#8DB9FF]">
                                {item.title.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate max-w-[200px]">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-[#94A3B8] truncate max-w-[200px]">
                              {item.tagline || 'Dijital proje'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            active
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : isPending(item.status as string)
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : isRevision(item.status as string)
                                  ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active
                                ? 'bg-emerald-400'
                                : isPending(item.status as string)
                                  ? 'bg-amber-400'
                                  : isRevision(item.status as string)
                                    ? 'bg-yellow-400'
                                    : 'bg-rose-400'
                            }`}
                          />
                          <span>
                            {active ? 'Yayında' : isPending(item.status as string) ? 'Bekliyor' : isRevision(item.status as string) ? 'Düzeltmede' : 'Askıda'}
                          </span>
                        </span>
                      </td>

                      {/* Upvotes */}
                      <td className="py-4 px-4 font-bold text-white">
                        <span className="inline-flex items-center gap-1 text-[#8DB9FF]">
                          <Heart size={12} />
                          <span>{upvotes}</span>
                        </span>
                      </td>

                      {/* Views */}
                      <td className="py-4 px-4 text-[#94A3B8] font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Eye size={12} />
                          <span>{views}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Grant Upvotes */}
                          <button
                            type="button"
                            onClick={() => setSupportModalTarget({ id: item.id, title: item.title, type: 'support' })}
                            className="h-8 px-2.5 rounded-lg border border-[#3269C7]/40 bg-[#3269C7]/20 text-[#8DB9FF] text-[11px] font-bold hover:bg-[#3269C7]/30 transition-all cursor-pointer"
                            title="Yönetim Desteği Ver"
                          >
                            +Destek
                          </button>

                          {/* Grant Views */}
                          <button
                            type="button"
                            onClick={() => setSupportModalTarget({ id: item.id, title: item.title, type: 'views' })}
                            className="h-8 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer"
                            title="Görünürlük Tanımla"
                          >
                            +İzlenme
                          </button>

                          {/* Toggle Active / Suspend */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleStatus(item.id, item.status as string)}
                            className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                              active
                                ? 'border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                                : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                            title={active ? 'Askıya Al' : 'Yayınla'}
                          >
                            {active ? 'Askıya Al' : 'Yayınla'}
                          </button>

                          {/* Preview */}
                          {(() => {
                            const safeProjectUrl = `/listings/${(item as any).slug || item.id}`;
                            return (
                              <Link
                                href={safeProjectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                title="Vitrinde Gör"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            );
                          })()}

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Projeyi Sil"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Grant Support Modal */}
      {supportModalTarget && (
        <GrantSupportModal
          isOpen={Boolean(supportModalTarget)}
          listingId={supportModalTarget.id}
          listingTitle={supportModalTarget.title}
          type={supportModalTarget.type}
          onClose={() => setSupportModalTarget(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Project Delete Modal (Glassmorphism & Typewriter) */}
      <ProjectDeleteModal
        project={deleteTarget}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
