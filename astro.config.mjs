import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  server: {
    port: 3000,
    host: true, // Listen on all addresses, including LAN and public addresses
    open: true, // Auto-open browser window
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
        }
      }
    }
  }
});
