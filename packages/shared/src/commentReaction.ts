import type { CommentReaction, ProjectComment } from './types';

/**
 * Yorum Tepkisi Geçiş Motoru (TEK DOĞRULUK KAYNAĞI)
 *
 * Kurallar (DB RPC `toggle_project_comment_reaction` ile birebir aynıdır):
 *  1. Aynı tepki tekrar gönderilirse tepki geri alınır (toggle-off).
 *  2. Zıt tepki gönderilirse mevcut tepki değiştirilir (like <-> dislike).
 *  3. Tepki yoksa yeni tepki eklenir.
 *  4. Sayaçlar asla negatife düşmez.
 *
 * Hem UI iyimser (optimistic) güncellemesi hem de veritabanı RPC'si bu kuralları izler.
 */
export function resolveCommentReactionTransition(
  comment: Pick<ProjectComment, 'likes_count' | 'dislikes_count' | 'my_reaction'>,
  reaction: CommentReaction
): Pick<ProjectComment, 'likes_count' | 'dislikes_count' | 'my_reaction'> {
  const likes = comment.likes_count ?? 0;
  const dislikes = comment.dislikes_count ?? 0;
  const current = comment.my_reaction ?? null;

  // 1. Aynı tepki -> geri al
  if (current === reaction) {
    return {
      likes_count: reaction === 1 ? Math.max(0, likes - 1) : likes,
      dislikes_count: reaction === -1 ? Math.max(0, dislikes - 1) : dislikes,
      my_reaction: null,
    };
  }

  // 2. Zıt tepki -> değiştir
  if (current !== null && current !== reaction) {
    return {
      likes_count: reaction === 1 ? likes + 1 : Math.max(0, likes - 1),
      dislikes_count: reaction === -1 ? dislikes + 1 : Math.max(0, dislikes - 1),
      my_reaction: reaction,
    };
  }

  // 3. Yeni tepki -> ekle
  return {
    likes_count: reaction === 1 ? likes + 1 : likes,
    dislikes_count: reaction === -1 ? dislikes + 1 : dislikes,
    my_reaction: reaction,
  };
}
