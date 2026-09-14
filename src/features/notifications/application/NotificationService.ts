import { supabase } from '../../../core/supabase/supabaseClient';
import { NotificationItem, NotificationType } from '../domain/Notification';

export class NotificationService {
  public static async getNotifications(limit = 40): Promise<NotificationItem[]> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('getNotifications error:', error);
        return [];
      }

      return (data || []).map((row: any): NotificationItem => ({
        id: row.id,
        userId: row.user_id,
        actorId: row.actor_id,
        type: (row.type as NotificationType) || 'system',
        title: row.title,
        body: row.body,
        data: row.data || {},
        isRead: !!row.is_read,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('getNotifications exception:', err);
      return [];
    }
  }

  public static async getUnreadCount(): Promise<number> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authData.user.id)
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  public static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      return !error;
    } catch {
      return false;
    }
  }

  public static async markAllAsRead(): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return false;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', authData.user.id)
        .eq('is_read', false);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Kullanıcının tüm bildirimlerini tek hamlede siler.
   */
  public static async deleteAllNotifications(): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return false;

      // 1. Öncelik: Atomik RPC
      const { data, error: rpcError } = await supabase.rpc('delete_all_user_notifications');
      if (!rpcError && data?.success !== false) {
        return true;
      }

      // 2. Yedek: RLS DELETE politikası
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', authData.user.id);

      return !error;
    } catch (err) {
      console.error('deleteAllNotifications exception:', err);
      return false;
    }
  }

  /**
   * Tekil bir bildirimi siler.
   */
  public static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      return !error;
    } catch {
      return false;
    }
  }

}
