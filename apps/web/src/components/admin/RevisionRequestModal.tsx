'use client';

import React, { useState } from 'react';
import { X, Wrench, Loader2, Send, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface RevisionRequestModalProps {
  isOpen: boolean;
  listingId: string | null;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RevisionRequestModal: React.FC<RevisionRequestModalProps> = ({
  isOpen,
  listingId,
  listingTitle,
  onClose,
  onSuccess,
}) => {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  if (!isOpen || !listingId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setError('Lütfen üretici için detaylı düzeltme notunuzu yazın.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_request_listing_revision', {
        p_listing_id: listingId,
        p_feedback: feedback.trim(),
      });

      if (rpcError || !data?.success) {
        throw new Error(rpcError?.message || data?.error || 'Düzeltme talebi gönderilemedi.');
      }

      setFeedback('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-lg overflow-hidden p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-amber-500/25 via-amber-500/10 to-transparent blur-3xl" />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-white to-[#FFFBEB] border border-amber-500/30 text-amber-600 shadow-[0_4px_18px_rgba(245,158,11,0.25)] backdrop-blur-xl">
              <Wrench size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                REVİZYON TALEBİ
              </p>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[280px]">
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
              Üreticiye İletilecek Not ve Düzeltme Yönergeleri
            </label>
            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (error) setError('');
              }}
              rows={4}
              disabled={busy}
              placeholder="Örn: Proje ekran görüntüleriniz çözünürlük standartlarını karşılamıyor, lütfen en az 2 adet yüksek çözünürlüklü görsel ekleyiniz..."
              className="w-full p-3.5 rounded-2xl border border-white/15 bg-white/5 text-xs font-medium text-white placeholder-[#64748B] focus:outline-none focus:border-amber-400 backdrop-blur-md resize-none transition-colors"
            />
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
              disabled={busy || !feedback.trim()}
              className="flex-[1.4] h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-xs font-bold text-white shadow-[0_4px_16px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>Düzeltme İste</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
