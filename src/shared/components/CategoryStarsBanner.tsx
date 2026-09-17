import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { motion, AnimatePresence } from 'framer-motion';

export interface CategoryStarsPillProps {
  words?: string[];
  interval?: number;
  animationDuration?: number;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

/**
 * 21st.dev Container Text Flip - Kıstas Günün Vitrini Başlık Satırı Kapsülü
 * Arka planda leke yapan blur neon glow kaldırılmıştır.
 * Canlı degrade, iç ışık (shimmer), parantez köşeleri ve akıcı harf harf flip animasyonu sunar.
 */
export const CategoryStarsBanner: React.FC<CategoryStarsPillProps> = ({
  words = ['Kategorinin Yıldızları', 'Vitrinde Yerinizi Alın', 'Projenizi Parlatın', 'Kıstas Vitrini'],
  interval = 3500,
  animationDuration = 700,
  size = 'lg',
  onPress,
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
        setIsAnimating(false);
      }, animationDuration / 2);
    }, interval);

    return () => clearInterval(intervalId);
  }, [words, interval, animationDuration]);

  const currentWord = words[currentWordIndex];

  const dimensions = size === 'lg'
    ? { height: 44, padding: '0 24px', fontSize: 14.5, letterSpacing: '-0.3px', shadow: '0 4px 18px rgba(236, 72, 153, 0.38), 0 0 0 1px rgba(255, 255, 255, 0.4) inset' }
    : size === 'sm'
    ? { height: 30, padding: '0 12px', fontSize: 11, letterSpacing: '-0.1px', shadow: '0 2px 8px rgba(236, 72, 153, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.3) inset' }
    : { height: 36, padding: '0 16px', fontSize: 12.5, letterSpacing: '-0.2px', shadow: '0 3px 12px rgba(236, 72, 153, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.35) inset' };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Kredi Mağazası - Kategorinin Yıldızları"
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="kistas-text-flip-pill"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Main pill container */}
        <motion.div
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          animate={{
            scale: isAnimating ? [1, 0.98, 1] : 1,
          }}
          transition={{
            duration: animationDuration / 1000,
            ease: 'easeInOut',
            layout: { duration: 0.25 },
          }}
          style={{
            position: 'relative',
            height: dimensions.height,
            padding: dimensions.padding,
            boxSizing: 'border-box',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #f97316)',
            boxShadow: dimensions.shadow,
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Shimmer effect */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear',
              }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                width: '100%',
                height: '100%',
                transform: 'skewX(-20deg)',
              }}
            />
          </div>

          {/* Text content with enhanced animations */}
          <div style={{ position: 'relative', zIndex: 10, paddingLeft: 2, paddingRight: 2 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWord}
                initial={{
                  opacity: 0,
                  y: 10,
                  filter: 'blur(5px)',
                  scale: 0.94,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  filter: 'blur(5px)',
                  scale: 1.05,
                }}
                transition={{
                  duration: animationDuration / 1000,
                  ease: [0.25, 0.25, 0, 1],
                }}
                style={{
                  color: '#FFFFFF',
                  fontSize: dimensions.fontSize,
                  fontWeight: '700',
                  letterSpacing: dimensions.letterSpacing,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {currentWord.split('').map((letter, index) => (
                  <motion.span
                    key={`${currentWord}-${index}`}
                    initial={{
                      opacity: 0,
                      y: 6,
                      filter: 'blur(3px)',
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                    }}
                    transition={{
                      delay: index * 0.02,
                      duration: 0.28,
                      ease: 'easeOut',
                    }}
                    style={{ display: 'inline-block' }}
                  >
                    {letter === ' ' ? '\u00A0' : letter}
                  </motion.span>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </TouchableOpacity>
  );
};
