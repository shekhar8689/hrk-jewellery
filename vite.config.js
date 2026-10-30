import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Your website address for link previews (WhatsApp, Instagram). After buying a
// domain, set VITE_SITE_URL on Vercel, e.g. https://www.hrkjewellery.in
const SITE_URL = (process.env.VITE_SITE_URL || 'https://hrk-jewellery.vercel.app').replace(/\/+$/, '')

export default defineConfig({
  plugins: [react(), { name: 'site-url', transformIndexHtml: html => html.replaceAll('__SITE_URL__', SITE_URL) }],
  // true when Vercel builds the site: shop data is then read through /api (see src/config/api.js)
  define: { __ON_VERCEL__: JSON.stringify(!!process.env.VERCEL) },
  build: {
    rollupOptions: {
      output: {
        // React and the router rarely change: keep them in their own file so
        // returning visitors reuse it from the browser cache after each update
        manualChunks: id => (/node_modules\/(react|react-dom|react-router|react-router-dom|@remix-run|scheduler)\//.test(id) ? 'vendor' : undefined),
      },
    },
  },
})
