import React from 'react';
import { DiscoverExperienceClient } from '@/components/DiscoverExperienceClient';
import { createAnonClient, getCuratedListings, getCategories } from '@kistas/supabase';
import type { Listing, Category } from '@kistas/shared';

export const revalidate = 60; // 1 minute ISR

export default async function HomePage() {
  const supabase = createAnonClient();

  // RSC: Public read from listings and categories
  const [dbListings, dbCategories] = await Promise.all([
    getCuratedListings(supabase, 'popular', 40),
    getCategories(supabase),
  ]);

  // Only real active listings from database
  const allListings: Listing[] = dbListings || [];

  const allCategories: Category[] = dbCategories || [];

  const serverTimestamp = Date.now();

  return (
    <DiscoverExperienceClient
      initialListings={allListings}
      categories={allCategories}
      initialTimestamp={serverTimestamp}
    />
  );
}
