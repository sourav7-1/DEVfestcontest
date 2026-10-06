import animate from 'tailwindcss-animate';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'] },
      keyframes: {
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
        'pulse-ring': { '0%': { boxShadow: 'inset 0 0 0 3px rgba(217,119,6,0.7)' }, '100%': { boxShadow: 'inset 0 0 0 3px rgba(217,119,6,0)' } },
      },
      animation: { shake: 'shake 0.45s ease-in-out', 'pulse-ring': 'pulse-ring 1.6s ease-out' },
      colors: {
        primary: { DEFAULT: '#0F5E63', fg: '#FFFFFF', soft: '#E3F0EF', dark: '#0A4447' },
        ink: '#1E293B',
        canvas: '#F3F5F8',
        line: '#DDE3E9',
      },
    },
  },
  plugins: [animate],
};
