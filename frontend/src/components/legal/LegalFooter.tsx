import { Link } from 'react-router-dom';
import { routes } from '@/config/routes';
import { cn } from '@/lib/cn';

const legalLinks = [
  [routes.privacy, 'Privacidad'],
  [routes.terms, 'Términos'],
  [routes.cookies, 'Cookies'],
  [routes.privacyNotice, 'Aviso de privacidad'],
  [routes.pilotInformation, 'Información del piloto'],
] as const;

export function LegalFooter({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <footer className={cn('border-t border-border text-muted', compact ? 'py-3' : 'py-6', className)}>
      <div className={cn('mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs', !compact && 'sm:justify-between sm:text-sm')}>
        {!compact && <p>© 2026 XCalificator · Proyecto educativo de código abierto.</p>}
        <nav aria-label="Información legal" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {legalLinks.map(([to, label]) => (
            <Link key={to} to={to} className="focus-ring rounded-md font-semibold hover:text-fg hover:underline">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
