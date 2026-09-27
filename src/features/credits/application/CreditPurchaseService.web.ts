export {
  CREDIT_PRODUCT_IDS,
  SHOPIER_CHECKOUT_URLS,
  CreditPackageId,
  CreditPurchaseResult,
  StoreCreditProduct,
} from './CreditPurchaseContracts';
import {
  CREDIT_PRODUCT_IDS,
  SHOPIER_CHECKOUT_URLS,
} from './CreditPurchaseContracts';
import type {
  CreditPurchaseResult,
  StoreCreditProduct,
} from './CreditPurchaseContracts';

/**
 * Web Shopier Ödeme ve Kredi Entegrasyon Servisi.
 * Web ortamında RevenueCat native SDK'sı yerine resmi Shopier entegrasyonu kullanılır.
 */
export class CreditPurchaseService {
  static isConfiguredForDevice(): boolean {
    return true;
  }

  static async initialize(_userId: string): Promise<void> {
    // Web için özel bir SDK ilklemesi gerekmez
    return Promise.resolve();
  }

  static async getProducts(_userId: string): Promise<Record<string, StoreCreditProduct>> {
    return {
      [CREDIT_PRODUCT_IDS.starter]: {
        identifier: CREDIT_PRODUCT_IDS.starter,
        price: 299,
        priceString: '₺299',
        currencyCode: 'TRY',
      },
      [CREDIT_PRODUCT_IDS.pro_launch]: {
        identifier: CREDIT_PRODUCT_IDS.pro_launch,
        price: 699,
        priceString: '₺699',
        currencyCode: 'TRY',
      },
      [CREDIT_PRODUCT_IDS.unicorn]: {
        identifier: CREDIT_PRODUCT_IDS.unicorn,
        price: 1499,
        priceString: '₺1.499',
        currencyCode: 'TRY',
      },
    };
  }

  static getCheckoutUrl(productId: string): string | null {
    return SHOPIER_CHECKOUT_URLS[productId] || null;
  }

  static openShopierCheckout(productId: string): Window | null {
    const url = this.getCheckoutUrl(productId);
    if (!url || typeof window === 'undefined') return null;

    const width = 540;
    const height = 820;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
      url,
      'KistasShopierCheckout',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,scrollbars=yes,resizable=yes,noopener,noreferrer`
    );
    if (popup) {
      popup.opener = null;
    }
    return popup;
  }

  static async purchase(
    _userId: string,
    productId: string
  ): Promise<CreditPurchaseResult> {
    const popup = this.openShopierCheckout(productId);
    if (!popup) {
      return { status: 'cancelled' };
    }

    return { status: 'pending' };
  }
}
