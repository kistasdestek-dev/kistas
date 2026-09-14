import { supabase } from '../../../core/supabase/supabaseClient';
import { ChatMessage, Conversation, MessageType } from '../domain/Chat';
import { ChatContentFilter } from '../../../core/security/ChatContentFilter';
import { toPostgrestUuid } from '../../../core/security/DatabaseInput';

const mapConversationRows = (rows: any[], currentUserId: string): Conversation[] => rows.map((row: any) => {
  const isBuyer = row.buyer_id === currentUserId;
  const otherParty = isBuyer ? row.seller : row.buyer;
  const listing = row.listings ? {
    id: row.listings.id,
    title: row.listings.title,
    price: Number(row.listings.price),
    coverImageUrl: row.listings.listing_images?.[0]?.image_url,
  } : undefined;

  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    buyerUnreadCount: row.buyer_unread_count,
    sellerUnreadCount: row.seller_unread_count,
    unreadCount: isBuyer ? row.buyer_unread_count : row.seller_unread_count,
    closedAt: row.closed_at || null,
    closedBy: row.closed_by || null,
    listing,
    otherParty: otherParty ? {
      id: otherParty.id,
      fullName: otherParty.full_name,
      avatarUrl: otherParty.avatar_url,
    } : undefined,
  };
});

export class ChatService {
  /**
   * Kullanıcının Tüm Sohbetlerini Listeleme
   */
  public static async getConversations(): Promise<Conversation[]> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return [];
      const safeCurrentUserId = toPostgrestUuid(authData.user.id, 'user id');

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          last_message,
          last_message_at,
          buyer_unread_count,
          seller_unread_count,
          closed_at,
          closed_by,
          listings:listing_id (id, title, price, listing_images(image_url, is_cover)),
          buyer:buyer_id (id, full_name, avatar_url),
          seller:seller_id (id, full_name, avatar_url)
        `)
        .or(`buyer_id.eq.${safeCurrentUserId},seller_id.eq.${safeCurrentUserId}`)
        .order('last_message_at', { ascending: false });

      if (error || !data) return [];

      return mapConversationRows(data, safeCurrentUserId);
    } catch {
      return [];
    }
  }

  /** Platform yöneticilerinin ortak destek kuyruğu. */
  public static async getAdminSupportConversations(): Promise<Conversation[]> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          last_message,
          last_message_at,
          buyer_unread_count,
          seller_unread_count,
          closed_at,
          closed_by,
          listings:listing_id (id, title, price, listing_images(image_url, is_cover)),
          buyer:buyer_id (id, full_name, avatar_url),
          seller:seller_id (id, full_name, avatar_url)
        `)
        .is('listing_id', null)
        .order('last_message_at', { ascending: false });

      if (error || !data) return [];
      return mapConversationRows(data, authData.user.id);
    } catch {
      return [];
    }
  }

  /**
   * Bir proje sahibiyle oturumdaki kullanıcı arasında özel konuşmayı açar.
   */
  public static async getOrCreateListingConversation(
    listingId: string
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;
      if (!currentUserId) return { success: false, error: 'Mesajlaşmak için giriş yapmalısınız.' };

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, seller_id, status')
        .eq('id', listingId)
        .single();

      if (listingError || !listing || listing.status !== 'active') {
        return { success: false, error: 'Proje artık mesajlaşmaya açık değil.' };
      }
      if (listing.seller_id === currentUserId) {
        return { success: false, error: 'Kendi projeniz için kendinizle konuşma başlatamazsınız.' };
      }

      const findExisting = () => supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('buyer_id', currentUserId)
        .eq('seller_id', listing.seller_id)
        .maybeSingle();

      const { data: existing, error: existingError } = await findExisting();
      if (existingError) return { success: false, error: existingError.message };
      if (existing?.id) return { success: true, conversationId: existing.id };

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({ listing_id: listing.id, buyer_id: currentUserId, seller_id: listing.seller_id })
        .select('id')
        .single();

      if (created?.id) return { success: true, conversationId: created.id };
      if (createError?.code === '23505') {
        const { data: racedConversation } = await findExisting();
        if (racedConversation?.id) return { success: true, conversationId: racedConversation.id };
      }
      return { success: false, error: createError?.message || 'Konuşma başlatılamadı.' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Konuşma başlatılamadı.' };
    }
  }

  /**
   * Kullanıcı ile platform yöneticisi arasındaki özel destek kanalını açar.
   */
  public static async getOrCreateSupportConversation(): Promise<{
    success: boolean;
    conversationId?: string;
    error?: string;
  }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;
      if (!currentUserId) {
        return { success: false, error: 'Destek için giriş yapmalısınız.' };
      }

      const { data, error } = await supabase.rpc('get_or_create_support_conversation');
      if (error || !data) {
        return { success: false, error: error?.message || 'Destek görüşmesi başlatılamadı.' };
      }

      const conversationId = String(data);
      const { data: ownedConversation, error: ownershipError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .is('listing_id', null)
        .eq('buyer_id', currentUserId)
        .maybeSingle();

      if (ownershipError || !ownedConversation?.id) {
        return { success: false, error: 'Destek görüşmesi bu kullanıcıya ait değil.' };
      }

      return { success: true, conversationId: ownedConversation.id };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Destek görüşmesi başlatılamadı.' };
    }
  }

  /**
   * Belirli Bir Sohbetin Mesajlarını Getirme
   */
  public static async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        type: row.type,
        metadata: row.metadata,
        isFlagged: !!row.is_flagged,
        flagReason: row.flag_reason,
        isRead: !!row.is_read,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  }

  public static async getConversationStatus(conversationId: string): Promise<{ closedAt: string | null } | null> {
    try {
      const safeConversationId = toPostgrestUuid(conversationId, 'conversation id');
      const { data, error } = await supabase
        .from('conversations')
        .select('closed_at')
        .eq('id', safeConversationId)
        .maybeSingle();
      if (error || !data) return null;
      return { closedAt: data.closed_at || null };
    } catch {
      return null;
    }
  }

  public static async closeSupportConversation(
    conversationId: string
  ): Promise<{ success: boolean; closedAt?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_close_support_conversation', {
        p_conversation_id: conversationId,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Görüşme sonlandırılamadı.' };
      }
      return { success: true, closedAt: data.closed_at || new Date().toISOString() };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Görüşme sonlandırılamadı.' };
    }
  }

  public static async clearSupportMessages(
    conversationId: string
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_clear_support_messages', {
        p_conversation_id: conversationId,
      });
      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Mesaj geçmişi silinemedi.' };
      }
      return { success: true, deletedCount: Number(data.deleted_count || 0) };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Mesaj geçmişi silinemedi.' };
    }
  }

  /**
   * Mesaj Gönderme (İstemci Ön Filtresi + Veritabanı Trigger Güvenliği)
   */
  public static async sendMessage(
    conversationId: string,
    content: string,
    type: MessageType = 'text',
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        return { success: false, error: 'Oturum bulunamadı.' };
      }

      // 1. Client-Side Pre-Flight Security Check (Telefon, IBAN, Harici Link)
      if (type === 'text') {
        const securityCheck = ChatContentFilter.inspect(content);
        if (!securityCheck.isSafe) {
          return {
            success: false,
            error: securityCheck.violations.join('\n'),
          };
        }
      }

      // 2. Katılımcı ve destek yöneticisi yetkisini sunucuda doğrulayarak kaydet.
      const { data, error } = await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId,
        p_content: content,
        p_type: type,
        p_metadata: metadata || null,
      });

      if (error || !data) {
        return { success: false, error: error?.message || 'Mesaj iletilemedi.' };
      }

      return {
        success: true,
        message: {
          id: data.id,
          conversationId: data.conversation_id,
          senderId: data.sender_id,
          content: data.content,
          type: data.type,
          metadata: data.metadata,
          isFlagged: !!data.is_flagged,
          flagReason: data.flag_reason,
          isRead: false,
          createdAt: data.created_at,
        },
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Beklenmeyen hata.' };
    }
  }

  public static async markConversationRead(conversationId: string): Promise<void> {
    try {
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    } catch {
      // Okundu bilgisi sohbetin açılmasını engellememeli.
    }
  }

  /**
   * Realtime WebSocket Dinleyicisi
   */
  public static subscribeToMessages(
    conversationId: string,
    onNewMessage: (msg: ChatMessage) => void
  ) {
    const safeConversationId = toPostgrestUuid(conversationId, 'conversation id');
    const channel = supabase
      .channel(`chat_${safeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${safeConversationId}`,
        },
        (payload) => {
          const row = payload.new as any;
          onNewMessage({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            content: row.content,
            type: row.type,
            metadata: row.metadata,
            isFlagged: !!row.is_flagged,
            flagReason: row.flag_reason,
            isRead: !!row.is_read,
            createdAt: row.created_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /** Yönetici ve kullanıcı gelen kutularını yeni destek hareketlerinde tazeler. */
  public static subscribeToInbox(onChange: () => void) {
    const channel = supabase
      .channel(`chat_inbox_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
