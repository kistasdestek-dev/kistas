import type { RefObject } from 'react';
import type { View } from 'react-native';

export type TabKey =
  | 'discover'
  | 'browse'
  | 'messages'
  | 'create'
  | 'credits'
  | 'profile';

export interface AppNavigationProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  isAuthenticated?: boolean;
  unreadMessagesCount?: number;
  compact?: boolean;
  blurTarget?: RefObject<View | null>;
}
