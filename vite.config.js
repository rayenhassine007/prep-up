import { resolve } from 'path';
import { defineConfig } from 'vite';

const CLEAN_URL_PAGES = new Set([
  '/calculateur',
  '/ressources',
  '/places-2026',
  '/chapitres-concours',
]);

function cleanUrlsPlugin() {
  const middleware = (req, res, next) => {
    const [pathname, query = ''] = (req.url ?? '/').split('?');
    const suffix = query ? `?${query}` : '';

    if (pathname.endsWith('.html') && pathname !== '/index.html') {
      const cleanPath = pathname.slice(0, -5);
      if (CLEAN_URL_PAGES.has(cleanPath)) {
        res.writeHead(301, { Location: `${cleanPath}${suffix}` });
        res.end();
        return;
      }
    }

    if (CLEAN_URL_PAGES.has(pathname)) {
      req.url = `${pathname}.html${suffix}`;
    }

    next();
  };

  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [cleanUrlsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        calculateur: resolve(__dirname, 'calculateur.html'),
        ressources: resolve(__dirname, 'ressources.html'),
        places: resolve(__dirname, 'places-2026.html'),
        chapitres: resolve(__dirname, 'chapitres-concours.html'),
      },
    },
  },
});
