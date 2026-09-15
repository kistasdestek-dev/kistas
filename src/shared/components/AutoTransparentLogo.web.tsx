import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl } from '../../core/media/imageDelivery';

// In-memory cache so each logo URL is processed only once across the whole app session
const transparentLogoCache = new Map<string, string>();

export interface AutoTransparentLogoProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  decoding?: 'async' | 'sync' | 'auto';
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}

/**
 * AutoTransparentLogo (Web)
 * Automatically detects if an uploaded logo has an opaque white or near-white background
 * (such as square margins or solid corners) and converts contiguous outer border pixels
 * to transparent alpha in an offscreen canvas.
 *
 * If the image is already transparent, it passes through untouched without any overhead.
 */
export const AutoTransparentLogo: React.FC<AutoTransparentLogoProps> = ({
  src,
  alt = '',
  className,
  style,
  draggable = false,
  decoding = 'async',
}) => {
  const deliveredSrc = getOptimizedImageUrl(src, 160) || src;
  const imageRef = useRef<HTMLImageElement>(null);
  const isSupabaseHosted = typeof src === 'string' && src.includes('supabase.co');
  const [shouldProcess, setShouldProcess] = useState(() => typeof IntersectionObserver === 'undefined');
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (!isSupabaseHosted) return deliveredSrc || src;
    return transparentLogoCache.get(src) || transparentLogoCache.get(deliveredSrc) || deliveredSrc;
  });

  useEffect(() => {
    if (shouldProcess || !isSupabaseHosted) return;
    const element = imageRef.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setShouldProcess(true);
      observer.disconnect();
    }, { rootMargin: '320px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldProcess, isSupabaseHosted]);

  useEffect(() => {
    if (!src) return;
    if (!isSupabaseHosted) {
      setCurrentSrc(deliveredSrc || src);
      return;
    }
    if (!shouldProcess) return;

    const cached = transparentLogoCache.get(src) || transparentLogoCache.get(deliveredSrc);
    if (cached) {
      if (cached !== currentSrc) {
        setCurrentSrc(cached);
      }
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;

          if (!naturalW || !naturalH) {
            transparentLogoCache.set(src, deliveredSrc);
            return;
          }

          // Keep canvas size optimized (max 256px) for instantaneous processing (< 2ms)
          const maxDim = 256;
          let w = naturalW;
          let h = naturalH;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.max(1, Math.round(w * ratio));
            h = Math.max(1, Math.round(h * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            transparentLogoCache.set(src, deliveredSrc);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Check 4 corner pixels
          const cornerIndices = [
            0,
            (w - 1) * 4,
            (h - 1) * w * 4,
            ((h - 1) * w + w - 1) * 4,
          ];

          // 1. If any corner is already transparent (alpha < 30), image already has a transparent background
          const hasTransparentCorner = cornerIndices.some((idx) => data[idx + 3] < 30);
          if (hasTransparentCorner) {
            transparentLogoCache.set(src, deliveredSrc);
            return;
          }

          // 2. Check if corners are light/white (r, g, b > 195)
          const isCornerLight = (idx: number) => {
            return data[idx] > 195 && data[idx + 1] > 195 && data[idx + 2] > 195;
          };

          const cornersAreLight = cornerIndices.filter(isCornerLight).length >= 3;
          if (!cornersAreLight) {
            // Image corners are not white/light (e.g. dark artwork), preserve as is
            transparentLogoCache.set(src, deliveredSrc);
            return;
          }

          // 3. BFS Flood Fill from all 4 boundaries for contiguous white/light pixels
          const visited = new Uint8Array(w * h);
          const queue: number[] = [];

          const isBgPixel = (x: number, y: number) => {
            const i = (y * w + x) * 4;
            return data[i] > 195 && data[i + 1] > 195 && data[i + 2] > 195;
          };

        // Seed outer boundaries
        for (let x = 0; x < w; x++) {
          if (isBgPixel(x, 0)) {
            queue.push(x, 0);
            visited[x] = 1;
          }
          const btmIdx = (h - 1) * w + x;
          if (isBgPixel(x, h - 1) && !visited[btmIdx]) {
            queue.push(x, h - 1);
            visited[btmIdx] = 1;
          }
        }
        for (let y = 0; y < h; y++) {
          const lftIdx = y * w;
          if (isBgPixel(0, y) && !visited[lftIdx]) {
            queue.push(0, y);
            visited[lftIdx] = 1;
          }
          const rgtIdx = y * w + (w - 1);
          if (isBgPixel(w - 1, y) && !visited[rgtIdx]) {
            queue.push(w - 1, y);
            visited[rgtIdx] = 1;
          }
        }

        let head = 0;
        while (head < queue.length) {
          const cx = queue[head++];
          const cy = queue[head++];
          const cidx = (cy * w + cx) * 4;
          data[cidx + 3] = 0; // Make background transparent!

          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1],
          ];

          for (let i = 0; i < 4; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const vidx = ny * w + nx;
              if (!visited[vidx] && isBgPixel(nx, ny)) {
                visited[vidx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');

        transparentLogoCache.set(src, transparentDataUrl);
        transparentLogoCache.set(deliveredSrc, transparentDataUrl);
        if (isMounted) {
          setCurrentSrc(transparentDataUrl);
        }
      } catch {
        transparentLogoCache.set(src, deliveredSrc);
        if (isMounted) {
          setCurrentSrc(deliveredSrc);
        }
      }
    };

    img.onerror = () => {
      if (img.src !== deliveredSrc) {
        img.src = deliveredSrc;
      } else {
        transparentLogoCache.set(src, deliveredSrc);
      }
    };
    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [src, deliveredSrc, isSupabaseHosted, shouldProcess]);

  return (
    <img
      ref={imageRef}
      src={currentSrc}
      alt={alt}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        objectFit: 'contain',
        ...style,
      }}
      draggable={draggable}
      decoding={decoding}
      loading="lazy"
      onError={() => {
        if (currentSrc !== src) {
          setCurrentSrc(src);
        }
      }}
    />
  );
};
