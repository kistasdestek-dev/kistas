import { createAnonClient, getCuratedListings } from '@kistas/supabase';
import Link from 'next/link';
import { ChevronUp, Flame, Sparkles } from 'lucide-react';

export const revalidate = 60;

export default async function PopularPage() {
  const supabase = createAnonClient();
  const dbItems = await getCuratedListings(supabase, 'popular', 30);
  const items = dbItems || [];

  const getRankBadge = (index: number) => {
    if (index === 0) return { label: '#1', color: 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20' };
    if (index === 1) return { label: '#2', color: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black shadow-lg shadow-slate-400/20' };
    if (index === 2) return { label: '#3', color: 'bg-gradient-to-br from-amber-600 to-amber-700 text-white font-black shadow-lg shadow-amber-700/20' };
    return { label: `#${index + 1}`, color: 'bg-white/5 text-[#94A3B8] border border-white/10' };
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
          <Flame size={13} className="text-amber-400" />
          <span>Haftalık Topluluk Trendi</span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white tracking-tight">
          En Çok Desteklenenler
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-[#94A3B8]">
          Kıstas topluluğunun en yüksek oy ve puan verdiği lider bağımsız dijital ürünler.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-12 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles size={24} />
          </div>
          <h3 className="text-base font-bold text-white">Vitrinde henüz onaylı proje bulunmuyor</h3>
          <p className="mt-1 text-xs sm:text-sm text-[#94A3B8]">
            İlk projeyi ekleyerek Kıstas vitrininde zirvede yerinizi alın.
          </p>
          <Link
            href="/create-listing"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all"
          >
            İlk Projeyi Vitrine Taşı →
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3.5">
          {items.map((item, idx) => {
            const rank = getRankBadge(idx);
            const cover = item.logo_url || (item.images && item.images[0]?.image_url);
            const initials = item.title ? item.title.slice(0, 2).toUpperCase() : 'KT';

            return (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-3.5 sm:p-5 shadow-lg transition-all hover:border-blue-500/40 hover:bg-white/[0.07] hover:shadow-blue-500/5 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                  <span className={`flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs ${rank.color}`}>
                    {rank.label}
                  </span>

                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {cover ? (
                      <img src={cover} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-blue-400">{initials}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm sm:text-base font-bold text-[#F8FAFC] transition-colors group-hover:text-blue-400">
                      {item.title}
                    </h2>
                    <p className="mt-0.5 truncate text-xs font-medium text-[#94A3B8]">
                      {item.tagline || item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0 ml-2.5 sm:ml-3">
                  <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    <ChevronUp size={13} />
                    <span>{item.upvote_count || 0}</span>
                  </div>
                  <span className="hidden sm:inline-block text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                    İncele →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
