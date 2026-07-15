import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        calculateur: resolve(__dirname, 'calculateur.html'),
        ressources: resolve(__dirname, 'ressources.html'),
        places: resolve(__dirname, 'places-2026.html'),
      },
    },
  },
});
