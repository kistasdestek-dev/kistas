import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <div
      className={`k-card ${className}`}
      style={{
        width: '100%',
        minHeight: 500,
        height: 500,
        backgroundColor: 'rgba(0, 0, 0, 0.96)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
