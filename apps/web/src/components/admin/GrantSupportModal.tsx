'use client';

import React, { useState } from 'react';
import { X, Heart, Eye, Loader2, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface GrantSupportModalProps {
  isOpen: boolean;
  listingId: string | null;
  listingTitle: string;
  type: 'support' | 'views';
  onClose: () => void;
  onSuccess: () => void;
}

export const GrantSupportModal: React.FC<GrantSupportModalProps> = ({
  isOpen,
  listingId,
  listingTitle,
  type,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('10');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  if (!isOpen || !listingId) return null;

  const isSupport = type === 'support';
  const presets = isSupport ? [5, 10, 25, 50, 100] : [50, 100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      setError('Lütfen geçerli bir pozitif sayı girin.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const rpcName = isSupport ? 'admin_grant_project_support' : 'admin_grant_project_views';
      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        p_listing_id: listingId,
        p_amount: num,
      });

      if (rpcError || !data?.success) {
        throw new Error(rpcError?.message || 'İşlem gerçekleştirilemedi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-md overflow-hidden p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className={`pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full blur-3xl ${
          isSupport
            ? 'bg-gradient-to-b from-rose-500/25 via-rose-500/10 to-transparent'
            : 'bg-gradient-to-b from-emerald-500/25 via-emerald-500/10 to-transparent'
        }`} />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-xs backdrop-blur-xl ${
                isSupport
                  ? 'border-rose-500/30 bg-gradient-to-b from-white to-[#FFF1F2] text-rose-600 shadow-[0_4px_18px_rgba(225,29,72,0.25)]'
                  : 'border-emerald-500/30 bg-gradient-to-b from-white to-[#ECFDF5] text-emerald-600 shadow-[0_4px_18px_rgba(16,185,129,0.25)]'
              }`}
            >
              {isSupport ? <Heart size={20} /> : <Eye size={20} />}
            </div>
            <div>
              <p className={`text-[10px] font-bold tracking-wider uppercase ${isSupport ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isSupport ? 'YÖNETİM DESTEĞİ' : 'GÖRÜNÜRLÜK ARTIŞI'}
              </p>
              <h3 className="text-base font-bold text-white tracking-tight truncate max-w-[240px]">
                {listingTitle}
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Tanımlanacak Miktar ({isSupport ? 'Destek Oyu' : 'Görüntülenme'})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="10000"
              disabled={busy}
              className="w-full h-11 px-3.5 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white placeholder-[#64748B] focus:outline-none focus:border-[#60A5FA] backdrop-blur-md transition-colors"
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  amount === String(val)
                    ? 'border-[#60A5FA]/60 bg-[#3269C7]/30 text-[#93C5FD] shadow-[0_0_12px_rgba(50,105,199,0.35)]'
                    : 'border-white/10 bg-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10'
                }`}
              >
                +{val}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="k-modal-glass-btn-secondary flex-1 h-11 rounded-xl font-semibold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={busy}
              className="k-modal-glass-btn-primary flex-[1.4] h-11 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>Tanımla</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
