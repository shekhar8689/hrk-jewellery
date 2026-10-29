import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Your website address for link previews (WhatsApp, Instagram). After buying a
// domain, set VITE_SITE_URL on Vercel, e.g. https://www.hrkjewellery.in
const SITE_URL = (process.env.VITE_SITE_URL || 'https://hrk-jewellery.vercel.app').replace(/\/+$/, '')

export default defineConfig({
  plugins: [react(), { name: 'site-url', transformIndexHtml: html => html.replaceAll('__SITE_URL__', SITE_URL) }],
})
