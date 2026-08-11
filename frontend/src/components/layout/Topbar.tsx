import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, ClipboardCheck, FileBarChart2, GraduationCap, Home, LogOut, Menu, Plus, Presentation, Sparkles, Wand2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui';
import { useAuth } from '@/stores/auth';

const TEACHER_CONTEXTS = [
  { match: '/app/materias', label: 'Materias y grupos', icon: BookOpen },
  { match: '/app/calificaciones', label: 'Revisi\u00f3n de calificaciones', icon: ClipboardCheck },
  { match: '/app/evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
  { match: '/app/analytics', label: 'Anal\u00edtica de aprendizaje', icon: FileBarChart2 },
  { match: '/app/herramientas', label: 'Recursos de clase', icon: Wand2 },
  { match: '/app/presentaciones', label: 'Presentaciones', icon: Presentation },
  { match: '/app/reportes', label: 'Reportes y progreso', icon: FileBarChart2 },
  { match: '/app/xali', label: 'Asistente Xali', icon: Sparkles },
];

const STUDENT_CONTEXTS = [
  { match: '/app/materias', label: 'Mis materias', icon: BookOpen },
  { match: '/app/evaluaciones', label: 'Mis actividades', icon: ClipboardCheck },
  { match: '/app/calificaciones', label: 'Mis resultados', icon: GraduationCap },
  { match: '/app/xali', label: 'Ayuda con Xali', icon: Sparkles },
];

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
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();
  const initials = (user?.nombre ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const teacherContext = TEACHER_CONTEXTS.find((item) => location.pathname.startsWith(item.match))
    ?? { label: 'Inicio docente', icon: Sparkles };
  const TeacherContextIcon = teacherContext.icon;
  const studentContext = STUDENT_CONTEXTS.find((item) => location.pathname.startsWith(item.match))
    ?? { label: 'Mi inicio', icon: Home };
  const StudentContextIcon = studentContext.icon;
  const isInsideMateria = /^\/app\/materias\/[^/]+(?:\/|$)/.test(location.pathname);

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
        {user?.rol === 'profesor' && (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-sm">
              <TeacherContextIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">Espacio docente</p>
              <p className="truncate text-sm font-bold text-fg">{teacherContext.label}</p>
            </div>
          </div>
        )}
        {user?.rol === 'estudiante' && (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white shadow-sm">
              <StudentContextIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Tu aprendizaje</p>
              <p className="truncate text-sm font-bold text-fg">{studentContext.label}</p>
            </div>
          </div>
        )}
      </div>
      {user?.rol === 'profesor' && !isInsideMateria && (
        <Link
          to="/app/herramientas/nuevo"
          className="focus-ring hidden min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 md:inline-flex"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Crear recurso
        </Link>
      )}
      {user?.rol === 'estudiante' && !location.pathname.startsWith('/app/evaluaciones') && (
        <Link
          to="/app/evaluaciones"
          className="focus-ring hidden min-h-10 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 text-sm font-bold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-200 md:inline-flex"
        >
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Mis actividades
        </Link>
      )}
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
