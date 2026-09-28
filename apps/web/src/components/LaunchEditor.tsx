'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLaunchArchiveExpired, LAUNCH_ARCHIVE_RETENTION_MS, launchDraftPayloadSchema, type Category, type LaunchDraft, type LaunchDraftPayload } from '@kistas/shared';
import { CreateListingExperienceClient, type EditableListing } from './CreateListingExperienceClient';
import { clearLocalLaunchAssets, copyLocalLaunch, readLocalLaunch, removeLocalLaunch, resolveArchiveImage, saveLocalLaunch } from '@/lib/launch-archive';
import { ShinyButton } from './ui/shiny-button';

export async function resolveLaunchMedia(userId: string, id: string, payload: LaunchDraftPayload): Promise<LaunchDraftPayload> {
  const resolved = new Map<string, string>();
  for (const ref of new Set([payload.logoUrl, payload.coverUrl, ...payload.screenshots])) {
    resolved.set(ref, await resolveArchiveImage(userId, id, ref));
  }
  return { ...payload, logoUrl: resolved.get(payload.logoUrl) || '', coverUrl: resolved.get(payload.coverUrl) || '',
    screenshots: payload.screenshots.map(ref => resolved.get(ref) || '') };
}

export function LaunchEditor({ userId, categories, initialListing, archiveId }: {
  userId: string; categories: Category[]; initialListing: EditableListing | null; archiveId: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<LaunchDraft | null>(null);
  const [status, setStatus] = useState('Arşiv açılıyor…');
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const current = useRef<LaunchDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const waiters = useRef<Array<() => void>>([]);
  const stopped = useRef(false);
  const paused = useRef(false);
  const completed = useRef(false);
  const localAvailable = useRef(true);

  const expire = useCallback(() => {
    completed.current = true;
    if (timer.current) clearTimeout(timer.current);
    if (current.current) {
      try { removeLocalLaunch(userId, current.current.id); } catch { /* Retry local pruning on the next archive read. */ }
      void clearLocalLaunchAssets(userId, current.current.id).catch(() => {});
    }
    current.current = null;
    setExpired(true);
  }, [userId]);

  const armExpiry = useCallback(() => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const value = current.current;
    if (!value || completed.current) return;
    if (isLaunchArchiveExpired(value.updatedAt)) { expire(); return; }
    expiryTimer.current = setTimeout(expire, Date.parse(value.updatedAt) + LAUNCH_ARCHIVE_RETENTION_MS - Date.now());
  }, [expire]);

  const synchronize = useCallback(async () => {
    if (busy.current) { await new Promise<void>(resolve => waiters.current.push(resolve)); return; }
    if (stopped.current || paused.current || completed.current || !current.current?.dirty) return;
    if (isLaunchArchiveExpired(current.current.updatedAt)) { expire(); return; }
    if (!navigator.onLine) {
      setStatus(localAvailable.current ? 'Cihaz arşivinde · bağlantı gelince hesabına kaydedilecek'
        : 'Çevrimdışısın ve cihaz kaydı yapılamadı. Bu sayfayı kapatmadan bağlantını ve cihaz depolamasını kontrol et.');
      return;
    }
    busy.current = true;
    try {
      while (current.current?.dirty && !stopped.current && !completed.current) {
        const snapshot = current.current;
        const payload = await resolveLaunchMedia(userId, snapshot.id, snapshot.payload);
        const response = await fetch('/api/launch-drafts', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: snapshot.id, revision: snapshot.revision, sourceListingId: snapshot.sourceListingId, sourceListingRevision: snapshot.listingRevision, payload }) });
        if (response.status === 409 || response.status === 410) {
          paused.current = true;
          setConflicted(true);
          setStatus(response.status === 410
            ? 'Hesap arşivinin süresi dolmuş. Cihazdaki yeni değişiklikler korundu; yeni lansman olarak devam edebilirsin.'
            : 'Başka bir sekmede değişiklik var. Bu cihazdaki arşiv korundu; göndermeden önce arşivi yeniden açın.');
          return;
        }
        if (!response.ok) throw new Error('SYNC_FAILED');
        const result = await response.json() as { revision: number; updatedAt: string };
        if (!Number.isSafeInteger(result.revision) || !Number.isFinite(Date.parse(result.updatedAt))) throw new Error('SYNC_FAILED');
        const latest: LaunchDraft | null = current.current;
        if (!latest || completed.current) return;
        const next: LaunchDraft = { ...latest, revision: result.revision, dirty: JSON.stringify(latest.payload) !== JSON.stringify(snapshot.payload) };
        if (!next.dirty) next.updatedAt = result.updatedAt;
        current.current = next;
        armExpiry();
        try { saveLocalLaunch(next); localAvailable.current = true; } catch { localAvailable.current = false; }
        setStatus(next.dirty ? 'Hesaba kaydediliyor…' : localAvailable.current
          ? 'Cihaz ve hesap arşivinde kaydedildi' : 'Hesap arşivinde kaydedildi · cihaz depolaması dolu veya kapalı');
      }
    } catch {
      setStatus(localAvailable.current
        ? 'Cihaz arşivinde · hesap kaydı tamamlanamadı. Bağlantı geldiğinde veya düzenlemeye devam ettiğinde tekrar denenecek.'
        : 'Cihaz ve hesap kaydı tamamlanamadı. Bu sayfayı kapatmadan bağlantınızı ve cihaz depolamasını kontrol edin.');
    } finally { busy.current = false; const ready = waiters.current.splice(0); ready.forEach(resolve => resolve()); }
  }, [armExpiry, expire, userId]);

  useEffect(() => {
    stopped.current = false; let cancelled = false;
    const onOnline = () => void synchronize();
    window.addEventListener('online', onOnline);
    void (async () => {
      const url = new URL(window.location.href);
      const requestedId = archiveId || url.searchParams.get('archive');
      const id = requestedId || crypto.randomUUID();
      url.searchParams.set('archive', id); window.history.replaceState(null, '', url);
      let local: LaunchDraft | null = null;
      try { local = readLocalLaunch(userId, id); } catch { setStatus('Cihaz arşivine erişilemiyor.'); }
      const initialPayload: LaunchDraftPayload = {
        title: initialListing?.title || '', tagline: initialListing?.tagline || '', description: initialListing?.description || '',
        categoryId: initialListing?.categoryId || categories[0]?.id || '', pricingModel: 'freemium',
        platforms: ['iOS'], logoUrl: initialListing?.logoUrl || '', coverUrl: initialListing?.coverUrl || '',
        screenshots: initialListing?.screenshots || [], appStoreUrl: initialListing?.appStoreUrl || '',
        playStoreUrl: initialListing?.playStoreUrl || '', webUrl: initialListing?.webUrl || '',
      };
      if (initialListing && ['free','freemium','subscription','paid'].includes(initialListing.pricingModel)) {
        initialPayload.pricingModel = initialListing.pricingModel as LaunchDraftPayload['pricingModel'];
      }
      if (initialListing?.platforms.length) initialPayload.platforms = initialListing.platforms as LaunchDraftPayload['platforms'];
      let selected: LaunchDraft = local || { id, userId, sourceListingId: initialListing?.id || null, payload: initialPayload,
        revision: 0, listingRevision: initialListing?.revision ?? null, updatedAt: new Date().toISOString(), dirty: false };
      try {
        const response = await fetch(`/api/launch-drafts?id=${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const remote = await response.json();
          const payload = launchDraftPayloadSchema.parse(remote.payload);
          if (remote.state === 'submitted') {
            let hasUnsavedChanges = Boolean(local?.dirty);
            if (local?.dirty) {
              try { hasUnsavedChanges = JSON.stringify(await resolveLaunchMedia(userId, id, local.payload)) !== JSON.stringify(payload); }
              catch { /* Unresolved local files must remain recoverable. */ }
            }
            if (hasUnsavedChanges) {
              paused.current = true;
              setConflicted(true);
              setStatus('Bu arşiv başka bir cihazdan gönderilmiş. Cihazdaki yeni değişiklikler korundu; yeni bir lansman olarak devam edebilirsiniz.');
            } else {
              try { removeLocalLaunch(userId, id); } catch { /* Submission is already confirmed by the server. */ }
              void clearLocalLaunchAssets(userId, id).catch(() => {});
              if (!cancelled) setSubmitted(true); return;
            }
          }
          if (!paused.current && !local?.dirty) selected = { ...selected, payload, revision: remote.revision,
            sourceListingId: remote.source_listing_id, listingRevision: remote.source_listing_revision, updatedAt: remote.updated_at, dirty: false };
          else if (!paused.current && local && local.revision !== remote.revision) {
            let same = false;
            try { same = JSON.stringify(await resolveLaunchMedia(userId, id, local.payload)) === JSON.stringify(payload); } catch { /* Keep unresolved local files. */ }
            if (same) {
              selected = { ...local, revision: remote.revision, updatedAt: remote.updated_at, dirty: false };
              try { saveLocalLaunch(selected); } catch { /* The server copy has already been confirmed. */ }
            } else {
              paused.current = true;
              setConflicted(true);
              setStatus('Hesap arşivi başka bir sekmede değişmiş. Cihazdaki kopya korunuyor; yeni bir lansman olarak devam edebilirsiniz.');
            }
          }
        } else if (response.status === 410 && local?.dirty) {
          paused.current = true;
          setConflicted(true);
          setStatus('Hesap arşivinin süresi dolmuş. Cihazdaki yeni değişiklikler korundu; yeni lansman olarak devam edebilirsin.');
        } else if (response.status === 410 || (response.status === 404 && requestedId && (!local || (local.revision > 0 && !local.dirty)))) {
          if (!cancelled) { current.current = selected; expire(); } return;
        } else if (response.status !== 404) throw new Error('ARCHIVE_UNAVAILABLE');
      } catch {
        if (!cancelled) setStatus(local
          ? 'Hesap arşivine ulaşılamadı; cihazdaki kayıtla devam ediliyor.'
          : 'Hesap arşivine ulaşılamadı. Bağlantınızı kontrol edip sayfayı yeniden açın.');
        if (requestedId && !local) return;
      }
      if (cancelled) return;
      current.current = selected; setDraft(selected);
      armExpiry();
      if (!paused.current) setStatus(local ? 'Cihaz arşivinden geri yüklendi' : 'Değişikliklerin arşive kaydedilecek');
      void synchronize();
    })();
    return () => { cancelled = true; stopped.current = true; window.removeEventListener('online', onOnline); if (timer.current) clearTimeout(timer.current); if (expiryTimer.current) clearTimeout(expiryTimer.current); };
  }, [archiveId, armExpiry, categories, expire, initialListing, synchronize, userId]);

  const onChange = useCallback((payload: LaunchDraftPayload) => {
    const previous = current.current;
    if (!previous || completed.current || JSON.stringify(previous.payload) === JSON.stringify(payload)) return;
    if (isLaunchArchiveExpired(previous.updatedAt)) { expire(); return; }
    const next = { ...previous, payload, dirty: true, updatedAt: new Date().toISOString() };
    current.current = next;
    armExpiry();
    try {
      saveLocalLaunch(next); localAvailable.current = true;
      if (!paused.current) setStatus('Cihaz arşivinde kaydedildi · hesaba eşitleniyor…');
    } catch {
      localAvailable.current = false;
      setStatus('Cihaz depolaması dolu veya kapalı: hesap kaydı tamamlanana kadar bu sayfayı kapatmayın.');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void synchronize(), 800);
  }, [armExpiry, expire, synchronize]);

  const prepare = useCallback(async (payload: LaunchDraftPayload) => {
    if (paused.current) throw new Error('Arşiv başka bir yerde değişti. Cihaz kopyanız korunuyor; güncel arşivi açıp karşılaştırın.');
    if (timer.current) clearTimeout(timer.current);
    onChange(payload);
    await synchronize();
    // A still-running autosave must finish before submitting this archive.
    if (busy.current || current.current?.dirty || !current.current?.revision) throw new Error('Arşiv henüz hesaba kaydedilemedi. Veriler cihazda korunuyor; bağlantınızı kontrol edip tekrar deneyin.');
    return resolveLaunchMedia(userId, current.current.id, payload);
  }, [onChange, synchronize, userId]);

  const onSubmitted = useCallback(() => {
    completed.current = true;
    if (timer.current) clearTimeout(timer.current);
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (current.current) {
      try { removeLocalLaunch(userId, current.current.id); } catch { /* Never report a committed launch as failed because device cleanup failed. */ }
      void clearLocalLaunchAssets(userId, current.current.id).catch(() => {});
    }
  }, [userId]);

  const fork = async () => {
    if (!current.current) return;
    try {
      const id = await copyLocalLaunch(current.current);
      router.push(`/create-listing?archive=${id}`);
    } catch { setStatus('Yeni kopya cihaz arşivine kaydedilemedi. Mevcut arşiv korunuyor.'); }
  };

  if (expired) return <div className="mx-auto max-w-3xl px-4 py-12"><p role="status">Arşiv bulunamadı veya son düzenlemeden itibaren 72 saatlik saklama süresi doldu.</p><Link href="/create-listing">Yeni lansman oluştur</Link></div>;
  if (submitted) return <div className="mx-auto max-w-3xl px-4 py-12"><p>Lansman gönderilmiş. Hesabındaki projelerden kontrol edebilirsin.</p><Link href="/profile">Profilime dön</Link></div>;
  if (!draft) return <p role="status" className="px-4 py-12">{status}</p>;
  return <>{conflicted && <div className="mx-auto max-w-6xl px-4 pt-6"><ShinyButton onClick={() => void fork()}>Bu kopyayı yeni lansman olarak aç</ShinyButton></div>}
    <CreateListingExperienceClient key={draft.id} categories={categories} initialListing={initialListing}
    initialValues={draft.payload} archiveId={draft.id} userId={userId} archiveStatus={status}
    expectedRevision={draft.listingRevision} onDraftChange={onChange} prepareSubmission={prepare} onSubmitted={onSubmitted} /></>;
}
