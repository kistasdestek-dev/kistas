'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface GrantCreditsModalProps {
  isOpen: boolean;
  userId: string | null;
  userName: string;
  currentCredits: number;
  onClose: () => void;
  onSuccess: (newCredits?: number) => void;
}

export const GrantCreditsModal: React.FC<GrantCreditsModalProps> = ({
  isOpen,
  userId,
  userName,
  currentCredits,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('Topluluk katkısı');

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
    };
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${scrollY}px`,
      left: '0',
      right: '0',
      overflow: 'hidden',
    });
    return () => {
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const parsedAmount = useMemo(() => Number.parseInt(amount, 10) || 0, [amount]);

  if (!isOpen || !userId) return null;

  const presets = [50, 100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (isNaN(num) || num < 1 || num > 10000) {
      setError('Kredi miktarı 1 ile 10.000 arasında olmalıdır.');
      return;
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5 || normalizedReason.length > 240) {
      setError('Yönetici notu 5 ile 240 karakter arasında olmalıdır.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_grant_credits', {
        p_user_id: userId,
        p_amount: num,
        p_reason: normalizedReason,
        p_request_id: crypto.randomUUID(),
      });

      if (rpcError || !data?.success) {
        const message = rpcError?.message || '';
        if (message.includes('FORBIDDEN')) throw new Error('Bu işlem için topluluk yönetimi yetkisi gerekiyor.');
        if (message.includes('PROFILE_NOT_FOUND')) throw new Error('Kullanıcı profili bulunamadı.');
        if (message.includes('INVALID_')) throw new Error('Kredi miktarı veya yönetici notu geçersiz.');
        throw new Error('Kredi şu anda tanımlanamadı. Lütfen tekrar deneyin.');
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
    <div className="fixed inset-0 z-[1000001] flex items-end justify-center overflow-y-auto overscroll-contain bg-black/75 p-3 backdrop-blur-xl animate-in fade-in duration-200 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="k-modal-glass-card relative w-full max-w-md overflow-y-auto p-5 sm:p-7 max-h-[calc(100dvh-1.5rem)]"
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
            aria-label="Kredi penceresini kapat"
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
              max="10000"
              disabled={busy}
              className="w-full h-11 px-3.5 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white placeholder-[#64748B] focus:outline-none focus:border-[#60A5FA] backdrop-blur-md transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Mevcut bakiye</p>
              <p className="mt-1 text-sm font-black text-white">{currentCredits.toLocaleString('tr-TR')}</p>
            </div>
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-blue-300/70">İşlem sonrası</p>
              <p className="mt-1 text-sm font-black text-[#A9CAFF]">{(currentCredits + parsedAmount).toLocaleString('tr-TR')}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">Yönetici Notu</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={5}
              maxLength={240}
              rows={2}
              disabled={busy}
              className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-xs font-semibold text-white placeholder-[#64748B] focus:border-[#60A5FA] focus:outline-none"
              placeholder="Kredinin verilme nedenini yazın"
            />
            <p className="mt-1 text-right text-[9px] text-slate-500">{reason.length}/240</p>
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

          <div className="flex items-center gap-3 pt-2 pb-[max(0px,env(safe-area-inset-bottom))]">
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
              className="shiny-cta flex-[1.4] min-h-11 text-xs font-bold disabled:opacity-50"
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
