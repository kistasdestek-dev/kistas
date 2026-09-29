'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { discoveryHref, type Category, type DiscoveryCard, type DiscoveryState } from '@kistas/shared';
import { SiteBackButton } from './SiteNavigation';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';

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
  const [api, setApi] = React.useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(true);

  React.useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };
    update();
    api.on('select', update);
    api.on('reInit', update);
    return () => {
      api.off('select', update);
      api.off('reInit', update);
    };
  }, [api]);

  const date = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  }).format(timestamp);

  const activeCategory = categories.find((c) => c.id === state.categoryId)?.name;
  const scope = [
    activeCategory,
    state.platform !== 'all' ? state.platform : null,
    state.q ? `“${state.q}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const backHref = discoveryHref('/', state);

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
          <span>{projects.length} proje</span>
        </div>
      </header>

      {/* Apple Card Carousel */}
      {projects.length > 0 ? (
        <section className="relative w-full py-2">
          <Carousel
            setApi={setApi}
            opts={{ align: 'start', dragFree: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-5 sm:-ml-7 py-4">
              {projects.map((project) => {
                const coverImage = project.images?.[0]?.image_url;
                const backdropImage = coverImage || project.logo_url;
                const platform = project.platforms?.[0] || 'Web';
                const projectCategory =
                  categories.find((c) => c.id === project.category_id)?.name ||
                  'Bağımsız Proje';

                return (
                  <CarouselItem
                    key={project.id}
                    className="pl-5 sm:pl-7 basis-auto"
                  >
                    <Link
                      href={`/listings/${project.id}`}
                      className="showcase-gallery-card group relative flex w-[280px] h-[460px] sm:w-[330px] sm:h-[520px] lg:w-[380px] lg:h-[580px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#091326] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-[1.02] cursor-pointer"
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
                            className="h-28 w-28 object-contain drop-shadow-[0_16px_36px_rgba(0,0,0,0.65)] transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,105,199,0.35),transparent_72%),#081226]" />
                      )}

                      {/* Apple-style Gradient Film */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020712]/80 via-[#020712]/20 to-[#020712]/92" />

                      {/* Upper Info */}
                      <div className="relative z-10 flex flex-col gap-2.5 text-white">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
                            {projectCategory}
                          </p>
                          {platform && (
                            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 backdrop-blur-md">
                              {platform}
                            </span>
                          )}
                        </div>

                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white line-clamp-2">
                          {project.title}
                        </h2>

                        {project.tagline && (
                          <p className="text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-2">
                            {project.tagline}
                          </p>
                        )}
                      </div>

                      {/* Bottom Info & Rotating Arrow Action */}
                      <div className="relative z-10 flex items-end justify-between gap-4 pt-4">
                        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/45 px-3.5 py-1.5 backdrop-blur-md">
                          {project.logo_url && (
                            <img
                              src={project.logo_url}
                              alt=""
                              className="h-5 w-5 rounded-md object-contain"
                            />
                          )}
                          <span className="text-xs font-bold text-[#E4FD97]">
                            ▲ {(project.upvote_count ?? 0).toLocaleString('tr-TR')} destek
                          </span>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 group-hover:bg-[#E4FD97] group-hover:scale-105">
                          <ArrowUpRight className="h-5 w-5 text-black transition-transform duration-300 group-hover:rotate-45 will-change-transform" />
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          {/* Bottom-right Controls */}
          <div className="mt-8 flex items-center justify-between px-2 sm:px-4">
            <p className="text-xs text-[#8495AF]">
              Kaydırmak için sürükleyin veya butonları kullanın
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => api?.scrollPrev()}
                disabled={!canScrollPrev}
                aria-label="Önceki vitrin kartı"
                className="h-11 w-11 rounded-full border-white/15 bg-white/5 text-white backdrop-blur-xl hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => api?.scrollNext()}
                disabled={!canScrollNext}
                aria-label="Sonraki vitrin kartı"
                className="h-11 w-11 rounded-full border-white/15 bg-white/5 text-white backdrop-blur-xl hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
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
            Keşfet’e dön <ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </section>
      )}
    </main>
  );
}
