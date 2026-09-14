import React from 'react';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { AppNavigationProps } from './navigationTypes';

export type { TabKey } from './navigationTypes';

export const AdaptiveAppNavigation: React.FC<AppNavigationProps> = (props) => (
  <MobileBottomNav {...props} />
);
