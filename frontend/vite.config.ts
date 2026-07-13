import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// FastAPI runs on :8000. In development we proxy backend routes so HttpOnly
// cookies stay same-origin. This file configures only Vite development, never
// the production server or Nginx.
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const allowLan = rootEnv.VITE_ALLOW_LAN === 'true';
  // Presenton proxies may attach an internal Basic Auth header. Keep them
  // loopback-only unless LAN exposure is explicitly requested as well.
  const allowPresentonProxyOnLan = rootEnv.VITE_ALLOW_PRESENTON_PROXY_ON_LAN === 'true';
  const enablePresentonProxy = !allowLan || allowPresentonProxyOnLan;

  const presentonUser = rootEnv.PRESENTON_AUTH_USERNAME || 'presenton_admin';
  const presentonPassword = rootEnv.PRESENTON_AUTH_PASSWORD || '';
  const presentonBasicAuth = rootEnv.PRESENTON_BASIC_AUTH || (
    presentonPassword ? Buffer.from(`${presentonUser}:${presentonPassword}`).toString('base64') : ''
  );
  const presentonTarget = rootEnv.PRESENTON_PUBLIC_URL || 'http://localhost:5001';
  const withPresentonAuth = (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any) => {
      if (presentonBasicAuth) proxyReq.setHeader('Authorization', `Basic ${presentonBasicAuth}`);
    });
  };
  const presentonProxy = {
    target: presentonTarget,
    changeOrigin: true,
    configure: withPresentonAuth,
  };

  const presentonRoutes = {
    '/api/v1': presentonProxy,
    '/api/telemetry-status': presentonProxy,
    '/api/can-change-keys': presentonProxy,
    '/presenton': {
      target: presentonTarget,
      changeOrigin: true,
      rewrite: (url: string) => url.replace(/^\/presenton/, ''),
      configure: withPresentonAuth,
    },
    '/_next': presentonProxy,
    '/app_data': presentonProxy,
    '/static': presentonProxy,
    '/presentation': presentonProxy,
  };

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
        ...(enablePresentonProxy ? presentonRoutes : {}),
        '/api': { target: 'http://localhost:8000', changeOrigin: true },
        '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
        '/health': { target: 'http://localhost:8000', changeOrigin: true },
      },
    },
  };
});
