/**
 * DoAi.Me Dashboard - Centralized Type Definitions
 * Design System Types for consistent component interfaces
 */

// ==================== Status & State Types ====================

/** Device connection status */
export type StatusType = 'online' | 'offline' | 'busy' | 'idle' | 'connecting';

/** Device activity type */
export type ActivityType = 'mining' | 'surfing' | 'response' | 'labor' | 'idle';

/** Device connection method */
export type ConnectionType = 'usb' | 'wifi' | 'lan';

/** Existence score level */
export type ExistenceLevel = 'critical' | 'low' | 'medium' | 'high' | 'max';

// ==================== Component Size & Variant Types ====================

/** Standard component sizes */
export type ComponentSize = 'sm' | 'md' | 'lg';

/** Button variants */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** Card variants */
export type CardVariant = 'default' | 'interactive' | 'selected';

/** Badge variants */
export type BadgeVariant = 'status' | 'activity' | 'connection' | 'count';

// ==================== Icon Mappings ====================

/** Activity icons */
export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  mining: '🎭',
  surfing: '🍿',
  response: '🔥',
  labor: '💰',
  idle: '💤',
};

/** Connection icons */
export const CONNECTION_ICONS: Record<ConnectionType, string> = {
  usb: '🔌',
  wifi: '📶',
  lan: '🔗',
};

// ==================== Existence Level Helpers ====================

/** Get existence level from score (0-100) */
export function getExistenceLevel(score: number): ExistenceLevel {
  if (score <= 20) return 'critical';
  if (score <= 40) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'max';
}

/** Existence level labels */
export const EXISTENCE_LABELS: Record<ExistenceLevel, string> = {
  critical: 'Critical',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
};
