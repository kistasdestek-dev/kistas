'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isLaunchArchiveExpired } from '@kistas/shared';
import { listLocalLaunches } from '@/lib/launch-archive';
import { ShinyButton } from './ui/shiny-button';

interface ArchiveItem { id: string; title: string; updatedAt: string; sourceListingId: string | null; localOnly?: boolean }
export function LaunchArchiveClient({ userId }: { userId: string }) {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [status, setStatus] = useState('Arşiv açılıyor…');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      try { listLocalLaunches(userId); } catch { /* Storage access is reported by the archive loader. */ }
      setItems(previous => previous.filter(item => !isLaunchArchiveExpired(item.updatedAt)));
    }, 60000);
    return () => clearInterval(timer);
  }, [userId]);
  useEffect(() => {
    let active = true;
    let local: ArchiveItem[] = [];
    try { local = listLocalLaunches(userId).map(draft => ({ id: draft.id, title: draft.payload.title,
      updatedAt: draft.updatedAt, sourceListingId: draft.sourceListingId, localOnly: draft.dirty })); }
    catch { setStatus('Cihaz arşivine erişilemiyor.'); }
    setItems(local);
    void fetch('/api/launch-drafts', { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(async response => {
      if (!response.ok) throw new Error('ARCHIVE_UNAVAILABLE');
      const result = await response.json();
      if (!active) return;
      const merged = new Map<string, ArchiveItem>();
      for (const row of result.items) merged.set(row.id, { id: row.id, title: row.title || '', updatedAt: row.updated_at, sourceListingId: row.source_listing_id });
      for (const item of local) if (item.localOnly || !merged.has(item.id)) merged.set(item.id, item);
      setItems([...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setNextOffset(result.nextOffset); setStatus('Taslaklar son düzenlemeden 72 saat sonra silinir. Düzenlemeye devam ettiğinde süre yenilenir.');
    }).catch(() => { if (active) setStatus('Hesap arşivine ulaşılamadı. Bu cihazda saklanan lansmanlar gösteriliyor.'); });
    return () => { active = false; };
  }, [userId]);
  const loadMore = async () => {
    if (loading || nextOffset === null) return; setLoading(true);
    try {
      const response = await fetch(`/api/launch-drafts?offset=${nextOffset}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('ARCHIVE_UNAVAILABLE');
      const result = await response.json();
      setItems(previous => {
        const existing = new Set(previous.map(item => item.id));
        return [...previous, ...result.items.filter((row: { id: string }) => !existing.has(row.id)).map((row: { id: string; title: string; updated_at: string; source_listing_id: string | null }) => ({
          id: row.id, title: row.title || '', updatedAt: row.updated_at, sourceListingId: row.source_listing_id,
        }))];
      }); setNextOffset(result.nextOffset);
    } catch { setStatus('Diğer kayıtlar yüklenemedi. Tekrar deneyebilirsin.'); }
    finally { setLoading(false); }
  };
  return <main className="mx-auto max-w-3xl px-4 py-10">
    <h1 className="text-2xl font-bold">Lansman Arşivim</h1>
    <p role="status" className="mt-3 text-sm text-slate-300">{status}</p>
    <div className="my-6 flex gap-4"><Link href="/create-listing" className="text-blue-300">Yeni lansman</Link><Link href="/profile">Profilime dön</Link></div>
    <div className="space-y-3">{items.map(item => <Link key={item.id} href={`/create-listing?archive=${item.id}${item.sourceListingId ? `&edit=${item.sourceListingId}` : ''}`}
      className="block rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="font-semibold">{item.title || 'İsimsiz lansman'}</p>
      <p className="mt-1 text-xs text-slate-400">{item.localOnly ? 'Cihazda · hesaba eşitlenmeyi bekliyor' : 'Devam et'}</p>
    </Link>)}</div>
    {nextOffset !== null && <ShinyButton className="mt-6" disabled={loading} onClick={() => void loadMore()}>Daha fazla</ShinyButton>}
  </main>;
}
