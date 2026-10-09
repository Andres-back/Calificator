import { Link } from 'react-router-dom';
import { Button, Modal } from '@/components/ui';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';
import { normalizeNumeric, type FollowUpCell } from './gradebookModel';

export function StudentGradeSummary({ cell }: { cell: FollowUpCell }) {
  const score = cell.status === 'decidida' ? cell.score : cell.status === 'por_revisar' ? normalizeNumeric(cell.grade?.nota_sugerida) : null;
  const status = cell.status === 'calificando' ? 'Calificando'
    : cell.status === 'sin_nota' ? 'Sin calificación'
      : cell.status === 'por_revisar' ? 'Sugerencia IA · pendiente de revisión'
        : cell.grade?.estado === 'publicada' ? 'Publicada' : 'Confirmada · sin publicar';
  const tone = cell.status === 'por_revisar' ? 'text-amber-700 dark:text-amber-200'
    : cell.status === 'calificando' ? 'text-brand-700 dark:text-brand-200' : 'text-muted';
  return <div>
    {score != null && <p className="text-lg font-bold tabular-nums">{formatGradeScore(score)} / {formatGradeScore(cell.maximumScore)}</p>}
    <p className={`mt-0.5 text-xs leading-5 ${tone}`}>{status}</p>
  </div>;
}

export function StudentGradebookPreview({ student, materiaName, cells, loading, error, onClose, onRetry, explanationHref }: {
  student: { id: string; nombre: string; email: string };
  materiaName: string;
  cells: FollowUpCell[];
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
  explanationHref: (cell: FollowUpCell) => string;
}) {
  return <Modal open onClose={onClose} title={`Boletín de ${student.nombre}`} description={<><span className="block break-words font-semibold">{materiaName}</span><span className="block break-all">{student.email}</span></>} className="max-w-3xl [overflow-wrap:anywhere]">
    <div className="space-y-4">
      {error ? <div role="alert" className="rounded-xl border border-border bg-surface-2 p-4">
        <p className="font-semibold">No pudimos cargar todas las notas.</p>
        <p className="mt-1 text-sm text-muted">No mostramos un boletín incompleto. Revisa tu conexión e inténtalo de nuevo.</p>
        <Button variant="outline" className="mt-3 min-h-11" onClick={onRetry}>Reintentar notas</Button>
      </div> : loading ? <p role="status" className="py-4 text-sm text-muted">Cargando notas…</p>
        : cells.length ? <>
          <p className="text-sm text-muted">Todas las evaluaciones de esta materia.</p>
          <ul aria-label="Notas del estudiante" className="divide-y divide-border rounded-xl border border-border">
            {cells.map(cell => <li key={cell.evaluationId} className="min-w-0 p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <p className="break-words text-sm font-semibold">{cell.evaluationName}</p>
                <StudentGradeSummary cell={cell} />
              </div>
              {cell.grade && <Link to={explanationHref(cell)} aria-label={`Ver explicación de ${cell.evaluationName}`} className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-brand-700 dark:text-brand-200">Ver explicación</Link>}
            </li>)}
          </ul>
        </> : <p className="py-4 text-sm text-muted">Todavía no hay notas</p>}
      <Button variant="outline" className="min-h-11 w-full" onClick={onClose}>Cerrar boletín</Button>
    </div>
  </Modal>;
}
