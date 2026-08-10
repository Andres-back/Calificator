import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
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

// ── Observabilidad desacoplada ────────────────────────────────────────
import { installGlobalErrorHandlers } from '@/lib/errorReporter';

// ── Service worker rogue cleanup ──
// era la fuente del `sw.js` que interceptaba fetches e imponía una CSP ajena.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
}

// ── Global error handlers (siempre al inicio) ──
installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'pointer-events-none !bg-surface-elevated !text-fg !border !border-border !shadow-glow',
          duration: 5000,
          ariaProps: {
            role: 'status',
            'aria-live': 'polite',
          },
        }}
        containerStyle={{
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      />
    </QueryClientProvider>
    </MotionConfig>
  </React.StrictMode>,
);
