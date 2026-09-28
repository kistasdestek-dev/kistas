import { isLaunchArchiveExpired, launchDraftPayloadSchema, type LaunchDraft } from '@kistas/shared';
import { uploadToStorage, type UploadResult } from './storage';

const prefix = (userId: string) => `kistas:launch:${userId}:`;
export function saveLocalLaunch(draft: LaunchDraft) {
  localStorage.setItem(prefix(draft.userId) + draft.id, JSON.stringify(draft));
}
export function readLocalLaunch(userId: string, id: string): LaunchDraft | null {
  try {
    const raw = localStorage.getItem(prefix(userId) + id); if (!raw) return null;
    const draft = JSON.parse(raw) as LaunchDraft;
    if (isLaunchArchiveExpired(draft.updatedAt)) {
      removeLocalLaunch(userId, id);
      void clearLocalLaunchAssets(userId, id).catch(() => {});
      return null;
    }
    if (draft.id !== id || draft.userId !== userId || !Number.isSafeInteger(draft.revision)
      || !launchDraftPayloadSchema.safeParse(draft.payload).success) return null;
    return draft;
  } catch { return null; }
}
export function listLocalLaunches(userId: string): LaunchDraft[] {
  const drafts: LaunchDraft[] = [];
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
  for (const key of keys) {
    if (key?.startsWith(prefix(userId))) { const draft = readLocalLaunch(userId, key.slice(prefix(userId).length)); if (draft) drafts.push(draft); }
  }
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function removeLocalLaunch(userId: string, id: string) { localStorage.removeItem(prefix(userId) + id); }

interface PendingImage { file: File; folder: 'logos' | 'vitrin'; uploadedUrl?: string }
const openAssets = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('kistas-launch-assets', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('images');
  request.onerror = () => reject(new Error('Görsel cihaz arşivine kaydedilemedi.'));
  request.onsuccess = () => resolve(request.result);
});
async function asset<T>(key: string, mode: IDBTransactionMode, value?: PendingImage): Promise<T> {
  const database = await openAssets();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('images', mode); const store = transaction.objectStore('images');
      const request = value ? store.put(value, key) : store.get(key); let result: T;
      request.onsuccess = () => { result = request.result as T; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () => reject(new Error('Görsel cihaz arşivine kaydedilemedi.'));
    });
  } finally { database.close(); }
}
const assetKey = (userId: string, draftId: string, ref: string) => `${userId}:${draftId}:${ref}`;
export async function archiveImage(file: File, folder: 'logos' | 'vitrin', userId: string, draftId: string): Promise<UploadResult> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'PNG, JPEG veya WebP görsel seçin; en fazla 10 MB.' };
  }
  const ref = `draft-asset:${crypto.randomUUID()}`;
  await asset(assetKey(userId, draftId, ref), 'readwrite', { file, folder });
  // Durable file first: uploads can be interrupted without losing the selected image.
  return { success: true, url: ref };
}
export async function previewArchiveImage(userId: string, draftId: string, ref: string) {
  if (!ref.startsWith('draft-asset:')) return ref;
  const stored = await asset<PendingImage | undefined>(assetKey(userId, draftId, ref), 'readonly');
  return stored ? URL.createObjectURL(stored.file) : null;
}
export async function resolveArchiveImage(userId: string, draftId: string, ref: string): Promise<string> {
  if (!ref.startsWith('draft-asset:')) return ref;
  const key = assetKey(userId, draftId, ref);
  const stored = await asset<PendingImage | undefined>(key, 'readonly');
  if (!stored) throw new Error('Bu görsel henüz sunucuya yüklenmedi. Görseli seçtiğiniz cihazdan devam edin veya yeniden seçin.');
  if (stored.uploadedUrl) return stored.uploadedUrl;
  const result = await uploadToStorage(stored.file, stored.folder);
  if (!result.success || !result.url) throw new Error(result.error || 'Görsel yüklenemedi; cihaz arşivinde korunuyor.');
  await asset(key, 'readwrite', { ...stored, uploadedUrl: result.url });
  return result.url;
}

export async function copyLocalLaunch(draft: LaunchDraft): Promise<string> {
  const id = crypto.randomUUID();
  for (const ref of new Set([draft.payload.logoUrl, draft.payload.coverUrl, ...draft.payload.screenshots])) {
    if (!ref.startsWith('draft-asset:')) continue;
    const stored = await asset<PendingImage | undefined>(assetKey(draft.userId, draft.id, ref), 'readonly');
    if (stored) await asset(assetKey(draft.userId, id, ref), 'readwrite', stored);
  }
  saveLocalLaunch({ ...draft, id, sourceListingId: null, listingRevision: null, revision: 0, dirty: true, updatedAt: new Date().toISOString() });
  return id;
}

export async function clearLocalLaunchAssets(userId: string, draftId: string) {
  const database = await openAssets();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('images', 'readwrite');
      const cursor = transaction.objectStore('images').openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result; if (!entry) return;
        if (String(entry.key).startsWith(`${userId}:${draftId}:`)) entry.delete();
        entry.continue();
      };
      transaction.oncomplete = () => resolve(); transaction.onerror = transaction.onabort = () => reject(new Error('LOCAL_CLEANUP_FAILED'));
    });
  } finally { database.close(); }
}
