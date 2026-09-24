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
          <GlassIconButton icon={ShieldCheck} size={44} iconSize={22} iconColor="#936413" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#25364E] tracking-tight">
            Lansman Onayları
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
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
              : 'border-white/80 bg-white/80 text-[#64748B] hover:text-[#25364E] hover:bg-white'
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
              ? 'border-[#B98916] bg-[#B98916] text-white shadow-[0_4px_14px_rgba(185,137,22,0.3)]'
              : 'border-white/80 bg-white/80 text-[#64748B] hover:text-[#25364E] hover:bg-white'
          }`}
        >
          <Wrench size={14} />
          <span>Düzeltmede ({revisionListings.length})</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl border border-[#ba0816]/20 bg-[#ba0816]/10 text-xs text-[#ba0816] font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Moderation Stream */}
      {currentList.length === 0 ? (
        <div className="rounded-[28px] border border-white/90 bg-white/80 p-12 text-center shadow-[-6px_-6px_16px_rgba(255,255,255,0.9),6px_6px_20px_rgba(130,146,168,0.16)]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F6FF] border border-[#3269C7]/20 text-[#3269C7]">
            <Inbox size={26} />
          </div>
          <h4 className="text-base font-bold text-[#25364E]">
            {subFilter === 'pending'
              ? 'İncelenmeyi bekleyen proje bulunmuyor.'
              : 'Düzeltme aşamasında proje bulunmuyor.'}
          </h4>
          <p className="mt-1 text-xs text-[#64748B]">
            Yeni lansman başvuruları yapıldığında bu alanda gerçek zamanlı listelenecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((item) => {
            const isBusyThis = actionId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-[26px] border border-white/90 bg-white/90 p-5 sm:p-6 shadow-[-6px_-6px_16px_rgba(255,255,255,0.9),6px_6px_20px_rgba(130,146,168,0.14)] backdrop-blur-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3269C7]/10 pb-4">
                  {/* Title & Logo */}
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#F7FAFF] border border-[#CBD9EC]/70 flex items-center justify-center shadow-xs overflow-hidden">
                      {item.logo_url ? (
                        <AutoTransparentLogo src={item.logo_url} alt={item.title} className="h-10 w-10 object-contain" />
                      ) : (
                        <span className="text-base font-black text-[#3269C7]">
                          {item.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-lg font-bold text-[#25364E] tracking-tight">
                          {item.title}
                        </h4>
                        <span className="rounded-full bg-[#FFF8E7] border border-[#936413]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#936413]">
                          {subFilter === 'pending' ? 'Onay Bekliyor' : 'Düzeltme İstendi'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {item.tagline || 'Yenilikçi dijital proje'}
                      </p>
                      <p className="text-[10px] text-[#8C9AA9] mt-0.5">
                        Gönderim Tarihi: {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at))}
                      </p>
                    </div>
                  </div>

                  {/* Platforms & Pricing Badges */}
                  <div className="flex items-center gap-2">
                    {item.pricing_model && (
                      <span className="rounded-xl bg-[#EAF0F7] px-3 py-1 text-[11px] font-bold text-[#25364E] capitalize">
                        {item.pricing_model}
                      </span>
                    )}
                    {Array.isArray(item.platforms) && item.platforms.length > 0 && (
                      <span className="rounded-xl bg-[#3269C7]/10 px-3 py-1 text-[11px] font-bold text-[#3269C7]">
                        {item.platforms.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="my-4">
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Previous Review Feedback (if any) */}
                {(item as any).review_feedback && (
                  <div className="mb-4 p-3 rounded-xl border border-[#B98916]/30 bg-[#FFFBEA] text-xs">
                    <p className="font-bold text-[#936413]">Mevcut Düzeltme Notu:</p>
                    <p className="text-[#686474] mt-0.5">{(item as any).review_feedback}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  {(() => {
                    const safeProjectUrl = `/project/${item.id}`;
                    return (
                      <Link
                        href={safeProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-[#CBD9EC] bg-white text-xs font-bold text-[#25364E] shadow-xs hover:bg-[#F7FAFE] transition-all cursor-pointer"
                      >
                        <ExternalLink size={14} />
                        <span>Önizle</span>
                      </Link>
                    );
                  })()}

                  <button
                    type="button"
                    disabled={isBusyThis}
                    onClick={() => setRevisionTarget(item)}
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-[#B98916]/30 bg-[#FFFDF5] text-xs font-bold text-[#8A6414] shadow-xs hover:bg-[#FFF8E7] active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Wrench size={14} />
                    <span>Düzeltme İste</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusyThis}
                    onClick={() => handleSuspend(item.id)}
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-[#ba0816]/25 bg-[#ba0816]/8 text-xs font-bold text-[#ba0816] hover:bg-[#ba0816]/15 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Ban size={14} />
                    <span>Askıya Al</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusyThis}
                    onClick={() => handleApprove(item.id)}
                    className="h-10 px-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#12b33c] to-[#0FA336] text-xs font-bold text-white shadow-[0_4px_14px_rgba(15,163,54,0.3)] hover:shadow-[0_6px_20px_rgba(15,163,54,0.4)] active:scale-98 transition-all cursor-pointer disabled:opacity-50"
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
