import { NavLink } from 'react-router-dom';
import { Bot, GraduationCap, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { adminNav, estudianteNav, profesorNav } from '@/config/nav';
import { useAuth } from '@/stores/auth';
import { EducationalIcon } from '@/components/ui';

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/branding/logo-full.png" alt="XCalificator" className="h-10 w-10 rounded-lg object-contain" />
      <div className="leading-tight">
        <p className="font-display font-extrabold text-fg">XCalificator</p>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Plataforma IA</p>
      </div>
    </div>
  );
}

export function Sidebar({
  onNavigate,
  onClose,
  mobile = false,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const user = useAuth((state) => state.user);
  const navItems = user?.rol === 'admin' ? adminNav : user?.rol === 'estudiante' ? estudianteNav : profesorNav;
  const roleMessage = user?.rol === 'admin'
    ? { title: 'IA bajo control', detail: 'Credenciales, modelos y rutas.', icon: ShieldCheck, to: '/app/admin/configuracion-ia' }
    : user?.rol === 'estudiante'
      ? { title: 'Pregunta a Xali', detail: 'Practica y aclara tus dudas.', icon: GraduationCap, to: '/app/xali' }
      : { title: 'Trabaja con Xali', detail: 'Prepara y revisa tus ideas.', icon: Bot, to: '/app/xali' };
  const RoleIcon = roleMessage.icon;

  return (
    <aside
      id={mobile ? 'main-navigation-mobile' : 'main-navigation-desktop'}
      aria-label="Navegación principal"
      role={mobile ? 'dialog' : undefined}
      aria-modal={mobile || undefined}
      className={cn(
        'safe-area-pb safe-area-pt relative flex h-full w-72 max-w-[86vw] flex-col gap-5 overflow-hidden border-r border-border bg-surface px-3 py-5 lg:w-64',
        user?.rol === 'estudiante' && 'border-r-brand-100 bg-gradient-to-b from-white via-white to-brand-50/70 dark:border-r-brand-500/20 dark:from-surface dark:via-surface dark:to-brand-950/30',
        user?.rol === 'profesor' && 'border-r-indigo-100 bg-gradient-to-b from-white via-white to-indigo-50/65 dark:border-r-indigo-500/20 dark:from-surface dark:via-surface dark:to-indigo-950/30',
      )}
    >
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img src="/branding/pattern-subtle.png" alt="" className="h-full w-full object-cover opacity-[0.04] dark:opacity-[0.03]" />
      </div>
      <div className="relative z-10 flex h-full flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          {mobile && (
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Cerrar menú principal"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {user?.rol === 'profesor' && (
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-brand-600 to-sky-500 px-4 py-3 text-white shadow-lg shadow-brand-900/10 dark:border-indigo-400/20">
            <div className="absolute -right-5 -top-7 h-20 w-20 rounded-full bg-white/15 blur-xl" aria-hidden="true" />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-100">
              Centro docente
            </p>
            <p className="relative mt-1 font-display text-sm font-extrabold">Todo para tu clase</p>
            <p className="relative mt-0.5 max-w-[9rem] text-[11px] leading-4 text-indigo-50">
              {'Planifica, eval\u00faa y acompa\u00f1a.'}
            </p>
          </div>
        )}
        {user?.rol === 'estudiante' && (
          <div className="relative overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-500 via-sky-500 to-brand-600 px-4 py-3 text-white shadow-lg shadow-cyan-900/10 dark:border-cyan-400/20">
            <div className="absolute -right-5 -top-7 h-20 w-20 rounded-full bg-white/20 blur-xl" aria-hidden="true" />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-50">Tu ruta</p>
            <p className="relative mt-1 font-display text-sm font-extrabold">Aprende a tu ritmo</p>
            <p className="relative mt-0.5 max-w-[10rem] text-[11px] leading-4 text-cyan-50">Practica, revisa y sigue avanzando.</p>
          </div>
        )}
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1" aria-label="Secciones de la aplicación">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {user?.rol === 'estudiante' ? 'Tu recorrido' : 'Menú'}
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={item.soon ? (event) => event.preventDefault() : onNavigate}
              className={({ isActive }) => cn(
                'focus-ring group relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                item.soon
                  ? 'cursor-not-allowed text-disabled'
                  : isActive
                    ? 'text-brand-800 dark:text-white'
                    : 'text-secondary hover:bg-surface-2 hover:text-fg',
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && !item.soon && (
                    <span
                      className="absolute inset-0 rounded-xl border border-brand-300 bg-brand-50 shadow-sm dark:border-brand-500/40 dark:bg-brand-500/20"
                    />
                  )}
                  {item.brandIcon ? (
                    <span
                      className={cn(
                        'relative grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                        isActive && !item.soon && 'bg-white/75 shadow-sm ring-1 ring-brand-200 dark:bg-white/10 dark:ring-white/15',
                      )}
                      data-nav-illustration={item.brandIcon}
                    >
                      <EducationalIcon name={item.brandIcon} className="h-10 w-10" />
                    </span>
                  ) : (
                    <item.icon aria-hidden="true" className={cn('relative h-[18px] w-[18px] shrink-0', isActive && !item.soon && 'text-brand-700 dark:text-brand-300')} />
                  )}
                  <span className="relative">{item.label}</span>
                  {item.soon && <span className="relative ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">Pronto</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink to={roleMessage.to} onClick={onNavigate} aria-label={`${roleMessage.title}: ${roleMessage.detail}`} className={cn(
          'focus-ring group relative flex min-h-[5.25rem] items-start gap-3 overflow-hidden rounded-2xl border border-border bg-surface-2 p-3.5 transition hover:border-brand-300 hover:shadow-md',
          user?.rol === 'estudiante' && 'border-brand-200 bg-gradient-to-br from-white to-cyan-50 pr-[5.25rem] shadow-sm dark:border-brand-500/25 dark:from-surface-2 dark:to-cyan-950/40',
          user?.rol === 'profesor' && 'border-indigo-200 bg-gradient-to-br from-white to-indigo-50 pr-[5.25rem] shadow-sm dark:border-indigo-500/25 dark:from-surface-2 dark:to-indigo-950/50',
        )}>
          {(user?.rol === 'estudiante' || user?.rol === 'profesor') && (
            <img src="/branding/semantic-icons/xali.webp" alt="" className="pointer-events-none absolute bottom-0 right-1 h-[4.75rem] w-[4.75rem] object-contain transition-transform duration-200 group-hover:scale-105" />
          )}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <RoleIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-fg">{roleMessage.title}</p>
            <p className="mt-1 text-xs leading-4 text-secondary">{roleMessage.detail}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
