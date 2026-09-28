'use client';

import React, { useState, useMemo } from 'react';
import { X, Code, Copy, Check, ExternalLink, Moon, Sun } from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export interface BadgeCodeModalProps {
  isOpen: boolean;
  listingId?: string | null;
  listingTitle?: string;
  badgeCode?: string;
  badgeType?: 'markdown' | 'html';
  onClose: () => void;
}

function toSafeHttpsUrl(value?: string | null): string {
  if (!value) return '#';
  try {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('//')) return '#';
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '#';
    return parsed.toString();
  } catch {
    return '#';
  }
}

export const BadgeCodeModal: React.FC<BadgeCodeModalProps> = ({
  isOpen,
  listingId,
  listingTitle = 'Projeniz',
  badgeCode: initialBadgeCode,
  badgeType: initialBadgeType,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [format, setFormat] = useState<'markdown' | 'html'>(initialBadgeType || 'markdown');
  useBodyScrollLock(isOpen);

  const siteOrigin = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://www.kistas.com.tr';
  }, []);

  const effectiveId = listingId || 'featured';
  const targetUrl = listingId ? `${siteOrigin}/listings/${listingId}` : siteOrigin;
  const badgeImageUrl = `${siteOrigin}/api/badge/${effectiveId}?theme=${theme}`;
  const safeBadgeImageUrl = toSafeHttpsUrl(badgeImageUrl);

  // Generated Embed Codes
  const code = useMemo(() => {
    if (initialBadgeCode && !listingId) {
      return initialBadgeCode;
    }
    if (format === 'markdown') {
      return `[![Featured on Kıstas](${badgeImageUrl})](${targetUrl})`;
    }
    return `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer">\n  <img src="${badgeImageUrl}" alt="Featured on Kıstas" style="height: 54px; width: 250px;" />\n</a>`;
  }, [initialBadgeCode, listingId, format, badgeImageUrl, targetUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-none p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="k-modal-glass-card w-full max-w-lg p-6 sm:p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3B82F6]/30 via-[#60A5FA]/10 to-transparent blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <GlassIconButton icon={Code} size={42} iconSize={19} ariaLabel="Rozet Kodu" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Kıstas Canlı Rozet Stüdyosu
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                {listingTitle} için web sitesi ve GitHub rozeti
              </p>
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

        {/* 1. Live Badge Preview Stage */}
        <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-6 relative">
          <span className="absolute top-2.5 left-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
            Canlı Önizleme
          </span>
          <div className="mt-2 py-1 flex items-center justify-center">
            { }
            <img
              src={`/api/badge/${effectiveId}?theme=${theme}`}
              alt="Kıstas Rozet Önizlemesi"
              className="h-[54px] w-[250px] object-contain transition-all duration-200"
            />
          </div>
        </div>

        {/* 2. Customization Controls */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Theme Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5">
              Tema Seçimi
            </label>
            <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Moon size={13} />
                <span>Koyu</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Sun size={13} />
                <span>Açık</span>
              </button>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5">
              Kod Formatı
            </label>
            <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFormat('markdown')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  format === 'markdown'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setFormat('html')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  format === 'html'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                HTML
              </button>
            </div>
          </div>
        </div>

        {/* 3. Generated Code Box */}
        <div className="mb-5 relative">
          <div className="p-3.5 rounded-2xl border border-white/10 bg-black/50 font-mono text-[11.5px] text-[#93C5FD] break-all select-all max-h-24 overflow-y-auto leading-relaxed">
            {code}
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="k-modal-glass-btn-primary flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs active:scale-98 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-400" />
                <span>Koda Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Kodu Kopyala</span>
              </>
            )}
          </button>
          <a
            href={safeBadgeImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="SVG dosyasını yeni sekmede aç"
          >
            <ExternalLink size={14} className="text-[#94A3B8]" />
            <span className="hidden sm:inline">SVG İncele</span>
          </a>
        </div>
      </div>
    </div>
  );
};
