'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { isLaunchArchiveExpired } from '@kistas/shared';
import { listLocalLaunches, removeLocalLaunch, clearLocalLaunchAssets } from '@/lib/launch-archive';
import { ShinyButton } from './ui/shiny-button';
import { GlassIconButton } from './GlassIconButton';

interface ArchiveItem { id: string; title: string; updatedAt: string; sourceListingId: string | null; revision: number; localOnly?: boolean }
export function LaunchArchiveClient({ userId }: { userId: string }) {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [status, setStatus] = useState('Arşiv açılıyor…');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      try { listLocalLaunches(userId); } catch { /* Storage access is reported by the archive loader. */ }
      setItems(previous => previous.filter(item => !isLaunchArchiveExpired(item.updatedAt)));
    }, 60000);
    return () => clearInterval(timer);
  }, [userId]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    let local: ArchiveItem[] = [];
    try { local = listLocalLaunches(userId).map(draft => ({ id: draft.id, title: draft.payload.title,
      updatedAt: draft.updatedAt, sourceListingId: draft.sourceListingId, revision: draft.revision, localOnly: draft.dirty })); }
    catch { setStatus('Cihaz arşivine erişilemiyor.'); }
    setItems(local);
    void fetch('/api/launch-drafts', { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(async response => {
      if (!response.ok) throw new Error('ARCHIVE_UNAVAILABLE');
      const result = await response.json();
      if (!active) return;
      const merged = new Map<string, ArchiveItem>();
      for (const row of result.items) merged.set(row.id, { id: row.id, title: row.title || '', updatedAt: row.updated_at, sourceListingId: row.source_listing_id, revision: row.revision });
      for (const item of local) if (item.localOnly || !merged.has(item.id)) merged.set(item.id, item);
      setItems([...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setNextOffset(result.nextOffset); setStatus('Taslaklar son düzenlemeden 72 saat sonra silinir. Düzenlemeye devam ettiğinde süre yenilenir.');
    }).catch(() => { if (active) setStatus('Hesap arşivine ulaşılamadı. Bu cihazda saklanan lansmanlar gösteriliyor.'); })
      .finally(() => { if (active) setLoading(false); });
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
        return [...previous, ...result.items.filter((row: { id: string }) => !existing.has(row.id)).map((row: { id: string; title: string; updated_at: string; source_listing_id: string | null; revision: number }) => ({
          id: row.id, title: row.title || '', updatedAt: row.updated_at, sourceListingId: row.source_listing_id, revision: row.revision,
        }))];
      }); setNextOffset(result.nextOffset);
    } catch { setStatus('Diğer kayıtlar yüklenemedi. Tekrar deneyebilirsin.'); }
    finally { setLoading(false); }
  };
  const deleteItem = async (item: ArchiveItem) => {
    if (deleting || loading || !window.confirm(`“${item.title || 'İsimsiz lansman'}” arşivden silinsin mi? Bu işlem geri alınamaz; yayındaki projen silinmez.`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/launch-drafts?id=${item.id}&revision=${item.revision}`, {
        method: 'DELETE', signal: AbortSignal.timeout(10000),
      });
      if (response.status === 409) {
        setStatus('Bu taslak başka bir sekmede değişti veya gönderildi. Silmeden önce sayfayı yenileyin.');
        return;
      }
      if (!response.ok) throw new Error('DELETE_FAILED');
      await clearLocalLaunchAssets(userId, item.id);
      removeLocalLaunch(userId, item.id);
      setItems(previous => previous.filter(row => row.id !== item.id));
      // Offset pagination counts server rows; the removed row no longer occupies a slot.
      setNextOffset(previous => previous === null ? null : Math.max(0, previous - (item.revision > 0 ? 1 : 0)));
      setStatus('Lansman arşivden silindi.');
    } catch {
      setStatus('Silme tamamlanamadı. Cihazdaki kayıt korundu; tekrar deneyebilirsiniz.');
    } finally { setDeleting(false); }
  };
  return <main className="mx-auto max-w-3xl px-4 py-10">
    <h1 className="text-2xl font-bold">Lansman Arşivim</h1>
    <p role="status" className="mt-3 text-sm text-slate-300">{status}</p>
    <div className="my-6 flex gap-4"><Link href="/create-listing" className="text-blue-300">Yeni lansman</Link><Link href="/profile">Profilime dön</Link></div>
    <div className="space-y-3">{items.map(item => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <Link href={`/create-listing?archive=${item.id}${item.sourceListingId ? `&edit=${item.sourceListingId}` : ''}`} className="min-w-0 flex-1">
      <p className="font-semibold">{item.title || 'İsimsiz lansman'}</p>
      <p className="mt-1 text-xs text-slate-400">{item.localOnly ? 'Cihazda · hesaba eşitlenmeyi bekliyor' : 'Devam et'}</p>
      </Link>
      <GlassIconButton icon={Trash2} title={`${item.title || 'İsimsiz lansman'} arşivden sil`} disabled={deleting || loading} onClick={() => void deleteItem(item)} />
    </div>)}</div>
    {nextOffset !== null && <ShinyButton className="mt-6" disabled={loading || deleting} onClick={() => void loadMore()}>Daha fazla</ShinyButton>}
  </main>;
}
