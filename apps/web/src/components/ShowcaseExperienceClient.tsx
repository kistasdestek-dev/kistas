'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock3, Sparkles } from 'lucide-react';
import { discoveryHref, type Category, type DiscoveryCard, type DiscoveryState } from '@kistas/shared';
import { SiteBackButton } from './SiteNavigation';

export function ShowcaseExperienceClient({
  projects,
  state,
  categories,
  timestamp,
}: {
  projects: DiscoveryCard[];
  state: DiscoveryState;
  categories: Category[];
  timestamp: number;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | 'all'>('all');

  const date = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  }).format(timestamp);

  const activeUrlCategory = categories.find((c) => c.id === state.categoryId)?.name;
  const scope = [
    activeUrlCategory,
    state.platform !== 'all' ? state.platform : null,
    state.q ? `“${state.q}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const backHref = discoveryHref('/', state);

  // Compute categories represented in the current project list
  const availableCategories = React.useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => {
      if (p.category_id) {
        counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .map(([id, count]) => {
        const cat = categories.find((c) => c.id === id);
        return cat ? { id: cat.id, name: cat.name, count } : null;
      })
      .filter((item): item is { id: string; name: string; count: number } => item !== null)
      .sort((a, b) => b.count - a.count);
  }, [projects, categories]);

  // Filter projects based on the in-page quick filter
  const filteredProjects = React.useMemo(() => {
    if (selectedCategoryId === 'all') return projects;
    return projects.filter((p) => p.category_id === selectedCategoryId);
  }, [projects, selectedCategoryId]);

  return (
    <main className="showcase-page">
      {/* Hero Header */}
      <header className="showcase-page-hero">
        <div className="showcase-page-ambient" aria-hidden="true" />
        <div className="relative inline-flex items-center gap-2.5 text-xs font-semibold text-slate-300">
          <SiteBackButton fallback={backHref} size={36} />
          <span>Geri dön</span>
        </div>

        <div className="showcase-page-intro">
          <div>
            <div className="showcase-page-eyebrow">
              <Sparkles size={13} aria-hidden="true" />
              <span>KISTAS SEÇKİSİ</span>
            </div>
            <h1>
              Günün <span>Vitrini</span>
            </h1>
            <p className="showcase-page-description">
              Bağımsız fikirler. Güçlü ürünler.
              <br />
              Topluluğun öne çıkardığı saatlik rotasyon seçkisi.
            </p>
          </div>
          <div className="showcase-page-edition">
            <span className="showcase-page-date">{date}</span>
            <span className="showcase-page-rotation">
              <Clock3 size={13} aria-hidden="true" />
              Saatlik rotasyon
            </span>
          </div>
        </div>

        <div className="showcase-page-caption">
          <p>{scope || 'Topluluğun desteklediği projeler'}</p>
          <span>{filteredProjects.length} proje listeleniyor</span>
        </div>

        {/* Category Quick Filter Pills (when multiple categories exist) */}
        {availableCategories.length > 1 && (
          <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1 pt-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selectedCategoryId === 'all'
                  ? 'border border-blue-400/40 bg-blue-500/20 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              Tümü ({projects.length})
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  selectedCategoryId === cat.id
                    ? 'border border-blue-400/40 bg-blue-500/20 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                    : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 3-Column Responsive Apple Card Grid */}
      {filteredProjects.length > 0 ? (
        <section className="relative w-full py-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
            {filteredProjects.map((project) => {
              const coverImage = project.images?.[0]?.image_url;
              const backdropImage = coverImage || project.logo_url;
              const platform = project.platforms?.[0] || 'Web';
              const projectCategory =
                categories.find((c) => c.id === project.category_id)?.name ||
                'Bağımsız Proje';

              return (
                <Link
                  key={project.id}
                  href={`/listings/${project.id}`}
                  className="showcase-gallery-card group relative flex h-[380px] sm:h-[400px] lg:h-[420px] w-full flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-[#091326] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_22px_50px_rgba(30,58,138,0.35)] cursor-pointer"
                >
                  {/* Card Cover Art */}
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={project.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : backdropImage ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(50,105,199,0.32),transparent_72%),#081226]">
                      <img
                        src={backdropImage}
                        alt=""
                        className="h-24 w-24 object-contain drop-shadow-[0_16px_36px_rgba(0,0,0,0.65)] transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,105,199,0.35),transparent_72%),#081226]" />
                  )}

                  {/* Apple-style Gradient Film */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020712]/85 via-[#020712]/25 to-[#020712]/92" />

                  {/* Upper Info */}
                  <div className="relative z-10 flex flex-col gap-2 text-white">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
                        {projectCategory}
                      </p>
                      {platform && (
                        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 backdrop-blur-md">
                          {platform}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug text-white line-clamp-2 transition-colors duration-200 group-hover:text-blue-100">
                      {project.title}
                    </h2>

                    {project.tagline && (
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-2">
                        {project.tagline}
                      </p>
                    )}
                  </div>

                  {/* Bottom Info & Rotating Arrow Action */}
                  <div className="relative z-10 flex items-end justify-between gap-3 pt-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
                      {project.logo_url && (
                        <img
                          src={project.logo_url}
                          alt=""
                          className="h-4.5 w-4.5 rounded object-contain"
                        />
                      )}
                      <span className="text-xs font-bold text-[#E4FD97]">
                        ▲ {(project.upvote_count ?? 0).toLocaleString('tr-TR')} destek
                      </span>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 group-hover:bg-[#E4FD97] group-hover:scale-110">
                      <ArrowUpRight className="h-4.5 w-4.5 text-black transition-transform duration-300 group-hover:rotate-45 will-change-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="showcase-page-empty">
          <Sparkles size={30} aria-hidden="true" />
          <h2>Bu seçkide henüz proje yok</h2>
          <p>
            Farklı bir kategori veya platform seçerek yeni fikirler
            keşfedebilirsin.
          </p>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
          >
            Keşfet’e dön
          </Link>
        </section>
      )}
    </main>
  );
}
