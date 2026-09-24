'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Layers,
  Check,
  AlertCircle,
  Loader2,
  Wallet,
} from 'lucide-react';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { GlassIconButton } from '../GlassIconButton';
import { createClient } from '@/lib/supabase/browser';
import type { Listing } from '@kistas/shared';

interface VisibilityManagementModalProps {
  isOpen: boolean;
  listings: Listing[];
  initialListingId?: string | null;
  boostCredits: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface BoostPackage {
  id: string;
  hours: number;
  credits: number;
  title: string;
  badge?: string;
}

const GLOBAL_PACKAGES: BoostPackage[] = [
  { id: 'g-24', hours: 24, credits: 300, title: '1 Günlük Vitrin', badge: 'Hızlı Başlangıç' },
  { id: 'g-72', hours: 72, credits: 750, title: '3 Günlük Vitrin', badge: 'En Çok Tercih Edilen' },
  { id: 'g-168', hours: 168, credits: 1500, title: '7 Günlük Vitrin', badge: 'En Avantajlı' },
];

const CATEGORY_PACKAGES: BoostPackage[] = [
  { id: 'c-24', hours: 24, credits: 150, title: '1 Günlük Kategori', badge: 'Hızlı Başlangıç' },
  { id: 'c-72', hours: 72, credits: 400, title: '3 Günlük Kategori', badge: 'En Çok Tercih Edilen' },
  { id: 'c-168', hours: 168, credits: 800, title: '7 Günlük Kategori', badge: 'En Avantajlı' },
];

export const VisibilityManagementModal: React.FC<VisibilityManagementModalProps> = ({
  isOpen,
  listings,
  initialListingId,
  boostCredits,
  onClose,
  onSuccess,
}) => {
  const [selectedListingId, setSelectedListingId] = useState<string>(
    initialListingId || listings[0]?.id || ''
  );
  const [scope, setScope] = useState<'category' | 'global'>('global');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('g-72');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  const selectedListing = listings.find((l) => l.id === selectedListingId);
  const activePackages = scope === 'global' ? GLOBAL_PACKAGES : CATEGORY_PACKAGES;
  const currentPackage = activePackages.find((p) => p.id === selectedPackageId) || activePackages[0];

  const hasEnoughCredits = boostCredits >= currentPackage.credits;

  const handleApplyBoost = async () => {
    if (!selectedListing || busy || !hasEnoughCredits) return;

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const expiresAt = new Date(Date.now() + currentPackage.hours * 60 * 60 * 1000).toISOString();

      const updateData: Record<string, any> = {
        is_sponsored: true,
        sponsored_until: expiresAt,
      };

      if (scope === 'global') {
        updateData.is_global_sponsored = true;
      }

      const { error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', selectedListing.id);

      if (updateError) {
        throw updateError;
      }

      setSuccessMsg(`Tebrikler! “${selectedListing.title}” projeniz vitrine taşındı.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Sponsorluk işlemi tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-amber-500/25 via-amber-500/10 to-transparent blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <GlassIconButton icon={Sparkles} iconColor="#FBBF24" size={42} iconSize={20} ariaLabel="Vitrin Yönetimi" />
            <div>
              <p className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                GÖRÜNÜRLÜK MOTORU
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Vitrin Yönetimi & Sponsorluk
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-xs"
          >
            <X size={16} />
          </button>
        </div>

        {/* Project Selector */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-[#A1A1AA] mb-2">
            Öne Çıkarılacak Projeyi Seçin
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto pr-1">
            {listings.map((item) => {
              const isSelected = item.id === selectedListingId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedListingId(item.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#3269C7] bg-[#3269C7]/20 shadow-xs ring-2 ring-[#3269C7]/30'
                      : 'border-white/10 bg-[#161616] hover:bg-[#202020]'
                  }`}
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#222222] border border-white/10 flex items-center justify-center">
                    {item.logo_url ? (
                      <AutoTransparentLogo src={item.logo_url} alt={item.title} className="h-7 w-7 object-contain" />
                    ) : (
                      <span className="text-xs font-bold text-[#60A5FA]">
                        {item.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-[#A1A1AA] truncate">
                      {item.is_boosted || (item as any).is_sponsored ? '★ Zaten Vitrinde' : 'Standart Yayın'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope Selector: Keşfet Vitrini vs Kategori Vitrini */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-[#A1A1AA] mb-2">
            Vitrin Konumu
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setScope('global');
                setSelectedPackageId('g-72');
              }}
              className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                scope === 'global'
                  ? 'border-[#3269C7] bg-[#3269C7]/20 shadow-sm'
                  : 'border-white/10 bg-[#161616] hover:bg-[#202020]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Globe size={15} className="text-[#60A5FA]" />
                <span>Keşfet Vitrini</span>
              </div>
              <p className="mt-1 text-[10px] text-[#A1A1AA]">
                Tüm platform anasayfasında ve Keşfet akışında en üst sırada
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setScope('category');
                setSelectedPackageId('c-72');
              }}
              className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                scope === 'category'
                  ? 'border-[#3269C7] bg-[#3269C7]/20 shadow-sm'
                  : 'border-white/10 bg-[#161616] hover:bg-[#202020]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Layers size={15} className="text-[#60A5FA]" />
                <span>Kategori Vitrini</span>
              </div>
              <p className="mt-1 text-[10px] text-[#A1A1AA]">
                Projenin ait olduğu kategori sayfasının en tepesinde
              </p>
            </button>
          </div>
        </div>

        {/* Packages Selector */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-[#A1A1AA] mb-2">
            Süre Paketi Seçin
          </label>
          <div className="space-y-2">
            {activePackages.map((pkg) => {
              const isSelected = pkg.id === selectedPackageId;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400/60 bg-amber-400/10 shadow-sm ring-1 ring-amber-400/30'
                      : 'border-white/10 bg-[#161616] hover:bg-[#202020]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-amber-400 bg-amber-400' : 'border-[#444444]'
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{pkg.title}</span>
                        {pkg.badge && (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#A1A1AA]">
                        {pkg.hours} saat kesintisiz öncelik
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-white">
                      {pkg.credits} kredi
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="mt-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
            <Check size={14} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer / Submit */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Wallet size={16} className="text-[#60A5FA]" />
            <span>Mevcut Cüzdan:</span>
            <span className="text-[#60A5FA] font-black">{boostCredits.toLocaleString('tr-TR')} kredi</span>
          </div>

          <button
            type="button"
            disabled={busy || !hasEnoughCredits || !selectedListing}
            onClick={handleApplyBoost}
            className="w-full sm:w-auto h-11 px-6 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500 text-xs font-bold text-black shadow-md hover:bg-amber-400 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin text-black" />
                <span>İşleniyor...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{hasEnoughCredits ? 'Projeyi Vitrine Taşı' : 'Yetersiz Bakiye'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
