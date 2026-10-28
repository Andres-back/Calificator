import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { Button } from '@/components/ui';
import { listGradingRevisions } from '../api';
import { formatGradeScore } from '../gradePresentation';

export function PreviousGradeReference({ gradeId, enabled, onOpenHistory }: {
  gradeId: string; enabled: boolean; onOpenHistory: () => void;
}) {
  const history = useQuery({ queryKey: ['grading-revisions', gradeId], queryFn: () => listGradingRevisions(gradeId), enabled, retry: false });
  if (!enabled) return null;
  const previous = history.data?.find((revision) => {
    const value = revision.nota_anterior;
    return (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0;
  });
  return <aside aria-label="Resultado anterior de referencia" className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
    <p className="flex items-center gap-2 font-semibold"><History className="h-4 w-4" aria-hidden="true" /> Nota anterior · solo referencia</p>
    {history.isPending ? <p role="status" className="mt-2 text-muted">Consultando el historial…</p>
      : history.isError ? <div role="alert" className="mt-2"><p>No pudimos consultar el historial. Los resultados anteriores se conservan.</p><Button variant="outline" size="sm" onClick={() => void history.refetch()}>Consultar de nuevo</Button></div>
        : previous ? <><p className="mt-2 text-2xl font-bold">{formatGradeScore(Number(previous.nota_anterior))}</p><p className="mt-2 text-muted">Este resultado se conserva en el historial. No es una nota vigente ni se publicará automáticamente. Puede corresponder a una evidencia anterior.</p></>
          : <p className="mt-2 text-muted">No hay una nota anterior disponible en los cambios recientes.</p>}
    <Button variant="ghost" size="sm" className="mt-2 min-h-11" onClick={onOpenHistory}>Ver historial</Button>
  </aside>;
}
