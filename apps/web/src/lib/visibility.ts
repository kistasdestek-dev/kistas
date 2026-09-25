export type VisibilityScope = 'category' | 'global';

export interface VisibilityPackage {
  id: string;
  scope: VisibilityScope;
  durationHours: 24 | 72 | 168;
  creditCost: number;
  title: string;
  badge: string;
  description: string;
}

export const VISIBILITY_PACKAGES: Record<VisibilityScope, readonly VisibilityPackage[]> = {
  category: [
    {
      id: 'category-24',
      scope: 'category',
      durationHours: 24,
      creditCost: 50,
      title: '1 Gün',
      badge: 'Hızlı başlangıç',
      description: 'Kategorinde hedef kullanıcıların karşısına çık.',
    },
    {
      id: 'category-72',
      scope: 'category',
      durationHours: 72,
      creditCost: 120,
      title: '3 Gün',
      badge: 'En çok tercih edilen',
      description: 'Üç gün boyunca kategori vitrini rotasyonuna katıl.',
    },
    {
      id: 'category-168',
      scope: 'category',
      durationHours: 168,
      creditCost: 250,
      title: '7 Gün',
      badge: 'En avantajlı',
      description: 'Bir hafta boyunca kategorinde görünürlüğünü büyüt.',
    },
  ],
  global: [
    {
      id: 'global-24',
      scope: 'global',
      durationHours: 24,
      creditCost: 200,
      title: '1 Gün',
      badge: 'Hızlı başlangıç',
      description: 'Genel Keşfet vitrininde saatlik rotasyona gir.',
    },
    {
      id: 'global-72',
      scope: 'global',
      durationHours: 72,
      creditCost: 450,
      title: '3 Gün',
      badge: 'En çok tercih edilen',
      description: 'Üç gün boyunca daha geniş bir kitleye ulaş.',
    },
    {
      id: 'global-168',
      scope: 'global',
      durationHours: 168,
      creditCost: 900,
      title: '7 Gün',
      badge: 'En avantajlı',
      description: 'Bir hafta boyunca Keşfet görünürlüğünü güçlendir.',
    },
  ],
};

export function getVisibilityErrorMessage(message?: string): string {
  if (!message) return 'Vitrin işlemi tamamlanamadı. Lütfen tekrar deneyin.';
  if (message.includes('INSUFFICIENT_CREDITS')) return 'Bu paket için yeterli Kıstas krediniz bulunmuyor.';
  if (message.includes('LISTING_NOT_FOUND')) return 'Yayındaki proje bulunamadı. Sayfayı yenileyip tekrar deneyin.';
  if (message.includes('FORBIDDEN')) return 'Yalnızca kendi projenizi vitrine taşıyabilirsiniz.';
  if (message.includes('INVALID_BOOST_PACKAGE') || message.includes('INVALID_SCOPE')) {
    return 'Vitrin paketi güncellendi. Sayfayı yenileyip tekrar deneyin.';
  }
  if (message.includes('UNAUTHORIZED')) return 'İşleme devam etmek için yeniden giriş yapın.';
  return 'Vitrin işlemi tamamlanamadı. Lütfen tekrar deneyin.';
}
