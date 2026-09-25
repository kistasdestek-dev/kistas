'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Wrench,
  Ban,
  ExternalLink,
  Loader2,
  Clock,
  Inbox,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { RevisionRequestModal } from './RevisionRequestModal';
import { createClient } from '@/lib/supabase/browser';
import type { Listing } from '@kistas/shared';

interface AdminModerationViewProps {
  listings: Listing[];
  onRefresh: () => void;
}

export const AdminModerationView: React.FC<AdminModerationViewProps> = ({
  listings,
  onRefresh,
}) => {
  const [subFilter, setSubFilter] = useState<'pending' | 'revision'>('pending');
  const [actionId, setActionId] = useState<string | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<Listing | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const isPending = (status: string) => status === 'pending_review' || status === 'draft';
  const isRevision = (status: string) => status === 'rejected' || status === 'inactive';

  const pendingListings = listings.filter((l) => isPending(l.status as string));
  const revisionListings = listings.filter((l) => isRevision(l.status as string));

  const currentList = subFilter === 'pending' ? pendingListings : revisionListings;

  const handleApprove = async (listingId: string) => {
    setActionId(listingId);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('admin_update_listing_status', {
        p_listing_id: listingId,
        p_status: 'active',
      });
      if (error || !data?.success) {
        throw new Error(error?.message || 'Proje onaylanamadı.');
      }
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası.');
    } finally {
      setActionId(null);
    }
  };

  const handleSuspend = async (listingId: string) => {
    setActionId(listingId);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('admin_update_listing_status', {
        p_listing_id: listingId,
        p_status: 'banned',
      });
      if (error || !data?.success) {
        throw new Error(error?.message || 'Proje askıya alınamadı.');
      }
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık Alanı (Kıstas Stili) */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          <GlassIconButton icon={ShieldCheck} size={44} iconSize={22} iconColor="#3269C7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Lansman Onayları
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5 font-medium">
            Kullanıcıların gönderdiği projeleri inceleyin, onaylayın veya gerekçeli düzeltme isteyin.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSubFilter('pending')}
          className={`h-10 px-5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
            subFilter === 'pending'
              ? 'border-[#3269C7] bg-[#3269C7] text-white shadow-[0_4px_14px_rgba(50,105,199,0.28)]'
              : 'border-white/10 bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Clock size={14} />
          <span>Onay Bekleyenler ({pendingListings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubFilter('revision')}
          className={`h-10 px-5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
            subFilter === 'revision'
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-[0_4px_14px_rgba(245,158,11,0.2)]'
              : 'border-white/10 bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Wrench size={14} />
          <span>Düzeltmede ({revisionListings.length})</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/15 text-xs text-rose-300 font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Moderation Stream */}
      {currentList.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3269C7]/20 border border-[#3269C7]/30 text-[#8DB9FF]">
            <Inbox size={26} />
          </div>
          <h4 className="text-base font-bold text-white">
            {subFilter === 'pending'
              ? 'İncelenmeyi bekleyen proje bulunmuyor.'
              : 'Düzeltme aşamasında proje bulunmuyor.'}
          </h4>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Yeni lansman başvuruları yapıldığında bu alanda gerçek zamanlı listelenecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((item) => {
            const isBusyThis = actionId === item.id;
            const safeProjectUrl = `/listings/${(item as any).slug || item.id}`;

            return (
              <div
                key={item.id}
                className="rounded-[26px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  {/* Title & Logo */}
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-xs overflow-hidden">
                      {item.logo_url ? (
                        <AutoTransparentLogo src={item.logo_url} alt={item.title} className="h-10 w-10 object-contain" />
                      ) : (
                        <span className="text-base font-black text-[#8DB9FF]">
                          {item.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {item.title}
                        </h4>
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                          {subFilter === 'pending' ? 'Onay Bekliyor' : 'Düzeltme İstendi'}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        {item.tagline || 'Yenilikçi dijital proje'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Gönderim Tarihi: {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at))}
                      </p>
                    </div>
                  </div>

                  {/* Platforms & Pricing Badges */}
                  <div className="flex items-center gap-2">
                    {item.pricing_model && (
                      <span className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-1 text-[11px] font-bold text-white capitalize">
                        {item.pricing_model}
                      </span>
                    )}
                    {Array.isArray(item.platforms) && item.platforms.length > 0 && (
                      <span className="rounded-xl bg-[#3269C7]/20 border border-[#3269C7]/30 px-3 py-1 text-[11px] font-bold text-[#8DB9FF]">
                        {item.platforms.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="my-4">
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Previous Review Feedback (if any) */}
                {(item as any).review_feedback && (
                  <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/15 text-xs">
                    <p className="font-bold text-amber-300">Mevcut Düzeltme Notu:</p>
                    <p className="text-slate-300 mt-0.5">{(item as any).review_feedback}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <Link
                    href={safeProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Önizle</span>
                  </Link>

                  <button
                    type="button"
                    disabled={isBusyThis}
                    onClick={() => setRevisionTarget(item)}
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-xs font-bold text-amber-300 hover:bg-amber-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Wrench size={14} />
                    <span>Düzeltme İste</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusyThis}
                    onClick={() => handleSuspend(item.id)}
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-xs font-bold text-rose-300 hover:bg-rose-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Ban size={14} />
                    <span>Askıya Al</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusyThis}
                    onClick={() => handleApprove(item.id)}
                    className="h-10 px-5 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-xs font-bold text-emerald-300 shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:bg-emerald-500/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isBusyThis ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    <span>Onayla ve Yayınla</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revision Modal */}
      <RevisionRequestModal
        isOpen={Boolean(revisionTarget)}
        listingId={revisionTarget?.id || null}
        listingTitle={revisionTarget?.title || ''}
        onClose={() => setRevisionTarget(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
