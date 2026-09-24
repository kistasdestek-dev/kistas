'use client';

import React from 'react';
import Link from 'next/link';

export interface ShinyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  disabled?: boolean;
}

export function ShinyButton({ children, onClick, href, className = '', disabled = false }: ShinyButtonProps) {
  const content = <span>{children}</span>;

  if (href && !disabled) {
    return (
      <Link href={href} className={`shiny-cta ${className}`} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={`shiny-cta ${disabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      {content}
    </button>
  );
}
