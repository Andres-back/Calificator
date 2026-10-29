import { CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { ReviewTriageLevel } from './buildReviewTriage';

// Verification priority, never the student's academic correctness.
export const reviewPriorityPresentation = {
  safe: {
    label: 'Sin avisos de revisión', Icon: CheckCircle2,
    classes: 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-400/60 dark:bg-emerald-400/10 dark:text-emerald-100',
  },
  attention: {
    label: 'Conviene comprobar', Icon: TriangleAlert,
    classes: 'border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-400/60 dark:bg-amber-400/10 dark:text-amber-100',
  },
  blocked: {
    label: 'Revisión prioritaria', Icon: ShieldAlert,
    classes: 'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-400/60 dark:bg-rose-400/10 dark:text-rose-100',
  },
} satisfies Record<ReviewTriageLevel, { label: string; Icon: typeof CheckCircle2; classes: string }>;
