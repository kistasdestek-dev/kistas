'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { KistasTopBrandBar } from './KistasTopBrandBar';
import { ActionSearchBar } from './ActionSearchBar';
import { DynamicDiscoverFilters, DiscoverPlatform, DiscoverSort } from './DynamicDiscoverFilters';
import { DiscoveryRevealStatement } from './DiscoveryRevealStatement';
import { SponsorLogoMarquee } from './SponsorLogoMarquee';
import { FeaturedBoostShowcase } from './FeaturedBoostShowcase';
import { TodayShowcaseRow } from './TodayShowcaseRow';
import { AppStoreProjectList } from './AppStoreProjectList';
import { FooterSloganBanner } from './FooterSloganBanner';
import { rotateListingsByHour, type Listing, type Category } from '@kistas/shared';

export interface DiscoverExperienceClientProps {
  initialListings: Listing[];
  categories: Category[];
  initialTimestamp?: number;
  initialCategoryId?: string | null;
  initialPlatform?: DiscoverPlatform;
  preserveLayoutWhenEmpty?: boolean;
}

export const DiscoverExperienceClient: React.FC<DiscoverExperienceClientProps> = ({
  initialListings = [],
  categories = [],
  initialTimestamp,
  initialCategoryId = null,
  initialPlatform = 'all',
  preserveLayoutWhenEmpty = false,
}) => {
  const router = useRouter();

  // Active discovery state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategoryId);
  const [selectedPlatform, setSelectedPlatform] = useState<DiscoverPlatform>(initialPlatform);
  const [feedSort, setFeedSort] = useState<DiscoverSort>('trending');

  // Reset all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedPlatform('all');
    setFeedSort('trending');
  }, []);

  // Top brand bar click
  const handleBrandPress = useCallback(() => {
    handleClearFilters();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [handleClearFilters]);

  // Selected category object
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory);
  }, [categories, selectedCategory]);

  // Filter and sort items according to active state
  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return initialListings
      .filter((item) => {
        // 1. Query search filter
        if (q) {
          const title = (item.title || '').toLowerCase();
          const tagline = (item.tagline || '').toLowerCase();
          const desc = (item.description || '').toLowerCase();
          if (!title.includes(q) && !tagline.includes(q) && !desc.includes(q)) {
            return false;
          }
        }

        // 2. Category filter
        if (selectedCategory) {
          if (item.category_id !== selectedCategory) return false;
        }

        // 3. Platform filter
        if (selectedPlatform !== 'all') {
          if (!item.platforms || !item.platforms.includes(selectedPlatform as any)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (feedSort === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (feedSort === 'top_voted') {
          return (b.upvote_count || 0) - (a.upvote_count || 0);
        }
        // 'trending' default: boosted first, then by upvotes
        if (a.is_boosted && !b.is_boosted) return -1;
        if (!a.is_boosted && b.is_boosted) return 1;
        return (b.upvote_count || 0) - (a.upvote_count || 0);
      });
  }, [initialListings, searchQuery, selectedCategory, selectedPlatform, feedSort]);

  // Subsets with hourly fair rotation
  const boostedListings = useMemo(() => {
    const boosted = filteredListings.filter((p) => p.is_boosted);
    return rotateListingsByHour(boosted, initialTimestamp);
  }, [filteredListings, initialTimestamp]);

  const todayShowcase = useMemo(() => {
    return rotateListingsByHour(filteredListings.slice(0, 6), initialTimestamp);
  }, [filteredListings, initialTimestamp]);

  const popularListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
  }, [filteredListings]);

  const newListings = useMemo(() => {
    return [...filteredListings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredListings]);

  const hasResults = filteredListings.length > 0;
  const hasActiveScope = selectedCategory !== null || selectedPlatform !== 'all';
  const keepShowcaseLayout = preserveLayoutWhenEmpty || (hasActiveScope && !searchQuery.trim());

  return (
    <div className="relative w-full pb-16">
      {/* 1. KISTAS TOP BRAND BAR (Clickable -> resets & scrolls top) */}
      <KistasTopBrandBar onPress={handleBrandPress} />

      {/* 2. ACTION SEARCH BAR (Live Interactive Search & Suggestions) */}
      <div className="mt-1 mb-3">
        <ActionSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          projects={initialListings}
          placeholder="Uygulama, proje veya geliştirici ara..."
        />
      </div>

      {/* 3. DYNAMIC DISCOVER FILTERS (3-Segmented Pill Dock) */}
      <DynamicDiscoverFilters
        categories={categories}
        selectedCategoryId={selectedCategory}
        selectedPlatform={selectedPlatform}
        selectedSort={feedSort}
        onSelectCategory={setSelectedCategory}
        onSelectPlatform={setSelectedPlatform}
        onSelectSort={setFeedSort}
        onOpenBrowse={() => router.push('/browse')}
      />

      {/* 4. DISCOVERY REVEAL STATEMENT */}
      <DiscoveryRevealStatement />

      {/* Empty State when zero projects in database or no search match */}
      {!hasResults && !keepShowcaseLayout ? (
        <div className="mx-auto my-16 max-w-md rounded-3xl border border-white/15 bg-[#0E0E0E]/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/15 text-[#60A5FA]">
            <Search size={28} />
          </div>
          {initialListings.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-white">Vitrin Henüz Boş</h3>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Vitrinde henüz onaylanmış bir proje bulunmuyor. İlk projenizi ekleyerek Kıstas vitrinindeki yerinizi alın!
              </p>
              <button
                type="button"
                onClick={() => router.push('/create-listing')}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#3B82F6] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#2563EB] transition-all cursor-pointer"
              >
                İlk Projeyi Vitrine Taşı →
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-white">Proje bulunamadı</h3>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Aramanızı veya seçili filtreleri değiştirerek tekrar deneyebilirsiniz.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#3B82F6] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2563EB] transition-all cursor-pointer"
              >
                Filtreleri Temizle
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* 5. SPONSOR LOGO MARQUEE */}
          <SponsorLogoMarquee projects={boostedListings} />

          {/* 6. FEATURED BOOST SHOWCASE (3D Floating Cards + BorderBeam + Promo Card) */}
          <FeaturedBoostShowcase
            projects={boostedListings}
            selectedCategoryName={selectedCategoryObj?.name}
            onOpenCreditStore={() => router.push('/popular')}
          />

          {/* 7. TODAY SHOWCASE ROW (Günün Vitrini: Apple-style Horizontal Cards) */}
          <TodayShowcaseRow
            projects={todayShowcase}
            title="Günün Vitrini"
            subtitle="Dünün kategori liderleri · Her saat adil rotasyon"
            onOpenAll={() => router.push('/popular')}
            showEmptyState={keepShowcaseLayout}
          />

          {/* 8. POPULAR PROJECT PAGER (Kalıcı topluluk desteğine göre sıralama) */}
          {feedSort !== 'newest' && (
            <AppStoreProjectList
              title={selectedCategoryObj ? `${selectedCategoryObj.name} · Popüler` : 'Popüler Projeler'}
              projects={popularListings}
              variant="ranked"
              viewAllHref="/popular"
              showEmptyState={keepShowcaseLayout}
            />
          )}

          {/* 9. NEW PROJECT PAGER (İlk 30 günündeki bağımsız projeler) */}
          {feedSort !== 'top_voted' && (
            <AppStoreProjectList
              title={selectedCategoryObj ? `${selectedCategoryObj.name} · Yeni` : 'Yeni Çıkanlar'}
              projects={newListings}
              variant="new"
              viewAllHref="/new"
              showEmptyState={keepShowcaseLayout}
            />
          )}
        </>
      )}

      {/* 10. FOOTER SLOGAN BANNER (Waving bold-on-hover magnetic text) */}
      <FooterSloganBanner text="Fikirler Kıstas ile Değerlenir" />
    </div>
  );
};
