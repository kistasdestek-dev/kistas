import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type CategoryFilterIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORY_FILTER_ICONS: Record<string, CategoryFilterIconName> = {
  'ai-ml': 'robot-outline',
  games: 'gamepad-variant-outline',
  productivity: 'lightning-bolt-outline',
  fintech: 'chart-line',
  social: 'account-group-outline',
  devtools: 'code-tags',
  saas: 'cloud-outline',
  design: 'palette-outline',

  'game-family': 'account-multiple-outline',
  'game-action': 'boxing-glove',
  'game-casual': 'party-popper',
  'game-puzzle': 'puzzle-outline',
  'game-card': 'cards-playing-outline',
  'game-word': 'alphabetical-variant',
  'game-adventure': 'compass-rose',
  'game-board': 'chess-knight',
  'game-music': 'music-circle-outline',
  'game-rpg': 'shield-sword-outline',
  'game-simulation': 'earth',
  'game-trivia': 'comment-question-outline',
  'game-sports': 'soccer',
  'game-strategy': 'chess-rook',
  'game-racing': 'racing-helmet',

  'app-shopping': 'shopping-outline',
  'app-magazines': 'newspaper-variant-outline',
  'app-education': 'school-outline',
  'app-entertainment': 'movie-open-outline',
  'app-finance': 'wallet-outline',
  'app-photo-video': 'camera-outline',
  'app-devtools': 'console-line',
  'app-design': 'vector-square',
  'app-news': 'bullhorn-outline',
  'app-weather': 'weather-partly-cloudy',
  'app-business': 'briefcase-outline',
  'app-books': 'book-open-page-variant-outline',
  'app-music': 'headphones',
  'app-navigation': 'navigation-variant-outline',
  'app-reference': 'bookshelf',
  'app-health-fitness': 'heart-pulse',
  'app-travel': 'airplane',
  'app-social': 'message-text-outline',
  'app-sports': 'trophy-outline',
  'app-utilities': 'toolbox-outline',
  'app-lifestyle': 'creation-outline',
  'app-food-drink': 'silverware-fork-knife',
  'app-productivity': 'format-list-checks',
};

export const getCategoryFilterIcon = (slug?: string): CategoryFilterIconName =>
  (slug && CATEGORY_FILTER_ICONS[slug]) || 'shape-outline';
