/**
 * DoAi.Me Dashboard - Design System
 * Centralized exports for design tokens, types, and utilities
 */

// Design Tokens
export * from './tokens';

// Utility Functions
export * from './utils';

// Types (re-export from types directory)
export type {
  StatusType,
  ActivityType,
  ConnectionType,
  ExistenceLevel,
  ComponentSize,
  ButtonVariant,
  CardVariant,
  BadgeVariant,
} from '@/types/design-system';

export {
  ACTIVITY_ICONS,
  CONNECTION_ICONS,
  EXISTENCE_LABELS,
  getExistenceLevel,
} from '@/types/design-system';
