'use client';

import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface AnnouncementConfirmModalProps {
  isOpen: boolean;
  isSending: boolean;
  projectTitle?: string;
  announcementTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const AnnouncementConfirmModal: React.FC<AnnouncementConfirmModalProps> = ({
  isOpen,
  isSending,
  projectTitle,
  announcementTitle,
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
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3269C7]/30 via-[#3269C7]/15 to-transparent blur-3xl" />

        {/* Kıstas Cam Yüzey İkon Kutusu */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3269C7]/30 bg-gradient-to-b from-white to-[#EFF6FF] text-[#1746A2] shadow-[0_8px_25px_rgba(50,105,199,0.35),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-xl">
          <Send size={24} className="text-[#1746A2]" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-[#F8FAFC] to-[#93C5FD] bg-clip-text text-transparent">
          Topluluk Bildirimi
        </h3>

        {/* Message */}
        <div className="my-3 min-h-[44px] flex items-center justify-center">
          <p className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed max-w-sm mx-auto">
            {projectTitle ? (
              <>
                <strong className="text-white font-bold">&quot;{projectTitle}&quot;</strong> projesiyle ilgili bildirim tüm kayıtlı kullanıcılara iletilecek. Devam etmek istiyor musunuz?
              </>
            ) : (
              <>
                <strong className="text-white font-bold">&quot;{announcementTitle}&quot;</strong> başlıklı duyuru tüm kayıtlı kullanıcılara bildirim olarak iletilecek. Devam etmek istiyor musunuz?
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="k-modal-glass-btn-secondary flex-1 h-11 rounded-xl font-semibold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={isSending}
            onClick={onConfirm}
            className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-r from-[#1746A2] via-[#2563EB] to-[#3B82F6] font-bold text-xs text-white shadow-[0_8px_25px_rgba(37,99,235,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_10px_32px_rgba(37,99,235,0.65)] backdrop-blur-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Bildirimi Gönder</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
