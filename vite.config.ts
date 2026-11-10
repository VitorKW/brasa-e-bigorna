/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaPlugin } from './scripts/pwa-plugin.ts'

export default defineConfig({
  // Caminhos relativos: o jogo funciona na raiz de um domínio ou numa subpasta (GitHub Pages) sem rebuild.
  base: './',
  plugins: [react(), pwaPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
