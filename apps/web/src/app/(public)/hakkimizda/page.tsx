import type { Metadata } from 'next';
import { AboutExperienceClient } from '@/components/about/AboutExperienceClient';

export const metadata: Metadata = {
  title: 'Hakkımızda | Kıstas - Bağımsız Dijital Projeler Vitrini',
  description:
    'Kıstas nedir? Bağımsız geliştiriciler, yenilikçi yazılımlar ve dijital araçlar için topluluk destekli, adil rotasyonlu yeni nesil vitrin ekosistemi.',
  openGraph: {
    title: 'Hakkımızda | Kıstas',
    description:
      'Kıstas, yeni dijital ürünleri bulmanın en kolay ve en şeffaf yoludur. Kullanıcılar yeni favorilerini keşfeder, üreticiler doğru insanlara ulaşır.',
    url: 'https://kistas.com.tr/hakkimizda',
    siteName: 'Kıstas',
    locale: 'tr_TR',
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutExperienceClient />;
}
