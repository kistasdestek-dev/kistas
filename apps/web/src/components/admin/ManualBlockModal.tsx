'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Loader2, Ban, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface ManualBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualBlockModal: React.FC<ManualBlockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [ipAddress, setIpAddress] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) {
      setError('Lütfen engellenecek IP adresini girin.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_quarantine_actor', {
        p_actor_id: null,
        p_ip_address: ipAddress.trim(),
        p_reason: reason.trim() || 'Yönetici tarafından manuel WAF kuralı ile engellendi.',
      });

      if (rpcError || (data && !data.success)) {
        throw new Error(rpcError?.message || data?.error || 'IP karantinaya alınamadı.');
      }

      setIpAddress('');
      setReason('');
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
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-rose-500/25 via-rose-500/10 to-transparent blur-3xl" />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/30 bg-gradient-to-b from-white to-[#FFF1F2] text-rose-600 shadow-[0_4px_18px_rgba(225,29,72,0.25)] backdrop-blur-xl">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                PARS DEFENDER WAF
              </p>
              <h3 className="text-base font-bold text-white tracking-tight">
                Manuel IP Karantinası
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
              Engellenecek IPv4 veya IPv6 Adresi
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => {
                setIpAddress(e.target.value);
                if (error) setError('');
              }}
              placeholder="Örn: 198.51.100.42"
              disabled={busy}
              className="w-full h-11 px-3.5 rounded-xl border border-white/15 bg-white/5 text-xs font-mono font-bold text-white placeholder-[#64748B] focus:outline-none focus:border-rose-500 backdrop-blur-md transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Engelleme Gerekçesi (Opsiyonel)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: SQL Injection taraması / Spam script"
              disabled={busy}
              className="w-full h-11 px-3.5 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-white placeholder-[#64748B] focus:outline-none focus:border-rose-500 backdrop-blur-md transition-colors"
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
              disabled={busy || !ipAddress.trim()}
              className="flex-[1.4] h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-xs font-bold text-white shadow-[0_4px_16px_rgba(225,29,72,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Ban size={15} />
              )}
              <span>Karantinaya Al</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
