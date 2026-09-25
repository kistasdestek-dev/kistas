import type { SupabaseClient } from '@supabase/supabase-js';

export type MessageType = 'text' | 'image' | 'location' | 'offer' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, any> | null;
  isFlagged: boolean;
  flagReason?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId?: string | null;
  buyerId: string;
  sellerId: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  unreadCount: number;
  closedAt?: string | null;
  closedBy?: string | null;
  hiddenAt?: string | null;
  listing?: {
    id: string;
    title: string;
    price?: number;
    coverImageUrl?: string;
  };
  otherParty?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
}

export interface ConversationTypingState {
  conversationId: string;
  userId: string;
  expiresAt: string;
}

/**
 * Pars DevState Savunma Prensibi - Sohbet İçerik Filtresi (SEC-020)
 * İstemci tarafında anlık uyarı verir, sunucu trigger'ı ile çift katmanlı doğrulanır.
 */
export class ChatContentFilter {
  private static readonly PHONE_REGEX = /(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}/;
  private static readonly IBAN_REGEX = /TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}/i;
  private static readonly URL_REGEX = /(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me)\b/i;

  public static inspect(content: string): { isSafe: boolean; violations: string[] } {
    const violations: string[] = [];

    if (this.PHONE_REGEX.test(content)) {
      violations.push('Telefon numarası paylaşımı platform güvenlik kuralları gereği kısıtlanmıştır.');
    }

    if (this.IBAN_REGEX.test(content)) {
      violations.push('IBAN veya banka hesap bilgisi paylaşımı dolandırıcılık önleme kuralları gereği engellenmiştir.');
    }

    if (this.URL_REGEX.test(content)) {
      violations.push('Harici web sitesi veya şüpheli bağlantı paylaşımı engellenmiştir.');
    }

    return {
      isSafe: violations.length === 0,
      violations,
    };
  }
}

interface PublicChatProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

const mapConversationRows = (
  rows: any[],
  currentUserId: string,
  profilesById: Map<string, PublicChatProfile>
): Conversation[] => {
  return rows.map((row: any) => {
    const isBuyer = row.buyer_id === currentUserId;
    const isSeller = row.seller_id === currentUserId;
    const otherParty = profilesById.get(isBuyer ? row.seller_id : row.buyer_id);
    const listing = row.listings
      ? {
          id: row.listings.id,
          title: row.listings.title,
          price: Number(row.listings.price || 0),
          coverImageUrl: row.listings.listing_images?.[0]?.image_url,
        }
      : undefined;

    return {
      id: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      buyerUnreadCount: Number(row.buyer_unread_count || 0),
      sellerUnreadCount: Number(row.seller_unread_count || 0),
      unreadCount: isBuyer
        ? Number(row.buyer_unread_count || 0)
        : Number(row.seller_unread_count || 0),
      closedAt: row.closed_at || null,
      closedBy: row.closed_by || null,
      hiddenAt: (isBuyer ? row.buyer_hidden_at : isSeller ? row.seller_hidden_at : null) || null,
      listing,
      otherParty: otherParty
        ? {
            id: otherParty.id,
            fullName: otherParty.full_name || 'Kıstas Üyesi',
            avatarUrl: otherParty.avatar_url,
            isVerified: Boolean(otherParty.is_verified),
          }
        : undefined,
    };
  });
};

export class ChatService {
  /**
   * Oturumdaki kullanıcının tüm konuşmalarını listeler
   */
  public static async getConversations(
    supabase: SupabaseClient,
    currentUserId: string,
    canViewAllSupport = false
  ): Promise<Conversation[]> {
    try {
      let query = supabase
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
          buyer_hidden_at,
          seller_hidden_at,
          listings:listing_id (id, title, price, listing_images(image_url, is_cover))
        `);

      query = query.or(
        canViewAllSupport
          ? `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId},listing_id.is.null`
          : `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
      );

      const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

      if (error || !data) {
        console.error('getConversations error:', error);
        return [];
      }

      const otherPartyIds = Array.from(new Set(data.map((row) =>
        row.buyer_id === currentUserId ? row.seller_id : row.buyer_id
      )));
      const profilesById = new Map<string, PublicChatProfile>();

      if (otherPartyIds.length > 0) {
        // Keep PostgREST URLs and result sets bounded for large production inboxes.
        for (let start = 0; start < otherPartyIds.length; start += 100) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, is_verified')
            .in('id', otherPartyIds.slice(start, start + 100));

          if (profileError) {
            console.error('getConversations participant profiles error:', profileError);
            break;
          }
          for (const profile of (profiles ?? []) as PublicChatProfile[]) {
            profilesById.set(profile.id, profile);
          }
        }
      }

      return mapConversationRows(data, currentUserId, profilesById).filter((conversation) => {
        if (!conversation.hiddenAt) return true;
        if (!conversation.lastMessageAt) return false;
        return new Date(conversation.lastMessageAt).getTime() > new Date(conversation.hiddenAt).getTime();
      });
    } catch (err) {
      console.error('getConversations catch:', err);
      return [];
    }
  }

  /**
   * Belirli bir konuşmanın mesajlarını çeker
   */
  public static async getMessages(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        console.error('getMessages error:', error);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        type: row.type || 'text',
        metadata: row.metadata,
        isFlagged: Boolean(row.is_flagged),
        flagReason: row.flag_reason,
        isRead: Boolean(row.is_read),
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('getMessages catch:', err);
      return [];
    }
  }

  /**
   * Mesaj gönderme (Çift katmanlı XSS, Phishing ve Rate-limit koruması)
   */
  public static async sendMessage(
    supabase: SupabaseClient,
    conversationId: string,
    content: string,
    type: MessageType = 'text',
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    try {
      const trimmed = content.trim();
      if (!trimmed) {
        return { success: false, error: 'Mesaj içeriği boş olamaz.' };
      }

      // 1. Pars DevState İstemci Ön Filtresi
      if (type === 'text') {
        const check = ChatContentFilter.inspect(trimmed);
        if (!check.isSafe) {
          return {
            success: false,
            error: check.violations.join(' '),
          };
        }
      }

      // 2. PostgreSQL SECURITY DEFINER send_chat_message RPC çağrısı
      const { data, error } = await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId,
        p_content: trimmed,
        p_type: type,
        p_metadata: metadata || null,
      });

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Mesaj iletilemedi. Lütfen tekrar deneyin.',
        };
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
          isFlagged: Boolean(data.is_flagged),
          flagReason: data.flag_reason,
          isRead: false,
          createdAt: data.created_at,
        },
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Beklenmeyen bir hata oluştu.' };
    }
  }

  /**
   * Konuşmadaki mesajları okundu olarak işaretler
   */
  public static async markConversationRead(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<void> {
    try {
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
    } catch {
      // Okundu bilgisi akışı engellemez
    }
  }

  public static async setConversationTyping(
    supabase: SupabaseClient,
    conversationId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      await supabase.rpc('set_conversation_typing', {
        p_conversation_id: conversationId,
        p_is_typing: isTyping,
      });
    } catch {
      // Yazıyor durumu mesajlaşmayı engelleyen kritik bir işlem değildir.
    }
  }

  public static async getConversationTypingStates(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<ConversationTypingState[]> {
    const { data, error } = await supabase
      .from('conversation_typing_states')
      .select('conversation_id, user_id, expires_at')
      .eq('conversation_id', conversationId)
      .gt('expires_at', new Date().toISOString());

    if (error || !data) return [];
    return data.map((row) => ({
      conversationId: row.conversation_id,
      userId: row.user_id,
      expiresAt: row.expires_at,
    }));
  }

  /**
   * Bir proje için satıcıyla konuşma oluşturur veya var olanı getirir
   */
  public static async getOrCreateListingConversation(
    supabase: SupabaseClient,
    listingId: string
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Mesaj göndermek için giriş yapmalısınız.' };
      }

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, seller_id, status')
        .eq('id', listingId)
        .single();

      if (listingError || !listing || (listing.status !== 'active' && listing.status !== 'approved')) {
        return { success: false, error: 'Bu proje artık mesajlaşmaya açık değil.' };
      }

      if (listing.seller_id === user.id) {
        return { success: false, error: 'Kendi projeniz için kendinize mesaj gönderemezsiniz.' };
      }

      // Var olan konuşmayı ara
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('buyer_id', user.id)
        .eq('seller_id', listing.seller_id)
        .maybeSingle();

      if (existing?.id) {
        await this.restoreConversation(supabase, existing.id);
        return { success: true, conversationId: existing.id };
      }

      // Yeni konuşma aç
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
        })
        .select('id')
        .single();

      if (created?.id) {
        await this.restoreConversation(supabase, created.id);
        return { success: true, conversationId: created.id };
      }

      return {
        success: false,
        error: createError?.message || 'Konuşma başlatılamadı.',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Konuşma başlatılamadı.' };
    }
  }

  /**
   * Kullanıcı ile Kıstas Destek arasındaki resmi destek konuşmasını açar
   */
  public static async getOrCreateSupportConversation(
    supabase: SupabaseClient
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Destek talebi için giriş yapmalısınız.' };
      }

      const { data, error } = await supabase.rpc('get_or_create_support_conversation');
      if (error || !data) {
        return { success: false, error: error?.message || 'Destek görüşmesi açılamadı.' };
      }

      const conversationId = String(data);
      await this.restoreConversation(supabase, conversationId);
      return { success: true, conversationId };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Destek görüşmesi açılamadı.' };
    }
  }

  public static async hideConversation(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('hide_conversation_for_current_user', {
      p_conversation_id: conversationId,
    });
    return error
      ? { success: false, error: error.message || 'Görüşme Inbox’tan kaldırılamadı.' }
      : { success: true };
  }

  public static async restoreConversation(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('restore_conversation_for_current_user', {
      p_conversation_id: conversationId,
    });
    return error
      ? { success: false, error: error.message || 'Görüşme yeniden açılamadı.' }
      : { success: true };
  }

  public static async closeSupportConversation(
    supabase: SupabaseClient,
    conversationId: string
  ): Promise<{ success: boolean; closedAt?: string; error?: string }> {
    const { data, error } = await supabase.rpc('admin_close_support_conversation', {
      p_conversation_id: conversationId,
    });
    if (error || !data) {
      return { success: false, error: error?.message || 'Destek görüşmesi sonlandırılamadı.' };
    }
    return {
      success: true,
      closedAt: typeof data.closed_at === 'string' ? data.closed_at : new Date().toISOString(),
    };
  }

  /**
   * Realtime Mesaj Dinleyicisi
   */
  public static subscribeToMessages(
    supabase: SupabaseClient,
    conversationId: string,
    onNewMessage: (message: ChatMessage) => void,
    onUpdatedMessage?: (message: ChatMessage) => void
  ) {
    const mapMessage = (row: any): ChatMessage => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      content: row.content,
      type: row.type || 'text',
      metadata: row.metadata,
      isFlagged: Boolean(row.is_flagged),
      flagReason: row.flag_reason,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
    });

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.id || !row.conversation_id) return;
          onNewMessage(mapMessage(row));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.id || !row.conversation_id || !onUpdatedMessage) return;
          onUpdatedMessage(mapMessage(row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  public static subscribeToTypingStates(
    supabase: SupabaseClient,
    conversationId: string,
    onChange: () => void
  ) {
    const channel = supabase
      .channel(`typing_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_typing_states',
          filter: `conversation_id=eq.${conversationId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Gelen Kutusu (Inbox) Dinleyicisi
   * Deterministik kullanıcı bazlı kanal adı kullanarak hayalet bağlantıların birikmesini önler.
   */
  public static subscribeToInbox(
    supabase: SupabaseClient,
    onChange: () => void,
    userId?: string
  ) {
    const channelKey = userId ? `inbox_user_${userId}` : 'inbox_stream_default';
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        onChange
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
