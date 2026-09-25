'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/browser';
import { isValidAnnouncementPath } from '@/lib/notifications';
import { GlobalNotificationCard } from './GlobalNotificationCard';

interface GlobalNotificationToast {
  key: string;
  notificationId: string;
  type: 'message' | 'admin_announcement';
  title: string;
  body: string;
  count: number;
  conversationId?: string;
  actionPath?: string;
  logoUrl?: string;
  logoAlt?: string;
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
    action_path?: string;
    listing_id?: string;
    logo_url?: string;
  } | null;
}

export const MessageNotificationProvider: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
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
                actionPath,
                logoUrl: row.data?.logo_url,
                logoAlt: row.title,
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
    <div className="pointer-events-none fixed inset-x-3 top-[max(14px,env(safe-area-inset-top))] z-[1000002] ml-auto flex max-w-[480px] flex-col gap-2 sm:right-5 sm:left-auto sm:top-5 sm:w-[460px]" aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        {visibleToasts.map((toast) => (
          <motion.div
            key={toast.key}
            layout
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -96, scale: 0.94, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -42, scale: 0.97, filter: 'blur(8px)' }}
            transition={prefersReducedMotion ? { duration: 0.16 } : { type: 'spring', stiffness: 420, damping: 30, mass: 0.82 }}
          >
            <GlobalNotificationCard
              type={toast.type}
              title={toast.title}
              body={toast.body}
              logoUrl={toast.logoUrl}
              logoAlt={toast.logoAlt}
              count={toast.count}
              onOpen={() => void openNotification(toast)}
              onDismiss={() => dismiss(toast.key)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
