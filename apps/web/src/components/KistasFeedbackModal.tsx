'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  LogIn,
  CheckCircle2,
  Info,
  X,
  HeartHandshake,
  AlertCircle,
} from 'lucide-react';
import { Typewriter } from './Typewriter';

export type KistasFeedbackType = 'auth' | 'info' | 'success' | 'warning' | 'error';

export interface KistasFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: KistasFeedbackType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  redirectUrl?: string;
  highlight?: string;
}

export const KistasFeedbackModal: React.FC<KistasFeedbackModalProps> = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  onConfirm,
  redirectUrl,
  highlight,
}) => {
  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'auth':
        return (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3269C7]/30 bg-gradient-to-b from-white to-[#EEF5FF] text-[#3269C7] shadow-[0_4px_24px_rgba(50,105,199,0.35),0_0_14px_rgba(96,165,250,0.25)]">
            <LogIn size={26} className="text-[#3269C7]" />
          </div>
        );
      case 'success':
        return (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-white to-[#ECFDF5] text-emerald-600 shadow-[0_4px_24px_rgba(16,185,129,0.35)]">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
        );
      case 'warning':
        return (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-white to-[#FFFBEB] text-amber-600 shadow-[0_4px_24px_rgba(245,158,11,0.35)]">
            <HeartHandshake size={26} className="text-amber-600" />
          </div>
        );
      case 'error':
        return (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-gradient-to-b from-white to-[#FFF1F2] text-rose-600 shadow-[0_4px_24px_rgba(244,63,94,0.35)]">
            <AlertCircle size={26} className="text-rose-600" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/30 bg-gradient-to-b from-white to-[#F0F9FF] text-sky-600 shadow-[0_4px_24px_rgba(14,165,233,0.35)]">
            <Info size={26} className="text-sky-600" />
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="k-modal-glass-card w-full max-w-md overflow-hidden p-6 sm:p-7 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-xs"
          title="Kapat"
        >
          <X size={16} />
        </button>

        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3B82F6]/30 via-[#60A5FA]/15 to-transparent blur-3xl" />

        {/* Icon */}
        {renderIcon()}

        {/* Title */}
        <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-[#F8FAFC] to-[#93C5FD] bg-clip-text text-transparent">
          {title}
        </h3>

        {/* Subtitle with Typewriter text animation */}
        <div className="my-3 min-h-[44px] flex items-center justify-center">
          <Typewriter
            key={message}
            words={[message]}
            speed={35}
            cursorChar="|"
            minHeight="auto"
            highlight={highlight || (type === 'auth' ? 'giriş yapın' : undefined)}
            className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed max-w-sm mx-auto"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          {type === 'auth' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="k-modal-glass-btn-secondary flex-1 h-11 rounded-xl font-semibold text-xs active:scale-98 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <Link
                href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                className="k-modal-glass-btn-primary flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs active:scale-98 cursor-pointer"
              >
                <LogIn size={16} className="text-white drop-shadow-sm" />
                <span>{confirmLabel || 'Giriş Yap'}</span>
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className="k-modal-glass-btn-primary w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs active:scale-98 cursor-pointer"
            >
              <span>{confirmLabel || 'Anladım'}</span>
            </button>
          )}
        </div>

        {type === 'auth' && (
          <div className="mt-4 pt-1 text-center">
            <span className="text-[11px] text-[#94A3B8]">Hesabınız yok mu?</span>{' '}
            <Link
              href={redirectUrl ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/signup'}
              onClick={onClose}
              className="text-[11px] font-bold text-[#60A5FA] hover:text-[#93C5FD] transition-colors underline underline-offset-2 cursor-pointer drop-shadow-xs"
            >
              Ücretsiz Kayıt Ol
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default KistasFeedbackModal;
