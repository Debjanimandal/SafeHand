import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}'],
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
        accent: '#6366F1',
        'accent-dim': '#4F46E5',
        'accent-glow': 'rgba(99,102,241,0.25)',
        danger: '#EF4444',
        'danger-dim': '#DC2626',
        success: '#10B981',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.25s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          '50%': { boxShadow: '0 0 16px 4px rgba(99,102,241,0.35)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(99,102,241,0.4)',
        'glow-sm': '0 0 12px rgba(99,102,241,0.25)',
        'glow-emerald': '0 0 16px rgba(16,185,129,0.35)',
        'glow-red': '0 0 16px rgba(239,68,68,0.35)',
        card: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        'surface-gradient': 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
      },
    }
  },
  plugins: []
};

export default config;
