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

      {/* 3-Column Responsive App Store / Mobbin Vitrin Card Grid */}
      {filteredProjects.length > 0 ? (
        <section className="relative w-full py-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
            {filteredProjects.map((project) => {
              const coverImage = project.images?.[0]?.image_url;
              const platform = project.platforms?.[0] || 'Web';
              const projectCategory =
                categories.find((c) => c.id === project.category_id)?.name ||
                'Bağımsız Proje';

              return (
                <Link
                  key={project.id}
                  href={`/listings/${project.id}`}
                  className="showcase-gallery-card group relative flex h-[360px] sm:h-[375px] w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#081226] shadow-[0_16px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_22px_50px_rgba(30,58,138,0.35)] cursor-pointer"
                >
                  {/* Top: Framed Media Showcase */}
                  <div className="relative h-[190px] sm:h-[200px] w-full overflow-hidden bg-[#030712] border-b border-white/5">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={project.title}
                        className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_70%),#070e20]">
                        {project.logo_url && (
                          <img
                            src={project.logo_url}
                            alt=""
                            className="h-16 w-16 rounded-2xl border border-white/10 bg-[#0d1b38] p-2 object-contain shadow-xl transition-transform duration-300 group-hover:scale-110"
                          />
                        )}
                      </div>
                    )}

                    {/* Subtle top & bottom image gradients for badge contrast */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/75 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#081226]/80 to-transparent" />

                    {/* Floating Floating Badges */}
                    <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2 z-10">
                      <span className="rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-[#93C5FD] backdrop-blur-md shadow-sm">
                        {projectCategory}
                      </span>
                      {platform && (
                        <span className="rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-slate-200 backdrop-blur-md shadow-sm">
                          {platform}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Dedicated Clean Info Panel */}
                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 bg-[#081226]">
                    {/* App Icon + Title & Tagline */}
                    <div className="flex items-start gap-3.5">
                      <div className="h-12 w-12 shrink-0 rounded-[14px] overflow-hidden border border-white/10 bg-[#0d1b38] p-1.5 shadow-md flex items-center justify-center">
                        {project.logo_url ? (
                          <img
                            src={project.logo_url}
                            alt=""
                            className="h-full w-full rounded-[10px] object-contain"
                          />
                        ) : (
                          <div className="h-full w-full rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-sm font-bold text-white">
                            {project.title.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug line-clamp-1 transition-colors duration-200 group-hover:text-blue-200">
                          {project.title}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {project.tagline || 'Kıstas topluluğunda öne çıkan bağımsız ürün.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer: Vote Count + Action Arrow Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/25 bg-lime-400/10 px-3 py-1 text-xs font-bold text-[#E4FD97] shadow-sm">
                        <span>▲</span>
                        <span>{(project.upvote_count ?? 0).toLocaleString('tr-TR')} destek</span>
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm transition-all duration-300 group-hover:bg-[#E4FD97] group-hover:text-black group-hover:border-[#E4FD97] group-hover:scale-105">
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 will-change-transform" />
                      </div>
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
