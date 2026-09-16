export {
  CREDIT_PRODUCT_IDS,
  CreditPackageId,
  CreditPurchaseResult,
  StoreCreditProduct,
} from './CreditPurchaseContracts';
import type {
  CreditPurchaseResult,
  StoreCreditProduct,
} from './CreditPurchaseContracts';

/**
 * TypeScript ve bilinmeyen platformlar için güvenli taban uygulama.
 * Metro iOS/Android'de `.native`, webde `.web` dosyasını seçer.
 */
export class CreditPurchaseService {
  static isConfiguredForDevice(): boolean {
    return false;
  }

  static async initialize(_userId: string): Promise<void> {
    throw new Error('STORE_PURCHASES_UNAVAILABLE');
  }

  static async getProducts(_userId: string): Promise<Record<string, StoreCreditProduct>> {
    return {};
  }

  static async purchase(
    _userId: string,
    _productId: string
  ): Promise<CreditPurchaseResult> {
    throw new Error('STORE_PURCHASES_UNAVAILABLE');
  }

  static getCheckoutUrl(_productId: string): string | null {
    return null;
  }

  static openShopierCheckout(_productId: string): Window | null {
    return null;
  }
}
