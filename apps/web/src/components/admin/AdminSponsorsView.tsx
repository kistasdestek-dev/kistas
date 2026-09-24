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
      {/* 1. Başlık Alanı (Fotoğraf ile birebir) */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          <GlassIconButton icon={Eye} size={44} iconSize={22} iconColor="#3269C7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#25364E] tracking-tight">
            Vitrin Desteği
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
            Seçtiğiniz projeye süreli editoryal erişim sağlayın. Gerçek görüntülenme sayısı ayrı tutulur.
          </p>
        </div>
      </div>

      {/* 2. Canlı Önizleme Kutusu (Fotoğraf ile birebir) */}
      <div className="rounded-[24px] border border-white/90 bg-white/90 p-5 sm:p-6 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-[#187657] uppercase tracking-wider">
              CANLI ÖNİZLEME
            </span>
            <h4 className="text-sm sm:text-base font-black text-[#25364E] mt-0.5">
              {activeSponsors.length} aktif Vitrin Desteği
            </h4>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#187657]/10 border border-[#187657]/20 text-[11px] font-bold text-[#187657]">
            <RotateCw size={12} className="animate-spin" />
            <span>Otomatik akış</span>
          </div>
        </div>

        {/* Liste Başlığı */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold text-[#3269C7] tracking-wider uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3269C7]" />
            <span>VİTRİN DESTEĞİ ALAN PROJELER</span>
          </div>

          {activeSponsors.length === 0 ? (
            <p className="text-xs text-[#64748B] italic py-2">
              Aktif Vitrin Desteği yok. Aşağıdan bir projeye süre tanımlayın.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {activeSponsors.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/60 text-xs font-bold text-[#25364E]"
                >
                  <div className="w-5 h-5 rounded-md overflow-hidden bg-white shrink-0">
                    {p.logo_url ? (
                      <AutoTransparentLogo src={p.logo_url} alt={p.title} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-black text-blue-600 flex items-center justify-center h-full">
                        {p.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span>{p.title}</span>
                  <span className="text-[10px] text-[#8A6414] bg-[#FFF8E7] px-1.5 py-0.5 rounded font-semibold">
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
              : 'border-white/80 bg-white text-[#64748B] hover:text-[#25364E]'
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
              : 'border-white/80 bg-white text-[#64748B] hover:text-[#25364E]'
          }`}
        >
          <span>Tüm uygun projeler ({listings.length})</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl border border-[#ba0816]/20 bg-[#ba0816]/10 text-xs text-[#ba0816] font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4. Proje Listesi (Kıstas Neumorphic DataCard Stili) */}
      {displayList.length === 0 ? (
        <div className="rounded-[28px] border border-white/90 bg-white/80 p-12 text-center shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF5FF] text-[#3269C7]">
            <Eye size={22} />
          </div>
          <h4 className="text-base font-bold text-[#25364E]">
            {sponsorView === 'active'
              ? 'Aktif Vitrin Desteği bulunmuyor.'
              : 'Aramanıza uygun bir proje bulunamadı.'}
          </h4>
          <p className="mt-1 text-xs text-[#64748B]">
            Uygun projelerden birine aşağıdaki süre butonlarını kullanarak vitrin tanımlayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayList.map((project) => {
            const sponsored = isSponsored(project);
            const isBusy = actionBusyId === project.id;
            const safeProjectUrl = `/project/${project.id}`;

            return (
              <div
                key={project.id}
                className="rounded-[24px] border border-white/90 bg-white p-5 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)] transition-all hover:shadow-[-2px_-2px_8px_rgba(255,255,255,0.8),2px_4px_12px_rgba(130,146,168,0.15)]"
              >
                {/* Proje Kimlik Bilgisi */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-[#F7FAFF] border border-[#CBD9EC]/70 flex items-center justify-center overflow-hidden">
                      {project.logo_url ? (
                        <AutoTransparentLogo src={project.logo_url} alt={project.title} className="h-8 w-8 object-contain" />
                      ) : (
                        <span className="text-xs font-black text-[#3269C7]">
                          {project.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#25364E] tracking-tight">
                          {project.title}
                        </h4>
                        {sponsored ? (
                          <span className="rounded-full bg-[#EFF5FF] border border-[#3269C7]/20 px-2 py-0.5 text-[10px] font-bold text-[#3269C7] flex items-center gap-1">
                            <Eye size={10} />
                            <span>Vitrin Desteği aktif</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Desteğe uygun
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                        {project.tagline || 'Dijital proje'}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={safeProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#3269C7] transition-colors shrink-0"
                    title="Vitrinde Gör"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>

                {/* Alt Meta Bilgileri */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] mt-3 pt-3 border-t border-slate-100">
                  <span>{project.view_count || 0} görüntülenme</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{project.upvote_count || 0} destek</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className={sponsored ? 'text-[#8A6414] font-semibold' : ''}>
                    {formatExpiry(project.boosted_until)}
                  </span>
                </div>

                {/* Aksiyon Butonları (Kıstas Stili) */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewModalTarget({ id: project.id, title: project.title })}
                    className="h-8 px-3 rounded-lg border border-[#3269C7]/30 bg-[#EFF5FF] text-xs font-bold text-[#3269C7] hover:bg-[#E3EFFF] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Görünürlük Ekle</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSetSponsorship(project.id, 24)}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Clock size={12} className="text-blue-600" />
                    <span>{sponsored ? '+24 saat' : '24 saat destek ver'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSetSponsorship(project.id, 72)}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Calendar size={12} className="text-blue-600" />
                    <span>+3 gün</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSetSponsorship(project.id, 168)}
                    className="h-8 px-3 rounded-lg border border-amber-200 bg-[#FFFDF5] text-xs font-bold text-[#8A6414] hover:bg-[#FFF8E7] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Calendar size={12} className="text-[#8A6414]" />
                    <span>+7 gün</span>
                  </button>

                  {sponsored && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetSponsorship(project.id, 0)}
                      className="h-8 px-3 rounded-lg border border-red-200 bg-red-50/70 text-xs font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ml-auto"
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
