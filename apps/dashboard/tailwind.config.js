/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DoAi.Me Brand Colors
        doai: {
          yellow: {
            50: '#FFFEF0',
            100: '#FFFACC',
            200: '#FFF599',
            300: '#FFED66',
            400: '#FFE033',
            500: '#FFCC00',   // Primary DoAi-Yellow
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
            900: '#111111',   // Primary DoAi-Black (Void)
            950: '#0A0A0A',
          }
        },
        // Semantic Colors
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Status Colors
        status: {
          online: '#22C55E',
          offline: '#EF4444',
          busy: '#F59E0B',
          idle: '#6B7280',
        },
        // Activity Colors
        activity: {
          mining: '#8B5CF6',
          surfing: '#06B6D4',
          response: '#EF4444',
          labor: '#F59E0B',
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
        },
        // Void Colors (for dark backgrounds)
        void: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#999999',
          400: '#666666',
          500: '#444444',
          600: '#333333',
          700: '#222222',
          800: '#1A1A1A',
          900: '#111111',
          950: '#0A0A0A',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'Pretendard', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 204, 0, 0.3)',
        'glow-strong': '0 0 30px rgba(255, 204, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'accident-flash': 'flash 0.5s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'fade-hold': 'fadeHold 8s ease-in-out forwards',
        'type-pulse': 'typePulse 0.8s ease-in-out infinite',
        'presence-signal': 'presenceSignal 2s ease-in-out infinite',
      },
      keyframes: {
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        fadeHold: {
          '0%': { opacity: '0.6' },
          '30%': { opacity: '0.08' },
          '100%': { opacity: '0.08' },
        },
        typePulse: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        presenceSignal: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.3' },
          '50%': { transform: 'scale(1.02)', opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

