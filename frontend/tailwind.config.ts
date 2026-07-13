import type { Config } from 'tailwindcss';

/**
 * Sistema de diseño XCalificator — índigo/violeta premium.
 * Los colores semánticos usan variables CSS (definidas en index.css) para
 * soportar tema claro/oscuro sin duplicar clases.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca
        brand: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        violet: {
          400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
        },
        // Semánticos (CSS vars)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(99 102 241 / 0.15), 0 8px 30px -8px rgb(99 102 241 / 0.35)',
        'glow-lg': '0 0 0 1px rgb(99 102 241 / 0.2), 0 20px 50px -12px rgb(99 102 241 / 0.45)',
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 8px 24px -12px rgb(16 24 40 / 0.12)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'brand-radial': 'radial-gradient(120% 120% at 0% 0%, #6366f1 0%, #7c3aed 45%, #4338ca 100%)',
        mesh: 'radial-gradient(at 0% 0%, rgb(99 102 241 / 0.18) 0px, transparent 50%), radial-gradient(at 98% 0%, rgb(139 92 246 / 0.14) 0px, transparent 50%), radial-gradient(at 50% 100%, rgb(99 102 241 / 0.10) 0px, transparent 55%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
