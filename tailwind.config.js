import animate from 'tailwindcss-animate';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'] },
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
