'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';

interface ConversationActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isBusy?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConversationActionModal: React.FC<ConversationActionModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  isBusy = false,
  destructive = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000010] flex items-center justify-center bg-[#020611]/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isBusy) onCancel();
    }}>
      <div className="w-full max-w-sm rounded-[26px] border border-white/15 bg-[linear-gradient(145deg,rgba(22,42,71,.98),rgba(7,16,32,.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,.65),inset_0_1px_0_rgba(255,255,255,.12)]" role="dialog" aria-modal="true" aria-labelledby="conversation-action-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="conversation-action-title" className="text-base font-black text-white">{title}</h2>
            <p className="mt-2 text-xs leading-5 text-[#A9BBD4]">{message}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={isBusy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#9FB1CA] hover:text-white disabled:opacity-40" aria-label="Pencereyi kapat">
            <X size={15} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isBusy} className="h-10 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-xs font-bold text-[#C6D4E7] hover:bg-white/[0.1] disabled:opacity-40">
            Vazgeç
          </button>
          <button type="button" onClick={onConfirm} disabled={isBusy} className={`flex h-10 min-w-28 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold text-white disabled:opacity-50 ${destructive ? 'border-rose-300/20 bg-rose-600 hover:bg-rose-500' : 'border-blue-300/20 bg-[#2858B0] hover:bg-[#3269C7]'}`}>
            {isBusy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
