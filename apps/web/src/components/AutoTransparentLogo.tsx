'use client';

import React, { useState, useEffect, useRef } from 'react';

// In-memory cache so each logo URL is processed only once per browser session
const transparentLogoCache = new Map<string, string>();

export interface AutoTransparentLogoProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
}

/**
 * AutoTransparentLogo (Web)
 * Automatically detects if an uploaded logo has an opaque white or near-white background
 * and converts contiguous outer border pixels to transparent alpha in an offscreen canvas.
 * If the image is already transparent or non-Supabase, passes through untouched.
 */
export const AutoTransparentLogo: React.FC<AutoTransparentLogoProps> = ({
  src,
  alt = '',
  className = '',
  style,
  draggable = false,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const isSupabaseHosted = typeof src === 'string' && src.includes('supabase.co');
  const [shouldProcess, setShouldProcess] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (!isSupabaseHosted) return src;
    return transparentLogoCache.get(src) || src;
  });

  useEffect(() => {
    if (shouldProcess || !isSupabaseHosted) return;
    const element = imageRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldProcess(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldProcess(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldProcess, isSupabaseHosted]);

  useEffect(() => {
    if (!src) return;
    if (!isSupabaseHosted) {
      setCurrentSrc(src);
      return;
    }
    if (!shouldProcess) return;

    const cached = transparentLogoCache.get(src);
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
          transparentLogoCache.set(src, src);
          return;
        }

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
          transparentLogoCache.set(src, src);
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

        // 1. If any corner is already transparent, don't flood-fill
        const hasTransparentCorner = cornerIndices.some((idx) => data[idx + 3] < 30);
        if (hasTransparentCorner) {
          transparentLogoCache.set(src, src);
          return;
        }

        // 2. Check if corners are light/white (r, g, b > 195)
        const isCornerLight = (idx: number) =>
          data[idx] > 195 && data[idx + 1] > 195 && data[idx + 2] > 195;

        const cornersAreLight = cornerIndices.filter(isCornerLight).length >= 3;
        if (!cornersAreLight) {
          transparentLogoCache.set(src, src);
          return;
        }

        // 3. BFS Flood Fill from outer edges
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];

        const isBgPixel = (x: number, y: number) => {
          const i = (y * w + x) * 4;
          return data[i] > 195 && data[i + 1] > 195 && data[i + 2] > 195;
        };

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
          data[cidx + 3] = 0; // Transparent!

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
        if (isMounted) {
          setCurrentSrc(transparentDataUrl);
        }
      } catch {
        transparentLogoCache.set(src, src);
        if (isMounted) {
          setCurrentSrc(src);
        }
      }
    };

    img.onerror = () => {
      transparentLogoCache.set(src, src);
    };
    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [src, isSupabaseHosted, shouldProcess, currentSrc]);

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
      loading="lazy"
      decoding="async"
    />
  );
};
