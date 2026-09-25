'use client';

import React from 'react';
import { Bell, Megaphone, MessageSquare, X } from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface GlobalNotificationCardProps {
  type: 'message' | 'admin_announcement';
  title: string;
  body: string;
  actionLabel: string;
  logoUrl?: string;
  logoAlt?: string;
  count?: number;
  onOpen?: () => void;
  onDismiss?: () => void;
  preview?: boolean;
}

export const GlobalNotificationCard: React.FC<GlobalNotificationCardProps> = ({
  type,
  title,
  body,
  actionLabel,
  logoUrl,
  logoAlt,
  count = 1,
  onOpen,
  onDismiss,
  preview = false,
}) => {
  const FallbackIcon = type === 'admin_announcement' ? Megaphone : MessageSquare;

  return (
    <div className={`k-notification-glass overflow-hidden rounded-[22px] ${preview ? 'w-full max-w-sm' : 'w-full'}`}>
      <div className="flex items-start gap-3 p-3.5">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="group flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform group-hover:scale-[1.03]">
            {logoUrl ? (
              <AutoTransparentLogo
                src={logoUrl}
                alt={logoAlt || title}
                className="h-full w-full object-cover"
              />
            ) : (
              <FallbackIcon size={18} />
            )}
          </span>

          <span className="min-w-0 flex-1 py-0.5">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13px] font-bold tracking-[-0.01em] text-white">{title}</span>
              {count > 1 && (
                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/90">
                  {count} yeni
                </span>
              )}
            </span>
            <span className="mt-1 block line-clamp-2 text-[11px] font-medium leading-relaxed text-white/75">{body}</span>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/90 transition-colors group-hover:text-white">
              <Bell size={10} /> {actionLabel}
            </span>
          </span>
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-0.5 rounded-full p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Bildirimi kapat"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
