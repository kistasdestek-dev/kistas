import type React from 'react';
import { View } from 'react-native';

export interface BorderBeamProps {
  children?: React.ReactNode;
  duration?: number;
  borderRadius?: number;
  colorVariant?: 'colorful' | 'kistas' | 'emerald' | 'gold';
  size?: 'line' | 'perimeter' | number;
  className?: string;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  squircle?: boolean;
}

export function BorderBeam({ children, borderRadius = 18 }: BorderBeamProps) {
  if (!children) return null;
  return <View style={{ position: 'relative', width: '100%', borderRadius }}>{children}</View>;
}

export default BorderBeam;
