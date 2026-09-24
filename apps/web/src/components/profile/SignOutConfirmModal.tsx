'use client';

import React from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { Typewriter } from '../Typewriter';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  isSigningOut: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  isOpen,
  isSigningOut,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="k-modal-glass-card w-full max-w-md overflow-hidden p-6 sm:p-7 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-rose-500/30 via-rose-500/15 to-transparent blur-3xl" />

        {/* Red Logout Icon (Kıstas Cam Yüzey) */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-gradient-to-b from-white to-[#FFF1F2] text-rose-600 shadow-[0_8px_25px_rgba(225,29,72,0.35),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-xl">
          <LogOut size={24} className="text-rose-600" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-[#F8FAFC] to-[#FDA4AF] bg-clip-text text-transparent">
          Oturumu Kapat
        </h3>

        {/* Subtitle with Typewriter */}
        <div className="my-3 min-h-[44px] flex items-center justify-center">
          <Typewriter
            words={['Kıstas hesabınızdan ayrılmak istediğinize emin misiniz?']}
            speed={40}
            cursorChar="|"
            minHeight="auto"
            highlight="ayrılmak istediğinize"
            highlightClassName="text-rose-400 font-bold drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]"
            className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed max-w-sm mx-auto"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onClose}
            className="k-modal-glass-btn-secondary flex-1 h-11 rounded-xl font-semibold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onConfirm}
            className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-r from-[#ba0816] via-[#dc2626] to-[#ef4444] font-bold text-xs text-white shadow-[0_8px_25px_rgba(220,38,38,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_10px_32px_rgba(220,38,38,0.65)] backdrop-blur-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSigningOut ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Çıkış Yapılıyor...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>Oturumu Kapat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
