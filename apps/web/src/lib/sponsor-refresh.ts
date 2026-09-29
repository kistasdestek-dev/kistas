import { sponsorExpiry, type DiscoveryCard, type SponsorSnapshot } from '@kistas/shared';

export const SPONSORS_CHANGED_EVENT = 'kistas:sponsors-changed';

interface SponsorRefreshOptions {
  initial: SponsorSnapshot;
  categoryId: string | null;
  clock: () => number;
  visible: () => boolean;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
  request: (signal: AbortSignal) => Promise<SponsorSnapshot>;
  publish: (items: DiscoveryCard[]) => void;
}

/** One request and one deadline per mounted sponsor scope, using server time. */
export function startSponsorRefresh(options: SponsorRefreshOptions) {
  let items = options.initial.items;
  let serverAnchor = options.initial.timestamp;
  let clockAnchor = options.clock();
  let timer: number | undefined;
  let active = true;
  let flight: Promise<void> | undefined;
  let invalidated = false;
  let abort: AbortController | undefined;
  const now = () => serverAnchor + options.clock() - clockAnchor;
  const clearTimer = () => { if (timer !== undefined) options.cancel(timer); timer = undefined; };
  const prune = () => {
    items = items.filter((card) => sponsorExpiry(card, options.categoryId) > now());
    options.publish(items);
  };
  const arm = () => {
    clearTimer();
    if (!active || !options.visible()) return;
    const time = now();
    const nextHour = (Math.floor(time / 3600000) + 1) * 3600000;
    const expiry = Math.min(...items.map((card) => sponsorExpiry(card, options.categoryId)).filter((value) => value > time));
    timer = options.schedule(() => {
      timer = undefined;
      prune();
      arm(); // Expired cards disappear even if a refresh is still in flight.
      void refresh();
    }, Math.max(1, Math.min(time + 60000, nextHour, expiry) - time));
  };
  const refresh = (): Promise<void> => {
    if (!active || !options.visible()) return Promise.resolve();
    if (flight) return flight;
    prune();
    const started = options.clock();
    abort = new AbortController();
    flight = options.request(abort.signal).then((snapshot) => {
      if (!active) return;
      serverAnchor = snapshot.timestamp;
      clockAnchor = started;
      items = snapshot.items;
      prune();
    }).catch(() => {
      if (active) prune(); // Preserve valid cards; retry on the next deadline.
    }).finally(() => {
      flight = undefined;
      abort = undefined;
      arm();
      if (invalidated && active && options.visible()) {
        invalidated = false;
        void refresh();
      }
    });
    return flight;
  };
  arm();
  void refresh();
  return {
    refresh,
    invalidate: () => { if (flight) invalidated = true; else void refresh(); },
    visibilityChanged: () => {
      clearTimer();
      if (options.visible()) {
        prune(); arm();
        if (flight) invalidated = true; else void refresh();
      }
    },
    stop: () => { active = false; clearTimer(); abort?.abort(); },
  };
}
