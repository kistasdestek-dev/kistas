/**
 * Kıstas Veritabanı Şeması & Strongly-Typed RPC/Tablo Sözleşmeleri
 * 
 * Bu dosya; PostgreSQL tabloları, görünümleri ve SECURITY DEFINER RPC fonksiyonları için
 * tip-güvenli 'Database' jenerik arayüzünü sağlar.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          icon_name: string | null;
          color_code: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          icon_name?: string | null;
          color_code?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          parent_id?: string | null;
          icon_name?: string | null;
          color_code?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          district: string | null;
          phone: string | null;
          iban: string | null;
          identity_number: string | null;
          available_balance: number;
          pending_balance: number;
          boost_credits: number;
          is_verified: boolean;
          rating_average: number;
          rating_count: number;
          token_valid_after: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          district?: string | null;
          phone?: string | null;
          iban?: string | null;
          identity_number?: string | null;
          available_balance?: number;
          pending_balance?: number;
          boost_credits?: number;
          is_verified?: boolean;
          rating_average?: number;
          rating_count?: number;
          token_valid_after?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          district?: string | null;
          phone?: string | null;
          iban?: string | null;
          identity_number?: string | null;
          available_balance?: number;
          pending_balance?: number;
          boost_credits?: number;
          is_verified?: boolean;
          rating_average?: number;
          rating_count?: number;
          token_valid_after?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string;
          title: string;
          tagline: string | null;
          description: string;
          price: number;
          pricing_model: string;
          status: string;
          is_boosted: boolean;
          boosted_until: string | null;
          category_boosted_until: string | null;
          upvotes_count: number;
          rating_average: number;
          rating_count: number;
          view_count: number;
          platforms: string[] | null;
          website_url: string | null;
          app_store_url: string | null;
          play_store_url: string | null;
          logo_url: string | null;
          promo_code: string | null;
          developer_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          category_id: string;
          title: string;
          tagline?: string | null;
          description: string;
          price?: number;
          pricing_model?: string;
          status?: string;
          is_boosted?: boolean;
          boosted_until?: string | null;
          category_boosted_until?: string | null;
          upvotes_count?: number;
          rating_average?: number;
          rating_count?: number;
          view_count?: number;
          platforms?: string[] | null;
          website_url?: string | null;
          app_store_url?: string | null;
          play_store_url?: string | null;
          logo_url?: string | null;
          promo_code?: string | null;
          developer_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          category_id?: string;
          title?: string;
          tagline?: string | null;
          description?: string;
          price?: number;
          pricing_model?: string;
          status?: string;
          is_boosted?: boolean;
          boosted_until?: string | null;
          category_boosted_until?: string | null;
          upvotes_count?: number;
          rating_average?: number;
          rating_count?: number;
          view_count?: number;
          platforms?: string[] | null;
          website_url?: string | null;
          app_store_url?: string | null;
          play_store_url?: string | null;
          logo_url?: string | null;
          promo_code?: string | null;
          developer_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_comments: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          likes_count: number;
          dislikes_count: number;
          is_flagged: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
          likes_count?: number;
          dislikes_count?: number;
          is_flagged?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          user_id?: string;
          content?: string;
          parent_id?: string | null;
          likes_count?: number;
          dislikes_count?: number;
          is_flagged?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      comment_reactions: {
        Row: {
          comment_id: string;
          user_id: string;
          reaction: number;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          user_id: string;
          reaction: number;
          created_at?: string;
        };
        Update: {
          comment_id?: string;
          user_id?: string;
          reaction?: number;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          type: string;
          metadata: Json | null;
          is_flagged: boolean;
          flag_reason: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          type?: string;
          metadata?: Json | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          type?: string;
          metadata?: Json | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          summary: string;
          content: string;
          cover_image_url: string | null;
          is_published: boolean;
          author_id: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          summary: string;
          content: string;
          cover_image_url?: string | null;
          is_published?: boolean;
          author_id?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          summary?: string;
          content?: string;
          cover_image_url?: string | null;
          is_published?: boolean;
          author_id?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
      };
      threat_events: {
        Row: {
          id: string;
          event_type: string;
          ip_address: string;
          user_agent: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          ip_address: string;
          user_agent?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          ip_address?: string;
          user_agent?: string | null;
          details?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      profiles_public: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          district: string | null;
          is_verified: boolean;
          rating_average: number;
          rating_count: number;
          created_at: string;
        };
      };
    };
    Functions: {
      toggle_project_comment_reaction: {
        Args: {
          p_comment_id: string;
          p_reaction: number;
        };
        Returns: {
          likes_count: number;
          dislikes_count: number;
          my_reaction: number | null;
        };
      };
      boost_listing: {
        Args: {
          p_listing_id: string;
          p_credits: number;
          p_request_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
          boosted_until?: string | null;
        };
      };
      create_order: {
        Args: {
          p_seller_id: string;
          p_listing_id: string;
          p_amount: number;
          p_request_id: string;
        };
        Returns: {
          success: boolean;
          order_id?: string;
          error?: string;
        };
      };
      get_current_admin_access: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_admin: boolean;
          email?: string | null;
        };
      };
      record_project_view: {
        Args: {
          p_listing_id: string;
        };
        Returns: boolean;
      };
      revoke_user_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      delete_my_account_and_anonymize: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
  };
}
