export interface CreditStorePlan {
  id: 'starter' | 'growth' | 'scale';
  productId: string;
  shopierProductId: string;
  checkoutUrl: string;
  name: string;
  credits: number;
  priceTRY: number;
  amountMinor: number;
  featured?: boolean;
  description: string;
  useCases: readonly string[];
}

export const CREDIT_STORE_PLANS: readonly CreditStorePlan[] = [
  {
    id: 'starter',
    productId: 'kistas_credits_250',
    shopierProductId: '50900373',
    checkoutUrl: 'https://www.shopier.com/kistascom/50900373',
    name: 'Başlangıç',
    credits: 250,
    priceTRY: 299,
    amountMinor: 29_900,
    description: 'İlk görünürlük hamlen için dengeli başlangıç.',
    useCases: ['7 gün kategori vitrini', '24 saat Keşfet + 24 saat kategori', 'Krediler süresiz bakiyende kalır'],
  },
  {
    id: 'growth',
    productId: 'kistas_credits_750',
    shopierProductId: '50900401',
    checkoutUrl: 'https://www.shopier.com/kistascom/50900401',
    name: 'Büyüme',
    credits: 750,
    priceTRY: 699,
    amountMinor: 69_900,
    featured: true,
    description: 'Lansmanını hem geniş hem hedefli kitleye taşı.',
    useCases: ['3 gün Keşfet + 7 gün kategori', 'Başlangıca göre %22 birim avantajı', 'Krediler süresiz bakiyende kalır'],
  },
  {
    id: 'scale',
    productId: 'kistas_credits_2000',
    shopierProductId: '50900419',
    checkoutUrl: 'https://www.shopier.com/kistascom/50900419',
    name: 'Ölçek',
    credits: 2_000,
    priceTRY: 1_499,
    amountMinor: 149_900,
    description: 'Birden fazla lansman ve uzun kampanyalar için.',
    useCases: ['2 × 7 gün Keşfet + 200 kredi', 'Başlangıca göre %37 birim avantajı', 'Krediler süresiz bakiyende kalır'],
  },
] as const;

export const formatCreditPrice = (priceTRY: number): string => (
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(priceTRY)
);

export const formatUnitCreditPrice = (plan: CreditStorePlan): string => (
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(plan.priceTRY / plan.credits)
);
