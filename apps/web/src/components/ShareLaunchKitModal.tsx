'use client';

import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Share2, Sparkles, ExternalLink } from 'lucide-react';
import { GlassIconButton } from './GlassIconButton';

export interface ShareLaunchKitModalProps {
  isOpen: boolean;
  listingId: string;
  listingTitle: string;
  listingTagline?: string | null;
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

export const ShareLaunchKitModal: React.FC<ShareLaunchKitModalProps> = ({
  isOpen,
  listingId,
  listingTitle,
  listingTagline,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const siteOrigin = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://www.kistas.com.tr';
  }, []);

  const projectUrl = `${siteOrigin}/listings/${listingId}`;
  const safeProjectUrl = toSafeHttpsUrl(projectUrl);

  const launchTweetText = useMemo(() => {
    const taglinePart = listingTagline ? `\n\n"${listingTagline}"` : '';
    return `🚀 "${listingTitle}" projemiz @KistasDestek üzerinde lansmana çıktı!${taglinePart}\n\nProjeyi incelemek, geri bildirim vermek ve destek olmak için:\n👉 ${projectUrl}\n\n#Kıstas #Girişimcilik #BuildInPublic`;
  }, [listingTitle, listingTagline, projectUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(launchTweetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleTwitterShare = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(launchTweetText)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleLinkedInShare = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(projectUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const handleWhatsAppShare = () => {
    const waText = `🚀 ${listingTitle} projemiz Kıstas'ta lansmanda! İnceleyip destek verirseniz çok sevinirim: ${projectUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0B111E]/95 p-6 shadow-2xl backdrop-blur-2xl text-white sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Lansman ve Paylaşım Kiti
                <Sparkles size={16} className="text-amber-400" />
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Projenizi topluluğa duyurun, ilk desteklerinizi toplayın
              </p>
            </div>
          </div>
          <GlassIconButton
            icon={X}
            size={36}
            iconSize={18}
            onClick={onClose}
            title="Kapat"
          />
        </div>

        {/* Quick Share Buttons */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {/* X / Twitter */}
          <button
            type="button"
            onClick={handleTwitterShare}
            className="group flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-blue-400/40 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border border-white/20 group-hover:border-blue-400">
              <span className="font-bold text-sm">𝕏</span>
            </div>
            <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
              X'te Paylaş
            </span>
          </button>

          {/* LinkedIn */}
          <button
            type="button"
            onClick={handleLinkedInShare}
            className="group flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-blue-500/40 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-xs">
              in
            </div>
            <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
              LinkedIn
            </span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="group flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-xs">
              WA
            </div>
            <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
              WhatsApp
            </span>
          </button>
        </div>

        {/* Optimized Text Area */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Hazır Lansman Metni
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Kopyalandı!' : 'Metni Kopyala'}</span>
            </button>
          </div>
          <div className="relative rounded-2xl bg-[#06090F] border border-white/10 p-3.5 text-xs text-[#CBD5E1] font-mono leading-relaxed whitespace-pre-wrap select-all">
            {launchTweetText}
          </div>
        </div>

        {/* Bottom Direct Link Action */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-[#64748B] truncate max-w-[280px]">
            {projectUrl}
          </span>
          <a
            href={safeProjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition-colors"
          >
            <span>Önizle</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
