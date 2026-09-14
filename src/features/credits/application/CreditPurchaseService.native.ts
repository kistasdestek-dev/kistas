import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASE_TYPE,
  PURCHASES_ERROR_CODE,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import {
  CREDIT_PRODUCT_IDS,
  CreditPurchaseResult,
  StoreCreditProduct,
} from './CreditPurchaseContracts';

export {
  CREDIT_PRODUCT_IDS,
  CreditPackageId,
  CreditPurchaseResult,
  StoreCreditProduct,
} from './CreditPurchaseContracts';

const getApiKey = (): string => {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || '';
  }

  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || '';
  }

  return '';
};

const isPurchasesError = (
  error: unknown
): error is { code?: string; userCancelled?: boolean | null } =>
  typeof error === 'object' && error !== null;

/** Apple/Google dijital kredi satın alma sınırı. */
export class CreditPurchaseService {
  static isConfiguredForDevice(): boolean {
    return getApiKey().length > 0;
  }

  static async initialize(userId: string): Promise<void> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('REVENUECAT_NOT_CONFIGURED');

    const configured = await Purchases.isConfigured();
    if (!configured) {
      Purchases.configure({ apiKey, appUserID: userId });
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      return;
    }

    const currentUserId = await Purchases.getAppUserID();
    if (currentUserId !== userId) await Purchases.logIn(userId);
  }

  static async getProducts(userId: string): Promise<Record<string, StoreCreditProduct>> {
    await this.initialize(userId);
    const products = await Purchases.getProducts(
      Object.values(CREDIT_PRODUCT_IDS),
      PURCHASE_TYPE.INAPP
    );

    return products.reduce<Record<string, StoreCreditProduct>>((result, product) => {
      result[product.identifier] = this.toStoreProduct(product);
      return result;
    }, {});
  }

  static async purchase(userId: string, productId: string): Promise<CreditPurchaseResult> {
    await this.initialize(userId);
    const products = await Purchases.getProducts([productId], PURCHASE_TYPE.INAPP);
    const product = products.find((item) => item.identifier === productId);
    if (!product) throw new Error('STORE_PRODUCT_NOT_FOUND');

    try {
      const result = await Purchases.purchaseStoreProduct(product);
      return { status: 'completed', productId: result.productIdentifier };
    } catch (error: unknown) {
      if (isPurchasesError(error)) {
        if (
          error.userCancelled ||
          error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        ) {
          return { status: 'cancelled' };
        }

        if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
          return { status: 'pending' };
        }
      }
      throw error;
    }
  }

  private static toStoreProduct(product: PurchasesStoreProduct): StoreCreditProduct {
    return {
      identifier: product.identifier,
      price: product.price,
      priceString: product.priceString,
      currencyCode: product.currencyCode,
    };
  }
}
