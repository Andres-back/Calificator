import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { DigitalizationJobMonitor } from '@/modules/evaluaciones/components/DigitalizationJobMonitor';

export function AppShell() {
  const role = useAuth((state) => state.user?.rol);
  const isStudent = role === 'estudiante';
  const isTeacher = role === 'profesor';
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const appContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const appContent = appContentRef.current;
    document.body.style.overflow = 'hidden';
    appContent?.setAttribute('inert', '');
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    const menuButton = menuButtonRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      appContent?.removeAttribute('inert');
      window.removeEventListener('keydown', handleEscape);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  return (
    <div
      className={cn(
        'flex min-h-dvh bg-bg lg:h-dvh',
        isStudent && 'student-shell',
        isTeacher && 'teacher-shell',
      )}
    >
      <a
        href="#main-content"
        className="focus-ring fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Saltar al contenido principal
      </a>

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar mobile onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div ref={appContentRef} className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          menuButtonRef={menuButtonRef}
          menuExpanded={mobileOpen}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'safe-area-pb min-w-0 flex-1 px-4 py-5 outline-none sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-7',
            isStudent && 'sm:py-7 lg:px-10 lg:py-9',
          )}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {isTeacher && <DigitalizationJobMonitor />}
    </div>
  );
}
