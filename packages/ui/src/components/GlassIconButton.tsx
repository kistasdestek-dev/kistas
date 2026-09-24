import React from 'react';

export interface GlassIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

/**
 * Kıstas Standart GlassIconButton
 * Cam/beyaz yüzey, mavi ikon, ince mavi kenarlık ve yumuşak mavi gölge
 */
export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  children,
  size = 'md',
  active = false,
  className = '',
  style,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${sizeClasses[size]} ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400'
          : 'bg-white/90 dark:bg-slate-900/80 text-blue-500 dark:text-blue-400 border border-blue-400/30 hover:border-blue-400/60 hover:bg-white dark:hover:bg-slate-900 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20'
      } ${className}`}
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};
