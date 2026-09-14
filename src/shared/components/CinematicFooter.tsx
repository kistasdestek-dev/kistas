import React from 'react';

export interface CinematicFooterProps {
  compact?: boolean;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

export const CinematicFooter: React.FC<CinematicFooterProps> = () => null;
