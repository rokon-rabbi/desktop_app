/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        base: {
          0: 'rgb(var(--base-0) / <alpha-value>)',
          50: 'rgb(var(--base-50) / <alpha-value>)',
          100: 'rgb(var(--base-100) / <alpha-value>)',
          200: 'rgb(var(--base-200) / <alpha-value>)',
          300: 'rgb(var(--base-300) / <alpha-value>)',
          400: 'rgb(var(--base-400) / <alpha-value>)',
          500: 'rgb(var(--base-500) / <alpha-value>)',
          600: 'rgb(var(--base-600) / <alpha-value>)',
          700: 'rgb(var(--base-700) / <alpha-value>)',
          800: 'rgb(var(--base-800) / <alpha-value>)',
          900: 'rgb(var(--base-900) / <alpha-value>)',
          950: 'rgb(var(--base-950) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-500) / <alpha-value>)',
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)'
        },
        safe: {
          DEFAULT: 'rgb(var(--safe-500) / <alpha-value>)',
          bg: 'rgb(var(--safe-bg) / <alpha-value>)',
          text: 'rgb(var(--safe-text) / <alpha-value>)'
        },
        review: {
          DEFAULT: 'rgb(var(--review-500) / <alpha-value>)',
          bg: 'rgb(var(--review-bg) / <alpha-value>)',
          text: 'rgb(var(--review-text) / <alpha-value>)'
        },
        important: {
          DEFAULT: 'rgb(var(--important-500) / <alpha-value>)',
          bg: 'rgb(var(--important-bg) / <alpha-value>)',
          text: 'rgb(var(--important-text) / <alpha-value>)'
        }
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem'
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        floating: '0 8px 24px -4px rgb(0 0 0 / 0.18), 0 2px 8px -2px rgb(0 0 0 / 0.10)'
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(60%)' },
          '100%': { transform: 'translateX(220%)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        shimmer: 'shimmer 1.6s infinite',
        indeterminate: 'indeterminate 1.3s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
