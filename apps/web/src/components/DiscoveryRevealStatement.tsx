'use client';

import React from 'react';
import TextLoop from '@/components/ui/text-loop';

const ROTATING_TEXTS = ['keşfedilir.', 'desteklenir.', 'büyür.'];

export const DiscoveryRevealStatement: React.FC = () => {
  return (
    <section
      className="relative mx-auto my-7 flex w-fit max-w-[calc(100%-32px)] items-center py-1 font-sans"
      aria-label="Kıstas keşif mesajı"
    >

      <TextLoop
        staticText="Fikirler burada"
        rotatingTexts={ROTATING_TEXTS}
        interval={3000}
        className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white"
        staticTextClassName="text-white font-bold tracking-tight mr-2"
        rotatingTextClassName="font-extrabold tracking-tight bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-[#93C5FD] bg-clip-text text-transparent"
        backgroundClassName="bg-gradient-to-r from-transparent via-[#3B82F6]/15 to-[#3B82F6]/30 rounded-md"
        cursorClassName="bg-[#60A5FA] shadow-[0_0_8px_rgba(96,165,250,0.9)] w-[2.5px] sm:w-[3px] ml-1 rounded-full"
      />
    </section>
  );
};
