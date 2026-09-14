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
});

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

  public static subscribe(listingId: string, onChange: () => void) {
    const safeListingId = toPostgrestUuid(listingId, 'listing id');
    return supabase
      .channel(`project_comments_${safeListingId}`)
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
