import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
// Fuentes auto-hospedadas (sin peticiones externas → sin errores de CSP).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';
import { AuthBootstrap } from '@/components/auth/RequireAuth';
import './index.css';
import './print.css';

// Desregistra cualquier service worker rogue (cacheado por el entorno/preview):
// era la fuente del `sw.js` que interceptaba fetches e imponía una CSP ajena.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthBootstrap>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-surface !text-fg !border !border-border !shadow-glow',
          duration: 3500,
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);
