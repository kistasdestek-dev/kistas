'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface KistasTopBrandBarProps {
  onPress?: () => void;
  tagline?: string;
  showTagline?: boolean;
  className?: string;
}

export const KistasTopBrandBar: React.FC<KistasTopBrandBarProps> = ({
  onPress,
  tagline = 'İyi fikirler görünür olmayı hak eder',
  showTagline = true,
  className = '',
}) => {
  const pathname = usePathname();

  const handlePress = (e: React.MouseEvent) => {
    if (onPress) {
      onPress();
    }

    if (pathname === '/') {
      e.preventDefault();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <div className={`relative z-10 mx-auto w-full max-w-[1320px] px-4 pt-6 pb-4 sm:px-6 sm:pb-5 ${className}`}>
      <Link
        href="/"
        onClick={handlePress}
        aria-label="Kıstas Ana Sayfası (Keşfet)"
        className="group inline-flex cursor-pointer items-center gap-4 select-none"
      >
        <Image
          src="/kistas-logo-256.webp"
          alt="Kıstas Logosu"
          width={80}
          height={80}
          className="h-16 w-16 object-contain drop-shadow-[0_0_12px_rgba(50,105,199,0.28)] transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20"
          priority
        />

        {/* Brand Meta Col */}
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white transition-colors group-hover:text-[#60A5FA]">
            Kıstas
          </h1>
          {showTagline && Boolean(tagline) && (
            <p className="text-xs sm:text-sm font-medium tracking-tight text-[#94A3B8]">
              {tagline}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
};
