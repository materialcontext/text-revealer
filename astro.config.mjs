import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  server: {
    port: 3000,
  },
  // Explicitly enable SCSS processing
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Optional: Add any global SCSS variables here
        }
      }
    }
  }
});
