import { supabase } from '../../../core/supabase/supabaseClient';
import { resolveProfileAvatarUrl } from '../../../core/brandAssets';
import { toPostgrestUuid } from '../../../core/security/DatabaseInput';

export interface ProjectCommentAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  isVerified: boolean;
}

export interface ProjectComment {
  id: string;
  listingId: string;
  authorId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  author: ProjectCommentAuthor;
  replies: ProjectComment[];
  likesCount: number;
  dislikesCount: number;
  myReaction?: 1 | -1 | null;
}

const mapRow = (row: any): ProjectComment => ({
  id: row.id,
  listingId: row.listing_id,
  authorId: row.author_id,
  parentId: row.parent_id,
  body: row.body,
  createdAt: row.created_at,
  author: {
    id: row.author?.id || row.author_id,
    fullName: row.author?.full_name || 'Kıstas üyesi',
    avatarUrl: resolveProfileAvatarUrl(row.author?.avatar_url),
    isVerified: !!row.author?.is_verified,
  },
  replies: [],
  likesCount: row.likes_count ?? 0,
  dislikesCount: row.dislikes_count ?? 0,
  myReaction: row.my_reaction ?? null,
});

export interface ToggleReactionResult {
  success: boolean;
  action?: string;
  myReaction?: 1 | -1 | null;
  likesCount?: number;
  dislikesCount?: number;
  error?: string;
}

export class ProjectCommentService {
  public static async getComments(listingId: string): Promise<ProjectComment[]> {
    const { data, error } = await supabase
      .from('project_comments')
      .select(`
        id,
        listing_id,
        author_id,
        parent_id,
        body,
        created_at,
        likes_count,
        dislikes_count,
        author:author_id (id, full_name, avatar_url, is_verified)
      `)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const mapped = (data || []).map(mapRow);
    const roots = mapped.filter((comment) => !comment.parentId);
    const rootMap = new Map(roots.map((comment) => [comment.id, comment]));

    mapped.forEach((comment) => {
      if (comment.parentId) rootMap.get(comment.parentId)?.replies.push(comment);
    });

    return roots.reverse();
  }

  public static async createComment(
    listingId: string,
    body: string,
    parentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('create_project_comment', {
      p_listing_id: listingId,
      p_body: body,
      p_parent_id: parentId || null,
    });

    if (error) {
      const message = error.message || 'Yorum yayınlanamadı.';
      if (message.includes('VERIFICATION_REQUIRED')) {
        return { success: false, error: 'Yorum yapmak için hesabınızı doğrulamalısınız.' };
      }
      if (message.includes('COMMENT_MUTED')) {
        return { success: false, error: 'Yorum yapma yetkiniz 3 gün süreyle durduruldu.' };
      }
      return { success: false, error: message.replace(/^[A-Z_]+:\s*/, '') };
    }

    return { success: true };
  }

  public static async toggleReaction(
    commentId: string,
    reaction: 1 | -1
  ): Promise<ToggleReactionResult> {
    const { data, error } = await supabase.rpc('toggle_project_comment_reaction', {
      p_comment_id: commentId,
      p_reaction: reaction,
    });

    if (error) {
      if (error.message?.includes('AUTH_REQUIRED')) {
        return { success: false, error: 'Tepki vermek için giriş yapmalısınız.' };
      }
      if (error.message?.includes('RATE_LIMITED')) {
        return { success: false, error: 'Çok hızlı tepki veriyorsunuz.' };
      }
      if (error.message?.includes('VERIFICATION_REQUIRED')) {
        return { success: false, error: 'Tepki vermek için hesabınızı doğrulamalısınız.' };
      }
      return { success: false, error: error.message };
    }

    const d = data as any;
    return {
      success: !!d?.success,
      action: d?.action,
      myReaction: d?.my_reaction ?? null,
      likesCount: d?.likes_count ?? 0,
      dislikesCount: d?.dislikes_count ?? 0,
    };
  }

  public static subscribe(listingId: string, onChange: () => void) {
    const safeListingId = toPostgrestUuid(listingId, 'listing id');
    return supabase
      .channel(`project_comments_${safeListingId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_comments',
          filter: `listing_id=eq.${safeListingId}`,
        },
        onChange
      )
      .subscribe();
  }
}
