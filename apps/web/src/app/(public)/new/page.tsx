import { createAnonClient, getCuratedListings } from '@kistas/supabase';
import Link from 'next/link';
import { Sparkles, ChevronUp, Calendar } from 'lucide-react';
import { AutoTransparentLogo } from '@/components/AutoTransparentLogo';

export const revalidate = 60;

export default async function NewListingsPage() {
  const supabase = createAnonClient();
  const dbItems = await getCuratedListings(supabase, 'new', 30);
  const items = dbItems || [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
          <Sparkles size={13} className="text-emerald-400" />
          <span>Yeni Lansmanlar</span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Yeni Çıkan Projeler
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-[#94A3B8]">
          Son 30 günde ekosisteme katılan ve keşfedilmeyi bekleyen bağımsız dijital ürünler.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-12 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles size={24} />
          </div>
          <h3 className="text-base font-bold text-white">Son 30 günde eklenen proje bulunmuyor</h3>
          <p className="mt-1 text-xs sm:text-sm text-[#94A3B8]">
            Yeni bir proje başlatmak veya vitrinde yer almak için ilk adımı atın.
          </p>
          <Link
            href="/create-listing"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all"
          >
            Yeni Lansman Yap →
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3.5">
          {items.map((item) => {
            const cover = item.logo_url || (item.images && item.images[0]?.image_url);
            const initials = item.title ? item.title.slice(0, 2).toUpperCase() : 'KT';

            return (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 sm:p-5 shadow-lg transition-all hover:border-emerald-500/40 hover:bg-white/[0.07] hover:shadow-emerald-500/5 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="flex-shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                    Yeni
                  </span>

                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {cover ? (
                      <AutoTransparentLogo src={cover} alt={item.title} className="h-full w-full object-cover" />
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

                <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                  <div className="hidden sm:flex items-center gap-1 text-xs text-[#94A3B8]">
                    <Calendar size={12} />
                    <span>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    <ChevronUp size={13} />
                    <span>{item.upvote_count || 0}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
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
