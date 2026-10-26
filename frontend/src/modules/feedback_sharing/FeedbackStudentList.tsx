import { ChevronRight, Link2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';
import type { ReviewStudent } from '@/types/api';
import type { FeedbackAccess, FeedbackPreview } from './api';

export type FeedbackStudentRow = ReviewStudent & { preview?: FeedbackPreview };
export function FeedbackStudentList({ rows, accesses, selected, detailId, canDeliver, busy, onToggle, onOpen, onShare }: {
  rows: FeedbackStudentRow[]; accesses: FeedbackAccess[]; selected: string[]; detailId: string | null;
  canDeliver: boolean; busy: boolean; onToggle: (id: string, checked: boolean) => void;
  onOpen: (id: string, trigger: HTMLButtonElement) => void; onShare: (id: string, trigger: HTMLButtonElement) => void;
}) {
  return <ul className="space-y-2" aria-label="Retroalimentaciones del grupo">{rows.map(row => {
    const id = row.calificacion_id;
    const score = row.preview?.resultado ?? row.preview?.borrador_docente;
    const hasLink = accesses.some(access => access.calificacion_id === id && access.estado === 'active' && access.copy_available !== false);
    return <li key={row.estudiante_id} className={`min-w-0 rounded-xl border bg-surface p-3 ${id && id === detailId ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      <div className="flex items-start gap-2">
        {canDeliver && <label className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"><input type="checkbox" className="h-5 w-5" aria-label={'Seleccionar ' + row.nombre} checked={selected.includes(id ?? '')} disabled={busy || !id || !(row.preview?.seleccionable || row.preview?.elegible)} onChange={event => { if (id) onToggle(id, event.target.checked); }} /></label>}
        <div className="min-w-0 flex-1"><p className="break-words font-semibold leading-6">{row.nombre}</p><p className="mt-1 text-sm text-muted">{row.preview?.elegible ? 'Lista para entregar' : row.preview?.motivo ?? 'Sin calificación todavía.'}</p></div>
        {score?.nota != null && <span className="shrink-0 font-bold tabular-nums">{formatGradeScore(Number(score.nota))}<span className="text-xs font-normal text-muted"> / {formatGradeScore(Number(score.nota_maxima))}</span></span>}
      </div>
      {id && <div className="mt-2 flex flex-wrap gap-1">
        <Button variant="link" disabled={busy} className="min-h-11" aria-label={'Ver devolución de ' + row.nombre} onClick={event => onOpen(id, event.currentTarget)}>Ver devolución<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
        {canDeliver && hasLink && <Button variant="outline" aria-label={'Copiar enlace de ' + row.nombre} disabled={busy} className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left" onClick={event => onShare(id, event.currentTarget)}><Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />Copiar enlace</Button>}
      </div>}
    </li>;
  })}</ul>;
}
