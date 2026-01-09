/**
 * DoAi.Me Dashboard - Design System Utilities
 * Helper functions for working with design tokens
 */

import { colors } from './tokens';
import type { ExistenceLevel, StatusType, ActivityType, ConnectionType } from '@/types/design-system';

// ==================== Existence Helpers ====================

/**
 * Get Tailwind color class for existence level
 */
export function getExistenceColorClass(level: ExistenceLevel): string {
  const colorMap: Record<ExistenceLevel, string> = {
    critical: 'bg-existence-critical',
    low: 'bg-existence-low',
    medium: 'bg-existence-medium',
    high: 'bg-existence-high',
    max: 'bg-existence-max',
  };
  return colorMap[level];
}

/**
 * Get hex color for existence level
 */
export function getExistenceColor(level: ExistenceLevel): string {
  return colors.existence[level];
}

/**
 * Get existence level from score (0-100)
 */
export function getExistenceLevelFromScore(score: number): ExistenceLevel {
  if (score <= 20) return 'critical';
  if (score <= 40) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'max';
}

// ==================== Status Helpers ====================

/**
 * Get Tailwind color class for status
 */
export function getStatusColorClass(status: StatusType): string {
  const colorMap: Record<StatusType, string> = {
    online: 'bg-status-online',
    offline: 'bg-status-offline',
    busy: 'bg-status-busy',
    idle: 'bg-status-idle',
    connecting: 'bg-doai-yellow-500',
  };
  return colorMap[status];
}

/**
 * Get hex color for status
 */
export function getStatusColor(status: StatusType): string {
  return colors.status[status];
}

// ==================== Activity Helpers ====================

/**
 * Get Tailwind color class for activity
 */
export function getActivityColorClass(activity: ActivityType): string {
  const colorMap: Record<ActivityType, string> = {
    mining: 'bg-activity-mining',
    surfing: 'bg-activity-surfing',
    response: 'bg-activity-response',
    labor: 'bg-activity-labor',
    idle: 'bg-gray-500',
  };
  return colorMap[activity];
}

/**
 * Get hex color for activity
 */
export function getActivityColor(activity: ActivityType): string {
  return colors.activity[activity];
}

// ==================== Connection Helpers ====================

/**
 * Get Tailwind color class for connection type
 */
export function getConnectionColorClass(connection: ConnectionType): string {
  const colorMap: Record<ConnectionType, string> = {
    usb: 'bg-connection-usb',
    wifi: 'bg-connection-wifi',
    lan: 'bg-connection-lan',
  };
  return colorMap[connection];
}

/**
 * Get hex color for connection type
 */
export function getConnectionColor(connection: ConnectionType): string {
  return colors.connection[connection];
}

// ==================== Generic Color Utils ====================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert hex color to RGBA string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
