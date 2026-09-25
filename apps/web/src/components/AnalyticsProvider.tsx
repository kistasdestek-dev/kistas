'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ANALYTICS_PREFERENCES_EVENT,
  type AnalyticsConsent,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  startAnalytics,
  trackPageView,
} from '@/lib/analytics';

export function AnalyticsProvider() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent>(null);
  const [isReady, setIsReady] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    setConsent(readAnalyticsConsent());
    setIsReady(true);

    const openPreferences = () => {
      saveAnalyticsConsent(null);
      lastTrackedPath.current = null;
      setConsent(null);
    };

    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    if (!isReady || consent !== true || lastTrackedPath.current === pathname) return;

    startAnalytics();
    trackPageView(pathname, document.title);
    lastTrackedPath.current = pathname;
  }, [consent, isReady, pathname]);

  const chooseConsent = (nextConsent: boolean) => {
    saveAnalyticsConsent(nextConsent);
    lastTrackedPath.current = null;
    setConsent(nextConsent);
  };

  if (!isReady || consent !== null) return null;

  return (
    <section
      aria-label="Analitik çerez tercihi"
      className="fixed inset-x-3 bottom-24 z-[999998] mx-auto max-w-xl rounded-2xl border border-blue-400/25 bg-[#091326]/95 p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_28px_rgba(50,105,199,0.18)] backdrop-blur-xl sm:bottom-6 sm:p-5"
    >
      <h2 className="text-sm font-bold tracking-tight sm:text-base">Analitik çerezler</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
        Kıstas&apos;ı geliştirmek için anonim ziyaret ve etkileşim verilerini Google Analytics ile
        ölçmek istiyoruz. Onay vermediğiniz sürece Google etiketi yüklenmez.
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => chooseConsent(false)}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          Reddet
        </button>
        <button
          type="button"
          onClick={() => chooseConsent(true)}
          className="rounded-full border border-blue-400/50 bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500"
        >
          Kabul et
        </button>
      </div>
    </section>
  );
}
