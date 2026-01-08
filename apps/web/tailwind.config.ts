import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // Market 페이지 Hive Grid용 커스텀 그리드
      gridTemplateColumns: {
        '15': 'repeat(15, minmax(0, 1fr))',
        '20': 'repeat(20, minmax(0, 1fr))',
        '25': 'repeat(25, minmax(0, 1fr))',
      },
      colors: {
        // shadcn/ui 시맨틱 컬러 (CSS 변수 기반)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        
        // DoAi Blue 포인트 컬러
        doai: {
          50: 'hsl(var(--doai-50))',
          100: 'hsl(var(--doai-100))',
          200: 'hsl(var(--doai-200))',
          300: 'hsl(var(--doai-300))',
          400: 'hsl(var(--doai-400))',
          500: 'hsl(var(--doai-500))',
          600: 'hsl(var(--doai-600))',
          700: 'hsl(var(--doai-700))',
        },
        
        // Signal/Status 컬러
        signal: {
          green: 'hsl(var(--signal-green))',
          amber: 'hsl(var(--signal-amber))',
          red: 'hsl(var(--signal-red))',
          blue: 'hsl(var(--signal-blue))',
        },
        
        // Umbra 컬러
        umbra: {
          DEFAULT: 'hsl(var(--umbra-primary))',
          light: 'hsl(var(--umbra-light))',
          dark: 'hsl(var(--umbra-dark))',
        },
        
        // Chart 컬러
        chart: {
          alpha: 'hsl(var(--chart-alpha))',
          beta: 'hsl(var(--chart-beta))',
          gamma: 'hsl(var(--chart-gamma))',
        },

        // Legacy 포인트 컬러 - Yellow (Direct mapping to blue)
        yellow: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },

        // 보조 컬러
        terminal: {
          DEFAULT: 'hsl(var(--signal-green))',
          dim: 'hsl(var(--signal-green) / 0.5)',
        },
        void: {
          DEFAULT: '#050505',
          50: '#0a0a0a',
          100: '#0f0f0f',
          200: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['var(--font-pretendard)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['var(--font-noto-serif-kr)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'Menlo', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        // shadcn/ui 애니메이션
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        // DoAi.Me 커스텀 애니메이션
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { 
            opacity: '0.6',
            boxShadow: '0 0 20px hsl(var(--doai-500) / 0.3)',
          },
          '50%': { 
            opacity: '1',
            boxShadow: '0 0 40px hsl(var(--doai-500) / 0.5)',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        // shadcn/ui 애니메이션
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        // DoAi.Me 커스텀 애니메이션
        'breathe': 'breathe 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'slide-down': 'slideDown 0.8s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-primary': '0 0 30px hsl(var(--doai-500) / 0.3)',
        'glow-primary-lg': '0 0 60px hsl(var(--doai-500) / 0.4)',
        // Legacy aliases
        'glow-yellow': '0 0 30px hsl(var(--doai-500) / 0.3)',
        'glow-yellow-lg': '0 0 60px hsl(var(--doai-500) / 0.4)',
        '3d': '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
