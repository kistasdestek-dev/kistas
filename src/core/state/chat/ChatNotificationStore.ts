import { useSyncExternalStore } from 'react';

export interface ChatNotificationState {
  unreadCount: number;
  activeConversationId: string | null;
  lastMessagePreview: string | null;
}

type Listener = () => void;

let state: ChatNotificationState = {
  unreadCount: 0,
  activeConversationId: null,
  lastMessagePreview: null,
};

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ChatNotificationState {
  return state;
}

function updateState(partial: Partial<ChatNotificationState>) {
  state = { ...state, ...partial };
  notify();
}

/**
 * Chat & Bildirim Mikro-Aksiyonları (Component'leri re-render ettirmeden çağrılabilir)
 */
export const chatNotificationActions = {
  setUnreadCount: (count: number) => {
    updateState({ unreadCount: Math.max(0, count) });
  },
  incrementUnread: (amount: number = 1) => {
    updateState({ unreadCount: state.unreadCount + amount });
  },
  decrementUnread: (amount: number = 1) => {
    updateState({ unreadCount: Math.max(0, state.unreadCount - amount) });
  },
  resetUnread: () => {
    updateState({ unreadCount: 0 });
  },
  setActiveConversation: (activeConversationId: string | null) => {
    updateState({ activeConversationId });
  },
  setLastMessagePreview: (lastMessagePreview: string | null) => {
    updateState({ lastMessagePreview });
  },
};

/**
 * Seçici Abonelik (Selective Subscription) Hook'u
 * Yalnızca seçilen değer değiştiğinde bileşeni render eder.
 */
export function useChatNotificationStore<T>(
  selector: (state: ChatNotificationState) => T
): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot())
  );
}

/**
 * Yalnızca okunmamış mesaj sayısına abone olan mikro-hook
 */
export const useChatUnreadCount = (): number => {
  return useChatNotificationStore((s) => s.unreadCount);
};
