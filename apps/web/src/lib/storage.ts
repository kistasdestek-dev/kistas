import { createClient } from './supabase/browser';

type ImageFolder = 'logos' | 'vitrin';

const MAX_DIMENSION: Record<ImageFolder, number> = {
  logos: 512,
  vitrin: 1280,
};

/**
 * Calculates contained aspect-ratio bounding box
 */
function calculateContainedSize(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Mobile-friendly and responsive client-side image compression
 */
export async function optimizeUploadImage(file: File, folder: ImageFolder): Promise<File> {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || file.type === 'image/gif') {
    return file;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = document.createElement('img');
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Görsel tarayıcıda işlenemedi.'));
      element.src = objectUrl;
    });

    const target = calculateContainedSize(image.naturalWidth, image.naturalHeight, MAX_DIMENSION[folder]);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, target.width, target.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', folder === 'vitrin' ? 0.78 : 0.84);
    });

    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || folder;
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Universal browser file picker (safe for iOS Safari, Android and Desktop)
 */
export async function pickImageFiles(multiple = false): Promise<File[] | null> {
  if (typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/png,image/jpeg,image/jpg,image/webp';
    if (multiple) {
      input.multiple = true;
    }

    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.pointerEvents = 'none';
    input.setAttribute('tabindex', '-1');

    let isHandled = false;

    const cleanup = () => {
      try {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      } catch {}
    };

    input.onchange = () => {
      if (isHandled) return;
      isHandled = true;
      if (input.files && input.files.length > 0) {
        resolve(Array.from(input.files));
      } else {
        resolve(null);
      }
      cleanup();
    };

    input.oncancel = () => {
      setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          resolve(null);
          cleanup();
        }
      }, 500);
    };

    document.body.appendChild(input);
    input.click();
  });
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Direct upload to Supabase Storage 'kistas' bucket with client-side optimization
 */
export async function uploadToStorage(
  file: File,
  folder: ImageFolder = 'vitrin'
): Promise<UploadResult> {
  try {
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Görsel boyutu en fazla 10 MB olabilir.' };
    }

    const uploadFile = await optimizeUploadImage(file, folder);

    const rawExt = uploadFile.name.split('.').pop()?.toLowerCase() || 'webp';
    const cleanExt = ['png', 'jpg', 'jpeg', 'webp'].includes(rawExt) ? rawExt : 'webp';

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Görsel yüklemek için giriş yapın.' };
    const fileKey = `${folder}/${user.id}/${crypto.randomUUID()}.${cleanExt}`;

    const { data: uploadData, error: sbError } = await supabase.storage
      .from('kistas')
      .upload(fileKey, uploadFile, {
        contentType: uploadFile.type || `image/${cleanExt}`,
        cacheControl: '31536000',
        upsert: false,
      });

    if (sbError || !uploadData) {
      throw new Error(sbError?.message || 'Depolama yüklemesi başarısız oldu.');
    }

    const { data: publicData } = supabase.storage
      .from('kistas')
      .getPublicUrl(fileKey);

    return {
      success: true,
      url: publicData.publicUrl,
      key: fileKey,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Görsel yüklenirken bir hata oluştu.';
    return {
      success: false,
      error: message,
    };
  }
}
