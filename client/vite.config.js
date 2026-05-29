import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // injectManifest: we own the SW file (src/sw.js).
      // The plugin injects self.__WB_MANIFEST and bundles the file via Vite,
      // so import.meta.env and ES module imports both work inside sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      // 'prompt' — new SW waits until the user dismisses the UpdatePrompt
      // banner. Prevents abrupt mid-session reloads.
      registerType: 'prompt',

      // Our manifest is already at public/manifest.json — don't generate a new one
      manifest: false,

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        // Exclude very large assets from the precache (they're handled by runtime caching)
        globIgnores: ['**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB cap per file
      },

      devOptions: {
        enabled: true,   // Test SW behaviour in dev (vite dev server)
        type: 'module',  // Required for ESM service workers in dev
        navigateFallback: '/index.html',
      },
    }),
  ],

  // Tell esbuild (used by Vite's dep pre-bundler) to treat .js files as JSX
  // so hooks that pass JSX to react-hot-toast don't cause "JSX not enabled" errors.
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },

  server: {
    proxy: {
      '/api':     { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
