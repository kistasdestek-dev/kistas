'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  RotateCw,
  Search,
  X,
  MessageSquare,
  Headphones,
  Inbox,
  Loader2,
  Plus,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { KistasLogo } from '../KistasLogo';
import { KistasFeedbackModal, KistasFeedbackType } from '../KistasFeedbackModal';
import { ConversationCard } from './ConversationCard';
import { ConversationActionModal } from './ConversationActionModal';
import { ChatWindow } from './ChatWindow';
import { ChatAvatar } from './ChatAvatar';
import { MessageNotificationSettings } from './MessageNotificationSettings';
import { getConversationIdentity } from './conversationIdentity';
import {
  ChatService,
  type Conversation,
} from '@/lib/services/chat';
import { createClient } from '@/lib/supabase/browser';

interface MessagesExperienceClientProps {
  initialConversations: Conversation[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  initialSelectedId?: string | null;
  canManageSupport: boolean;
}

export const MessagesExperienceClient: React.FC<MessagesExperienceClientProps> = ({
  initialConversations,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  initialSelectedId,
  canManageSupport,
}) => {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialSelectedId && initialConversations.some((conversation) => conversation.id === initialSelectedId)
      ? initialSelectedId
      : null
  );
  const [filter, setFilter] = useState<'all' | 'unread' | 'support'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingSupport, setIsStartingSupport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [closeTarget, setCloseTarget] = useState<Conversation | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: KistasFeedbackType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [isPending, startTransition] = useTransition();
  const supportIconControls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();

  const supabase = useMemo(() => createClient(), []);

  // Mobil mesajlaşmada dış sayfayı kilitle; yalnız iç listeler kaydırılabilir.
  useEffect(() => {
    const syncViewportHeight = () => {
      const viewport = window.visualViewport;
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const visibleTop = viewport?.offsetTop ?? 0;
      document.documentElement.style.setProperty(
        '--k-messages-vh',
        `${Math.round(visibleHeight)}px`
      );
      document.documentElement.style.setProperty(
        '--k-messages-vtop',
        `${Math.round(visibleTop)}px`
      );
    };

    document.documentElement.classList.add('k-messages-open');
    document.body.classList.add('k-messages-open');
    syncViewportHeight();
    setIsViewportReady(true);

    window.addEventListener('resize', syncViewportHeight);
    window.addEventListener('orientationchange', syncViewportHeight);
    window.visualViewport?.addEventListener('resize', syncViewportHeight);
    window.visualViewport?.addEventListener('scroll', syncViewportHeight);

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
      window.visualViewport?.removeEventListener('resize', syncViewportHeight);
      window.visualViewport?.removeEventListener('scroll', syncViewportHeight);
      document.documentElement.classList.remove('k-messages-open');
      document.body.classList.remove('k-messages-open');
      document.documentElement.style.removeProperty('--k-messages-vh');
      document.documentElement.style.removeProperty('--k-messages-vtop');
    };
  }, []);

  // Verileri Canlı Tazeleme
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await ChatService.getConversations(supabase, currentUserId, canManageSupport);
      setConversations(data);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [canManageSupport, currentUserId, router, supabase]);

  // Realtime Inbox Dinleyicisi
  useEffect(() => {
    const unsubscribe = ChatService.subscribeToInbox(
      supabase,
      () => {
        void handleRefresh();
      },
      currentUserId
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, handleRefresh, supabase]);

  // Kıstas Destek Sohbeti Başlatma
  const handleStartSupport = async () => {
    if (!shouldReduceMotion) {
      void supportIconControls.start({
        rotate: [0, 90, 180],
        scale: [1, 1.3, 0.9, 1],
        transition: { duration: 0.42, ease: 'easeOut' },
      });
    }
    setIsStartingSupport(true);
    try {
      const res = await ChatService.getOrCreateSupportConversation(supabase);
      if (res.success && res.conversationId) {
        await handleRefresh();
        setSelectedConversationId(res.conversationId);
        router.replace(`/messages?conversationId=${encodeURIComponent(res.conversationId)}`, { scroll: false });
      } else {
        setFeedbackModal({
          isOpen: true,
          type: 'info',
          title: 'Kıstas Destek',
          message: res.error || 'Destek görüşmesi başlatılamadı.',
        });
      }
    } finally {
      setIsStartingSupport(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    router.replace(`/messages?conversationId=${encodeURIComponent(conversation.id)}`, { scroll: false });
  };

  const handleHideConversation = async () => {
    if (!deleteTarget || actionBusyId) return;
    const targetId = deleteTarget.id;
    setActionBusyId(targetId);
    const result = await ChatService.hideConversation(supabase, targetId);
    if (result.success) {
      setConversations((current) => current.filter((conversation) => conversation.id !== targetId));
      if (selectedConversationId === targetId) {
        setSelectedConversationId(null);
        router.replace('/messages', { scroll: false });
      }
      setDeleteTarget(null);
    } else {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Görüşme kaldırılamadı',
        message: result.error || 'Lütfen tekrar deneyin.',
      });
    }
    setActionBusyId(null);
  };

  const handleCloseSupportConversation = async () => {
    if (!closeTarget || actionBusyId) return;
    const targetId = closeTarget.id;
    setActionBusyId(targetId);
    const result = await ChatService.closeSupportConversation(supabase, targetId);
    if (result.success) {
      setConversations((current) => current.map((conversation) => (
        conversation.id === targetId
          ? { ...conversation, closedAt: result.closedAt || new Date().toISOString(), closedBy: currentUserId }
          : conversation
      )));
      setCloseTarget(null);
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Destek görüşmesi sonlandırıldı',
        message: 'Kullanıcı ihtiyaç duyarsa Destek butonundan yeni bir görüşme başlatabilir.',
      });
    } else {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Görüşme sonlandırılamadı',
        message: result.error || 'Yetkinizi ve görüşme durumunu kontrol edin.',
      });
    }
    setActionBusyId(null);
  };

  // Filtrelenmiş ve Aranmış Konuşmalar
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === 'unread' && c.unreadCount === 0) return false;
      if (filter === 'support' && c.listingId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const otherName = c.otherParty?.fullName?.toLowerCase() || '';
        const project = c.listing?.title?.toLowerCase() || '';
        const lastMsg = c.lastMessage?.toLowerCase() || '';
        const isSupportMatch = getConversationIdentity(c, currentUserId).isOfficialSupport && 'kıstas destek'.includes(q);
        return (
          otherName.includes(q) ||
          project.includes(q) ||
          lastMsg.includes(q) ||
          isSupportMatch
        );
      }
      return true;
    });
  }, [conversations, filter, searchQuery, currentUserId]);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  }, [conversations]);

  const supportCount = conversations.filter((conversation) => !conversation.listingId).length;
  const heroContacts = conversations.filter((conversation, index, all) => {
    const otherId = conversation.buyerId === currentUserId ? conversation.sellerId : conversation.buyerId;
    return all.findIndex((candidate) =>
      (candidate.buyerId === currentUserId ? candidate.sellerId : candidate.buyerId) === otherId
    ) === index;
  }).slice(0, 4);

  const messagesView = (
    <div className="k-messages-root h-full w-full max-w-none min-h-0 bg-[#070B12] text-white overflow-hidden flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Arka Plan Safir Atmosfer Işıltısı */}
      <div className="hidden sm:block absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="hidden sm:block absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Üst Bar (Header) - Kıstas Tasarım Sistemi */}
      <header className="hidden lg:block z-40 bg-[radial-gradient(circle_at_50%_-40%,rgba(33,188,219,0.42),rgba(12,34,58,0.88)_45%,#080C14_82%)] backdrop-blur-xl border-b border-white/[0.08] shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <GlassIconButton
              icon={ChevronLeft}
              size={38}
              iconSize={18}
              onClick={() => router.back()}
              title="Geri dön"
              animation="nudge"
            />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <KistasLogo size={28} showWordmark={false} glow />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  <span>Mesajlar</span>
                  {totalUnreadCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-black text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                      {totalUnreadCount} yeni
                    </span>
                  )}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <MessageNotificationSettings userId={currentUserId} />
            <button
              type="button"
              onClick={handleStartSupport}
              disabled={isStartingSupport}
              className="h-9 w-9 sm:w-auto sm:px-4 rounded-xl bg-[#1E4FA3] hover:bg-[#275DB7] text-white text-xs font-bold border border-blue-400/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Kıstas Yetkilisi ile Görüş"
            >
              {isStartingSupport ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <motion.span animate={supportIconControls} className="inline-flex"><Headphones size={15} /></motion.span>
              )}
              <span className="hidden sm:inline">Canlı Destek</span>
            </button>

            <GlassIconButton
              icon={RotateCw}
              size={38}
              iconSize={17}
              onClick={handleRefresh}
              disabled={isRefreshing || isPending}
              title="Verileri yenile"
              animation="spin"
              className={isRefreshing || isPending ? 'animate-spin' : ''}
            />
          </div>
        </div>
      </header>

      {/* Ana Çalışma Alanı (Responsive Master-Detail Düzen) */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6 relative z-10 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-0 lg:grid-cols-12 lg:gap-6">
          {/* Sol Kolon: Konuşmalar Listesi */}
          <div
            className={`lg:col-span-5 xl:col-span-4 relative rounded-none border-0 bg-[#0A0F19] px-3 pt-0 pb-3 sm:p-4 shadow-none lg:rounded-3xl lg:border lg:border-white/10 lg:bg-white/[0.03] lg:backdrop-blur-2xl lg:shadow-2xl flex flex-col h-full min-h-0 gap-3 lg:gap-4 ${
              selectedConversationId ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="lg:hidden relative h-[218px] -mx-3 overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,rgba(31,167,202,0.25),rgba(10,22,38,0.52)_53%,#0A0F19_85%)] shrink-0">
              <GlassIconButton icon={ChevronLeft} variant="bare" size={38} iconSize={18} iconColor="#A8C8FB" onClick={() => router.back()} title="Geri dön" className="!absolute left-4 top-4 z-10 !bg-[#1A2B41] !border-white/10 !shadow-none" />
              <div className="absolute left-1/2 top-[62px] -translate-x-1/2">
                <ChatAvatar imageUrl={currentUserAvatarUrl} alt={currentUserName} size={92} />
              </div>
              {heroContacts.map((conversation, index) => {
                const positions = ['left-[9%] top-[96px]', 'right-[9%] top-[96px]', 'left-[25%] top-[137px]', 'right-[25%] top-[137px]'];
                const { name: contactName, avatarUrl: contactAvatar } = getConversationIdentity(conversation, currentUserId);
                return (
                  <div
                    key={conversation.id}
                    className={`absolute ${positions[index]}`}
                  >
                    <ChatAvatar imageUrl={contactAvatar} alt={contactName} size={index < 2 ? 47 : 37} />
                  </div>
                );
              })}
              <div className="absolute bottom-0 left-[-10%] h-10 w-[120%] rounded-[50%_50%_0_0/100%_100%_0_0] bg-[#0A0F19]" />
            </div>

            {/* Arama Kutusu */}
            <div className={`${isSearchOpen ? 'flex' : 'hidden'} lg:flex order-2 lg:order-none rounded-2xl border border-white/10 bg-white/[0.05] focus-within:border-blue-500/60 focus-within:bg-white/[0.08] px-4 py-2.5 transition-all items-center gap-2.5 shrink-0`}>
              <Search size={15} className="text-[#94A3B8] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mesaj veya kullanıcı ara..."
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-white placeholder-[#94A3B8] focus:outline-none"
              />
              {(searchQuery || isSearchOpen) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  aria-label="Aramayı kapat"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtre Sekmeleri (Kıstas Stili) */}
            <div className="order-1 lg:order-none flex items-center gap-1 rounded-full border border-white/[0.07] bg-[#141B27] p-1 shrink-0 shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`h-9 flex-1 px-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  filter === 'all'
                    ? 'border-blue-300/25 bg-[linear-gradient(100deg,#4936D7,#1FA9D2)] text-white shadow-[0_6px_18px_rgba(45,89,200,0.30)]'
                    : 'border-transparent bg-transparent text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span className="lg:hidden">Gelen ({conversations.length})</span>
                <span className="hidden lg:inline">Tümü ({conversations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`h-9 flex-1 px-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  filter === 'unread'
                    ? 'border-blue-300/25 bg-[linear-gradient(100deg,#4936D7,#1FA9D2)] text-white shadow-[0_6px_18px_rgba(45,89,200,0.30)]'
                    : 'border-transparent bg-transparent text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span className="lg:hidden">Okunmamış</span>
                <span className="hidden lg:inline">Okunmamış ({totalUnreadCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilter('support')}
                className={`lg:hidden h-9 flex-1 px-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  filter === 'support'
                    ? 'border-blue-300/25 bg-[linear-gradient(100deg,#4936D7,#1FA9D2)] text-white shadow-[0_6px_18px_rgba(45,89,200,0.30)]'
                    : 'border-transparent text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                Destek ({supportCount})
              </button>
            </div>

            {/* Konuşmalar Listesi */}
            <div className="k-messages-scroll order-3 lg:order-none flex-1 min-h-0 overflow-y-auto space-y-1 pb-20 lg:pb-0 pr-1 no-scrollbar">
              {filteredConversations.length === 0 ? (
                <div className="h-64 rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center flex flex-col items-center justify-center space-y-2.5 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Inbox size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Görüşme Bulunamadı</h4>
                  <p className="text-xs text-[#94A3B8] max-w-xs leading-relaxed">
                    {searchQuery
                      ? 'Aramanıza uygun bir mesaj veya kullanıcı bulunamadı.'
                      : 'Henüz bir mesajlaşma geçmişiniz yok. Proje sahipleriyle iletişime geçebilir veya Canlı Destek başlatabilirsiniz.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    currentUserId={currentUserId}
                    isSelected={conv.id === selectedConversationId}
                    isDeleting={actionBusyId === conv.id}
                    onSelect={handleSelectConversation}
                    onDelete={conv.buyerId === currentUserId || conv.sellerId === currentUserId ? setDeleteTarget : undefined}
                  />
                ))
              )}
            </div>
            <div className="lg:hidden absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 flex items-center gap-1 rounded-full border border-white/10 bg-[#1B2431]/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <button type="button" onClick={handleStartSupport} disabled={isStartingSupport} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white disabled:opacity-50" aria-label="Kıstas Destek görüşmesi aç">
                {isStartingSupport ? <Loader2 size={17} className="animate-spin" /> : <motion.span animate={supportIconControls} className="inline-flex"><Plus size={18} className="text-blue-400" /></motion.span>}
                Destek
              </button>
              <GlassIconButton icon={Search} variant="bare" size={39} iconSize={18} iconColor="#77A9F8" onClick={() => {
                if (isSearchOpen) setSearchQuery('');
                setIsSearchOpen(!isSearchOpen);
              }} title={isSearchOpen ? 'Aramayı kapat' : 'Mesaj ara'} animation="pulse" className="!bg-[#273348] !border-white/[0.08] !shadow-none" />
              <GlassIconButton icon={RotateCw} variant="bare" size={39} iconSize={18} iconColor="#77A9F8" onClick={handleRefresh} disabled={isRefreshing || isPending} title="Yenile" animation="spin" className="!bg-[#273348] !border-white/[0.08] !shadow-none" />
              <MessageNotificationSettings userId={currentUserId} compact />
            </div>
          </div>

          {/* Sağ Kolon: Aktif Sohbet Penceresi */}
          <div
            className={`h-full min-h-0 min-w-0 overflow-hidden lg:col-span-7 xl:col-span-8 ${
              selectedConversationId ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {selectedConversation ? (
              <ChatWindow
                key={selectedConversation.id}
                conversation={selectedConversation}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserAvatarUrl={currentUserAvatarUrl}
                canManageSupport={canManageSupport}
                isClosingSupport={actionBusyId === selectedConversation.id}
                onRequestCloseSupport={() => setCloseTarget(selectedConversation)}
                onBackMobile={() => {
                  setSelectedConversationId(null);
                  router.replace('/messages', { scroll: false });
                }}
              />
            ) : (
              <div className="w-full h-full rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 flex flex-col items-center justify-center text-center space-y-3.5 shadow-2xl">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Bir Sohbet Seçin
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-sm font-medium leading-relaxed">
                  Sol taraftaki listeden bir konuşmayı açabilir veya yukarıdaki butonla doğrudan Kıstas Destek ekibimizle görüşme başlatabilirsiniz.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartSupport}
                    disabled={isStartingSupport}
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold border border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Headphones size={15} />
                    <span>Kıstas Destek ile Görüş</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Kıstas Glass Feedback Modal */}
      <KistasFeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
      />
      <ConversationActionModal
        isOpen={Boolean(deleteTarget)}
        title="Görüşme Inbox’tan kaldırılsın mı?"
        message="Bu işlem yalnızca sizin listenizi temizler; karşı tarafın mesajları silinmez. Yeni mesaj gelirse görüşme yeniden görünür."
        confirmLabel="Kaldır"
        destructive
        isBusy={Boolean(deleteTarget && actionBusyId === deleteTarget.id)}
        onCancel={() => {
          if (!actionBusyId) setDeleteTarget(null);
        }}
        onConfirm={() => void handleHideConversation()}
      />
      <ConversationActionModal
        isOpen={Boolean(closeTarget)}
        title="Destek görüşmesi sonlandırılsın mı?"
        message="Bu görüşmeye yeni mesaj gönderilemez. Kullanıcı Destek butonuna tekrar bastığında yönetim ekibine yeni bir görüşmeyle ulaşabilir."
        confirmLabel="Sonlandır"
        destructive
        isBusy={Boolean(closeTarget && actionBusyId === closeTarget.id)}
        onCancel={() => {
          if (!actionBusyId) setCloseTarget(null);
        }}
        onConfirm={() => void handleCloseSupportConversation()}
      />
    </div>
  );

  return isViewportReady ? createPortal(messagesView, document.body) : null;
};
