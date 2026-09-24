'use client';

import React, { useState } from 'react';

export interface FooterSloganBannerProps {
  text?: string;
  onPress?: () => void;
}

export const FooterSloganBanner: React.FC<FooterSloganBannerProps> = ({
  text = 'Fikirler Kıstas ile Değerlenir',
  onPress,
}) => {
  const [isActive, setIsActive] = useState(false);
  const chars = text.split('');

  const triggerWave = () => {
    setIsActive(true);
    setTimeout(() => setIsActive(false), 1200);
    onPress?.();
  };

  return (
    <div className="relative mt-10 mb-2 flex items-center justify-center py-1 text-center select-none">
      <div
        onClick={triggerWave}
        role="button"
        tabIndex={0}
        aria-label={text}
        className="group inline-flex cursor-pointer items-center justify-center flex-wrap gap-x-0"
      >
        {chars.map((char, index) => {
          const delay = `${index * 25}ms`;
          return (
            <span
              key={index}
              style={{
                transitionDelay: delay,
              }}
              className={`inline-block text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight italic transition-all duration-300 ${
                isActive
                  ? 'text-[#3B82F6] -translate-y-2 scale-110'
                  : 'text-white group-hover:text-[#60A5FA] group-hover:-translate-y-1.5'
              }`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    </div>
  );
};
