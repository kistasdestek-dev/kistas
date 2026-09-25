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
              const actionPath = requestedPath && allowedAnnouncementPaths.has(requestedPath) ? requestedPath : '/';
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
          <div key={toast.key} className="overflow-hidden rounded-[22px] border border-white/20 bg-[linear-gradient(135deg,rgba(25,46,76,.94),rgba(7,17,34,.96))] shadow-[0_18px_55px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.14)] backdrop-blur-2xl animate-in slide-in-from-top-3 fade-in duration-200">
            <div className="flex items-start gap-3 p-3.5">
              <button type="button" onClick={() => void openNotification(toast)} className="flex min-w-0 flex-1 items-start gap-3 text-left cursor-pointer">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3269C7]/25 text-[#8DB9FF] shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-white">{toast.title}</span>
                    {toast.count > 1 && <span className="rounded-full bg-[#3269C7]/25 px-1.5 py-0.5 text-[9px] font-bold text-[#A8C8FB]">{toast.count} yeni</span>}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-[#B8C7DC]">{toast.body}</span>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#79A9F4]">
                    <Bell size={10} /> {toast.type === 'message' ? 'Mesajı aç' : toast.actionLabel}
                  </span>
                </span>
              </button>
              <button type="button" onClick={() => dismiss(toast.key)} className="mt-0.5 text-[#8FA4C1] hover:text-white cursor-pointer" aria-label="Bildirimi kapat">
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
