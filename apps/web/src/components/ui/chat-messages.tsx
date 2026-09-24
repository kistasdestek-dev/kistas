'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KistasLogo } from '../KistasLogo';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatMessagesProps {
  messages?: ChatMessage[];
  autoPlay?: boolean;
  autoPlayDelay?: number;
  typingDuration?: number;
  showReplay?: boolean;
  interactive?: boolean;
  className?: string;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender: 'assistant',
    content:
      "Merhaba! Ben Kıstas Asistanı. Türkiye'nin en yenilikçi dijital projelerini keşfetmenizde veya yeni bir lansman hazırlığınızda size nasıl yardımcı olabilirim?",
  },
  {
    id: '2',
    sender: 'user',
    content: 'Yeni geliştirdiğim mikro-SaaS girişimimi Kıstas üzerinde vitrine çıkarmak istiyorum.',
  },
  {
    id: '3',
    sender: 'assistant',
    content:
      'Harika bir hamle! Kıstas Dağıtım Motoru; dinamik lansman kartları (OG), Kıstas Glass rozetleri ve canlı oylama rekabetiyle projenize anında ilk kullanıcılarını ve itibarını kazandırır.',
  },
  {
    id: '4',
    sender: 'user',
    content:
      'Lansman gününde projemin öne çıkması için ne yapmamı önerirsiniz?',
  },
  {
    id: '5',
    sender: 'assistant',
    content:
      'Projenize Kıstas Doğrulanmış Rozeti (Badge) ekleyin ve lansman saatinizde topluluğunuzla etkileşimi başlatın. Trend listesinde ilk 3 sıraya yükselen girişimler ana sayfa vitrininde 7 gün boyunca öne çıkar.',
  },
  {
    id: '6',
    sender: 'user',
    content: 'Şimdi hemen bir lansman taslağı oluşturabilir miyim?',
  },
  {
    id: '7',
    sender: 'assistant',
    content:
      'Kesinlikle. Üst menüden "Lansman Yap" sekmesine tıklayarak 3 adımda projenizi önizleyebilir ve lansman takviminizi belirleyebilirsiniz.',
  },
];

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-white/10 bg-white/[0.06] backdrop-blur-xl px-4 py-3 shadow-lg shadow-black/40',
        className
      )}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}

export function MessageBubble({
  message,
}: {
  message: ChatMessage;
  isLast?: boolean;
}) {
  const isUser = message.sender === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex items-end gap-2.5 max-w-[85%] sm:max-w-[78%]', isUser && 'flex-row-reverse')}>
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Sparkles className="size-4 text-white" />
          </div>
        )}
        <motion.div
          layout
          className={cn(
            'rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed font-medium break-words',
            isUser
              ? 'rounded-tr-xs bg-gradient-to-br from-blue-600 to-indigo-600 text-white border border-blue-400/30 shadow-[0_4px_20px_rgba(59,130,246,0.3)]'
              : 'rounded-tl-xs border border-white/10 bg-white/[0.06] text-[#F8FAFC] backdrop-blur-xl shadow-lg'
          )}
          whileHover={{ scale: 1.01, y: -1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {message.content}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ChatMessages({
  messages = DEFAULT_MESSAGES,
  autoPlay = true,
  autoPlayDelay = 1800,
  typingDuration = 1400,
  showReplay = true,
  interactive = false,
  className,
}: ChatMessagesProps) {
  const [visibleCount, setVisibleCount] = useState(
    autoPlay ? 0 : messages.length
  );
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoPlaying = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  const revealNext = useCallback(
    async (index: number) => {
      if (index >= chatMessages.length) {
        isAutoPlaying.current = false;
        return;
      }

      const message = chatMessages[index];

      if (message.sender === 'assistant') {
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, typingDuration));
        setIsTyping(false);
      }

      setVisibleCount(index + 1);
      await new Promise((r) => setTimeout(r, 100));
      scrollToBottom();

      await new Promise((r) =>
        setTimeout(
          r,
          autoPlayDelay -
            (message.sender === 'assistant' ? typingDuration : 0) -
            100
        )
      );

      if (isAutoPlaying.current) {
        revealNext(index + 1);
      }
    },
    [chatMessages, autoPlayDelay, typingDuration, scrollToBottom]
  );

  const replay = useCallback(() => {
    setVisibleCount(0);
    setChatMessages(messages);
    isAutoPlaying.current = true;
    setTimeout(() => revealNext(0), 100);
  }, [messages, revealNext]);

  useEffect(() => {
    setChatMessages(messages);
    if (autoPlay) {
      setVisibleCount(0);
      isAutoPlaying.current = true;
      const timer = setTimeout(() => revealNext(0), 500);
      return () => {
        clearTimeout(timer);
        isAutoPlaying.current = false;
      };
    }

    setVisibleCount(messages.length);
    return undefined;
  }, [messages, autoPlay, revealNext]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, isTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !interactive) return;

    const newMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: inputValue.trim(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setVisibleCount((prev) => prev + 1);

    setTimeout(() => {
      const assistantReply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content:
          'Mesajınızı aldım! Kıstas üzerinde aradığınız bilgiyi sağlamak veya projenizi güçlendirmek için her an buradayım.',
      };
      setChatMessages((prev) => [...prev, assistantReply]);
      setVisibleCount((prev) => prev + 1);
    }, typingDuration + 500);
  }, [inputValue, interactive, typingDuration]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-xl px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center">
            <KistasLogo size={24} showWordmark={false} glow />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Kıstas AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            </h3>
            <p className="text-[11px] text-[#94A3B8]">Akıllı Asistan & Rehber</p>
          </div>
        </div>
        {showReplay && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={replay}
            aria-label="Replay conversation"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            Yeniden Oynat
          </motion.button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5 no-scrollbar"
      >
        {chatMessages.slice(0, visibleCount).map((message, i) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={i === visibleCount - 1}
          />
        ))}

        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-black/50 backdrop-blur-2xl p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 backdrop-blur-xl focus-within:border-blue-500/60 focus-within:bg-white/[0.08] transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!interactive}
            placeholder={
              interactive
                ? 'Kıstas Asistanına sorun...'
                : 'Demo modu — yeniden izlemek için butona tıklayın'
            }
            aria-label={
              interactive ? 'Mesajınızı yazın' : 'Mesaj kutusu (demo modu)'
            }
            className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-white outline-none placeholder:text-[#94A3B8] disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleSend}
            disabled={!interactive || !inputValue.trim()}
            aria-label="Send message"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl transition-all border cursor-pointer',
              interactive && inputValue.trim()
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'bg-white/5 border-white/10 text-white/30 disabled:pointer-events-none'
            )}
          >
            <Send className="size-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default ChatMessages;
