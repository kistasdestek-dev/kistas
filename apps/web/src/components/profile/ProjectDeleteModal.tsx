'use client';

import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import type { Listing } from '@kistas/shared';
import { Typewriter } from '../Typewriter';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ProjectDeleteModalProps {
  project: Listing | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ProjectDeleteModal: React.FC<ProjectDeleteModalProps> = ({
  project,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  useBodyScrollLock(Boolean(project));

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-sm overflow-hidden p-6 sm:p-7 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-rose-500/30 via-rose-500/15 to-transparent blur-3xl" />

        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-gradient-to-b from-white to-[#FFF1F2] text-rose-600 shadow-[0_8px_25px_rgba(225,29,72,0.35),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-xl">
          <Trash2 size={24} className="text-rose-600" />
        </div>

        <p className="text-[10px] font-bold tracking-widest text-rose-400 uppercase">
          Kalıcı İşlem
        </p>
        <h3 className="mt-1 text-xl font-bold tracking-tight bg-gradient-to-r from-white via-[#F8FAFC] to-[#FDA4AF] bg-clip-text text-transparent">
          Projeyi sil?
        </h3>

        <div className="my-3 min-h-[44px] flex items-center justify-center">
          <Typewriter
            words={[`“${project.title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`]}
            speed={35}
            cursorChar="|"
            minHeight="auto"
            highlight="Bu işlem geri alınamaz"
            highlightClassName="text-rose-400 font-bold drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]"
            className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed max-w-xs mx-auto"
          />
        </div>

        <div className="mt-6 flex items-center gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="k-modal-glass-btn-secondary flex-1 h-11 rounded-xl font-semibold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex-[1.4] h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-r from-[#ba0816] via-[#dc2626] to-[#ef4444] font-bold text-xs text-white shadow-[0_8px_25px_rgba(220,38,38,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_10px_32px_rgba(220,38,38,0.65)] backdrop-blur-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Kalıcı Olarak Sil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
