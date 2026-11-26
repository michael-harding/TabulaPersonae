import path from 'path'

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { VitePWA } from 'vite-plugin-pwa'

import pkg from './package.json'
import { stripDataAttributesBabelPlugin } from './vite-plugins/strip-data-attributes'

export default defineConfig(({ mode }) => ({
  define: {
    // The version shown in the footer. The visual regression server (`pnpm dev:visual`) pins it so a
    // version bump doesn't change every page baseline.
    __APP_VERSION__: JSON.stringify(mode === 'visual' ? '0.0.0' : pkg.version),
  },
  plugins: [
    solid({
      babel: { plugins: mode === 'production' ? [stripDataAttributesBabelPlugin] : [] },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TabulaPersonae',
        short_name: 'TabulaPersonae',
        description: 'D&D 5e Character Sheet',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/web-app-manifest-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/web-app-manifest-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // The e2e dev server (`pnpm dev:e2e`): e2e tests take the browser offline, which also drops the
  // HMR connection, and Vite's client reloads the page when it reconnects — mid-test.
  server: mode === 'e2e' ? { hmr: false } : undefined,
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
}))
