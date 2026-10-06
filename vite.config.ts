import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Relative base: one build works at a domain root (Vercel) and under /<repo-name>/ (GitHub Pages).
// The app has no client-side routes, so every asset can resolve next to index.html.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node' },
});
