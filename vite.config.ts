import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Use env to allow different bases for GitHub Pages vs Firebase Hosting.
  // Default to root ('/') for Firebase; set VITE_BASE_PATH=/clock-tasks/ for GitHub Pages builds.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 7428,
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})