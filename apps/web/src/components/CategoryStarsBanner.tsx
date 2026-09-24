'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface CategoryStarsBannerProps {
  words?: string[];
  interval?: number;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
}

export const CategoryStarsBanner: React.FC<CategoryStarsBannerProps> = ({
  words = ['Yıldız Projeler', 'Vitrinde Yer Al', 'Projeni Parlat', 'Kıstas Vitrini'],
  interval = 3200,
  href = '/create-listing',
  onClick,
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!words || words.length <= 1) return;
    const intervalId = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        setIsFlipping(false);
      }, 300);
    }, interval);

    return () => clearInterval(intervalId);
  }, [words, interval]);

  const currentWord = words[currentWordIndex % words.length];

  const content = (
    <div
      className="group relative inline-flex w-[122px] items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-white/10 bg-gradient-to-r from-[#141C2E] via-[#0E1322] to-[#141C2E] px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:shadow-[0_6px_20px_rgba(59,130,246,0.25)] hover:-translate-y-0.5 cursor-pointer"
    >
      <span
        className={`text-xs font-bold text-white transition-all duration-300 ${
          isFlipping ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {currentWord}
      </span>
    </div>
  );

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return <Link href={href}>{content}</Link>;
};
