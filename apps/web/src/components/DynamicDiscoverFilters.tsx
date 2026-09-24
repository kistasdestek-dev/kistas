'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronUpCircle, Clock, Layers, Globe, Smartphone, Laptop, Cloud, ChevronDown, Check } from 'lucide-react';
import type { Category } from '@kistas/shared';

export type DiscoverSort = 'trending' | 'top_voted' | 'newest';
export type DiscoverPlatform = 'all' | 'iOS' | 'Android' | 'Web' | 'macOS' | 'SaaS';

export interface DynamicDiscoverFiltersProps {
  categories?: Category[];
  selectedCategoryId?: string | null;
  selectedPlatform?: DiscoverPlatform;
  selectedSort?: DiscoverSort;
  onSelectCategory?: (id: string | null) => void;
  onSelectPlatform?: (platform: DiscoverPlatform) => void;
  onSelectSort?: (sort: DiscoverSort) => void;
  onOpenBrowse?: () => void;
}

const SORTS: ReadonlyArray<{ id: DiscoverSort; label: string; hint: string; icon: any }> = [
  { id: 'trending', label: 'Öne Çıkan', hint: 'Editör seçkileri ve yükselen projeler', icon: Sparkles },
  { id: 'top_voted', label: 'En Çok Desteklenen', hint: 'Topluluğun en çok destekledikleri', icon: ChevronUpCircle },
  { id: 'newest', label: 'Yeni', hint: 'Vitrine yeni katılan projeler', icon: Clock },
];

const PLATFORMS: ReadonlyArray<{ id: DiscoverPlatform; label: string; icon: any }> = [
  { id: 'all', label: 'Tümü', icon: Layers },
  { id: 'Web', label: 'Web', icon: Globe },
  { id: 'iOS', label: 'iOS', icon: Smartphone },
  { id: 'Android', label: 'Android', icon: Smartphone },
  { id: 'macOS', label: 'macOS', icon: Laptop },
  { id: 'SaaS', label: 'SaaS', icon: Cloud },
];

export const DynamicDiscoverFilters: React.FC<DynamicDiscoverFiltersProps> = ({
  categories = [],
  selectedCategoryId = null,
  selectedPlatform = 'all',
  selectedSort = 'trending',
  onSelectCategory,
  onSelectPlatform,
  onSelectSort,
  onOpenBrowse,
}) => {
  const [activePanel, setActivePanel] = useState<'none' | 'sort' | 'category' | 'platform'>('none');
  const [categorySearch, setCategorySearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedSortObj = SORTS.find((s) => s.id === selectedSort) || SORTS[0];
  const selectedPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setActivePanel('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter((c) =>
    (c.name || '').toLowerCase().includes(categorySearch.trim().toLowerCase())
  );

  return (
    <div
      ref={rootRef}
      className={`relative ${activePanel !== 'none' ? 'z-50' : 'z-30'} mx-auto w-full max-w-[580px] px-4 my-2 select-none`}
    >
      {/* Three Segment Button Dock */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/20 bg-white/[0.07] p-1 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        {/* 1. Sort Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActivePanel((prev) => (prev === 'sort' ? 'none' : 'sort'));
          }}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
            activePanel === 'sort' || selectedSort !== 'trending'
              ? 'border border-blue-500/40 bg-blue-950/50 text-[#60A5FA] shadow-inner'
              : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="truncate">{selectedSortObj.label}</span>
          <ChevronDown size={11} className={activePanel === 'sort' || selectedSort !== 'trending' ? 'text-[#60A5FA]' : 'text-[#64748B]'} />
        </button>

        {/* 2. Category Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActivePanel((prev) => (prev === 'category' ? 'none' : 'category'));
          }}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
            activePanel === 'category' || selectedCategoryId !== null
              ? 'border border-blue-500/40 bg-blue-950/50 text-[#60A5FA] shadow-inner'
              : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="truncate">
            {selectedCategoryObj ? selectedCategoryObj.name : 'Kategoriler'}
          </span>
          <ChevronDown size={11} className={activePanel === 'category' || selectedCategoryId !== null ? 'text-[#60A5FA]' : 'text-[#64748B]'} />
        </button>

        {/* 3. Platform Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActivePanel((prev) => (prev === 'platform' ? 'none' : 'platform'));
          }}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
            activePanel === 'platform' || selectedPlatform !== 'all'
              ? 'border border-blue-500/40 bg-blue-950/50 text-[#60A5FA] shadow-inner'
              : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="truncate">{selectedPlatformObj.label}</span>
          <ChevronDown size={11} className={activePanel === 'platform' || selectedPlatform !== 'all' ? 'text-[#60A5FA]' : 'text-[#64748B]'} />
        </button>
      </div>

      {/* Floating Dropdown Panels */}
      {activePanel === 'sort' && (
        <div
          style={{ WebkitBackdropFilter: 'blur(24px) saturate(180%)', transform: 'translateZ(0)' }}
          className="absolute left-4 right-4 top-[calc(100%+8px)] z-50 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#0E182A]/75 to-[#0A101D]/80 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex flex-col gap-1">
            {SORTS.map((sort) => {
              const Icon = sort.icon;
              const isSelected = selectedSort === sort.id;
              return (
                <button
                  key={sort.id}
                  type="button"
                  onClick={() => {
                    onSelectSort?.(sort.id);
                    setActivePanel('none');
                  }}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'border border-blue-500/35 bg-blue-600/20 text-[#60A5FA]'
                      : 'border border-transparent text-[#F8FAFC] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className={isSelected ? 'text-[#60A5FA]' : 'text-[#3B82F6]'} />
                    <div className="text-left">
                      <div className="font-bold">{sort.label}</div>
                      <div className="text-[10.5px] font-normal text-[#94A3B8]">{sort.hint}</div>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-[#60A5FA]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activePanel === 'category' && (
        <div
          style={{ WebkitBackdropFilter: 'blur(24px) saturate(180%)', transform: 'translateZ(0)' }}
          className="absolute left-4 right-4 top-[calc(100%+8px)] z-50 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#0E182A]/75 to-[#0A101D]/80 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Search inside Category */}
          <div className="mb-2.5">
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Kategori filtrele..."
              className="w-full rounded-xl border border-blue-500/30 bg-white/[0.04] px-3 py-1.5 text-[16px] sm:text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            <button
              type="button"
              onClick={() => {
                onSelectCategory?.(null);
                setActivePanel('none');
              }}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                selectedCategoryId === null
                  ? 'border border-blue-500/35 bg-blue-600/20 text-[#60A5FA]'
                  : 'border border-transparent text-[#F8FAFC] hover:bg-white/5'
              }`}
            >
              <span>✦ Tüm Kategoriler</span>
              {selectedCategoryId === null && <Check size={13} className="text-[#60A5FA]" />}
            </button>

            {filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory?.(cat.id);
                    setActivePanel('none');
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'border border-blue-500/35 bg-blue-600/20 text-[#60A5FA] font-bold'
                      : 'border border-transparent text-[#F8FAFC] hover:bg-white/5'
                  }`}
                >
                  <span>{cat.name}</span>
                  {isSelected && <Check size={13} className="text-[#60A5FA]" />}
                </button>
              );
            })}
          </div>

          {onOpenBrowse && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setActivePanel('none');
                  onOpenBrowse();
                }}
                className="text-[11px] font-bold text-[#60A5FA] hover:text-[#93C5FD] cursor-pointer"
              >
                Göz At Sayfasına Git →
              </button>
            </div>
          )}
        </div>
      )}

      {activePanel === 'platform' && (
        <div
          style={{ WebkitBackdropFilter: 'blur(24px) saturate(180%)', transform: 'translateZ(0)' }}
          className="absolute left-4 right-4 top-[calc(100%+8px)] z-50 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#0E182A]/75 to-[#0A101D]/80 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PLATFORMS.map((plat) => {
              const Icon = plat.icon;
              const isSelected = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => {
                    onSelectPlatform?.(plat.id);
                    setActivePanel('none');
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'border border-blue-500/40 bg-blue-600/20 text-[#60A5FA]'
                      : 'border border-transparent text-[#F8FAFC] hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-[#60A5FA]' : 'text-[#3B82F6]'} />
                  <span>{plat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
