import React from 'react';

export interface FooterSloganBannerProps {
  text?: string;
}

export const FooterSloganBanner: React.FC<FooterSloganBannerProps> = ({
  text = 'Fikirler Kıstas ile Değerlenir',
}) => {
  const chars = text.split('');

  return (
    <div className="relative mt-10 mb-2 flex w-full items-center justify-center py-1 text-center select-none">
      <div
        aria-label={text}
        className="group flex w-full max-w-full flex-wrap items-center justify-center gap-x-0 px-4 text-center"
      >
        {chars.map((char, index) => {
          const delay = `${index * 25}ms`;
          return (
            <span
              key={index}
              style={{
                transitionDelay: delay,
              }}
              className="inline-block text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight italic text-white transition-all duration-300 group-hover:text-[#60A5FA] group-hover:-translate-y-1.5"
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    </div>
  );
};
