import type { Metadata } from 'next';
import { HowItWorksExperienceClient } from '@/components/how-it-works/HowItWorksExperienceClient';

export const metadata: Metadata = {
  title: 'Nasıl Çalışır? | Kıstas - Dijital Vitrin ve Destek Ekosistemi',
  description:
    'Kıstas nasıl çalışır? Bağımsız geliştiricilerin inovatif projelerini tanıttığı, topluluğun organik oylarla desteklediği ve adil rotasyonlu vitrin platformu.',
  openGraph: {
    title: 'Nasıl Çalışır? | Kıstas',
    description:
      'Kıstas ekosisteminde bağımsız geliştiriciler ürünlerini tanıtır, topluluk destekler ve mikro servisler güvenle el değiştirir.',
    url: 'https://kistas.com.tr/nasil-calisir',
    siteName: 'Kıstas',
    locale: 'tr_TR',
    type: 'website',
  },
};

export default function HowItWorksPage() {
  return <HowItWorksExperienceClient />;
}
