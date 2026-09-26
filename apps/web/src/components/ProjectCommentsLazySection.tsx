'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MessageSquare, PenLine, RotateCcw } from 'lucide-react';
import { loadProjectCommentsAction } from '@/app/actions/listings';
import type { ProjectComment } from '@kistas/shared';

const loadCommentsPanel = () => import('./ProjectCommentsSection');
const ProjectCommentsSection = dynamic(
  () => loadCommentsPanel().then((module) => module.ProjectCommentsSection),
  { ssr: false },
);

interface ProjectCommentsLazySectionProps {
  projectId: string;
  sellerId: string;
}

export function ProjectCommentsLazySection({ projectId, sellerId }: ProjectCommentsLazySectionProps) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openComments = useCallback(async () => {
    if (isLoading) return;
    if (hasLoaded) {
      setIsPanelOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [result] = await Promise.all([
        loadProjectCommentsAction(projectId),
        loadCommentsPanel(),
      ]);

      if (result.success) {
        setComments(result.comments);
        setHasLoaded(true);
        setIsPanelOpen(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Yorumlar şu anda yüklenemiyor.');
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isLoading, projectId]);

  return (
    <>
      {!isPanelOpen && (
        <button
          type="button"
          onClick={() => void openComments()}
          onPointerEnter={() => void loadCommentsPanel()}
          onFocus={() => void loadCommentsPanel()}
          aria-haspopup="dialog"
          aria-expanded={isPanelOpen}
          aria-busy={isLoading}
          className="group my-8 flex w-full cursor-pointer items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.995] disabled:cursor-wait disabled:opacity-75 sm:p-6"
          disabled={isLoading}
        >
          <span className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#3269C7]/25 bg-gradient-to-b from-white to-[#EEF5FF] shadow-[0_4px_18px_rgba(50,105,199,0.20)]">
              {isLoading ? <Loader2 size={19} className="animate-spin text-[#3269C7]" /> : <MessageSquare size={19} color="#3269C7" />}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">Yorumlar</span>
                {hasLoaded && comments.length > 0 && (
                  <span className="rounded-full border border-[#3269C7]/30 bg-[#3269C7]/15 px-2 py-0.5 text-[11px] font-bold text-[#60A5FA]">
                    {comments.length}
                  </span>
                )}
                <span className="ml-4 flex shrink-0 items-center gap-1.5 rounded-full border border-[#3269C7]/25 bg-[#3269C7]/10 px-2.5 py-1 text-[11px] font-semibold text-white sm:hidden">
                  {error ? <RotateCcw size={13} color="#60A5FA" /> : <PenLine size={13} color="#60A5FA" />}
                  {error ? 'Tekrar Dene' : 'Yorum Yap'}
                </span>
              </span>
              <span className={`mt-0.5 block truncate text-xs ${error ? 'text-red-300' : 'text-[#94A3B8]'}`}>
                {error || (isLoading ? 'Yorumlar güvenli şekilde yükleniyor…' : 'Yorumları aç ve sen de katıl')}
              </span>
            </span>
          </span>

          <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[#3269C7]/25 bg-[#3269C7]/10 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-[#3269C7]/20 sm:flex">
            {error ? <RotateCcw size={14} color="#60A5FA" /> : <PenLine size={14} color="#60A5FA" />}
            {error ? 'Tekrar Dene' : 'Yorum Yap'}
          </span>
        </button>
      )}

      {hasLoaded && (
        <ProjectCommentsSection
          projectId={projectId}
          comments={comments}
          sellerId={sellerId}
          open={isPanelOpen}
          onOpenChange={setIsPanelOpen}
        />
      )}
    </>
  );
}
