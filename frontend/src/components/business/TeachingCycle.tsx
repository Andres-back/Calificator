import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  PenLine,
  Send,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface CycleStep {
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}

const steps: CycleStep[] = [
  { label: 'Planear', detail: 'DBA, metas y criterios', icon: BookOpenCheck, tone: 'text-sky-600 bg-sky-500/10 border-sky-500/20' },
  { label: 'Crear', detail: 'Material con IA', icon: Wand2, tone: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
  { label: 'Asignar', detail: 'Online o imprimible', icon: Send, tone: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  { label: 'Resolver', detail: 'Aula, casa o papel', icon: PenLine, tone: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  { label: 'Calificar', detail: 'IA con revisión docente', icon: ClipboardList, tone: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20' },
  { label: 'Retroalimentar', detail: 'Feedback accionable', icon: CheckCircle2, tone: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  { label: 'Reforzar', detail: 'Plan personalizado', icon: HeartHandshake, tone: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
  { label: 'Reportar', detail: 'Evidencias y avance', icon: BarChart3, tone: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' },
];

export function TeachingCycle({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface/80 p-4 shadow-card', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Modelo de negocio</p>
          <h2 className="mt-1 font-display text-lg font-extrabold">Ciclo completo del docente</h2>
        </div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          La IA sugiere. El docente decide.
        </span>
      </div>

      <div className={cn('mt-4 grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 2xl:grid-cols-8')}>
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
            className="cycle-step group relative min-h-[86px] overflow-hidden rounded-xl border border-border bg-surface-2/60 p-3"
          >
            <div className="cycle-step-sweep" />
            <div className={cn('relative grid h-8 w-8 place-items-center rounded-lg border', step.tone)}>
              <step.icon className="h-4 w-4" />
            </div>
            <p className="relative mt-2 break-words text-[13px] font-bold leading-tight">{step.label}</p>
            {!compact && <p className="relative mt-0.5 text-[11px] leading-snug text-muted">{step.detail}</p>}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
