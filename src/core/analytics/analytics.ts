import { Platform } from 'react-native';

const GA_MEASUREMENT_ID = 'G-2XXP5LHME9';
const CONSENT_KEY = 'kistas_analytics_consent_v1';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function readAnalyticsConsent(): boolean | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' ? true : value === 'denied' ? false : null;
  } catch {
    return null;
  }
}

export function saveAnalyticsConsent(granted: boolean | null): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (granted === null) window.localStorage.removeItem(CONSENT_KEY);
    else window.localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
  } catch {}

  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = granted !== true;
  if (granted === true) startAnalytics();
}

export function startAnalytics(): void {
  if (readAnalyticsConsent() !== true || typeof document === 'undefined' || window.gtag) return;
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects each queued command as an Arguments object.
  window.gtag = function () { window.dataLayer?.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function trackPageView(path: string, title: string): void {
  if (readAnalyticsConsent() !== true || typeof window.gtag !== 'function') return;
  const safePath = (path.startsWith('/') ? path : `/${path}`).split(/[?#]/, 1)[0];
  window.gtag('event', 'page_view', {
    page_path: safePath,
    page_location: `${window.location.origin}${safePath}`,
    page_title: title,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackEvent(eventName: string, eventParams?: Record<string, unknown>): void {
  if (readAnalyticsConsent() !== true || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, eventParams);
}
