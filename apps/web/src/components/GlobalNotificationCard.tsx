'use client';

import React from 'react';
import { Bell, Megaphone, MessageSquare, X } from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface GlobalNotificationCardProps {
  type: 'message' | 'admin_announcement';
  title: string;
  body: string;
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
  logoUrl,
  logoAlt,
  count = 1,
  onOpen,
  onDismiss,
  preview = false,
}) => {
  const FallbackIcon = type === 'admin_announcement' ? Megaphone : MessageSquare;

  return (
    <div className={`k-notification-glass overflow-hidden rounded-[22px] ${preview ? 'w-full max-w-lg' : 'w-full'}`}>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        >
          {logoUrl ? (
            <AutoTransparentLogo
              src={logoUrl}
              alt={logoAlt || title}
              className="h-10 w-10 shrink-0 object-contain transition-transform group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-white/85">
              <FallbackIcon size={18} />
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13px] font-bold tracking-[-0.01em] text-white">{title}</span>
              {count > 1 && (
                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/90">
                  {count} yeni
                </span>
              )}
            </span>
            <span className="mt-0.5 block line-clamp-2 text-[11px] font-medium leading-relaxed text-white/75">{body}</span>
            {type === 'message' && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/90 transition-colors group-hover:text-white">
                <Bell size={10} /> Mesajı aç
              </span>
            )}
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
