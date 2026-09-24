'use client';

import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';
import type { Conversation } from '@/lib/services/chat';
import { ChatAvatar } from './ChatAvatar';
import { getConversationIdentity } from './conversationIdentity';

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId: string;
  isSelected: boolean;
  onSelect: (conv: Conversation) => void;
}

const formatConversationTime = (isoString?: string | null) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';

    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  currentUserId,
  isSelected,
  onSelect,
}) => {
  const { isOfficialSupport, name, avatarUrl, isVerified } = getConversationIdentity(conversation, currentUserId);
  const projectTitle = conversation.listing?.title;
  const lastMessage = conversation.lastMessage || 'Görüşme başlatıldı.';
  const timeFormatted = formatConversationTime(conversation.lastMessageAt);
  const unreadCount = conversation.unreadCount;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`relative block w-full text-left px-2 py-2.5 sm:p-4 rounded-[22px] transition-all duration-200 cursor-pointer border ${
        isSelected
          ? 'bg-[linear-gradient(100deg,rgba(50,105,199,0.22),rgba(91,66,219,0.08))] border-[#4776C9]/45'
          : 'bg-transparent hover:bg-white/[0.035] border-transparent hover:border-white/[0.07]'
      }`}
    >
      <div className="flex items-center lg:items-start gap-3 sm:gap-3.5">
        {/* Avatar / İkon */}
        <div className="relative shrink-0">
          <ChatAvatar
            imageUrl={avatarUrl}
            alt={name}
            size={48}
            className="lg:rounded-full lg:border lg:border-[#6784C6]/55 lg:bg-[#111A2B]"
          />

          {isOfficialSupport && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0A0F19] flex items-center justify-center" />
          )}
        </div>

        {/* Bilgiler */}
        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="text-sm font-bold text-white truncate tracking-tight">
                {name}
              </h4>
              {isVerified && (
                <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
              )}
            </div>
            <span className="lg:hidden text-[10px] text-[#94A3B8] font-semibold shrink-0">{timeFormatted}</span>
            {timeFormatted && <span className="hidden lg:inline text-[10px] text-[#94A3B8] font-semibold shrink-0">{timeFormatted}</span>}
          </div>

          {/* Proje Başlığı (Varsa) */}
          {projectTitle && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 mt-0.5 truncate">
              <FolderGit2 size={11} className="shrink-0 text-blue-400" />
              <span className="truncate">{projectTitle}</span>
            </div>
          )}

          {/* Son Mesaj Özeti */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <p
              className={`text-xs truncate ${
                unreadCount > 0
                  ? 'font-bold text-white'
                  : 'font-medium text-[#94A3B8]'
              }`}
            >
              {lastMessage}
            </p>

            {/* Okunmamış Rozeti */}
            {unreadCount > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#2456B8] text-[10px] font-black text-white flex items-center justify-center shrink-0 border border-blue-300/20">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        <span className="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#8DA4C9]" aria-hidden="true">
          <ChevronRight size={16} />
        </span>
      </div>
    </button>
  );
};
