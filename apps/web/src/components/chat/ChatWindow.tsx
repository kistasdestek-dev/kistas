'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Send,
  Headphones,
  CheckCircle2,
  ExternalLink,
  Lock,
  AlertTriangle,
  Loader2,
  CheckCheck,
  ShieldCheck,
  ChevronLeft,
  Mic,
} from 'lucide-react';
import {
  ChatService,
  ChatContentFilter,
  type Conversation,
  type ChatMessage,
} from '@/lib/services/chat';
import { createClient } from '@/lib/supabase/browser';
import { GlassIconButton } from '../GlassIconButton';
import { ChatAvatar } from './ChatAvatar';
import { getConversationIdentity } from './conversationIdentity';

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  onBackMobile?: () => void;
}

const formatMessageTime = (isoString?: string | null) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  onBackMobile,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [securityViolations, setSecurityViolations] = useState<string[]>([]);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const swipeGestureRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    direction: 'pending' | 'horizontal' | 'vertical';
  } | null>(null);
  const swipeReleaseTimerRef = useRef<number | null>(null);
  const composerFocusTimerRef = useRef<number | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const { isSupport, isOfficialSupport, name, avatarUrl, isVerified } = getConversationIdentity(conversation, currentUserId);
  const project = conversation.listing;
  const isClosed = Boolean(conversation.closedAt);

  // Otomatik aşağı kaydırma
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const messageList = messagesScrollRef.current;
    if (!messageList) return;

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior,
    });
  };

  useEffect(() => () => {
    if (swipeReleaseTimerRef.current !== null) {
      window.clearTimeout(swipeReleaseTimerRef.current);
    }
    if (composerFocusTimerRef.current !== null) {
      window.clearTimeout(composerFocusTimerRef.current);
    }
  }, []);

  const handleComposerFocus = () => {
    window.requestAnimationFrame(() => scrollToBottom('auto'));
    if (composerFocusTimerRef.current !== null) {
      window.clearTimeout(composerFocusTimerRef.current);
    }
    composerFocusTimerRef.current = window.setTimeout(() => {
      scrollToBottom('auto');
      composerFocusTimerRef.current = null;
    }, 300);
  };

  const handleMessagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;

    const messageList = messagesScrollRef.current;
    if (swipeReleaseTimerRef.current !== null) {
      window.clearTimeout(swipeReleaseTimerRef.current);
      swipeReleaseTimerRef.current = null;
    }
    messageList?.classList.remove('k-chat-swipe-releasing');
    swipeGestureRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      direction: 'pending',
    };
  };

  const handleMessagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    const messageList = messagesScrollRef.current;
    if (!gesture || !messageList || event.pointerId !== gesture.pointerId) return;

    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;

    if (gesture.direction === 'pending') {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      gesture.direction = Math.abs(deltaX) > Math.abs(deltaY) * 1.2
        ? 'horizontal'
        : 'vertical';
      if (gesture.direction === 'horizontal') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (gesture.direction !== 'horizontal') return;

    const offset = Math.min(72, Math.max(0, -deltaX));
    messageList.style.setProperty('--k-chat-swipe', `${offset}px`);
    messageList.style.setProperty('--k-chat-swipe-progress', `${offset / 72}`);
  };

  const handleMessagePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    swipeGestureRef.current = null;
    if (gesture.direction !== 'horizontal') return;

    const messageList = messagesScrollRef.current;
    if (!messageList) return;
    messageList.classList.add('k-chat-swipe-releasing');
    messageList.style.setProperty('--k-chat-swipe', '0px');
    messageList.style.setProperty('--k-chat-swipe-progress', '0');
    swipeReleaseTimerRef.current = window.setTimeout(() => {
      messageList.classList.remove('k-chat-swipe-releasing');
      swipeReleaseTimerRef.current = null;
    }, 180);
  };

  // Mesajları yükleme ve okundu işaretleme
  useEffect(() => {
    let isMounted = true;
    setIsLoadingMessages(true);
    setSendError('');

    ChatService.getMessages(supabase, conversation.id).then((fetchedMessages) => {
      if (!isMounted) return;
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
      setTimeout(() => scrollToBottom('auto'), 50);
      void ChatService.markConversationRead(supabase, conversation.id);
    });

    // Realtime Mesaj Dinleyicisi
    const unsubscribe = ChatService.subscribeToMessages(
      supabase,
      conversation.id,
      (newMessage) => {
        if (!isMounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);

        if (newMessage.senderId !== currentUserId) {
          void ChatService.markConversationRead(supabase, conversation.id);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [conversation.id, currentUserId, supabase]);

  // Canlı Güvenlik Denetimi (Telefon, IBAN, Harici Link)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (text.trim()) {
      const check = ChatContentFilter.inspect(text);
      setSecurityViolations(check.violations);
    } else {
      setSecurityViolations([]);
    }
  };

  // Mesaj Gönderme
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending || isClosed) return;

    // Güvenlik kalkanı kontrolü
    const check = ChatContentFilter.inspect(text);
    if (!check.isSafe) {
      setSecurityViolations(check.violations);
      return;
    }

    setIsSending(true);
    setSendError('');

    const res = await ChatService.sendMessage(supabase, conversation.id, text, 'text');

    if (!res.success) {
      setSendError(res.error || 'Mesaj iletilemedi.');
      setIsSending(false);
      return;
    }

    if (res.message) {
      setMessages((prev) => [...prev, res.message!]);
      setInputText('');
      setSecurityViolations([]);
      setTimeout(() => scrollToBottom('smooth'), 50);
    }

    setIsSending(false);
    textareaRef.current?.focus();
  };

  // Enter ile gönderme (Shift+Enter yeni satır)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const safeProjectUrl = project?.id ? `/project/${project.id}` : null;

  return (
    <div className="relative flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-[radial-gradient(circle_at_55%_0%,rgba(28,190,218,0.38),transparent_42%),linear-gradient(180deg,#0A1422_0%,#0A0F19_48%,#070B12_100%)] outline-none shadow-none lg:rounded-3xl lg:border lg:border-white/10 lg:bg-none lg:bg-white/[0.03] lg:backdrop-blur-2xl lg:shadow-2xl">
      {/* 1. Mesaj alanı üzerinde yüzen profil kapsülü. */}
      <div className="k-messages-floating-header z-30 flex shrink-0 items-center justify-between gap-3 lg:relative lg:bg-[radial-gradient(circle_at_55%_-30%,rgba(28,190,218,0.52),rgba(16,54,82,0.86)_44%,#0A1422_82%)] lg:px-5 lg:py-3">
        <div className="relative z-10 flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <div className="lg:hidden shrink-0">
              <GlassIconButton
                icon={ChevronLeft}
                size={36}
                iconSize={21}
                iconColor="#E8F2FF"
                variant="bare"
                onClick={onBackMobile}
                title="Konuşmalara dön"
              />
            </div>
          )}

          {/* Avatar */}
          <div className="relative shrink-0">
            <ChatAvatar
              imageUrl={avatarUrl}
              alt={name}
              size={48}
            />
            {isOfficialSupport && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#10213A] bg-emerald-400" />}
          </div>

          <div className="min-w-0 max-w-[calc(100vw-9.5rem)] lg:max-w-none">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-white truncate tracking-tight">{name}</h3>
              {isVerified && (
                <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
              )}
            </div>

            {isOfficialSupport ? (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate">Kıstas Resmi Destek Kanalı</span>
              </p>
            ) : isSupport ? (
              <p className="text-[11px] text-[#94A3B8] font-medium">Destek görüşmesi</p>
            ) : project ? (
              <p className="text-[11px] text-[#94A3B8] font-medium truncate">
                Proje: <span className="font-semibold text-blue-400">{project.title}</span>
              </p>
            ) : (
              <p className="text-[11px] text-[#94A3B8]">Kıstas Üyesi</p>
            )}
          </div>
        </div>

        {/* Sağ Butonlar (Proje bağlantısı veya Durum) */}
        <div className="relative z-10 hidden items-center gap-2 lg:flex">
          {safeProjectUrl && (
            <Link
              href={safeProjectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 w-10 sm:w-auto sm:px-3.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 backdrop-blur-xl"
              title="Projeyi Görüntüle"
            >
              <ExternalLink size={12} />
              <span className="hidden sm:inline">Projeyi İncele</span>
            </Link>
          )}

          {isClosed && (
            <span className="h-8.5 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Lock size={12} />
              <span>Görüşme Kapalı</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Mesaj Akış Alanı */}
      <div
        ref={messagesScrollRef}
        className="k-messages-scroll k-chat-message-list flex-1 min-h-0 px-5 py-7 sm:p-6 overflow-y-auto space-y-7 bg-transparent lg:bg-[radial-gradient(circle_at_90%_10%,rgba(32,74,130,0.12),transparent_28%),linear-gradient(180deg,#0A0F19_0%,#070B12_100%)] no-scrollbar"
        style={{ paddingBottom: `calc(${securityViolations.length > 0 || sendError ? 220 : 132}px + env(safe-area-inset-bottom, 0px))` }}
        onPointerDown={handleMessagePointerDown}
        onPointerMove={handleMessagePointerMove}
        onPointerUp={handleMessagePointerEnd}
        onPointerCancel={handleMessagePointerEnd}
      >
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <span className="text-xs font-semibold text-[#94A3B8]">Mesajlar yükleniyor...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Headphones size={24} />
            </div>
            <h4 className="text-sm font-bold text-white">Henüz mesaj bulunmuyor</h4>
            <p className="text-xs text-[#94A3B8] max-w-xs leading-relaxed">
              İlk mesajınızı yazarak iletişimi başlatabilirsiniz. Güvenliğiniz için platform dışı iletişim bilgisi paylaşmayınız.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const time = formatMessageTime(msg.createdAt);

            return (
              <div key={msg.id} className="relative w-full">
                <div className="k-chat-swipe-row">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`flex w-full min-w-0 items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <ChatAvatar
                        imageUrl={avatarUrl}
                        alt={name}
                        size={56}
                      />
                    )}
                    <div
                      className={`relative max-w-[calc(100%_-_4.75rem)] sm:max-w-[68%] rounded-[30px] px-5 py-3.5 text-[14px] sm:text-sm font-medium leading-relaxed break-words ${
                        isMe
                          ? 'bg-[linear-gradient(145deg,#263143,#202836)] text-white border border-white/[0.08] shadow-[0_8px_22px_rgba(0,0,0,0.24)]'
                          : 'bg-[linear-gradient(145deg,#222B3A,#1A2230)] text-[#EDF2F8] border border-white/[0.08] shadow-[0_8px_22px_rgba(0,0,0,0.24)]'
                      }`}
                    >
                      <span className={`absolute bottom-2 h-2.5 w-2.5 rounded-full bg-[#4936D7] shadow-[0_0_9px_rgba(73,54,215,0.48)] ${isMe ? '-right-2' : '-left-2'}`} />
                      <span className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-[#1FA9D2] shadow-[0_0_8px_rgba(31,169,210,0.5)] ${isMe ? '-right-4' : '-left-4'}`} />
                      <p className="whitespace-pre-wrap" title={time}>{msg.content}</p>
                      {isMe && (
                        <div className="mt-1 flex justify-end">
                          <CheckCheck size={12} className="text-blue-200" />
                        </div>
                      )}
                    </div>
                    {isMe && (
                      <ChatAvatar
                        imageUrl={currentUserAvatarUrl}
                        alt={currentUserName}
                        size={56}
                      />
                    )}
                  </motion.div>
                </div>
                {time && (
                  <time dateTime={msg.createdAt} className="k-chat-swipe-time">
                    {time}
                  </time>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Mesaj alanı üzerinde yüzen giriş kapsülü ve uyarılar. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-transparent px-3 pt-2 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:p-4">
        {securityViolations.length > 0 && (
          <div className="mx-auto mb-2 flex max-w-2xl items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/80 px-4 py-2.5 text-xs font-semibold text-rose-300 backdrop-blur-md">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{securityViolations.join(' ')}</span>
          </div>
        )}

        {sendError && (
          <div className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/80 px-4 py-2.5 text-xs font-semibold text-rose-300 backdrop-blur-md">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        {isClosed ? (
          <div className="k-messages-composer flex min-h-14 items-center justify-center gap-1.5 p-3 text-center text-xs font-semibold text-[#94A3B8]">
            <Lock size={14} />
            <span>Bu destek görüşmesi yetkili tarafından sonlandırılmıştır.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="k-messages-composer pointer-events-auto flex min-h-14 items-center gap-1 p-1.5">
            <div className="relative flex-1 min-w-0 px-1 py-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleComposerFocus}
                placeholder="Mesajınızı yazın…"
                className="block w-full bg-transparent resize-none text-[16px] sm:text-sm font-medium leading-7 text-white placeholder-[#728096] focus:outline-none max-h-24 min-h-7"
              />
            </div>

            <button
              type="button"
              onClick={() => textareaRef.current?.focus()}
              className="h-10 w-10 shrink-0 rounded-full bg-white/[0.05] flex items-center justify-center text-[#8290A5]"
              title="Mesaj alanına odaklan"
            >
              <Mic size={17} />
            </button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="submit"
              disabled={!inputText.trim() || isSending || securityViolations.length > 0}
              className="h-10 w-10 rounded-full bg-[linear-gradient(145deg,#3269C7,#6548EF)] text-white border border-blue-200/20 shadow-[0_6px_18px_rgba(40,82,178,0.38)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Gönder"
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={18} className="block" />
              )}
            </motion.button>
          </form>
        )}

        {/* Alt Güvenlik Bilgisi */}
        <div className="mx-auto mt-2 hidden max-w-2xl items-center justify-between px-1 text-[10px] text-[#8290A5] sm:flex">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="sm:hidden">Güvenli mesajlaşma</span>
            <span className="hidden sm:inline">Uçtan uca platform içi güvenlik filtresi devrede</span>
          </span>
          <span className="text-[#64748B] hidden sm:inline font-mono">SEC-020 • Pars DevState</span>
        </div>
      </div>
    </div>
  );
};
