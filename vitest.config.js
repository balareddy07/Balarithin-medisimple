import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Pure logic + Web Crypto tests run in Node; no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
