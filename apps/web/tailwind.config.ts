import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#0A0A0A',
        card: '#0F0F0F',
        elevated: '#161616',
        text: '#FFFFFF',
        subtext: '#A1A1AA',
        muted: '#71717A',
        border: 'rgba(255,255,255,0.06)',
        'border-strong': 'rgba(255,255,255,0.12)',
        accent: '#6366F1',
        'accent-dim': '#4F46E5',
        'accent-bright': '#818CF8',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
      },
      maxWidth: {
        shell: '1200px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(99,102,241,0.4)',
        'glow-lg': '0 0 80px rgba(99,102,241,0.3)',
        'glow-emerald': '0 0 30px rgba(16,185,129,0.35)',
        card: '0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)',
        'mesh': 'radial-gradient(ellipse 70% 60% at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(139,92,246,0.06) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};

export default config;
