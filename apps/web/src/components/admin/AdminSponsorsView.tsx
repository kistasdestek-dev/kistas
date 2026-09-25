'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  Sparkles,
  ExternalLink,
  Loader2,
  AlertCircle,
  Calendar,
  RotateCw,
  Clock,
  X,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { GrantSupportModal } from './GrantSupportModal';
import { createClient } from '@/lib/supabase/browser';
import type { Listing } from '@kistas/shared';

interface AdminSponsorsViewProps {
  listings: Listing[];
  onRefresh: () => void;
}

export const AdminSponsorsView: React.FC<AdminSponsorsViewProps> = ({
  listings,
  onRefresh,
}) => {
  const [sponsorView, setSponsorView] = useState<'active' | 'all'>('active');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewModalTarget, setViewModalTarget] = useState<{ id: string; title: string } | null>(null);

  const supabase = createClient();

  const isSponsored = (item: Listing) => {
    if (item.is_boosted) return true;
    if (item.boosted_until) {
      const exp = new Date(item.boosted_until).getTime();
      return exp > Date.now();
    }
    return false;
  };

  const activeSponsors = listings.filter(isSponsored);
  const displayList = sponsorView === 'active' ? activeSponsors : listings;

  const handleSetSponsorship = async (listingId: string, hours: 0 | 24 | 72 | 168) => {
    setActionBusyId(listingId);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('admin_set_listing_sponsorship', {
        p_listing_id: listingId,
        p_duration_hours: hours,
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Vitrin Desteği süresi güncellenemedi.');
      }

      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası.');
    } finally {
      setActionBusyId(null);
    }
  };

  const formatExpiry = (isoString?: string | null) => {
    if (!isoString) return 'Süre tanımsız';
    try {
      const d = new Date(isoString);
      const diffHours = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60));
      const formattedDate = new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);

      if (diffHours > 0) {
        return `Bitiş: ${formattedDate} (${diffHours} saat kaldı)`;
      }
      return `Bitiş: ${formattedDate} (Süresi doldu)`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Başlık Alanı (Kıstas Stili) */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          <GlassIconButton icon={Eye} size={44} iconSize={22} iconColor="#3269C7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Vitrin Desteği
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5 font-medium">
            Seçtiğiniz projeye süreli editoryal erişim sağlayın. Gerçek görüntülenme sayısı ayrı tutulur.
          </p>
        </div>
      </div>

      {/* 2. Canlı Önizleme Kutusu (Sıvı Cam Kart) */}
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
              CANLI ÖNİZLEME
            </span>
            <h4 className="text-sm sm:text-base font-black text-white mt-0.5">
              {activeSponsors.length} aktif Vitrin Desteği
            </h4>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
            <RotateCw size={12} className="animate-spin" />
            <span>Otomatik akış</span>
          </div>
        </div>

        {/* Liste Başlığı */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[11px] font-extrabold text-[#8DB9FF] tracking-wider uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3269C7]" />
            <span>VİTRİN DESTEĞİ ALAN PROJELER</span>
          </div>

          {activeSponsors.length === 0 ? (
            <p className="text-xs text-[#94A3B8] italic py-2">
              Aktif Vitrin Desteği yok. Aşağıdan bir projeye süre tanımlayın.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {activeSponsors.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-white"
                >
                  <div className="w-5 h-5 rounded-md overflow-hidden bg-white/10 shrink-0">
                    {p.logo_url ? (
                      <AutoTransparentLogo src={p.logo_url} alt={p.title} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-black text-[#8DB9FF] flex items-center justify-center h-full">
                        {p.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span>{p.title}</span>
                  <span className="text-[10px] text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded font-semibold border border-amber-500/25">
                    {formatExpiry(p.boosted_until)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Projeler Araç Çubuğu / Sekmeler */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSponsorView('active')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            sponsorView === 'active'
              ? 'border-[#3269C7] bg-[#3269C7] text-white shadow-xs'
              : 'border-white/10 bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <Sparkles size={13} />
          <span>Destek alan ({activeSponsors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSponsorView('all')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            sponsorView === 'all'
              ? 'border-[#3269C7] bg-[#3269C7] text-white shadow-xs'
              : 'border-white/10 bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <span>Tüm uygun projeler ({listings.length})</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/15 text-xs text-rose-300 font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4. Proje Listesi (Kıstas Obsidyen Kart Stili) */}
      {displayList.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3269C7]/20 border border-[#3269C7]/30 text-[#8DB9FF]">
            <Eye size={22} />
          </div>
          <h4 className="text-base font-bold text-white">
            {sponsorView === 'active'
              ? 'Aktif Vitrin Desteği bulunmuyor.'
              : 'Aramanıza uygun bir proje bulunamadı.'}
          </h4>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Uygun projelerden birine aşağıdaki süre butonlarını kullanarak vitrin tanımlayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayList.map((project) => {
            const sponsored = isSponsored(project);
            const isBusy = actionBusyId === project.id;
            const safeProjectUrl = `/listings/${(project as any).slug || project.id}`;

            return (
              <div
                key={project.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/20 hover:bg-white/[0.05]"
              >
                {/* Proje Kimlik Bilgisi */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden">
                      {project.logo_url ? (
                        <AutoTransparentLogo src={project.logo_url} alt={project.title} className="h-8 w-8 object-contain" />
                      ) : (
                        <span className="text-xs font-black text-[#8DB9FF]">
                          {project.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {project.title}
                        </h4>
                        {sponsored ? (
                          <span className="rounded-full bg-[#3269C7]/20 border border-[#3269C7]/30 px-2 py-0.5 text-[10px] font-bold text-[#8DB9FF] flex items-center gap-1">
                            <Eye size={10} />
                            <span>Vitrin Desteği aktif</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/[0.05] border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            Desteğe uygun
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-1">
                        {project.tagline || 'Dijital proje'}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={safeProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    title="Vitrinde Gör"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>

                {/* Alt Meta Bilgileri */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] mt-3 pt-3 border-t border-white/10">
                  <span>{project.view_count || 0} görüntülenme</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{project.upvote_count || 0} destek</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className={sponsored ? 'text-amber-300 font-semibold' : ''}>
                    {formatExpiry(project.boosted_until)}
                  </span>
                </div>

                {/* Aksiyon Butonları (Kıstas Stili) */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewModalTarget({ id: project.id, title: project.title })}
                    className="h-8 px-3 rounded-lg border border-[#3269C7]/40 bg-[#3269C7]/20 text-xs font-bold text-[#8DB9FF] hover:bg-[#3269C7]/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Görünürlük Ekle</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSetSponsorship(project.id, 24)}
                    className="h-8 px-3 rounded-lg border border-white/10 bg-white/[0.05] text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Clock size={12} className="text-[#8DB9FF]" />
                    <span>{sponsored ? '+24 saat' : '24 saat destek ver'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSetSponsorship(project.id, 72)}
                    className="h-8 px-3 rounded-lg border border-white/10 bg-white/[0.05] text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Calendar size={12} className="text-[#8DB9FF]" />
                    <span>+3 gün</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSetSponsorship(project.id, 168)}
                    className="h-8 px-3 rounded-lg border border-amber-500/30 bg-amber-500/15 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Calendar size={12} className="text-amber-400" />
                    <span>+7 gün</span>
                  </button>

                  {sponsored && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetSponsorship(project.id, 0)}
                      className="h-8 px-3 rounded-lg border border-rose-500/30 bg-rose-500/15 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ml-auto"
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      <span>Desteği sonlandır</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Görünürlük Ekle Modalı */}
      {viewModalTarget && (
        <GrantSupportModal
          isOpen={!!viewModalTarget}
          onClose={() => setViewModalTarget(null)}
          onSuccess={onRefresh}
          listingId={viewModalTarget.id}
          listingTitle={viewModalTarget.title}
          type="views"
        />
      )}
    </div>
  );
};
