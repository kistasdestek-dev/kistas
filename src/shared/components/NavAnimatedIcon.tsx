import React from 'react';
import { TabKey } from '../navigation/navigationTypes';

interface NavAnimatedIconProps {
  name: TabKey;
  isActive: boolean;
  color?: string;
  size?: number;
}

export const NavAnimatedIcon: React.FC<NavAnimatedIconProps> = ({
  name,
  isActive,
  color = 'currentColor',
  size = 20,
}) => {
  switch (name) {
    case 'discover':
      // 21st.dev Animated Compass (Lucide standard)
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`k21-icon k21-compass${isActive ? ' is-active' : ''}`}
        >
          <circle cx="12" cy="12" r="10" />
          <polygon
            points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
            className="k21-compass-needle"
            fill={isActive ? color : 'none'}
            stroke={color}
          />
        </svg>
      );

    case 'browse':
      // 21st.dev Animated Search (Lucide standard)
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`k21-icon k21-browse${isActive ? ' is-active' : ''}`}
        >
          <circle
            cx="11"
            cy="11"
            r="8"
            fill={isActive ? color : 'none'}
            opacity={isActive ? 0.18 : 1}
            stroke={color}
          />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2.2" />
        </svg>
      );

    case 'credits':
      // 21st.dev Animated Sparkles (Lucide standard)
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`k21-icon k21-credits${isActive ? ' is-active' : ''}`}
        >
          <path
            d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
            className="k21-sparkle-star"
            fill={isActive ? color : 'none'}
            stroke={color}
          />
          <path d="M5 3v4M3 5h4" className="k21-sparkle-dot" stroke={color} strokeWidth="1.8" />
        </svg>
      );

    case 'profile':
      // 21st.dev Animated User (Lucide standard)
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`k21-icon k21-profile${isActive ? ' is-active' : ''}`}
        >
          <path
            d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
            className="k21-user-body"
            stroke={color}
            fill={isActive ? color : 'none'}
            opacity={isActive ? 0.18 : 1}
          />
          <circle
            cx="12"
            cy="7"
            r="4"
            className="k21-user-head"
            stroke={color}
            fill={isActive ? color : 'none'}
          />
        </svg>
      );

    case 'messages':
      // 21st.dev Animated Message Square (Lucide standard)
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`k21-icon k21-messages${isActive ? ' is-active' : ''}`}
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill={isActive ? color : 'none'}
            opacity={isActive ? 0.18 : 1}
            stroke={color}
          />
          <line x1="8" y1="10" x2="16" y2="10" stroke={color} className="k21-dot-1" />
          <line x1="8" y1="14" x2="12" y2="14" stroke={color} className="k21-dot-2" />
        </svg>
      );

    case 'create':
      // 21st.dev Animated Plus Circle (Lucide standard)
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`k21-icon k21-create${isActive ? ' is-active' : ''}`}
        >
          <circle cx="12" cy="12" r="10" stroke={color} />
          <line x1="12" y1="8" x2="12" y2="16" stroke={color} className="k21-create-plus" />
          <line x1="8" y1="12" x2="16" y2="12" stroke={color} className="k21-create-plus" />
        </svg>
      );

    default:
      return null;
  }
};
