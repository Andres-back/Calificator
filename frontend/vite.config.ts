import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { cpSync, readFileSync } from 'node:fs';

// FastAPI runs on :8000. In development we proxy backend routes so HttpOnly
// cookies stay same-origin. This file configures only Vite development, never
// the production server or Nginx.
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const allowLan = rootEnv.VITE_ALLOW_LAN === 'true';
  return {
    plugins: [react(), {
      name: 'pdfjs-local-resources',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const match = req.url?.split('?')[0].match(/^\/pdfjs\/(cmaps|standard_fonts|wasm)\/([a-zA-Z0-9_.-]+)$/);
          if (!match) return next();
          try {
            const content = readFileSync(path.resolve(__dirname, 'node_modules/pdfjs-dist', match[1], match[2]));
            res.setHeader('Content-Type', match[2].endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
            res.end(content);
          } catch { res.statusCode = 404; res.end(); }
        });
      },
      closeBundle() {
        for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
          cpSync(path.resolve(__dirname, 'node_modules/pdfjs-dist', directory), path.resolve(__dirname, 'dist/pdfjs', directory), { recursive: true });
        }
      },
    }],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    worker: { format: 'es' },
    build: {
      modulePreload: {
        resolveDependencies: (_url, deps, { hostType }) => {
          if (hostType !== 'html') return deps;
          return deps.filter((dependency) => !/(^|\/)(charts|markdown|document-export)-/.test(dependency));
        },
      },
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
