import React from 'react';
import { Text } from 'react-native';

export interface DiaTextRevealProps {
  text: string[];
  fixedWidth?: boolean;
  repeat?: boolean;
  repeatDelay?: number;
  className?: string;
  charDelay?: number;
  holdDuration?: number;
}

export const DiaTextReveal: React.FC<DiaTextRevealProps> = ({ text }) => (
  <Text>{text[0] || ''}</Text>
);
