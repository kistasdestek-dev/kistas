'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Headphones,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Radio,
  Loader2,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

export interface AdminSupportConversation {
  id: string;
  buyer_id: string;
  last_message: string | null;
  last_message_at: string | null;
  buyer_unread_count: number;
  seller_unread_count?: number;
  closed_at: string | null;
  closed_by?: string | null;
  buyer?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
  } | null;
}

interface AdminSupportViewProps {
  conversations?: AdminSupportConversation[];
  onRefresh?: () => void;
  searchQuery?: string;
}

export const AdminSupportView: React.FC<AdminSupportViewProps> = ({
  conversations,
  onRefresh,
  searchQuery = '',
}) => {
  const [localConversations, setLocalConversations] = useState<AdminSupportConversation[]>(conversations || []);
  const [filter, setFilter] = useState<'open' | 'closed'>('open');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (conversations && conversations.length > 0) {
      setLocalConversations(conversations);
    } else {
      supabase
        .from('conversations')
        .select('*, buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url, is_verified), listing:listings(id, title, logo_url)')
        .order('updated_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) setLocalConversations(data as any);
        });
    }
  }, [conversations, supabase]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Açık ve sonlandırılmış sayıları
  const openCount = localConversations.filter((c) => !c.closed_at).length;
  const closedCount = localConversations.filter((c) => Boolean(c.closed_at)).length;

  // Filtreleme
  const filtered = localConversations.filter((c) => {
    const isClosed = Boolean(c.closed_at);
    if (filter === 'open' && isClosed) return false;
    if (filter === 'closed' && !isClosed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = c.buyer?.full_name?.toLowerCase() || '';
      const msg = c.last_message?.toLowerCase() || '';
      return name.includes(q) || msg.includes(q);
    }
    return true;
  });

  // Sohbeti Sonlandır
  const handleCloseConversation = async (c: AdminSupportConversation) => {
    setActionBusyId(c.id);
    try {
      const { error } = await supabase.rpc('admin_close_support_conversation', {
        p_conversation_id: c.id,
      });
      if (error) throw error;
      showToast('Destek görüşmesi başarıyla sonlandırıldı.');
      onRefresh?.();
    } catch (err: any) {
      console.error('admin_close_support_conversation error:', err);
      showToast('Hata: ' + (err.message || 'Görüşme sonlandırılamadı.'));
    } finally {
      setActionBusyId(null);
    }
  };

  // Mesajları Sil / Temizle
  const handleClearMessages = async (c: AdminSupportConversation) => {
    if (!window.confirm('Bu destek görüşmesindeki tüm mesajları kalıcı olarak silmek istediğinize emin misiniz?')) {
      return;
    }
    setActionBusyId(c.id);
    try {
      const { error } = await supabase.rpc('admin_clear_support_messages', {
        p_conversation_id: c.id,
      });
      if (error) throw error;
      showToast('Görüşme mesajları kalıcı olarak temizlendi.');
      onRefresh?.();
    } catch (err: any) {
      console.error('admin_clear_support_messages error:', err);
      showToast('Hata: ' + (err.message || 'Mesajlar temizlenemedi.'));
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Bilgilendirmesi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-blue-500/30 bg-[#0E182A]/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3">
          <AlertCircle size={15} className="text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Başlık ve Filtre Rayı */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2.5">
            <Headphones size={20} className="text-blue-400" />
            <span>Destek Talepleri & Canlı Mesajlaşma</span>
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Footer veya doğrudan başlatılan canlı destek görüşmelerini anlık yönetin.
          </p>
        </div>

        {/* Sekmeler (Açık / Sonlandırılan) */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-blue-500/25 bg-black/40 p-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setFilter('open')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              filter === 'open'
                ? 'border border-blue-500/40 bg-blue-500/20 text-blue-200 shadow-sm'
                : 'border border-transparent text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio size={12} className={filter === 'open' ? 'text-blue-300' : 'text-emerald-400'} />
            <span>Açık Talepler ({openCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('closed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              filter === 'closed'
                ? 'border border-blue-500/40 bg-blue-500/20 text-blue-200 shadow-sm'
                : 'border border-transparent text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Sonlandırılanlar ({closedCount})</span>
          </button>
        </div>
      </div>

      {/* Görüşmeler Listesi */}
      {filtered.length === 0 ? (
        <div className="rounded-[24px] border border-blue-500/25 bg-gradient-to-br from-[#0E182A] to-[#0A101D] p-12 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Inbox size={22} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {filter === 'open' ? 'Açık Destek Görüşmesi Yok' : 'Sonlandırılmış Görüşme Yok'}
          </h3>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
            {filter === 'open'
              ? 'Şu anda yanıt bekleyen veya açık bir destek talebi bulunmuyor.'
              : 'Henüz arşivlenmiş bir destek görüşmesi kaydı mevcut değil.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((conv, index) => {
            const isBusy = actionBusyId === conv.id;
            const partyName = conv.buyer?.full_name || 'Kıstas Üyesi';
            const unreadCount = conv.buyer_unread_count || 0;
            const isClosed = Boolean(conv.closed_at);
            const timeFormatted = conv.last_message_at
              ? new Intl.DateTimeFormat('tr-TR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(conv.last_message_at))
              : 'Yeni görüşme';

            return (
              <div
                key={conv.id || `conv-${index}`}
                className={`group rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg ${
                  unreadCount > 0
                    ? 'border-blue-500/50 bg-gradient-to-br from-[#12233f] to-[#0d1627] ring-1 ring-blue-500/30'
                    : 'border-blue-500/25 bg-gradient-to-br from-[#0E182A] to-[#0A101D] hover:border-blue-400/40'
                }`}
              >
                {/* Kullanıcı ve Mesaj Önizlemesi */}
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      {partyName.charAt(0).toUpperCase()}
                    </div>
                    {conv.buyer?.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-[#0E182A] rounded-full p-0.5">
                        <CheckCircle2 size={13} className="text-blue-400 fill-blue-400/20" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-white tracking-tight truncate">
                        {partyName}
                      </p>
                      {unreadCount > 0 && (
                        <span className="rounded-md bg-blue-500/25 border border-blue-400/40 px-2 py-0.5 text-[10px] font-black text-blue-300">
                          {unreadCount} YENİ MESAJ
                        </span>
                      )}
                      {isClosed ? (
                        <span className="rounded-md bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          Sonlandırıldı
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Açık
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#CBD5E1] line-clamp-1 break-all">
                      {conv.last_message || 'Destek görüşmesi başlatıldı.'}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {timeFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    href={`/messages?conversationId=${conv.id}`}
                    className="h-8.5 px-3.5 rounded-xl border border-blue-500/35 bg-blue-500/15 hover:bg-blue-500/25 hover:border-blue-400/60 text-blue-200 hover:text-white text-xs font-semibold inline-flex items-center gap-2 transition-all duration-200 shadow-xs cursor-pointer"
                  >
                    <MessageSquare size={13} className="text-blue-300" />
                    <span>Görüşmeyi Aç</span>
                    <ArrowRight size={12} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {!isClosed ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleCloseConversation(conv)}
                      className="h-8.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:border-amber-500/35 hover:bg-amber-500/15 text-slate-300 hover:text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
                      title="Görüşmeyi Arşivle / Sonlandır"
                    >
                      {isBusy ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={13} className="text-amber-400/80" />
                      )}
                      <span>Sonlandır</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleClearMessages(conv)}
                      className="h-8.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:border-rose-500/35 hover:bg-rose-500/15 text-slate-300 hover:text-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
                      title="Mesajları Kalıcı Olarak Sil"
                    >
                      {isBusy ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} className="text-rose-400/80" />
                      )}
                      <span>Temizle</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
