'use client';

import React, { useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  FolderGit2,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import type { Conversation } from '@/lib/services/chat';
import { ChatAvatar } from './ChatAvatar';
import { getConversationIdentity } from './conversationIdentity';

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId: string;
  isSelected: boolean;
  isDeleting?: boolean;
  onSelect: (conversation: Conversation) => void;
  onDelete?: (conversation: Conversation) => void;
}

const formatConversationTime = (isoString?: string | null) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  currentUserId,
  isSelected,
  isDeleting = false,
  onSelect,
  onDelete,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const arrowControls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();
  const gestureRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startOffset: number;
    direction: 'pending' | 'horizontal' | 'vertical';
  } | null>(null);
  const { isOfficialSupport, name, avatarUrl, isVerified } = getConversationIdentity(conversation, currentUserId);
  const timeFormatted = formatConversationTime(conversation.lastMessageAt);

  const animateArrow = () => {
    if (shouldReduceMotion) return;
    void arrowControls.start({
      x: [0, 7, -2, 0],
      scale: [1, 0.9, 1.08, 1],
      transition: { duration: 0.34, ease: 'easeOut' },
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    animateArrow();
    gestureRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startOffset: swipeOffset,
      direction: 'pending',
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;

    if (gesture.direction === 'pending') {
      if (Math.abs(deltaX) < 7 && Math.abs(deltaY) < 7) return;
      gesture.direction = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? 'horizontal' : 'vertical';
      if (gesture.direction === 'horizontal') event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (gesture.direction !== 'horizontal') return;
    if (onDelete) setSwipeOffset(Math.min(84, Math.max(0, gesture.startOffset - deltaX)));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (gesture.direction === 'horizontal') setSwipeOffset((value) => (value >= 44 ? 84 : 0));
  };

  const selectConversation = () => {
    if (swipeOffset > 0) {
      setSwipeOffset(0);
      return;
    }
    onSelect(conversation);
  };

  return (
    <div className="relative overflow-visible rounded-[22px]">
      {onDelete && <div className="absolute inset-y-0 right-0 flex w-[84px] items-stretch overflow-hidden rounded-r-[22px] lg:hidden">
        <button
          type="button"
          onClick={() => onDelete(conversation)}
          disabled={isDeleting}
          className="flex w-full flex-col items-center justify-center gap-1 bg-rose-600 text-[10px] font-bold text-white disabled:opacity-60"
          aria-label={`${name} görüşmesini Inbox'tan kaldır`}
        >
          <Trash2 size={18} />
          Sil
        </button>
      </div>}

      <div
        className={`relative touch-pan-y rounded-[22px] border transition-[transform,background-color,border-color] duration-200 ${
          isSelected
            ? 'border-[#4776C9]/45 bg-[linear-gradient(100deg,rgba(50,105,199,0.22),rgba(91,66,219,0.08))]'
            : 'border-transparent bg-[#0A0F19] hover:border-white/[0.07] hover:bg-[#101621] lg:bg-transparent'
        }`}
        style={{ transform: `translateX(-${swipeOffset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <button
          type="button"
          onClick={selectConversation}
          className="block w-full cursor-pointer px-2 py-2.5 pr-12 text-left sm:p-4 sm:pr-12"
        >
          <span className="flex items-center gap-3 sm:gap-3.5 lg:items-start">
            <span className="relative shrink-0">
              <ChatAvatar imageUrl={avatarUrl} alt={name} size={48} className="lg:rounded-full lg:border lg:border-[#6784C6]/55 lg:bg-[#111A2B]" />
              {isOfficialSupport && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0A0F19] bg-emerald-400" />}
            </span>

            <span className="min-w-0 flex-1 py-1">
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-bold tracking-tight text-white">{name}</span>
                  {isVerified && <CheckCircle2 size={13} className="shrink-0 text-blue-400" />}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-[#94A3B8]">{timeFormatted}</span>
              </span>

              {conversation.listing?.title && (
                <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-blue-400">
                  <FolderGit2 size={11} className="shrink-0" />
                  <span className="truncate">{conversation.listing.title}</span>
                </span>
              )}

              <span className="mt-1 flex items-center justify-between gap-2">
                <span className={`truncate text-xs ${conversation.unreadCount > 0 ? 'font-bold text-white' : 'font-medium text-[#94A3B8]'}`}>
                  {conversation.lastMessage || 'Görüşme başlatıldı.'}
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-blue-300/20 bg-[#2456B8] px-1.5 text-[10px] font-black text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </span>
            </span>
          </span>
        </button>

        <span className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.05] text-[#8DA4C9] lg:hidden" aria-hidden="true">
          <motion.span animate={arrowControls} className="inline-flex"><ChevronRight size={16} /></motion.span>
        </span>

        {onDelete && <button
          type="button"
          onClick={() => setIsMenuOpen((value) => !value)}
          className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] hover:bg-white/[0.08] hover:text-white lg:flex"
          aria-label={`${name} görüşme seçenekleri`}
          aria-expanded={isMenuOpen}
        >
          <MoreVertical size={16} />
        </button>}
      </div>

      {onDelete && isMenuOpen && (
        <div className="absolute right-2 top-[calc(50%+20px)] z-30 hidden w-44 rounded-xl border border-white/10 bg-[#111A27]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:block">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              onDelete(conversation);
            }}
            disabled={isDeleting}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Inbox’tan kaldır
          </button>
        </div>
      )}
    </div>
  );
};
