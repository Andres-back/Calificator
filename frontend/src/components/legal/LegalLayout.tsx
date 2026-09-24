import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/ui';
import { routes } from '@/config/routes';
import { LEGAL_CONTACT_EMAIL, LEGAL_VERSION } from '@/modules/legal/legalContent';
import { LegalFooter } from './LegalFooter';

export function LegalLayout({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to={routes.home} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a XCalificator
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-sky-50 p-6 dark:border-brand-500/25 dark:from-brand-950/35 dark:to-sky-950/25 sm:p-9">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-200">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Información legal y transparencia
          </div>
          <h1 className="mt-4 font-display text-3xl font-black sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-secondary">{summary}</p>
          <p className="mt-4 text-xs font-semibold text-muted">Versión y vigencia: {LEGAL_VERSION}</p>
        </div>

        <article className="legal-document mt-7 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-9">
          {children}
        </article>

        <aside className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
          <strong>Base de cumplimiento en revisión.</strong> Estos documentos mejoran la transparencia, pero no sustituyen la autorización institucional, la autorización del representante legal de menores, el asentimiento que corresponda, el consentimiento específico del estudio ni la revisión de un profesional jurídico.
        </aside>

        <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-2 p-5 text-sm">
          <Mail className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <span>Consultas, reclamos o ejercicio de derechos:</span>
          <a className="focus-ring rounded-md font-bold text-brand-700 hover:underline dark:text-brand-200" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
