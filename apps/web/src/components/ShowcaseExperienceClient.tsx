'use client';

import Link from 'next/link';
import { ArrowLeft, Clock3, Sparkles } from 'lucide-react';
import { discoveryHref, type Category, type DiscoveryCard, type DiscoveryState } from '@kistas/shared';
import { SiteBackButton } from './SiteNavigation';
import { TodayShowcaseRow } from './TodayShowcaseRow';

export function ShowcaseExperienceClient({ projects, state, categories, timestamp }: {
  projects: DiscoveryCard[]; state: DiscoveryState; categories: Category[]; timestamp: number;
}) {
  const date = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' }).format(timestamp);
  const categoryName = categories.find(category => category.id === state.categoryId)?.name;
  const scope = [categoryName, state.platform !== 'all' ? state.platform : null, state.q ? `“${state.q}”` : null].filter(Boolean).join(' · ');
  const backHref = discoveryHref('/', state);

  return (
    <main className="showcase-page">
      <header className="showcase-page-hero">
        <div className="showcase-page-ambient" aria-hidden="true" />
        <div className="relative inline-flex items-center gap-2.5 text-xs font-semibold text-slate-300"><SiteBackButton fallback={backHref} size={36} /><span>Geri dön</span></div>

        <div className="showcase-page-intro">
          <div>
            <div className="showcase-page-eyebrow"><Sparkles size={13} aria-hidden="true" /><span>KISTAS SEÇKİSİ</span></div>
            <h1>Günün <span>Vitrini</span></h1>
            <p className="showcase-page-description">Bağımsız fikirler. Güçlü ürünler.<br />Bir sonraki favorin burada olabilir.</p>
          </div>
          <div className="showcase-page-edition">
            <span className="showcase-page-date">{date}</span>
            <span className="showcase-page-rotation"><Clock3 size={13} aria-hidden="true" />Saatlik rotasyon</span>
          </div>
        </div>
        <div className="showcase-page-caption">
          <p>{scope || 'Topluluğun desteklediği projeler'}</p>
          <span>{projects.length} proje</span>
        </div>
      </header>

      {projects.length > 0 ? (
        <TodayShowcaseRow projects={projects} layout="grid" categories={categories} />
      ) : (
        <section className="showcase-page-empty">
          <Sparkles size={30} aria-hidden="true" />
          <h2>Bu seçkide henüz proje yok</h2>
          <p>Farklı bir kategori veya platform seçerek yeni fikirler keşfedebilirsin.</p>
          <Link href={backHref} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300">Keşfet’e dön <ArrowLeft size={14} aria-hidden="true" /></Link>
        </section>
      )}
    </main>
  );
}
