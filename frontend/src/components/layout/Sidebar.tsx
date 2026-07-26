import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, GraduationCap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { adminNav, estudianteNav, profesorNav } from '@/config/nav';
import { useAuth } from '@/stores/auth';

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/branding/logo-full.png" alt="XCalificator" className="h-10 w-10 rounded-lg object-contain" />
      <div className="leading-tight">
        <p className="font-display font-extrabold text-fg">XCalificator</p>
        <p className="text-[10px] uppercase tracking-wider text-muted">Plataforma IA</p>
      </div>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((state) => state.user);
  const navItems = user?.rol === 'admin' ? adminNav : user?.rol === 'estudiante' ? estudianteNav : profesorNav;
  const roleMessage = user?.rol === 'admin'
    ? { title: 'IA bajo control', detail: 'Credenciales, modelos y rutas.', icon: ShieldCheck }
    : user?.rol === 'estudiante'
      ? { title: 'Tu proceso importa', detail: 'Actividades y avances.', icon: GraduationCap }
      : { title: 'La IA sugiere', detail: 'Tú revisas y decides.', icon: Bot };
  const RoleIcon = roleMessage.icon;

  return (
    <aside className="relative flex h-full w-64 flex-col gap-5 overflow-hidden border-r border-border bg-surface px-3 py-5">
      <div className="absolute inset-0 z-0">
        <img
          src="/branding/pattern-subtle.png"
          alt=""
          className="h-full w-full object-cover opacity-[0.04] dark:opacity-[0.03]"
        />
      </div>
      <div className="relative z-10 flex h-full flex-col gap-5">
        <Logo />
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Menú</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={item.soon ? (e) => e.preventDefault() : onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                item.soon
                  ? 'cursor-not-allowed text-muted/60'
                  : isActive
                    ? 'text-brand-700 dark:text-white'
                    : 'text-muted hover:text-fg hover:bg-surface-2',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !item.soon && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/15"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && !item.soon && 'text-brand-600 dark:text-brand-300')} />
                <span className="relative">{item.label}</span>
                {item.soon && <span className="relative ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-muted">pronto</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><RoleIcon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-fg">{roleMessage.title}</p>
          <p className="mt-0.5 text-xs text-muted">{roleMessage.detail}</p>
        </div>
      </div>
      </div>
    </aside>
  );
}
