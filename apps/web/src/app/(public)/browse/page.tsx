import type { Metadata } from 'next';
import { BrowseExperienceClient } from '@/components/BrowseExperienceClient';

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: 'Dijital Projeleri Keşfet | Kıstas',
  description:
    'Mobil uygulama, SaaS, oyun, web ve yapay zekâ projelerini kategori ve platformlara göre keşfedin; bağımsız üreticilerin yeni ürünlerini inceleyin.',
  alternates: {
    canonical: 'https://www.kistas.com.tr/browse',
  },
  openGraph: {
    title: 'Dijital Projeleri Keşfet | Kıstas',
    description:
      'Mobil uygulama, SaaS, oyun, web ve yapay zekâ projelerini kategori ve platformlara göre keşfedin; bağımsız üreticilerin yeni ürünlerini inceleyin.',
    url: 'https://www.kistas.com.tr/browse',
  },
};

export default function BrowsePage() {
  return <BrowseExperienceClient />;
}
