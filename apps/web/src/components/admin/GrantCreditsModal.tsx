'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface GrantCreditsModalProps {
  isOpen: boolean;
  userId: string | null;
  userName: string;
  onClose: () => void;
  onSuccess: (newCredits?: number) => void;
}

export const GrantCreditsModal: React.FC<GrantCreditsModalProps> = ({
  isOpen,
  userId,
  userName,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  if (!isOpen || !userId) return null;

  const presets = [50, 100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      setError('Lütfen geçerli bir kredi miktarı girin.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_grant_credits', {
        p_user_id: userId,
        p_amount: num,
      });

      if (rpcError || !data?.success) {
        throw new Error(rpcError?.message || 'Kredi tanımlanamadı.');
      }

      onSuccess(data.new_credits);
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
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-amber-500/25 via-amber-500/10 to-transparent blur-3xl" />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-white to-[#FFFBEB] text-amber-600 shadow-[0_4px_18px_rgba(245,158,11,0.25)] backdrop-blur-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                KREDİ TANIMLAMA
              </p>
              <h3 className="text-base font-bold text-white tracking-tight truncate max-w-[240px]">
                {userName}
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
              Yüklenecek Kıstas Vitrin Kredisi
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="50000"
              disabled={busy}
              className="w-full h-11 px-3.5 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white placeholder-[#64748B] focus:outline-none focus:border-[#60A5FA] backdrop-blur-md transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  amount === String(val)
                    ? 'border-amber-400/50 bg-amber-500/25 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
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
              className="flex-[1.4] h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-xs font-bold text-white shadow-[0_4px_16px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>Kredi Yükle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
