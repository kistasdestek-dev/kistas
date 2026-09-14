type ImageFolder = 'logos' | 'vitrin' | 'avatars';

const MAX_DIMENSION: Record<ImageFolder, number> = {
  logos: 512,
  avatars: 512,
  vitrin: 1280,
};

export const calculateContainedSize = (width: number, height: number, maxDimension: number) => {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

export const optimizeUploadImage = async (file: File, folder: ImageFolder): Promise<File> => {
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
      canvas.toBlob(resolve, 'image/webp', folder === 'vitrin' ? 0.76 : 0.82);
    });
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || folder;
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
