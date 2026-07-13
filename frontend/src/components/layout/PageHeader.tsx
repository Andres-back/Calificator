import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
  badge,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Etiqueta pequeña en mayúsculas sobre el título (opcional). */
  eyebrow?: string;
  /** Contenido a la derecha del título, p. ej. un Badge de estado (opcional). */
  badge?: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase text-brand-600 dark:text-brand-300">{eyebrow}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1.5 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">{action}</div>}
    </motion.div>
  );
}
