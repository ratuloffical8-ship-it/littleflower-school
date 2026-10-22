// tailwind.config.ts
import type { Config } from 'tailwindcss';

/**
 * Colors are driven by CSS variables (space-separated RGB channels) defined in
 * src/styles/index.css. Change a value there once -> it changes everywhere.
 */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1200px' },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: token('navy'),
          dark: token('navy-dark'),
        },
        royal: token('royal'),
        gold: {
          DEFAULT: token('gold'),
          soft: token('gold-soft'),
        },
        surface: token('surface'),
        page: token('page'),
        ink: {
          DEFAULT: token('ink'),
          muted: token('ink-muted'),
        },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        line: token('line'),
      },
      fontFamily: {
        bn: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
        en: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['"Hind Siliguri"', 'Inter', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 42, 67, 0.06), 0 4px 12px rgba(16, 42, 67, 0.06)',
        lift: '0 8px 24px rgba(16, 42, 67, 0.12)',
      },
      borderRadius: {
        card: '0.75rem',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'bottom-nav': 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      },
    },
  },
  plugins: [],
};

export default config;
