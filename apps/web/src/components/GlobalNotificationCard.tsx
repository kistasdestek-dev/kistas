'use client';

import React from 'react';
import { Megaphone, MessageSquare, X } from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { ChatAvatar } from './chat/ChatAvatar';

export interface GlobalNotificationCardProps {
  type: 'message' | 'admin_announcement';
  title: string;
  body: string;
  logoUrl?: string;
  logoAlt?: string;
  avatarUrl?: string;
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
  avatarUrl,
  count = 1,
  onOpen,
  onDismiss,
  preview = false,
}) => {
  if (type === 'message') {
    return (
      <div className={`k-notification-glass k-notification-glass--message overflow-hidden rounded-[26px] ${preview ? 'w-full max-w-lg' : 'w-full'}`}>
        <div className="relative flex items-center gap-3 p-2.5 pr-10 sm:p-3 sm:pr-11">
          <button
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            className="group flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
            aria-label={`${title} mesajını aç`}
          >
            <span className="relative shrink-0">
              <ChatAvatar
                imageUrl={avatarUrl}
                alt={title}
                size={52}
                className="ring-1 ring-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.34)] transition-transform group-hover:scale-[1.03]"
              />
              <span className="absolute -right-0.5 -bottom-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-[#182438] bg-[#E4FD97] text-[#091326] shadow-[0_3px_10px_rgba(228,253,151,0.35)]" aria-hidden="true">
                <MessageSquare size={9.5} strokeWidth={2.6} />
              </span>
            </span>

            <span className="min-w-0 flex-1 self-center">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15px] font-bold tracking-[-0.015em] text-white sm:text-base">{title}</span>
                {count > 1 && (
                  <span className="shrink-0 rounded-full border border-[#E4FD97]/30 bg-[#E4FD97]/12 px-1.5 py-0.5 text-[9px] font-extrabold text-[#E4FD97]">
                    {count} yeni
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] font-semibold text-white/50">şimdi</span>
              </span>
              <span className="mt-0.5 block line-clamp-2 text-[13px] font-medium leading-[1.35] text-white/82 sm:text-[13.5px]">{body}</span>
            </span>
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="absolute top-2.5 right-2.5 rounded-full p-1 text-white/35 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Bildirimi kapat"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

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
              <Megaphone size={18} />
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
