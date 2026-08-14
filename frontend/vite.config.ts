import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// FastAPI runs on :8000. In development we proxy backend routes so HttpOnly
// cookies stay same-origin. This file configures only Vite development, never
// the production server or Nginx.
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const allowLan = rootEnv.VITE_ALLOW_LAN === 'true';
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-core',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
                priority: 50,
              },
              {
                name: 'charts',
                test: /node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+|decimal\.js-light|react-smooth)[\\/]/,
                priority: 40,
              },
              {
                name: 'markdown',
                test: /node_modules[\\/](react-markdown|remark-[^\\/]+|micromark[^\\/]*|mdast-[^\\/]+|hast-[^\\/]+|unified|unist-[^\\/]+|vfile[^\\/]*|property-information)[\\/]/,
                priority: 40,
              },
              {
                name: 'document-export',
                test: /node_modules[\\/](jspdf|html2canvas|dompurify|canvg|fflate)[\\/]/,
                priority: 40,
              },
              {
                name: 'icons',
                test: /node_modules[\\/]lucide-react[\\/]/,
                priority: 30,
              },
              {
                name: 'app-vendor',
                test: /node_modules[\\/](@tanstack|axios|zustand|zod|clsx|tailwind-merge)[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      // Default to loopback. LAN is opt-in through VITE_ALLOW_LAN=true.
      host: allowLan ? true : '127.0.0.1',
      proxy: {
        '/api': { target: 'http://localhost:8000', changeOrigin: true },
        '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
        '/health': { target: 'http://localhost:8000', changeOrigin: true },
      },
    },
  };
});
