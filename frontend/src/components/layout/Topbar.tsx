import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, ChevronDown, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ui';
import { useAuth } from '@/stores/auth';

export function Topbar({
  onMenu,
  menuButtonRef,
  menuExpanded,
}: {
  onMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
  menuExpanded: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();
  const initials = (user?.nombre ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, [open]);

  return (
    <header className="safe-area-pt sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-xl lg:px-8">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenu}
        className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
        aria-label="Abrir menú principal"
        aria-controls="main-navigation-mobile"
        aria-expanded={menuExpanded}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        {user?.rol === 'estudiante' && (
          <div className="hidden items-center gap-2 text-sm font-semibold text-secondary lg:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            Aprende a tu ritmo
          </div>
        )}
      </div>
      <ThemeToggle />
      <div className="relative">
        <button
          ref={accountButtonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className="focus-ring flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 transition-colors hover:border-brand-300"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={accountMenuId}
          aria-label={`Abrir menú de cuenta de ${user?.nombre ?? 'usuario'}`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-700 text-xs font-bold text-white">{initials}</span>
          <span className="hidden max-w-[140px] truncate text-sm font-medium sm:block">{user?.nombre}</span>
          <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
        </button>
        {open && (
          <div
            id={accountMenuId}
            className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
            role="menu"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold">{user?.nombre}</p>
              <p className="truncate text-xs text-secondary">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
                {user?.rol}
              </span>
            </div>
            <button
              type="button"
              onMouseDown={async () => {
                await logout();
                navigate('/login');
              }}
              role="menuitem"
              className="focus-ring flex min-h-11 w-full items-center gap-2 px-4 py-3 text-sm font-medium text-error hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
