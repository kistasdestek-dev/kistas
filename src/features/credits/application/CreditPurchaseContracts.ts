export const CREDIT_PRODUCT_IDS = {
  starter: 'kistas_credits_100',
  pro_launch: 'kistas_credits_350',
  unicorn: 'kistas_credits_1000',
} as const;

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
