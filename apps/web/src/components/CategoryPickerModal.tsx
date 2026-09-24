'use client';

import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronDown,
  Gamepad2,
  LayoutGrid,
  PanelsTopLeft,
  Search,
  X,
} from 'lucide-react';
import { GlassIconButton } from './GlassIconButton';
import {
  APPS_CATEGORIES,
  CATEGORY_CARD_TINTS,
  GAMES_CATEGORIES,
  resolveCategoryIconPath,
} from '@/lib/categoryCatalog';
import type { Category } from '@kistas/shared';

type CategorySegment = 'all' | 'games' | 'apps';

const CATEGORY_VISUALS = new Map(
  [...GAMES_CATEGORIES, ...APPS_CATEGORIES].map((category) => [category.slug, category])
);

const CATEGORY_SEGMENTS = [
  { id: 'all', label: 'Tümü', icon: LayoutGrid },
  { id: 'games', label: 'Oyunlar', icon: Gamepad2 },
  { id: 'apps', label: 'Uygulamalar', icon: PanelsTopLeft },
] as const;

interface CategoryPickerModalProps {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  categories,
  value,
  onChange,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<CategorySegment>('all');

  const selected = useMemo(
    () => categories.find((c) => c.id === value),
    [categories, value]
  );

  const filtered = useMemo(() => {
    const norm = query.trim().toLocaleLowerCase('tr-TR');
    return categories.filter((category) => {
      const isInSegment =
        activeSegment === 'all' ||
        (activeSegment === 'games' && category.slug.startsWith('game-')) ||
        (activeSegment === 'apps' && category.slug.startsWith('app-'));
      const matchesQuery =
        !norm || category.name.toLocaleLowerCase('tr-TR').includes(norm);
      return isInSegment && matchesQuery;
    });
  }, [activeSegment, categories, query]);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      CATEGORY_VISUALS.forEach((category) => {
        const image = new window.Image();
        image.src = resolveCategoryIconPath(category.icon3d);
      });
    }, 250);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };

    document.body.classList.add('k-category-picker-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('k-category-picker-open');
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.left = previousBodyStyles.left;
      document.body.style.right = previousBodyStyles.right;
      document.body.style.width = previousBodyStyles.width;
      document.body.style.paddingRight = previousBodyStyles.paddingRight;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
      window.requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
      });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery('');
          setActiveSegment(
            selected?.slug.startsWith('game-')
              ? 'games'
              : selected?.slug.startsWith('app-')
                ? 'apps'
                : 'all'
          );
          setOpen(true);
        }}
        className={`flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all ${
          error
            ? 'border-red-500/50 bg-red-950/30 text-red-300'
            : 'border-white/10 bg-white/[0.05] text-white hover:border-[#3269C7]/40 hover:bg-white/[0.08]'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#3269C7]/25 bg-gradient-to-b from-white to-[#EEF5FF] text-[#3269C7] shadow-[0_4px_14px_rgba(50,105,199,0.22)]">
            <LayoutGrid size={16} />
          </div>
          <span className="font-bold text-sm truncate text-white">
            {selected ? selected.name : 'Kategori Seçiniz'}
          </span>
        </div>
        <ChevronDown size={18} className="text-[#60A5FA] shrink-0" />
      </button>

      {/* Modal Dialog */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center overflow-hidden overscroll-none bg-[#080C14]/70 p-2 backdrop-blur-xl animate-in fade-in duration-200 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kategori seç"
        >
          <div
            className="fixed inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="k-modal-glass-card relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden p-4 sm:p-6">
            {/* Ambient Top Glow */}
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3B82F6]/25 via-[#60A5FA]/10 to-transparent blur-3xl" />

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
              <div className="min-w-0 pr-4">
                <h3 className="bg-gradient-to-r from-white via-[#F8FAFC] to-[#93C5FD] bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                  Kategorini Bul
                </h3>
                <p className="mt-0.5 text-xs font-medium text-[#94A3B8]">
                  Projene en uygun alanı görsel kartlardan seç.
                </p>
              </div>
              <GlassIconButton
                icon={X}
                size={38}
                iconSize={18}
                onClick={() => setOpen(false)}
                title="Kapat"
              />
            </div>

            <div className="shrink-0 border-b border-white/10 py-4">
              {/* Segment Filter */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-inner backdrop-blur-xl">
                {CATEGORY_SEGMENTS.map((segment) => {
                  const Icon = segment.icon;
                  const isActive = activeSegment === segment.id;
                  return (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => setActiveSegment(segment.id)}
                      aria-pressed={isActive}
                      className={`flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-bold transition-all sm:text-xs ${
                        isActive
                          ? 'border border-[#60A5FA]/35 bg-[#3269C7]/25 text-white shadow-[0_5px_18px_rgba(50,105,199,0.22)]'
                          : 'border border-transparent text-[#94A3B8] hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-[#60A5FA]' : 'text-[#64748B]'} />
                      <span className="truncate">{segment.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div className="relative mt-3">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#60A5FA]">
                  <Search size={18} />
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kategori adı yazın..."
                  autoFocus
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-[16px] text-white shadow-inner outline-none backdrop-blur-xl transition-colors placeholder:text-[#64748B] focus:border-[#3269C7] focus:bg-white/[0.08] sm:text-sm"
                />
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-semibold text-[#94A3B8]">
                <span>{query ? `“${query}” için sonuçlar` : 'Kategori kartları'}</span>
                <span>{filtered.length} kategori</span>
              </div>
            </div>

            {/* Category Card Grid */}
            <div className="mt-3 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {filtered.map((cat) => {
                const isSelected = cat.id === value;
                const visual = CATEGORY_VISUALS.get(cat.slug);
                const tints = visual
                  ? CATEGORY_CARD_TINTS[visual.tintKey] ?? CATEGORY_CARD_TINTS.fallback
                  : CATEGORY_CARD_TINTS.fallback;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                    aria-pressed={isSelected}
                    className={`group relative min-h-[116px] w-full cursor-pointer overflow-hidden rounded-[20px] border p-3 text-left backdrop-blur-xl transition-all duration-200 active:scale-[0.98] sm:min-h-[132px] ${
                      isSelected
                        ? 'border-[#60A5FA]/80 text-white shadow-[0_10px_28px_rgba(50,105,199,0.32)] ring-1 ring-[#3269C7]/35'
                        : 'border-white/10 text-[#CBD5E1] shadow-[0_8px_22px_rgba(0,0,0,0.28)] hover:border-[#60A5FA]/35 hover:text-white hover:shadow-[0_10px_28px_rgba(50,105,199,0.18)]'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 82% 14%, ${tints[1]}45 0%, transparent 56%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(8,12,20,0.42))`,
                    }}
                  >
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.09] via-transparent to-[#080C14]/35" />
                    {isSelected && (
                      <span className="absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#60A5FA]/50 bg-[#091326]/85 text-[#60A5FA] shadow-[0_0_14px_rgba(96,165,250,0.45)] backdrop-blur-md">
                        <CheckCircle2 size={15} />
                      </span>
                    )}

                    {visual && (
                      <span className="absolute right-2.5 top-2.5 z-10 flex h-14 w-14 items-center justify-center rounded-[17px] border border-white/20 bg-white/[0.12] p-1.5 shadow-sm backdrop-blur-md transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveCategoryIconPath(visual.icon3d)}
                          alt=""
                          className="h-full w-full select-none object-contain drop-shadow-md"
                          loading="eager"
                          decoding="async"
                        />
                      </span>
                    )}

                    <span className="absolute bottom-3 left-3 right-3 z-10 line-clamp-2 text-xs font-bold leading-tight tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] sm:text-sm">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
              </div>

              {filtered.length === 0 && (
                <div className="mx-auto my-8 max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-9 text-center shadow-inner backdrop-blur-xl">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3269C7]/25 bg-[#3269C7]/15 text-[#60A5FA]">
                    <Search size={22} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-white">Eşleşen kategori bulunamadı</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">Farklı bir kelime yazın veya segmenti değiştirin.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
