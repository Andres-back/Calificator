import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ui';
import { useAuth } from '@/stores/auth';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const initials = (user?.nombre ?? '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-xl lg:px-8">
      <button onClick={onMenu} className="focus-ring rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label="Abrir menú principal">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <ThemeToggle />
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 transition-colors hover:border-brand-300"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-sm font-medium sm:block max-w-[140px] truncate">{user?.nombre}</span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lg" role="menu">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold">{user?.nombre}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                {user?.rol}
              </span>
            </div>
            <button
              onMouseDown={async () => {
                await logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
