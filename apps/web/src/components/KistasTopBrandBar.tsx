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
        {/* Logo Plate */}
        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl border border-white/20 bg-white/[0.08] p-2 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-300 group-hover:scale-105 group-hover:border-[#3B82F6]/60 group-hover:shadow-[0_14px_32px_-4px_rgba(59,130,246,0.4)]">
          <Image
            src="/kistas-logo-transparent.png"
            alt="Kıstas Logosu"
            width={60}
            height={60}
            className="h-full w-full object-contain"
            priority
          />
        </div>

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
