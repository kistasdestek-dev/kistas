import React from 'react';
import Image from 'next/image';

interface KistasLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  glow?: boolean;
  className?: string;
}

export const KistasLogo: React.FC<KistasLogoProps> = ({
  size = 36,
  showWordmark = true,
  wordmarkColor = '#FFFFFF',
  glow = false,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative flex items-center justify-center transition-transform hover:scale-105 ${
          glow ? 'drop-shadow-[0_0_12px_rgba(50,105,199,0.25)]' : ''
        }`}
        style={{ width: size, height: size }}
      >
        <Image
          src="/kistas-logo-256.webp"
          alt="Kıstas Logo"
          width={size}
          height={size}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      {showWordmark && (
        <span
          className="font-bold tracking-tight select-none"
          style={{
            color: wordmarkColor,
            fontSize: Math.round(size * 0.76),
            lineHeight: `${Math.round(size * 0.9)}px`,
            letterSpacing: '-0.6px',
          }}
        >
          Kıstas
        </span>
      )}
    </div>
  );
};
