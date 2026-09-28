import { createAnonClient, getCuratedListings } from '@kistas/supabase';
import { Rocket, Sparkles } from 'lucide-react';
import { AppStoreProjectList } from '@/components/AppStoreProjectList';
import { ShinyButton } from '@/components/ui/shiny-button';

export const revalidate = 60;

export default async function NewListingsPage() {
  const supabase = createAnonClient();
  const items = await getCuratedListings(supabase, 'new', 30);

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="relative overflow-hidden border-b border-white/10 pb-6">
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/[0.07] px-3 py-1.5 text-[11px] font-bold text-blue-200 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <Rocket size={13} />
            <span>Yeni Lansmanlar</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
            Yeni Çıkan Projeler
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#94A3B8]">
            Ekosisteme yeni katılan ve keşfedilmeyi bekleyen bağımsız dijital ürünlerle ilk siz tanışın.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <section className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.035] p-10 text-center shadow-xl backdrop-blur-2xl">
          <Sparkles size={26} className="mx-auto text-blue-300" />
          <h2 className="mt-4 text-base font-bold text-white">Henüz yeni bir lansman bulunmuyor</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#94A3B8]">Yeni projenizi yayınlayarak bu listenin ilk sırasında yerinizi alın.</p>
          <div className="mx-auto mt-6 max-w-xs">
            <ShinyButton href="/create-listing">Yeni Lansman Yap</ShinyButton>
          </div>
        </section>
      ) : (
        <AppStoreProjectList
          projects={items}
          variant="new"
          maxItems={30}
          showViewAll={false}
          fullPage
        />
      )}
    </main>
  );
}
