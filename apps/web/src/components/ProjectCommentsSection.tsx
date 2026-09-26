'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Send,
  CornerDownRight,
  X,
  Loader2,
  Heart,
  HeartOff,
} from 'lucide-react';
import { GlassIconButton } from './GlassIconButton';
import { addProjectCommentAction, toggleProjectCommentReactionAction } from '@/app/actions/listings';
import { createClient } from '@/lib/supabase/browser';
import { getViewerCommentReactions } from '@kistas/supabase';
import { resolveCommentReactionTransition } from '@kistas/shared';
import { isKistasDefaultAvatar, resolveAvatarUrl } from '@/lib/avatar';
import { InstagramVerifiedBadge } from './InstagramVerifiedBadge';
import styles from './ProjectCommentsSection.module.css';
import type { CommentReaction, ProjectComment } from '@kistas/shared';

interface ProjectCommentsSectionProps {
  projectId: string;
  comments: ProjectComment[];
  sellerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommentReactionRowProps {
  comment: ProjectComment;
  onReact: (commentId: string, reaction: CommentReaction) => void;
  reactingCommentId: string | null;
}

/**
 * Kalp tabanlı tepki butonları: like=Heart, dislike=HeartOff.
 * framer-motion scale bounce animasyonu (referans kodla birebir).
 */
const CommentReactionRow: React.FC<CommentReactionRowProps> = ({ comment, onReact, reactingCommentId }) => {
  const likesCount = comment.likes_count ?? 0;
  const dislikesCount = comment.dislikes_count ?? 0;

  return (
    <div className="mt-2 flex items-center gap-4">
      {/* LIKE — Heart */}
      <motion.button
        onClick={() => onReact(comment.id, 1)}
        whileTap={{ scale: 0.9 }}
        disabled={reactingCommentId === comment.id}
        title="Beğen"
        aria-label={`Beğen (${likesCount})`}
        className="relative -ml-2 flex items-center gap-1.5 rounded-full p-2 text-[#7C8798] transition-colors hover:bg-white/[0.04] hover:text-[#E7EDF6] disabled:opacity-50"
      >
        <motion.div
          animate={{ scale: comment.my_reaction === 1 ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <Heart
            size={18}
            className={`transition-colors ${
              comment.my_reaction === 1
                ? 'fill-red-500 text-red-500'
                : 'text-current'
            }`}
          />
        </motion.div>
        {likesCount > 0 && (
          <span className={`text-xs font-semibold ${
            comment.my_reaction === 1 ? 'text-red-500' : 'text-current'
          }`}>{likesCount}</span>
        )}
      </motion.button>

      {/* DISLIKE — HeartOff */}
      <motion.button
        onClick={() => onReact(comment.id, -1)}
        whileTap={{ scale: 0.9 }}
        disabled={reactingCommentId === comment.id}
        title="Beğenme"
        aria-label={`Beğenme (${dislikesCount})`}
        className="relative flex items-center gap-1.5 rounded-full p-2 text-[#7C8798] transition-colors hover:bg-white/[0.04] hover:text-[#E7EDF6] disabled:opacity-50"
      >
        <motion.div
          animate={{ scale: comment.my_reaction === -1 ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <HeartOff
            size={18}
            className={`transition-colors ${
              comment.my_reaction === -1
                ? 'fill-slate-500 text-slate-500'
                : 'text-current'
            }`}
          />
        </motion.div>
        {dislikesCount > 0 && (
          <span className={`text-xs font-semibold ${
            comment.my_reaction === -1 ? 'text-slate-300' : 'text-current'
          }`}>{dislikesCount}</span>
        )}
      </motion.button>
    </div>
  );
};

export const ProjectCommentsSection: React.FC<ProjectCommentsSectionProps> = ({
  projectId,
  comments: initialComments,
  sellerId,
  open: isOpen,
  onOpenChange,
}) => {
  const [commentList, setCommentList] = useState<ProjectComment[]>(initialComments || []);
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ProjectComment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<{ id: string; email?: string; full_name?: string } | null>(null);
  const [reactingCommentId, setReactingCommentId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setActiveUser({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
        });
      } else {
        setActiveUser(null);
      }
    });
  }, []);

  // Modal: lock page scroll + close on Escape while open
  useLayoutEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.left = previousBodyStyles.left;
      document.body.style.right = previousBodyStyles.right;
      document.body.style.width = previousBodyStyles.width;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
      window.requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
      });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  // Görüntüleyen üyenin kendi tepkilerini yükle (ikon dolgusu için; sonsuz döngü kalkanı ref ile)
  const reactionsLoadedForRef = useRef<string | null>(null);
  useEffect(() => {
    const viewerId = activeUser?.id;
    const ids = commentList.map((c) => c.id);
    if (!viewerId || ids.length === 0) return;

    const loadKey = `${viewerId}:${ids.join(',')}`;
    if (reactionsLoadedForRef.current === loadKey) return;
    reactionsLoadedForRef.current = loadKey;

    let cancelled = false;
    const supabase = createClient();
    getViewerCommentReactions(supabase, ids, viewerId)
      .then((map) => {
        if (cancelled) return;
        setCommentList((prev) =>
          prev.map((c) =>
            map[c.id] !== undefined && c.my_reaction !== map[c.id] ? { ...c, my_reaction: map[c.id] } : c
          )
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeUser?.id, commentList]);

  // Yorum tepkisi (beğeni / beğenmeme) — iyimser güncelleme + hata geri alma
  const handleReaction = async (commentId: string, reaction: CommentReaction) => {
    if (!activeUser) {
      setError('Tepki vermek için giriş yapmalısınız.');
      return;
    }
    if (reactingCommentId) return;

    const target = commentList.find((c) => c.id === commentId);
    if (!target) return;

    const optimistic = { ...target, ...resolveCommentReactionTransition(target, reaction) };
    setReactingCommentId(commentId);
    setCommentList((prev) => prev.map((c) => (c.id === commentId ? optimistic : c)));

    const res = await toggleProjectCommentReactionAction(commentId, reaction);
    setReactingCommentId(null);

    if (!res.success) {
      setCommentList((prev) => prev.map((c) => (c.id === commentId ? target : c)));
      setError(res.error || 'Tepki kaydedilemedi.');
      return;
    }

    setCommentList((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likes_count: res.likes_count ?? optimistic.likes_count,
              dislikes_count: res.dislikes_count ?? optimistic.dislikes_count,
              my_reaction: res.my_reaction ?? null,
            }
          : c
      )
    );
  };

  // iOS-style bottom sheet: drag-to-dismiss (mobile, from the handle/header)
  const sheetStartYRef = useRef<number | null>(null);
  const sheetTouchStartedAtRef = useRef(0);
  const sheetStartExpansionRef = useRef(0);
  const sheetDragDeltaYRef = useRef(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [sheetExpansionProgress, setSheetExpansionProgress] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSheetExpanded(false);
      setDragOffsetY(0);
      setSheetExpansionProgress(0);
      sheetDragDeltaYRef.current = 0;
    }
  }, [isOpen]);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetStartYRef.current = e.touches[0].clientY;
    sheetTouchStartedAtRef.current = performance.now();
    sheetStartExpansionRef.current = isSheetExpanded ? 1 : 0;
    sheetDragDeltaYRef.current = 0;
    setIsDraggingSheet(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (sheetStartYRef.current === null) return;
    const dy = e.touches[0].clientY - sheetStartYRef.current;
    const expansionTravel = Math.max(window.innerHeight * 0.28, 1);
    const nextExpansionProgress = Math.min(
      1,
      Math.max(0, sheetStartExpansionRef.current - dy / expansionTravel)
    );
    sheetDragDeltaYRef.current = dy;
    setSheetExpansionProgress(nextExpansionProgress);
    setDragOffsetY(!isSheetExpanded && dy > 0 ? dy : 0);
  };

  const handleSheetTouchEnd = () => {
    const dragDeltaY = sheetDragDeltaYRef.current;
    const elapsedMs = Math.max(performance.now() - sheetTouchStartedAtRef.current, 1);
    const velocityY = dragDeltaY / elapsedMs;
    const startedExpanded = sheetStartExpansionRef.current === 1;
    setIsDraggingSheet(false);
    sheetStartYRef.current = null;
    sheetDragDeltaYRef.current = 0;

    if (startedExpanded) {
      const shouldCollapse = dragDeltaY > 64 || velocityY > 0.45;
      setIsSheetExpanded(!shouldCollapse);
      setSheetExpansionProgress(shouldCollapse ? 0 : 1);
    } else if (dragDeltaY < -64 || velocityY < -0.45) {
      setIsSheetExpanded(true);
      setSheetExpansionProgress(1);
    } else if (dragDeltaY > 120 || velocityY > 0.75) {
      onOpenChange(false);
    } else {
      setSheetExpansionProgress(0);
    }

    setDragOffsetY(0);
  };

  // Separate parent comments and replies
  const rootComments = commentList.filter((c) => !c.parent_id);
  const repliesMap = commentList.reduce<Record<string, ProjectComment[]>>((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const res = await addProjectCommentAction(projectId, content, replyingTo?.id);
    setIsSubmitting(false);

    if (res.success && res.comment) {
      setCommentList((prev) => [...prev, res.comment as ProjectComment]);
      setContent('');
      setReplyingTo(null);
    } else {
      setError(res.error || 'Yorum gönderilemedi.');
    }
  };

  return (
    <>
      {/* Comments Modal (Kıstas Glass) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1000000] flex items-end justify-center overflow-hidden overscroll-none sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Yorumlar"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xl"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          {/* Glass Panel — iOS-style bottom sheet (mobile) / centered card (desktop) */}
          <div
            className={`${styles.panel} ${styles.sheetEnter} relative z-10 flex h-[var(--comments-sheet-height)] min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] pt-2.5 sm:h-[72vh] sm:max-w-2xl sm:rounded-[28px] sm:pt-0`}
            style={{
              '--comments-sheet-height': `${72 + sheetExpansionProgress * 28}dvh`,
              transform: `translateY(${dragOffsetY}px)`,
              transition: isDraggingSheet
                ? 'none'
                : 'height 0.42s cubic-bezier(0.32, 0.72, 0, 1), transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
            } as React.CSSProperties}
          >
            {/* Grab Handle (mobile) */}
            <div
              className="mx-auto mt-1 mb-1 h-1.5 w-10 shrink-0 touch-none rounded-full bg-white/25 sm:hidden"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              aria-hidden="true"
            />

            {/* Modal Header */}
            <div
              className="flex touch-none items-center border-b border-white/[0.08] px-5 py-4"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
            >
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white">Yorumlar</h3>
                <p className="text-xs text-[#94A3B8]">
                  {commentList.length > 0 ? `${commentList.length} yorum` : 'Henüz yorum yok'}
                </p>
              </div>
            </div>

            {/* Scrollable Comments Body */}
            <div className={`${styles.scroll} min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch] sm:px-5`}>

              {/* Comments List */}
              <div>
                {rootComments.length === 0 && (
                  <p className="py-8 text-center text-sm text-[#64748B]">Henüz yorum yok. İlk yorumu sen yaz!</p>
                )}
                {rootComments.map((comment) => {
                  const replies = repliesMap[comment.id] || [];
                  const isMaker = comment.user_id === sellerId;
                  const isDefaultCommentAvatar = isKistasDefaultAvatar(comment.user?.avatar_url);

                  return (
                    <article key={comment.id} className="border-b border-white/[0.08] py-4 text-white last:border-b-0 sm:py-5">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {isDefaultCommentAvatar ? (

                            <img
                              src="/kistas-logo-256.webp"
                              alt="Kıstas"
                              className="h-11 w-11 object-contain"
                            />
                          ) : (

                            <img
                              src={resolveAvatarUrl(comment.user?.avatar_url)}
                              alt={comment.user?.full_name || 'Kullanıcı'}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/kistas-logo-256.webp';
                              }}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                              <span className="max-w-full truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-[#F5F7FA]">
                                {comment.user?.full_name || 'Kıstas Kullanıcısı'}
                              </span>
                              {comment.user?.is_verified && (
                                <InstagramVerifiedBadge size={13} />
                              )}
                              {isMaker && (
                                <span className="rounded bg-[#2563EB]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#76ADFF]">
                                  Geliştirici
                                </span>
                              )}
                              <span className="text-xs text-[#687386]">·</span>
                              <time className="text-xs font-medium text-[#7F8A9B]">
                                {new Date(comment.created_at).toLocaleDateString('tr-TR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </time>
                            </div>

                            {activeUser ? (
                              <button
                                type="button"
                                onClick={() => setReplyingTo(comment)}
                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#8C98AA] transition-colors hover:bg-white/[0.04] hover:text-white"
                              >
                                <CornerDownRight size={12} />
                                <span>Yanıtla</span>
                              </button>
                            ) : (
                              <Link
                                href={`/login?redirect=/listings/${projectId}`}
                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#8C98AA] transition-colors hover:bg-white/[0.04] hover:text-white"
                                title="Yanıtlamak için giriş yapın"
                              >
                                <CornerDownRight size={12} />
                                <span>Yanıtla</span>
                              </Link>
                            )}
                          </div>

                          <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] font-medium leading-[1.48] tracking-[-0.012em] text-[#E7EAF0]">
                            {comment.content}
                          </p>

                          <CommentReactionRow
                            comment={comment}
                            onReact={handleReaction}
                            reactingCommentId={reactingCommentId}
                          />

                          {/* Nested Replies */}
                          {replies.length > 0 && (
                            <div className="relative mt-3 space-y-4 border-l border-white/[0.10] pl-4 sm:pl-5">
                              {replies.map((reply) => {
                                const replyIsMaker = reply.user_id === sellerId;
                                const isDefaultReplyAvatar = isKistasDefaultAvatar(reply.user?.avatar_url);

                                return (
                                  <div key={reply.id} className="flex min-w-0 items-start gap-2.5">
                                    {isDefaultReplyAvatar ? (

                                      <img
                                        src="/kistas-logo-256.webp"
                                        alt="Kıstas"
                                        className="h-9 w-9 shrink-0 object-contain"
                                      />
                                    ) : (

                                      <img
                                        src={resolveAvatarUrl(reply.user?.avatar_url)}
                                        alt={reply.user?.full_name || 'Kullanıcı'}
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = '/kistas-logo-256.webp';
                                        }}
                                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                                      />
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                                        <span className="truncate text-[13px] font-bold text-[#F1F4F8]">
                                        {reply.user?.full_name || 'Kullanıcı'}
                                        </span>
                                        {reply.user?.is_verified && <InstagramVerifiedBadge size={11} />}
                                        {replyIsMaker && (
                                          <span className="rounded bg-[#2563EB]/15 px-1 py-0.5 text-[8px] font-bold text-[#76ADFF]">Geliştirici</span>
                                        )}
                                        <span className="text-[10px] text-[#687386]">·</span>
                                        <time className="text-[10px] font-medium text-[#7F8A9B]">
                                          {new Date(reply.created_at).toLocaleDateString('tr-TR')}
                                        </time>
                                      </div>
                                      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] font-medium leading-5 text-[#D9DEE7]">
                                        {reply.content}
                                      </p>
                                      <CommentReactionRow
                                        comment={reply}
                                        onReact={handleReaction}
                                        reactingCommentId={reactingCommentId}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* ── STICKY BOTTOM COMPOSER ── */}
            <div className="shrink-0 border-t border-white/10 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              {activeUser ? (
                <form onSubmit={handleSubmit}>
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-[var(--kistas-border)] bg-white/[0.05] px-3 py-1.5 text-xs text-[var(--kistas-blue-hover)] backdrop-blur-xl">
                      <span className="flex items-center gap-1 font-bold">
                        <CornerDownRight size={12} />
                        <span>Yanıtlanıyor: {replyingTo.user?.full_name || 'Kullanıcı'}</span>
                      </span>
                      <GlassIconButton
                        icon={X}
                        size={24}
                        iconSize={11}
                        onClick={() => setReplyingTo(null)}
                        title="Yanıtlamayı iptal et"
                      />
                    </div>
                  )}
                  <div className="kistas-glass relative rounded-[18px] transition-all duration-200 focus-within:border-[var(--kistas-blue)]">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={1000}
                      rows={2}
                      placeholder={
                        replyingTo
                          ? 'Yanıtınızı yazın...'
                          : 'Proje hakkında düşünceleriniz, geri bildirimleriniz ve sorularınız...'
                      }
                      aria-label={replyingTo ? 'Yanıtınızı yazın' : 'Proje yorumunuzu yazın'}
                      className="min-h-[68px] w-full resize-none rounded-[18px] bg-transparent p-3 pb-10 pr-12 text-[15px] text-[var(--kistas-ink)] outline-none placeholder:text-[var(--kistas-muted)]/60 sm:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!content.trim() || isSubmitting}
                      className="k-modal-glass-btn-primary absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                      title="Gönder"
                      aria-label="Yorumu gönder"
                    >
                      {isSubmitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>
                  {error && <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>}
                </form>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-[#3269C7]/25 bg-gradient-to-r from-[#0B1120] via-[#0E172B] to-[#080C14] px-4 py-2.5 shadow-[0_8px_30px_rgba(50,105,199,0.15)] backdrop-blur-xl">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#3269C7]/15 blur-xl" />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-white tracking-tight">Topluluğa Katıl</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/signup?redirect=/listings/${projectId}`}
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#3269C7] to-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(50,105,199,0.35)] transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                      >
                        Ücretsiz Kayıt Ol
                      </Link>
                      <Link
                        href={`/login?redirect=/listings/${projectId}`}
                        className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
                      >
                        Giriş Yap
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
