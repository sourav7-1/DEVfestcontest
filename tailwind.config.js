import animate from 'tailwindcss-animate';

// "Tender file desk" theme. Values live as CSS variables in src/index.css.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontSize: {
      xs: ['0.8125rem', { lineHeight: '1.4' }], // 13px: stamps, tags
      sm: ['0.875rem', { lineHeight: '1.5' }], // 14
      base: ['1rem', { lineHeight: '1.55' }], // 16
      lg: ['1.125rem', { lineHeight: '1.45' }], // 18
      xl: ['1.375rem', { lineHeight: '1.3' }], // 22
      '2xl': ['1.75rem', { lineHeight: '1.2' }], // 28
    },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Hind Siliguri"', 'ui-sans-serif', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Noto Serif Bengali"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', '"Hind Siliguri"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: v('paper'),
        sheet: v('sheet'),
        ink: { DEFAULT: v('ink'), muted: v('ink-muted') },
        rule: v('rule'),
        khaki: { DEFAULT: v('khaki'), soft: v('khaki-soft'), deep: v('khaki-deep') },
        primary: { DEFAULT: v('primary'), hover: v('primary-hover'), fg: v('sheet') },
        tape: { DEFAULT: v('tape'), soft: v('missing-bg') },
        st: {
          ok: v('ok'), 'ok-bg': v('ok-bg'),
          missing: v('missing'), 'missing-bg': v('missing-bg'),
          expired: v('expired'), 'expired-bg': v('expired-bg'),
          need: v('need'), 'need-bg': v('need-bg'),
          none: v('none'), 'none-bg': v('none-bg'),
          dup: v('dup'), 'dup-bg': v('dup-bg'),
        },
        disabled: { DEFAULT: v('disabled'), fg: v('disabled-fg') },
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '6px', lg: '8px' },
      boxShadow: {
        DEFAULT: '0 1px 2px rgba(30, 43, 42, 0.08)',
        sheet: '0 1px 0 rgb(var(--rule))',
        lift: '0 8px 24px rgba(30, 43, 42, 0.12)',
      },
      keyframes: {
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-5px)' }, '40%,80%': { transform: 'translateX(5px)' } },
        settle: { '0%': { transform: 'translateY(-3px)', opacity: '0.6' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        stamp: { '0%': { transform: 'rotate(-2deg) scale(1.25)', opacity: '0' }, '60%': { transform: 'rotate(-2deg) scale(0.97)', opacity: '1' }, '100%': { transform: 'rotate(-2deg) scale(1)' } },
      },
      animation: { shake: 'shake 0.4s ease-in-out', settle: 'settle 0.18s ease-out', stamp: 'stamp 0.35s ease-out both' },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [animate],
};
