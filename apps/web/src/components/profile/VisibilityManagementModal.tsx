'use client';

import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  Globe2,
  Layers3,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import type { Listing } from '@kistas/shared';
import { purchaseSponsorAction } from '@/app/actions/sponsors';
import { SPONSORS_CHANGED_EVENT } from '@/lib/sponsor-refresh';
import {
  getVisibilityErrorMessage,
  VISIBILITY_PACKAGES,
  type VisibilityScope,
} from '@/lib/visibility';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { ShinyButton } from '../ui/shiny-button';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface VisibilityManagementModalProps {
  isOpen: boolean;
  listings: Listing[];
  initialListingId?: string | null;
  boostCredits: number;
  onClose: () => void;
  onSuccess: (newCredits?: number) => void;
}

const formatExpiry = (value?: string | null) => {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getActiveExpiry = (listing: Listing, scope: VisibilityScope) =>
  scope === 'global' ? listing.boosted_until : listing.category_boosted_until;

export const VisibilityManagementModal: React.FC<VisibilityManagementModalProps> = ({
  isOpen,
  listings,
  initialListingId,
  boostCredits,
  onClose,
  onSuccess,
}) => {
  const purchaseInFlight = useRef(false);
  const initialized = useRef<{ listingId: string | null } | null>(null);
  const activeListings = useMemo(
    () => listings.filter((listing) => listing.status === 'active'),
    [listings]
  );
  const [selectedListingId, setSelectedListingId] = useState('');
  const [scope, setScope] = useState<VisibilityScope>('category');
  const [selectedPackageId, setSelectedPackageId] = useState(VISIBILITY_PACKAGES.category[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) { initialized.current = null; return; }
    if (initialized.current && initialized.current.listingId === (initialListingId ?? null)) return;
    if (activeListings.length) initialized.current = { listingId: initialListingId ?? null };
    const preferredListing = activeListings.find((listing) => listing.id === initialListingId);
    setSelectedListingId(preferredListing?.id ?? activeListings[0]?.id ?? '');
    setScope('category');
    setSelectedPackageId(VISIBILITY_PACKAGES.category[0].id);
    setError('');
    setSuccessMsg('');
  }, [activeListings, initialListingId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [busy, isOpen, onClose]);

  if (!isOpen) return null;

  const packages = VISIBILITY_PACKAGES[scope];
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[0];
  const selectedListing = activeListings.find((listing) => listing.id === selectedListingId);
  const remainingCredits = boostCredits - selectedPackage.creditCost;
  const hasEnoughCredits = remainingCredits >= 0;
  const activeExpiry = selectedListing ? getActiveExpiry(selectedListing, scope) : null;
  const formattedExpiry = formatExpiry(activeExpiry);
  const isAlreadyActive = Boolean(activeExpiry && Date.parse(activeExpiry) > Date.now());

  const changeScope = (nextScope: VisibilityScope) => {
    if (busy || successMsg) return;
    setScope(nextScope);
    setSelectedPackageId(VISIBILITY_PACKAGES[nextScope][0].id);
    setError('');
  };

  const handleApplyBoost = async () => {
    if (!selectedListing || purchaseInFlight.current || busy || successMsg || !hasEnoughCredits) return;

    purchaseInFlight.current = true;
    setBusy(true);
    setError('');

    try {
      const result = await purchaseSponsorAction(selectedListing.id, selectedPackage.id);
      if (!result.success) { setError(result.error); return; }

      const scopeLabel = scope === 'global' ? 'Genel Keşfet' : 'Kategori Vitrini';
      setSuccessMsg(`“${selectedListing.title}” için ${scopeLabel} görünürlüğü etkinleştirildi.`);
      // Refresh is a separate outcome; never offer to repeat a completed credit spend.
      try {
        window.dispatchEvent(new Event(SPONSORS_CHANGED_EVENT));
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel(SPONSORS_CHANGED_EVENT);
          channel.postMessage('changed');
          channel.close();
        }
        onSuccess(result.newCredits);
      } catch { /* The purchase succeeded; periodic refresh will catch up. */ }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : undefined;
      setError(getVisibilityErrorMessage(message));
    } finally {
      purchaseInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000000] flex items-end justify-center overscroll-none bg-[#020712]/80 p-0 backdrop-blur-xl sm:items-center sm:p-4"
      onMouseDown={busy ? undefined : onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="visibility-modal-title"
        className="k-modal-glass-card relative max-h-[94dvh] w-full max-w-2xl touch-pan-y overflow-y-auto overscroll-contain rounded-b-none border-b-0 p-5 sm:rounded-[28px] sm:border-b sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-12 -top-24 h-52 rounded-full bg-blue-500/20 blur-[72px]" />

        <header className="relative flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="min-w-0">
            <h2 id="visibility-modal-title" className="text-xl font-black tracking-tight text-white">Vitrin Yönetimi</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">Projeni doğru vitrinde, doğru süreyle daha fazla kullanıcıya ulaştır.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Vitrin Yönetimi penceresini kapat"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-slate-300 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </header>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-blue-300/20 bg-blue-400/[0.08] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-200"><Wallet size={14} /> Mevcut bakiye</div>
            <p className="mt-2 text-2xl font-black text-white">{boostCredits.toLocaleString('tr-TR')} <span className="text-xs font-bold text-blue-200">kredi</span></p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300"><ShieldCheck size={14} /> İşlem sonrası</div>
            <p className={`mt-2 text-2xl font-black ${hasEnoughCredits ? 'text-white' : 'text-rose-300'}`}>
              {Math.max(0, remainingCredits).toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-300">kredi</span>
            </p>
          </div>
        </div>

        {activeListings.length === 0 ? (
          <div className="relative mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center">
            <Sparkles className="mx-auto text-blue-300" size={24} />
            <h3 className="mt-3 text-sm font-bold text-white">Vitrine taşınabilecek proje bulunmuyor</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">Yalnızca yayındaki projeler görünürlük paketlerinden yararlanabilir.</p>
            <Link href="/create-listing" onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-200">
              Yeni lansman oluştur <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <div className="relative mt-6">
              <h3 className="mb-2.5 text-xs font-bold text-white">1. Projeni seç</h3>
              <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {activeListings.map((listing) => {
                  const isSelected = listing.id === selectedListingId;
                  return (
                    <button
                      key={listing.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={busy || Boolean(successMsg)}
                      onClick={() => { setSelectedListingId(listing.id); setError(''); }}
                      className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition disabled:cursor-not-allowed ${isSelected ? 'border-blue-400/60 bg-blue-400/15 shadow-[0_12px_32px_-20px_rgba(59,130,246,0.9)]' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.065]'}`}
                    >
                      {listing.logo_url ? (
                        <AutoTransparentLogo src={listing.logo_url} alt="" className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_6px_12px_rgba(59,130,246,0.25)]" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-sm font-black text-blue-300">{listing.title.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-white">{listing.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{listing.tagline || 'Kıstas’ta yayında'}</span>
                      </span>
                      {isSelected && <Check size={16} className="shrink-0 text-blue-300" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-6">
              <h3 className="mb-2.5 text-xs font-bold text-white">2. Vitrin konumunu seç</h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'category' as const, icon: Layers3, title: 'Kategori Vitrini', copy: 'Doğrudan hedef kitlene ulaş', accent: 'text-cyan-300' },
                  { id: 'global' as const, icon: Globe2, title: 'Genel Keşfet', copy: 'Platform genelinde görün', accent: 'text-blue-300' },
                ]).map((option) => {
                  const Icon = option.icon;
                  const isSelected = scope === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={busy || Boolean(successMsg)}
                      onClick={() => changeScope(option.id)}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${isSelected ? 'border-blue-400/60 bg-blue-400/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.065]'}`}
                    >
                      <span className="flex items-center gap-2 text-xs font-bold text-white"><Icon size={16} className={option.accent} /> {option.title}</span>
                      <span className="mt-1.5 block text-[10px] leading-4 text-slate-400">{option.copy}</span>
                    </button>
                  );
                })}
              </div>
              {isAlreadyActive && formattedExpiry && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-[10px] text-emerald-200">
                  <Clock3 size={13} /> Bu konumdaki mevcut görünürlük {formattedExpiry} tarihine kadar aktif. Yeni süre sonuna eklenir.
                </div>
              )}
            </div>

            <div className="relative mt-6">
              <h3 className="mb-2.5 text-xs font-bold text-white">3. Süre paketini seç</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {packages.map((item) => {
                  const isSelected = item.id === selectedPackageId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={busy || Boolean(successMsg)}
                      onClick={() => { setSelectedPackageId(item.id); setError(''); }}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${isSelected ? 'border-blue-400/60 bg-gradient-to-b from-blue-400/20 to-blue-500/[0.08] shadow-[0_16px_36px_-24px_rgba(59,130,246,0.95)]' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.065]'}`}
                    >
                      <span className={`text-[9px] font-bold uppercase tracking-wide ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{item.badge}</span>
                      <span className="mt-2 block text-lg font-black text-white">{item.title}</span>
                      <span className="mt-1 block min-h-8 text-[10px] leading-4 text-slate-400">{item.description}</span>
                      <span className="mt-3 block text-xs font-black text-blue-200">{item.creditCost} kredi</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.08] p-3 text-xs text-rose-200">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] p-3 text-xs text-emerald-200">
            <Check size={15} className="shrink-0" /> {successMsg}
          </div>
        )}

        <footer className="relative mt-6 border-t border-white/10 pt-5">
          {!hasEnoughCredits && activeListings.length > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-center text-xs text-slate-300 sm:text-left">Bu paket için <strong className="text-white">{Math.abs(remainingCredits)} kredi</strong> daha gerekiyor.</p>
              <ShinyButton href="/credits" onClick={onClose} className="shiny-cta--citrus min-h-11 w-full px-6 text-xs font-bold sm:w-auto">Kredi Al</ShinyButton>
            </div>
          ) : successMsg ? (
            <ShinyButton onClick={onClose} className="min-h-11 w-full text-xs font-bold">Tamam</ShinyButton>
          ) : (
            <ShinyButton onClick={() => startTransition(handleApplyBoost)} disabled={busy || !selectedListing} className="shiny-cta--citrus min-h-12 w-full text-xs font-extrabold">
              <span className="inline-flex items-center justify-center gap-2">
                {busy && <Loader2 size={16} className="animate-spin" />}
                {busy ? 'Güvenli işlem tamamlanıyor...' : `${isAlreadyActive ? 'Görünürlüğü Uzat' : 'Projeyi Öne Çıkar'} · ${selectedPackage.creditCost} Kredi`}
              </span>
            </ShinyButton>
          )}
        </footer>
      </section>
    </div>
  );
};
