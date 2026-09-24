import React from 'react';

interface InstagramVerifiedBadgeProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Pixel-perfect Instagram Verified Badge (Meta Blue Rosette with crisp white checkmark)
 */
export const InstagramVerifiedBadge: React.FC<InstagramVerifiedBadgeProps> = ({
  size = 15,
  className = '',
  title = 'Kıstas Doğrulanmış Geliştirici',
}) => {
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center shrink-0 align-middle select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_1px_3px_rgba(0,149,246,0.35)]"
      >
        {/* Instagram / Meta 8-lobe scalloped rosette */}
        <path
          d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
          fill="#0095F6"
        />
        {/* Crisp White Checkmark */}
        <path
          d="M10.2 16.2L6.5 12.5l1.414-1.414L10.2 13.372l6.886-6.886L18.5 7.9 10.2 16.2z"
          fill="#FFFFFF"
        />
      </svg>
    </span>
  );
};

export default InstagramVerifiedBadge;
