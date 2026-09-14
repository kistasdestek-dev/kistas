import React from 'react';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { AppNavigationProps } from './navigationTypes';

export type { TabKey } from './navigationTypes';

const NativeAppNavigation: React.FC<AppNavigationProps> = (props) => (
  <MobileBottomNav {...props} />
);

export const AdaptiveAppNavigation = React.memo(NativeAppNavigation);
