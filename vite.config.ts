import { defineConfig, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Strips data-test="literal" / data-sem="literal" attributes from JSX source.
function stripLiteralDataAttrs(code: string): string {
  return code
    .replace(/\s+data-test="[^"]*"/g, '')
    .replace(/\s+data-sem="[^"]*"/g, '')
}

// Strips every occurrence of `${attr}={expr}` from code. A plain regex can't match
// the closing `}` reliably because the expression can contain its own braces (template
// literals, ternaries), so this scans forward counting brace depth and skipping over
// quoted/template string contents instead.
function stripDynamicAttr(code: string, attr: string): string {
  const needle = `${attr}={`
  let result = ''
  let i = 0
  while (i < code.length) {
    const idx = code.indexOf(needle, i)
    if (idx === -1) {
      result += code.slice(i)
      break
    }
    let start = idx
    while (start > 0 && /\s/.test(code[start - 1])) start--
    result += code.slice(i, start)
    let depth = 1
    let j = idx + needle.length
    let quote: string | null = null
    while (j < code.length && depth > 0) {
      const ch = code[j]
      if (quote) {
        if (ch === '\\') { j += 2; continue }
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
      } else if (ch === '{') {
        depth++
      } else if (ch === '}') {
        depth--
      }
      j++
    }
    i = j
  }
  return result
}

// Strips data-test={expr} / data-sem={expr} — the dynamic form used for per-item
// selectors (e.g. `data-test={`slot-${index}`}`).
function stripDynamicDataAttrs(code: string): string {
  return stripDynamicAttr(stripDynamicAttr(code, 'data-test'), 'data-sem')
}

// Strips data-test and data-sem attributes from JSX source in production builds.
// These attributes are used as stable test selectors and semantic labels in dev/test;
// they must not ship to production per §6.8–9 of the Constitution.
function stripDataAttributes(): Plugin {
  return {
    name: 'strip-data-attributes',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) return null
      return stripDynamicDataAttrs(stripLiteralDataAttrs(code))
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === 'production' ? [stripDataAttributes()] : []),
    solid(),
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
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
}))
