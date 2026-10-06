import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves the app from /<repo-name>/ (origin: github.com/sourav7-1/DEVfestcontest).
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/DEVfestcontest/' : '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node' },
}));
