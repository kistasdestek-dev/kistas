export type NotificationType =
  | 'launch_approved'
  | 'upvote'
  | 'review'
  | 'message'
  | 'revision_requested'
  | 'system';

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}
