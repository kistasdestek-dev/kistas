export const GA_MEASUREMENT_ID = 'G-2XXP5LHME9';
export const ANALYTICS_CONSENT_KEY = 'kistas_analytics_consent_v1';
export const ANALYTICS_PREFERENCES_EVENT = 'kistas:analytics-preferences';

const GA_SCRIPT_ID = 'kistas-ga4-script';

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsConsent = boolean | null;

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' ? true : value === 'denied' ? false : null;
  } catch {
    return null;
  }
}

export function saveAnalyticsConsent(consent: AnalyticsConsent): void {
  if (typeof window === 'undefined') return;

  try {
    if (consent === null) window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    else window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent ? 'granted' : 'denied');
  } catch {
    // Privacy mode or blocked storage must fail closed.
  }

  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = consent !== true;

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consent === true ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }

  if (consent === true) startAnalytics();
}

export function startAnalytics(): void {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    readAnalyticsConsent() !== true
  ) {
    return;
  }

  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;

  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params -- gtag.js requires an Arguments object in dataLayer.
      window.dataLayer?.push(arguments);
    };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }
}

export function trackPageView(path: string, title: string): void {
  if (
    typeof window === 'undefined' ||
    readAnalyticsConsent() !== true ||
    typeof window.gtag !== 'function'
  ) {
    return;
  }

  const safePath = (path.startsWith('/') ? path : `/${path}`).split(/[?#]/, 1)[0] || '/';
  window.gtag('event', 'page_view', {
    page_path: safePath,
    page_location: `${window.location.origin}${safePath}`,
    page_title: title,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackEvent(eventName: string, eventParams?: Record<string, unknown>): void {
  if (
    typeof window === 'undefined' ||
    readAnalyticsConsent() !== true ||
    typeof window.gtag !== 'function'
  ) {
    return;
  }

  window.gtag('event', eventName, eventParams);
}
