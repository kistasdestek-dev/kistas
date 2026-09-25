'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  LayoutGrid,
  Apple,
  Smartphone,
  Globe,
  Monitor,
  Cloud,
} from 'lucide-react';
import { KistasTopBrandBar } from './KistasTopBrandBar';
import { GlassIconButton } from './GlassIconButton';
import {
  APPS_CATEGORIES,
  CATEGORY_CARD_TINTS,
  GAMES_CATEGORIES,
  resolveCategoryIconPath,
} from '@/lib/categoryCatalog';

export type CategorySegment = 'games' | 'apps';

const PLATFORM_OPTIONS = [
  { id: 'iOS', label: 'iOS', icon: Apple },
  { id: 'Android', label: 'Android', icon: Smartphone },
  { id: 'Web', label: 'Web', icon: Globe },
  { id: 'macOS', label: 'macOS', icon: Monitor },
  { id: 'SaaS', label: 'SaaS', icon: Cloud },
] as const;

export const BrowseExperienceClient: React.FC = () => {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<CategorySegment>('games');
  const categories = activeSegment === 'games' ? GAMES_CATEGORIES : APPS_CATEGORIES;

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] selection:bg-[#3B82F6]/30 pb-32">
      {/* 1. Üst Marka Şeridi */}
      <KistasTopBrandBar tagline="İyi fikirler görünür olmayı hak eder" />

      <main className="container mx-auto max-w-[1180px] px-4 sm:px-6 pt-2 pb-12">
        {/* 2. Sayfa Başlığı (Page Header) */}
        <div className="mb-6 pt-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Göz At
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#94A3B8]">
            Bir kategori seç, yeni fikirlerle tanış.
          </p>
        </div>

        {/* 3. Neumorphic Segment Seçici (Oyunlar vs. Uygulamalar) */}
        <div className="mb-8 inline-flex w-full max-w-[520px] items-center rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveSegment('games')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSegment === 'games'
                ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Gamepad2 size={18} className={activeSegment === 'games' ? 'text-[#60A5FA]' : 'text-[#94A3B8]'} />
            <span>Oyunlar</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                activeSegment === 'games'
                  ? 'bg-[#3B82F6]/20 text-[#60A5FA]'
                  : 'bg-white/5 text-[#94A3B8]'
              }`}
            >
              {GAMES_CATEGORIES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('apps')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSegment === 'apps'
                ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <LayoutGrid size={18} className={activeSegment === 'apps' ? 'text-[#60A5FA]' : 'text-[#94A3B8]'} />
            <span>Uygulamalar</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                activeSegment === 'apps'
                  ? 'bg-[#3B82F6]/20 text-[#60A5FA]'
                  : 'bg-white/5 text-[#94A3B8]'
              }`}
            >
              {APPS_CATEGORIES.length}
            </span>
          </button>
        </div>

        {/* 4. Bölüm Başlığı & Sayacı */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-white">
            {activeSegment === 'games' ? 'Oyun kategorileri' : 'Uygulama kategorileri'}
          </h2>
          <span className="text-xs font-semibold text-[#94A3B8]">
            {categories.length} kategori
          </span>
        </div>

        {/* 5. 3D Kategori Kartları Izgarası (Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const tints = CATEGORY_CARD_TINTS[cat.tintKey] ?? CATEGORY_CARD_TINTS.fallback;
            const categoryHref = `/browse/${cat.slug}`;
            const gradientStyle = {
              background: `linear-gradient(135deg, ${tints[0]} 6%, ${tints[1]} 52%, ${tints[2]} 94%)`,
            };

            return (
              <Link
                key={cat.id}
                href={categoryHref}
                prefetch={false}
                onPointerEnter={() => router.prefetch(categoryHref)}
                onFocus={() => router.prefetch(categoryHref)}
                onTouchStart={() => router.prefetch(categoryHref)}
                className="group relative h-28 sm:h-32 w-full overflow-hidden rounded-[20px] border border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.985]"
              >
                {/* Dynamic Vibrant Gradient */}
                <div className="absolute inset-0" style={gradientStyle} />

                {/* Specular Sheen Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/30 pointer-events-none" />

                {/* Top Right: 3D Artwork Plate */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  <div className="flex h-14 w-14 sm:h-15 sm:w-15 items-center justify-center rounded-[19px] border border-white/30 bg-white/20 p-1.5 backdrop-blur-md shadow-sm transition-transform duration-300 group-hover:scale-105">
                    { }
                    <img
                      src={resolveCategoryIconPath(cat.icon3d)}
                      alt={cat.name}
                      className="h-full w-full object-contain select-none drop-shadow-md"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Bottom Left: Category Title */}
                <div className="absolute left-3.5 right-16 bottom-2.5 z-10">
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] line-clamp-2 leading-tight">
                    {cat.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 6. Platforma Göre Keşfet Bölümü */}
        <section className="mt-12 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <h3 className="text-base sm:text-lg font-bold text-white mb-4">
            Platforma göre keşfet
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {PLATFORM_OPTIONS.map((item) => {
              const Icon = item.icon;
              const platformHref = `/browse/platform/${item.id}`;
              return (
                <Link
                  key={item.id}
                  href={platformHref}
                  prefetch={false}
                  onPointerEnter={() => router.prefetch(platformHref)}
                  onFocus={() => router.prefetch(platformHref)}
                  onTouchStart={() => router.prefetch(platformHref)}
                  className="group flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 shadow-sm transition-all hover:scale-102 hover:bg-white/10 active:scale-98"
                >
                  <GlassIconButton
                    icon={Icon}
                    size={32}
                    iconSize={16}
                    className="!bg-white/10 !border-white/15"
                  />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
