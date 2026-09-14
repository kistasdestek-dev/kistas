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
 * Web ödeme sağlayıcısı bağlanana kadar istemciden kredi üretmeyen güvenli sınır.
 * Böylece RevenueCat native SDK'sı web paketine girmez.
 */
export class CreditPurchaseService {
  static isConfiguredForDevice(): boolean {
    return false;
  }

  static async initialize(_userId: string): Promise<void> {
    throw new Error('WEB_PAYMENTS_NOT_CONFIGURED');
  }

  static async getProducts(_userId: string): Promise<Record<string, StoreCreditProduct>> {
    return {};
  }

  static async purchase(
    _userId: string,
    _productId: string
  ): Promise<CreditPurchaseResult> {
    throw new Error('WEB_PAYMENTS_NOT_CONFIGURED');
  }
}
