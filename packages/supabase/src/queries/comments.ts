import { SupabaseClient } from '@supabase/supabase-js';
import type { CommentReaction, ProjectComment } from '@kistas/shared';

/**
 * Get comments for a listing with user public profile info
 */
export async function getListingComments(client: SupabaseClient, listingId: string): Promise<ProjectComment[]> {
  const { data, error } = await client
    .from('project_comments')
    .select('*, user:profiles(id, full_name, avatar_url, is_verified)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }
  return (data as any[]).map((d) => ({
    id: d.id,
    listing_id: d.listing_id,
    user_id: d.author_id || d.user_id,
    content: d.body || d.content || '',
    parent_id: d.parent_id,
    created_at: d.created_at,
    likes_count: d.likes_count ?? 0,
    dislikes_count: d.dislikes_count ?? 0,
    my_reaction: null,
    user: d.user,
  }));
}

/**
 * Görüntüleyen üyenin verdiği tepkileri getirir (harita: commentId -> reaction).
 * `project_comment_reactions` SELECT'i herkese açıktır; yalnızca viewer'a ait satırlar çekilir.
 */
export async function getViewerCommentReactions(
  client: SupabaseClient,
  commentIds: string[],
  viewerId: string
): Promise<Record<string, CommentReaction>> {
  if (!viewerId || commentIds.length === 0) return {};

  const { data, error } = await client
    .from('project_comment_reactions')
    .select('comment_id, reaction')
    .eq('user_id', viewerId)
    .in('comment_id', commentIds);

  if (error || !data) return {};

  return (data as Array<{ comment_id: string; reaction: number }>).reduce<Record<string, CommentReaction>>(
    (acc, row) => {
      if (row.reaction === 1 || row.reaction === -1) {
        acc[row.comment_id] = row.reaction as CommentReaction;
      }
      return acc;
    },
    {}
  );
}
