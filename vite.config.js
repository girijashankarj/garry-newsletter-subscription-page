import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Must match GitHub Pages URL: https://<user>.github.io/<repo>/
  base: process.env.GITHUB_PAGES === 'true' ? '/newsletter-subscription-page/' : '/',
  plugins: [react(), tailwindcss()],
})
