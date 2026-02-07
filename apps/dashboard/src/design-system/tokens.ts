/**
 * DoAi.Me Dashboard - Design Tokens
 * Single source of truth for design values
 */

// ==================== Color Tokens ====================

export const colors = {
  // Brand Colors
  doai: {
    yellow: {
      50: '#FFFEF0',
      100: '#FFFACC',
      200: '#FFF599',
      300: '#FFED66',
      400: '#FFE033',
      500: '#FFCC00',  // Primary
      600: '#CCAD00',
      700: '#998500',
      800: '#665C00',
      900: '#333300',
    },
    black: {
      50: '#F5F5F5',
      100: '#E5E5E5',
      200: '#CCCCCC',
      300: '#999999',
      400: '#666666',
      500: '#444444',
      600: '#333333',
      700: '#222222',
      800: '#1A1A1A',
      900: '#111111',  // Primary (Void)
      950: '#0A0A0A',
    },
  },

  // Semantic Colors
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Status Colors
  status: {
    online: '#22C55E',
    offline: '#EF4444',
    busy: '#F59E0B',
    idle: '#6B7280',
    connecting: '#FFCC00',
  },

  // Activity Colors
  activity: {
    mining: '#8B5CF6',
    surfing: '#06B6D4',
    response: '#EF4444',
    labor: '#F59E0B',
    idle: '#6B7280',
  },

  // Existence Gradient
  existence: {
    critical: '#EF4444',
    low: '#F97316',
    medium: '#FFCC00',
    high: '#84CC16',
    max: '#22C55E',
  },

  // Connection Types
  connection: {
    usb: '#A855F7',
    wifi: '#06B6D4',
    lan: '#10B981',
  },

  // LSP (Listening Silent Presence) Colors
  lsp: {
    dormant: '#1a1a2e',
    listening: '#4a9eff',
    evaluating: '#7c3aed',
    resonating: '#f59e0b',
    silencing: '#f59e0b',
    responding: '#10b981',
    background: '#0a0a0f',
    textPrimary: '#e2e8f0',
    textSecondary: '#64748b',
  },
} as const;

// ==================== Typography Tokens ====================

export const fonts = {
  display: ['Space Grotesk', 'sans-serif'],
  body: ['Inter', 'Pretendard', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ==================== Spacing Tokens ====================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

// ==================== Shadow Tokens ====================

export const shadows = {
  glow: '0 0 20px rgba(255, 204, 0, 0.3)',
  glowStrong: '0 0 30px rgba(255, 204, 0, 0.5)',
  glowSubtle: '0 0 10px rgba(255, 204, 0, 0.15)',
} as const;

// ==================== Z-Index Scale ====================

export const zIndex = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  overlay: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
  nav: 1000,
} as const;

// ==================== Animation Tokens ====================

export const animations = {
  durations: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  easings: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ==================== Border Radius ====================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  default: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const;

// ==================== Combined Tokens Export ====================

export const tokens = {
  colors,
  fonts,
  fontWeights,
  spacing,
  shadows,
  zIndex,
  animations,
  borderRadius,
} as const;

export type Tokens = typeof tokens;
