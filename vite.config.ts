/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Base path for static hosting.
 *
 * GitHub Pages project sites are served from https://<user>.github.io/<repo>/,
 * so production builds default to "/nunavut-atlas/". Override with the
 * BASE_PATH environment variable, e.g. BASE_PATH=/ for a custom domain or
 * BASE_PATH=./ for a fully relative build. The GitHub Actions workflow sets it
 * from the repository's Pages configuration automatically.
 */
export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? '/nunavut-atlas/' : '/'),
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'leaflet';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
}));
