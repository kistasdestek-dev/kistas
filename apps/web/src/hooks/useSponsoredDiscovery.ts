'use client';

import { useEffect, useState } from 'react';
import { discoveryHref, type DiscoveryCard, type DiscoveryState, type SponsorSnapshot } from '@kistas/shared';
import { SPONSORS_CHANGED_EVENT, startSponsorRefresh } from '@/lib/sponsor-refresh';

export function useSponsoredDiscovery(state: DiscoveryState, initialItems: DiscoveryCard[], timestamp: number) {
  const scope = JSON.stringify([state.q, state.categoryId, state.platform]);
  const [snapshot, setSnapshot] = useState({ scope, items: initialItems });
  const { q, categoryId, platform } = state;
  useEffect(() => {
    const current = { q, categoryId, platform, sort: 'trending' as const };
    const controller = startSponsorRefresh({
      initial: { items: initialItems, timestamp }, categoryId,
      clock: () => performance.now(), visible: () => document.visibilityState === 'visible',
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: (timer) => window.clearTimeout(timer),
      publish: (items) => setSnapshot({ scope, items }),
      request: async (signal) => {
        const response = await fetch(discoveryHref('/api/discovery/sponsors', current), {
          cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
        });
        if (!response.ok) throw new Error('SPONSORS_UNAVAILABLE');
        const result = await response.json() as SponsorSnapshot;
        if (!Array.isArray(result.items) || result.items.length > 12 || !Number.isFinite(result.timestamp)) {
          throw new Error('INVALID_SPONSOR_RESPONSE');
        }
        return result;
      },
    });
    const refresh = () => controller.invalidate();
    document.addEventListener('visibilitychange', controller.visibilityChanged);
    window.addEventListener(SPONSORS_CHANGED_EVENT, refresh);
    // A purchase in another open Kıstas tab refreshes this tab too.
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(SPONSORS_CHANGED_EVENT);
    if (channel) channel.onmessage = refresh;
    return () => {
      controller.stop();
      document.removeEventListener('visibilitychange', controller.visibilityChanged);
      window.removeEventListener(SPONSORS_CHANGED_EVENT, refresh);
      channel?.close();
    };
  }, [q, categoryId, platform, scope, initialItems, timestamp]);
  return snapshot.scope === scope ? snapshot.items : initialItems;
}
