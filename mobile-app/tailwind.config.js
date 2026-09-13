/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f7e39',
          dark: '#0d6b32',
          light: '#148d42',
          soft: '#e8f5e9',
          container: '#c8e6c8',
        },
        accent: '#22c55e',
        surface: '#ffffff',
        page: '#f5f5f5',
        ink: {
          DEFAULT: '#1a1a1a',
          soft: '#5c5c5c',
          faint: '#8a8a8a',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Lexend', 'system-ui', 'Roboto', 'sans-serif'],
        body: ['Lexend', 'system-ui', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
        lifted: '0 8px 30px rgba(20, 141, 66, 0.18)',
        dock: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}