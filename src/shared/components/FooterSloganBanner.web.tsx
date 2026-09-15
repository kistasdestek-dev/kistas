import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

interface FooterSloganBannerProps {
  text?: string;
  onPress?: () => void;
}

const STYLE_ID = 'kistas-bold-on-hover-styles';
const STYLES = `
.kistas-bold-hover-root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.kistas-bold-hover-root:hover {
  transform: translateY(-1px);
}

.kistas-bold-hover-char {
  display: inline-block;
  white-space: pre;
  transition: all 0.36s cubic-bezier(0.16, 1, 0.3, 1);
  font-variation-settings: 'wght' 400, 'slnt' 0;
  will-change: transform, font-weight, color;
  color: #25364E;
}

.kistas-bold-hover-root:hover .kistas-bold-hover-char,
.kistas-bold-hover-root.is-active .kistas-bold-hover-char {
  font-weight: 700;
  font-variation-settings: 'wght' 700, 'slnt' -8;
  color: #013196;
  transform: translateY(-3.5px) scale(1.05) skewX(-5deg);
  text-shadow: 0 4px 18px rgba(1, 49, 150, 0.15);
  transition-delay: var(--char-delay, 0s);
}

.kistas-bold-hover-root:not(:hover):not(.is-active) .kistas-bold-hover-char {
  transition-delay: var(--char-delay, 0s);
}
`;

export const FooterSloganBanner: React.FC<FooterSloganBannerProps> = ({
  text = 'Keşfedilmeye hazır mısın?',
  onPress,
}) => {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
  }, []);

  const bannerRef = useRef<HTMLDivElement>(null);

  const triggerMobileWave = useCallback(() => {
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, 1400);
  }, []);

  useEffect(() => {
    const node = bannerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined' || typeof window === 'undefined') return;

    // Yalnızca mobil veya dokunmatik cihazlarda görünür olunca 1 kez otomatik dalga
    const isTouchOrMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    if (!isTouchOrMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          triggerMobileWave();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [triggerMobileWave]);

  const chars = text.split('');

  return (
    <View style={styles.bannerContainer}>
      <div
        ref={bannerRef}
        className={`kistas-bold-hover-root ${isActive ? 'is-active' : ''}`}
        onClick={() => {
          triggerMobileWave();
          onPress?.();
        }}
        role="button"
        tabIndex={0}
        aria-label={text}
      >
        <span style={{ display: 'none' }}>{text}</span>
        {chars.map((char, index) => {
          const delay = `${(index * 0.024).toFixed(3)}s`;
          return (
            <span
              key={index}
              className="kistas-bold-hover-char"
              style={
                {
                  '--char-delay': delay,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 'clamp(26px, 4.4vw, 42px)',
                  lineHeight: '1.25',
                  letterSpacing: '-0.035em',
                  fontStyle: 'italic',
                } as React.CSSProperties
              }
              aria-hidden="true"
            >
              {char}
            </span>
          );
        })}
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
});
