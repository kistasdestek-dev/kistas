export const CREDIT_PRODUCT_IDS = {
  starter: 'kistas_credits_100',
  pro_launch: 'kistas_credits_350',
  unicorn: 'kistas_credits_1000',
} as const;

export const SHOPIER_CHECKOUT_URLS: Record<string, string> = {
  [CREDIT_PRODUCT_IDS.starter]: 'https://www.shopier.com/kistascom/50900373',
  [CREDIT_PRODUCT_IDS.pro_launch]: 'https://www.shopier.com/kistascom/50900401',
  [CREDIT_PRODUCT_IDS.unicorn]: 'https://www.shopier.com/kistascom/50900419',
};

export type CreditPackageId = keyof typeof CREDIT_PRODUCT_IDS;

export interface StoreCreditProduct {
  identifier: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

export type CreditPurchaseResult =
  | { status: 'completed'; productId: string }
  | { status: 'cancelled' }
  | { status: 'pending' };

export interface CreditPurchaseServiceContract {
  isConfiguredForDevice(): boolean;
  initialize(userId: string): Promise<void>;
  getProducts(userId: string): Promise<Record<string, StoreCreditProduct>>;
  purchase(userId: string, productId: string): Promise<CreditPurchaseResult>;
}
