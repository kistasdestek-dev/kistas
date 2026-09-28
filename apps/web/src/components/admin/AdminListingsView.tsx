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

const grantActionClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-400/25 bg-blue-500/10 px-2 text-xs font-bold text-[#A9CAFF] transition hover:bg-blue-500/20 disabled:opacity-50';

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
        <div className="relative w-full min-w-0 flex-1 sm:max-w-md">
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
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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

      {filtered.length === 0 ? <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-8 text-center text-xs text-slate-400">Filtreye uygun proje bulunamadı.</div> : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map(item => {
            const active = isActive(item.status as string);
            const isBusy = Boolean(actionBusyId) || isDeleting;
            const statusLabel = active ? 'Yayında' : isPending(item.status as string) ? 'Bekliyor' : isRevision(item.status as string) ? 'Düzeltmede' : 'Askıda';
            const statusColor = active ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20' : isPending(item.status as string) || isRevision(item.status as string) ? 'text-amber-300 bg-amber-500/10 border-amber-400/20' : 'text-rose-300 bg-rose-500/10 border-rose-400/20';
            return <article key={item.id} className="relative min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.025] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-5">
              <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
              <div className="relative flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center">{item.logo_url ? <AutoTransparentLogo src={item.logo_url} alt={item.title} className="h-9 w-9 object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.35)]" /> : <span className="text-sm font-black text-[#8DB9FF]">{item.title.slice(0, 2).toUpperCase()}</span>}</div>
                <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-white" title={item.title}>{item.title}</h3><p className="mt-1 line-clamp-2 break-words text-[11px] leading-4 text-[#94A3B8]">{item.tagline || 'Dijital proje'}</p></div>
                <span className={'shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold ' + statusColor}>{statusLabel}</span>
              </div>
              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-black/15 p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#94A3B8]"><Heart size={12} />Destek</p><p className="mt-1 truncate text-sm font-black text-[#A9CAFF]">{(item.upvote_count || 0).toLocaleString('tr-TR')}</p></div>
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-black/15 p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#94A3B8]"><Eye size={12} />Görüntülenme</p><p className="mt-1 truncate text-sm font-black text-white">{(item.view_count || 0).toLocaleString('tr-TR')}</p></div>
              </div>
              <div className="relative mt-3 space-y-2 rounded-2xl border border-white/10 bg-[#091326]/75 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={isBusy} onClick={() => setSupportModalTarget({ id: item.id, title: item.title, type: 'support' })} className={grantActionClass}><Heart size={14} />Destek Ver</button>
                  <button type="button" disabled={isBusy} onClick={() => setSupportModalTarget({ id: item.id, title: item.title, type: 'views' })} className={grantActionClass}><Eye size={14} />İzlenme Ver</button>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <button type="button" disabled={isBusy} onClick={() => handleToggleStatus(item.id, item.status as string)} className={'inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-xs font-bold transition disabled:opacity-50 ' + (active ? 'border-rose-400/20 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/15' : 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300 hover:bg-emerald-500/15')}>{active ? 'Askıya Al' : 'Yayınla'}</button>
                  <Link href={'/listings/' + item.id} target="_blank" rel="noopener noreferrer" aria-label={item.title + ' projesini vitrinde gör'} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"><GlassIconButton icon={ExternalLink} as="div" variant="glass" size={44} iconSize={17} iconColor="#A8C8FB" /></Link>
                  <GlassIconButton icon={Trash2} variant="glass" size={44} iconSize={17} iconColor="#FDA4AF" onClick={() => setDeleteTarget(item)} disabled={isBusy} title={item.title + ' projesini sil'} />
                </div>
              </div>
            </article>;
          })}
        </div>
      )}
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
