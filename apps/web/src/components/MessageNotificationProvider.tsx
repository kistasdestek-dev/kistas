'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Megaphone, MessageSquare, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface GlobalNotificationToast {
  key: string;
  notificationId: string;
  type: 'message' | 'admin_announcement';
  title: string;
  body: string;
  count: number;
  conversationId?: string;
  actionLabel?: string;
  actionPath?: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: {
    conversation_id?: string;
    announcement_id?: string;
    action_label?: string;
    action_path?: string;
  } | null;
}

const allowedAnnouncementPaths = new Set(['/', '/browse', '/new', '/popular', '/blog']);

const isValidAnnouncementPath = (path?: string): boolean => {
  if (!path) return false;
  if (allowedAnnouncementPaths.has(path)) return true;
  if (/^\/listings\/[a-zA-Z0-9_-]+$/.test(path)) return true;
  return false;
};

export const MessageNotificationProvider: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [toasts, setToasts] = useState<GlobalNotificationToast[]>([]);
  const [messageNotificationsEnabled, setMessageNotificationsEnabled] = useState(true);
  const messageEnabledRef = useRef(true);
  const timersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled !== 'boolean') return;
      messageEnabledRef.current = detail.enabled;
      setMessageNotificationsEnabled(detail.enabled);
      if (!detail.enabled) {
        setToasts((current) => {
          current.filter((toast) => toast.type === 'message').forEach((toast) => {
            const timer = timersRef.current.get(toast.key);
            if (timer) window.clearTimeout(timer);
            timersRef.current.delete(toast.key);
          });
          return current.filter((toast) => toast.type !== 'message');
        });
      }
    };
    window.addEventListener('kistas:message-notification-preference', handlePreferenceChange);
    return () => window.removeEventListener('kistas:message-notification-preference', handlePreferenceChange);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedUserId: string | null = null;
    let subscriptionRevision = 0;

    const stopChannel = async () => {
      if (channel) await supabase.removeChannel(channel);
      channel = null;
      subscribedUserId = null;
    };

    const queueToast = (toast: GlobalNotificationToast) => {
      setToasts((current) => {
        const existing = current.find((item) => item.key === toast.key);
        const nextToast = { ...toast, count: existing ? existing.count + 1 : 1 };
        return [nextToast, ...current.filter((item) => item.key !== toast.key)].slice(0, 2);
      });

      const existingTimer = timersRef.current.get(toast.key);
      if (existingTimer) window.clearTimeout(existingTimer);
      timersRef.current.set(toast.key, window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.key !== toast.key));
        timersRef.current.delete(toast.key);
      }, toast.type === 'admin_announcement' ? 7500 : 5500));
    };

    const subscribeForUser = async (userId: string | null) => {
      if (!active || userId === subscribedUserId) return;
      const revision = ++subscriptionRevision;
      await stopChannel();
      if (!active || revision !== subscriptionRevision) return;
      if (!userId) {
        messageEnabledRef.current = true;
        setMessageNotificationsEnabled(true);
        setToasts([]);
        return;
      }

      const { data: preference } = await supabase
        .from('notification_preferences')
        .select('message_in_app_enabled')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active || revision !== subscriptionRevision) return;
      const preferenceEnabled = preference?.message_in_app_enabled !== false;
      messageEnabledRef.current = preferenceEnabled;
      setMessageNotificationsEnabled(preferenceEnabled);
      subscribedUserId = userId;

      channel = supabase
        .channel(`global_notifications_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            if (!active) return;

            if (row.type === 'message') {
              const conversationId = row.data?.conversation_id;
              if (!messageEnabledRef.current || !conversationId) return;
              window.dispatchEvent(new CustomEvent('kistas:notification-received', { detail: row }));
              queueToast({
                key: `message:${conversationId}`,
                notificationId: row.id,
                type: 'message',
                title: row.title,
                body: row.body,
                count: 1,
                conversationId,
              });
              return;
            }

            if (row.type === 'admin_announcement') {
              const requestedPath = row.data?.action_path;
              const actionPath = requestedPath && isValidAnnouncementPath(requestedPath) ? requestedPath : '/';
              window.dispatchEvent(new CustomEvent('kistas:notification-received', { detail: row }));
              queueToast({
                key: `announcement:${row.data?.announcement_id || row.id}`,
                notificationId: row.id,
                type: 'admin_announcement',
                title: row.title,
                body: row.body,
                count: 1,
                actionLabel: row.data?.action_label || 'Göz at',
                actionPath,
              });
            }
          }
        )
        .subscribe();
    };

    void supabase.auth.getSession().then(({ data }) => subscribeForUser(data.session?.user.id ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void subscribeForUser(session?.user.id ?? null), 0);
    });

    return () => {
      active = false;
      subscriptionRevision += 1;
      authListener.subscription.unsubscribe();
      void stopChannel();
    };
  }, [supabase]);

  const visibleToasts = toasts.filter((toast) => (
    toast.type === 'admin_announcement'
    || (messageNotificationsEnabled && !pathname.startsWith('/messages'))
  ));
  if (visibleToasts.length === 0) return null;

  const dismiss = (toastKey: string) => {
    const timer = timersRef.current.get(toastKey);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(toastKey);
    setToasts((current) => current.filter((toast) => toast.key !== toastKey));
  };

  const openNotification = async (toast: GlobalNotificationToast) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', toast.notificationId);
    dismiss(toast.key);
    if (toast.type === 'message' && toast.conversationId) {
      router.push(`/messages?conversationId=${encodeURIComponent(toast.conversationId)}`);
      return;
    }
    router.push(toast.actionPath || '/');
  };

  return (
    <div className="fixed inset-x-3 top-[max(14px,env(safe-area-inset-top))] z-[1000002] ml-auto flex max-w-sm flex-col gap-2 sm:right-5 sm:left-auto sm:top-5 sm:w-[360px]" aria-live="polite">
      {visibleToasts.map((toast) => {
        const Icon = toast.type === 'admin_announcement' ? Megaphone : MessageSquare;
        return (
          <div
            key={toast.key}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 50%, rgba(255, 255, 255, 0.07) 100%), rgba(255, 255, 255, 0.04)',
              WebkitBackdropFilter: 'blur(28px) saturate(210%) brightness(115%)',
              backdropFilter: 'blur(28px) saturate(210%) brightness(115%)',
              boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.42), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.20)',
            }}
            className="overflow-hidden rounded-[22px] border transition-all duration-300 animate-in slide-in-from-top-3 fade-in"
          >
            <div className="flex items-start gap-3 p-3.5">
              <button type="button" onClick={() => void openNotification(toast)} className="flex min-w-0 flex-1 items-start gap-3 text-left cursor-pointer group">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform group-hover:scale-105">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-white tracking-tight">{toast.title}</span>
                    {toast.count > 1 && <span className="rounded-full bg-white/15 border border-white/25 px-1.5 py-0.5 text-[9px] font-bold text-white">{toast.count} yeni</span>}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-white/80 font-medium leading-relaxed">{toast.body}</span>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-white/90 group-hover:text-white transition-colors">
                    <Bell size={10} /> {toast.type === 'message' ? 'Mesajı aç' : toast.actionLabel}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => dismiss(toast.key)}
                className="mt-0.5 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Bildirimi kapat"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
