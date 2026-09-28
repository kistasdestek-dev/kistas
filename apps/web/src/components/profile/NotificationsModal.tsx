'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Rocket,
  ArrowUpCircle,
  MessageSquare,
  Mail,
  Wrench,
  Sparkles,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  isLoading: boolean;
  onClose: () => void;
  onMarkAllRead: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onDeleteSingle: (id: string) => Promise<void>;
  onSelectNotification?: (notif: NotificationItem) => void;
}

const formatNotificationTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin}d önce`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}s önce`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}g önce`;
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(d);
  } catch {
    return '';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'launch_approved':
      return { Icon: Rocket, color: '#187657', bg: 'bg-[#187657]/10 border-[#187657]/20' };
    case 'upvote':
      return { Icon: ArrowUpCircle, color: '#3269C7', bg: 'bg-[#3269C7]/10 border-[#3269C7]/20' };
    case 'review':
      return { Icon: MessageSquare, color: '#936413', bg: 'bg-[#936413]/10 border-[#936413]/20' };
    case 'message':
      return { Icon: Mail, color: '#3269C7', bg: 'bg-[#3269C7]/10 border-[#3269C7]/20' };
    case 'revision_requested':
      return { Icon: Wrench, color: '#B98916', bg: 'bg-[#B98916]/10 border-[#B98916]/20' };
    case 'credit_purchase':
      return { Icon: Sparkles, color: '#187657', bg: 'bg-[#187657]/10 border-[#187657]/20' };
    case 'admin_announcement':
      return { Icon: Megaphone, color: '#60A5FA', bg: 'bg-[#3269C7]/10 border-[#3269C7]/25' };
    default:
      return { Icon: Bell, color: '#3269C7', bg: 'bg-[#3269C7]/10 border-[#3269C7]/20' };
  }
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  notifications,
  isLoading,
  onClose,
  onMarkAllRead,
  onDeleteAll,
  onDeleteSingle,
  onSelectNotification,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  useBodyScrollLock(isOpen);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3B82F6]/25 via-[#60A5FA]/10 to-transparent blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <GlassIconButton icon={Bell} size={42} iconSize={19} ariaLabel="Bildirimler" />
            <div>
              <p className="text-[10px] font-bold tracking-wider text-[#A1A1AA] uppercase">
                KISTAS AKIŞI
              </p>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Bildirimler
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    {unreadCount} yeni
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-xs"
          >
            <X size={16} />
          </button>
        </div>

        {/* SubHeader: Tabs & SubActions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md">
          {/* Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setIsConfirmingDeleteAll(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#3269C7] text-white shadow-xs'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Tümü ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('unread');
                setIsConfirmingDeleteAll(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[#3269C7] text-white shadow-xs'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Okunmamış ({unreadCount})
            </button>
          </div>

          {/* Actions: Mark all read & Delete all */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={busyAction}
                onClick={async () => {
                  setBusyAction(true);
                  await onMarkAllRead();
                  setBusyAction(false);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#60A5FA] hover:underline cursor-pointer disabled:opacity-50"
              >
                <CheckCheck size={13} />
                <span>Okundu Say</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setIsConfirmingDeleteAll(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={12} />
                <span>Tümünü Sil</span>
              </button>
            )}
          </div>
        </div>

        {/* Delete All Confirmation Dialog */}
        {isConfirmingDeleteAll && (
          <div className="mx-6 my-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-center animate-in fade-in duration-150">
            <p className="text-xs font-bold text-white">
              Tüm bildirimler kalıcı olarak silinsin mi?
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setIsConfirmingDeleteAll(false)}
                className="h-8 px-3 rounded-lg border border-white/10 bg-[#1A1A1A] text-xs font-bold text-white shadow-xs hover:bg-[#222222] cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={async () => {
                  setBusyAction(true);
                  await onDeleteAll();
                  setBusyAction(false);
                  setIsConfirmingDeleteAll(false);
                }}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-xs font-bold text-white shadow-xs hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {busyAction ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                <span>Sil</span>
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 touch-pan-y overflow-y-auto overscroll-contain p-6 space-y-3 [-webkit-overflow-scrolling:touch]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#A1A1AA]">
              <Loader2 size={24} className="animate-spin text-[#3269C7]" />
              <span>Bildirimler yükleniyor...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#161616]">
                <BellOff size={24} className="text-[#60A5FA]" />
              </div>
              <p className="text-sm font-bold text-white">
                {filter === 'unread'
                  ? 'Okunmamış bildiriminiz yok.'
                  : 'Henüz bildiriminiz bulunmuyor.'}
              </p>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Lansman, destek ve mesaj hareketleriniz burada listelenir.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const { Icon, color, bg } = getNotificationIcon(item.type);
              const announcementLogoUrl = item.type === 'admin_announcement' && typeof item.data?.logo_url === 'string'
                ? item.data.logo_url
                : undefined;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectNotification?.(item)}
                  className={`group relative flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    !item.is_read
                      ? 'bg-[#181818] border-[#3269C7]/40 shadow-lg'
                      : 'bg-[#141414] border-white/10 hover:bg-[#1A1A1A]'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${bg}`}
                  >
                    {announcementLogoUrl ? (
                      <AutoTransparentLogo
                        src={announcementLogoUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon size={18} color={color} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] font-medium text-[#71717A] shrink-0">
                        {formatNotificationTime(item.created_at)}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] leading-relaxed text-[#D4D4D8]">
                      {item.body}
                    </p>
                  </div>

                  {/* Actions right side */}
                  <div className="flex flex-col items-center justify-between self-stretch shrink-0 pl-1">
                    {!item.is_read ? (
                      <span className="h-2 w-2 rounded-full bg-[#3269C7] shadow-xs" />
                    ) : (
                      <span className="h-2 w-2" />
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDeleteSingle(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#71717A] hover:text-red-400 transition-opacity cursor-pointer"
                      title="Bildirimi sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
