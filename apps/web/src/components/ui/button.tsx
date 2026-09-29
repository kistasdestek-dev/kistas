'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3269C7] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-white text-black hover:bg-white/90 shadow-sm',
        outline: 'border border-white/15 bg-white/5 text-white backdrop-blur-xl hover:bg-white/15 hover:border-white/25 shadow-sm',
        glass: 'border border-white/10 bg-[#091326]/70 text-slate-200 backdrop-blur-xl hover:bg-[#3269C7]/20 hover:text-white hover:border-[#3269C7]/40 shadow-md',
        citrus: 'border border-[#E4FD97]/30 bg-[#E4FD97]/10 text-[#E4FD97] hover:bg-[#E4FD97]/20 shadow-[0_0_20px_rgba(228,253,151,0.15)]',
        ghost: 'text-slate-300 hover:bg-white/10 hover:text-white',
        destructive: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-2xl px-6 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
