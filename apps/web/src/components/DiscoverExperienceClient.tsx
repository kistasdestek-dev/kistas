'use client';

import React, { useState, useMemo, useCallback, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { KistasTopBrandBar } from './KistasTopBrandBar';
import { ActionSearchBar } from './ActionSearchBar';
import { DynamicDiscoverFilters } from './DynamicDiscoverFilters';
import { DiscoveryRevealStatement } from './DiscoveryRevealStatement';
import { SponsorLogoMarquee } from './SponsorLogoMarquee';
import { FeaturedBoostShowcase } from './FeaturedBoostShowcase';
import { TodayShowcaseRow } from './TodayShowcaseRow';
import { AppStoreProjectList } from './AppStoreProjectList';
import { FooterSloganBanner } from './FooterSloganBanner';
import { rotateListingsByHour, discoveryHref, DISCOVERY_DEFAULTS, type DiscoveryState, type DiscoveryCard, type Category } from '@kistas/shared';

export interface DiscoverExperienceClientProps {
  sections: { popular: DiscoveryCard[]; newest: DiscoveryCard[]; sponsored: DiscoveryCard[] };
  state: DiscoveryState;
  categories: Category[];
  initialTimestamp: number;
  preserveLayoutWhenEmpty?: boolean;
}
export const DiscoverExperienceClient: React.FC<DiscoverExperienceClientProps> = ({ sections, state, categories, initialTimestamp, preserveLayoutWhenEmpty = false }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(state.q);
  const draftQuery = useRef(state.q);
  const submittedQuery = useRef(state.q);
  const desiredState = useRef(state);
  const [pending, startTransition] = useTransition();
  const navigate = useCallback((next: DiscoveryState, replace = false) => {
    desiredState.current = next;
    submittedQuery.current = next.q;
    startTransition(() => { if (replace) router.replace(discoveryHref('/', next), { scroll: false }); else router.push(discoveryHref('/', next), { scroll: false }); });
  }, [router]);
  useEffect(() => {
    if (state.q === submittedQuery.current && draftQuery.current.trim() !== state.q) return;
    draftQuery.current = state.q;
    desiredState.current = state;
    setSearchQuery(state.q);
  }, [state]);
  useEffect(() => {
    if (searchQuery.trim() === state.q) return;
    const timeout = window.setTimeout(() => {
      const q = searchQuery.trim();
      if (desiredState.current.q === q && submittedQuery.current === q) return;
      navigate({ ...desiredState.current, q }, true);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, state, navigate]);
  const changeScope = (patch: Partial<DiscoveryState>) => navigate({ ...state, q: searchQuery.trim(), ...patch });
  const handleClearFilters = useCallback(() => { draftQuery.current = ''; setSearchQuery(''); navigate(DISCOVERY_DEFAULTS); }, [navigate]);
  const handleBrandPress = useCallback(() => { handleClearFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [handleClearFilters]);
  const selectedCategoryObj = categories.find((category) => category.id === state.categoryId);
  const projects = useMemo(() => [...new Map([...sections.sponsored, ...sections.popular, ...sections.newest].map((project) => [project.id, project])).values()], [sections]);
  const todayShowcase = useMemo(() => rotateListingsByHour(sections.popular, initialTimestamp), [sections.popular, initialTimestamp]);
  const keepShowcaseLayout = preserveLayoutWhenEmpty || ((state.categoryId !== null || state.platform !== 'all') && !state.q);
  const filtered = Boolean(state.q || state.categoryId || state.platform !== 'all');
  const popularHref = discoveryHref('/popular', { ...state, sort: 'top_voted' });
  const newestHref = discoveryHref('/new', { ...state, sort: 'newest' });
  return (
    <div className="relative w-full pb-16" aria-busy={pending}>
      <KistasTopBrandBar onPress={handleBrandPress} />
      <div className="mt-1 mb-3"><ActionSearchBar query={searchQuery} onQueryChange={(query) => { draftQuery.current = query; setSearchQuery(query); }} projects={projects} placeholder="Uygulama, proje veya geliştirici ara..." /></div>
      <DynamicDiscoverFilters categories={categories} selectedCategoryId={state.categoryId} selectedPlatform={state.platform} selectedSort={state.sort}
        onSelectCategory={(categoryId) => changeScope({ categoryId })} onSelectPlatform={(platform) => changeScope({ platform })} onSelectSort={(sort) => changeScope({ sort })} onOpenBrowse={() => router.push('/browse')} />
      <DiscoveryRevealStatement />
      <span role="status" className="sr-only">{pending ? 'Projeler yükleniyor' : `${projects.length} proje gösteriliyor`}</span>
      {!projects.length && !keepShowcaseLayout ? (
        <div className="mx-auto my-16 max-w-md rounded-3xl border border-white/15 bg-[#0E0E0E]/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/15 text-[#60A5FA]"><Search size={28} /></div>
          <h3 className="text-base font-bold text-white">{filtered ? 'Proje bulunamadı' : 'Vitrin Henüz Boş'}</h3>
          <p className="mt-1 text-xs text-[#94A3B8]">{filtered ? 'Aramanızı veya seçili filtreleri değiştirerek tekrar deneyebilirsiniz.' : 'Vitrinde henüz onaylanmış bir proje bulunmuyor. İlk projenizi ekleyerek Kıstas vitrinindeki yerinizi alın!'}</p>
          <button type="button" onClick={filtered ? handleClearFilters : () => router.push('/create-listing')} className="mt-5 inline-flex items-center justify-center rounded-full bg-[#3B82F6] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2563EB] transition-all cursor-pointer">{filtered ? 'Filtreleri Temizle' : 'İlk Projeyi Vitrine Taşı →'}</button>
        </div>
      ) : (
        <>
          <SponsorLogoMarquee projects={sections.sponsored} />
          <FeaturedBoostShowcase projects={sections.sponsored} selectedCategoryName={selectedCategoryObj?.name} onOpenCreditStore={() => router.push('/popular')} />
          <TodayShowcaseRow projects={todayShowcase} title="Günün Vitrini" subtitle="Topluluğun desteklediği projeler · Her saat adil rotasyon" onOpenAll={() => router.push(popularHref)} showEmptyState={keepShowcaseLayout} />
          {state.sort !== 'newest' && <AppStoreProjectList title={selectedCategoryObj ? `${selectedCategoryObj.name} · Popüler` : 'Popüler Projeler'} projects={sections.popular} variant="ranked" viewAllHref={popularHref} showEmptyState={keepShowcaseLayout} />}
          {state.sort !== 'top_voted' && <AppStoreProjectList title={selectedCategoryObj ? `${selectedCategoryObj.name} · Yeni` : 'Yeni Çıkanlar'} projects={sections.newest} variant="new" viewAllHref={newestHref} showEmptyState={keepShowcaseLayout} />}
        </>
      )}
      <FooterSloganBanner text="Fikirler Kıstas ile Değerlenir" />
    </div>
  );
};
