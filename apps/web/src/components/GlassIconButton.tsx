'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';

interface GlassIconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  as?: 'button' | 'div' | 'span';
  variant?: 'default' | 'bare';
  size?: number;
  iconSize?: number;
  iconColor?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: number | string;
  title?: string;
  ariaLabel?: string;
  className?: string;
  animation?: 'pop' | 'spin' | 'pulse' | 'nudge';
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  icon: Icon,
  onClick,
  as,
  variant = 'default',
  size = 42,
  iconSize = 18,
  iconColor = '#3269C7',
  active = false,
  disabled = false,
  badge,
  title,
  ariaLabel,
  className = '',
  animation = 'pop',
}) => {
  const iconControls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();
  // Eğer explicitly 'as' belirtilmemişse: onClick varsa 'button', yoksa (dekoratif/ikon tablası) 'div' olarak render et
  // Böylece başka bir <button> veya <Link> içine konulduğunda nested button hatası vermez.
  const Component = as || (onClick ? 'button' : 'div');
  const surfaceClasses = variant === 'bare'
    ? 'border-transparent bg-transparent shadow-none hover:opacity-75'
    : active
      ? 'bg-gradient-to-b from-[#EEF5FF] to-[#DFEDFF] shadow-[0_4px_14px_rgba(50,105,199,0.28)] border-[#3269C7]/35 scale-95'
      : 'bg-gradient-to-b from-[#FFFFFF] to-[#EEF5FF] shadow-[0_4px_18px_rgba(50,105,199,0.20),0_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_24px_rgba(50,105,199,0.38)] hover:border-[#3269C7]/45 hover:-translate-y-0.5';

  const sharedProps = {
    title,
    'aria-label': ariaLabel || title,
    style: { width: size, height: size },
    className: `relative inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${variant === 'bare' ? 'backdrop-blur-none' : 'backdrop-blur-xl'} border ${surfaceClasses} ${variant === 'default' ? 'border-[#3269C7]/25' : ''} active:scale-95 ${
      disabled ? 'opacity-50 pointer-events-none' : ''
    } ${className}`,
  };

  const handleClick = () => {
    if (disabled) return;
    if (!shouldReduceMotion) {
      const keyframes = animation === 'spin'
        ? { rotate: [0, -18, 360], scale: [1, 0.88, 1] }
        : animation === 'pulse'
          ? { scale: [1, 1.28, 0.92, 1] }
          : animation === 'nudge'
            ? { x: [0, 5, -2, 0], scale: [1, 0.92, 1] }
            : { scale: [1, 0.72, 1.18, 1], rotate: [0, -8, 5, 0] };
      void iconControls.start({
        ...keyframes,
        transition: { duration: animation === 'spin' ? 0.48 : 0.32, ease: 'easeOut' },
      });
    }
    onClick?.();
  };

  const innerContent = (
    <>
      <motion.span animate={iconControls} className="inline-flex items-center justify-center">
        <Icon size={iconSize} color={iconColor} />
      </motion.span>
      {badge !== undefined && badge !== null && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3269C7] px-1 text-[10px] font-bold text-white shadow-sm border border-white">
          {badge}
        </span>
      )}
    </>
  );

  if (Component === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        {...sharedProps}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div {...sharedProps} role={onClick ? 'button' : undefined} onClick={onClick ? handleClick : undefined}>
      {innerContent}
    </div>
  );
};
