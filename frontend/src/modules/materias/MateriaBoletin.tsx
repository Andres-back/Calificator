import { useMemo, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CheckCircle2, FileText, Users } from 'lucide-react';
import { Badge, Card, EmptyState, Skeleton } from '@/components/ui';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { listCalificaciones } from '@/modules/calificaciones/api';
import { useMateriaContext } from './MateriaDetailPage';
import { getBoletin } from '@/modules/calificaciones/api';
import { useAuth } from '@/stores/auth';
import type { Calificacion, Evaluacion } from '@/types/api';
import { cn } from '@/lib/cn';

type SortField = 'nombre' | 'promedio' | 'confirmadas';
type SortDir = 'asc' | 'desc';

interface StudentRow {
  id: string;
  nombre: string;
  email: string;
  calificaciones: Map<string, Calificacion>;
  promedio: number;
  confirmadas: number;
}

export function MateriaBoletin() {
  const { materia, canManageMateria, isStudent } = useMateriaContext();
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const estudiantesList = useMemo(() => {
    if ('estudiantes' in materia) {
      return (materia as any).estudiantes as Array<{ id: string; nombre: string; email: string }>;
    }
    return [];
  }, [materia]);

  const evaluacionesQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const evaluaciones = evaluacionesQuery.data ?? [];
  const abiertas = evaluaciones.filter((e) => e.estado !== 'cerrada');
  const cerradas = evaluaciones.filter((e) => e.estado === 'cerrada');

  // Fetch calificaciones for each evaluation
  const calificacionesQueries = useQueries({
    queries: cerradas.map((ev) => ({
      queryKey: ['calificaciones', ev.id],
      queryFn: () => listCalificaciones(ev.id),
      enabled: Boolean(ev.id) && canManageMateria,
    })),
  });

  const calificacionesPorEval = useMemo(() => {
    const map = new Map<string, Calificacion[]>();
    cerradas.forEach((ev, i) => {
      if (calificacionesQueries[i]?.data) {
        map.set(ev.id, calificacionesQueries[i].data!);
      }
    });
    return map;
  }, [cerradas, calificacionesQueries]);

  const studentRows = useMemo<StudentRow[]>(() => {
    if (!canManageMateria || estudiantesList.length === 0) return [];

    return estudiantesList.map((est) => {
      const cals = new Map<string, Calificacion>();
      let total = 0;
      let count = 0;
      let conf = 0;

      for (const [evId, calList] of calificacionesPorEval) {
        const cal = calList.find((c) => c.estudiante_id === est.id);
        if (cal) {
          cals.set(evId, cal);
          const nota = cal.nota_confirmada ?? cal.nota_sugerida;
          if (nota != null) { total += nota; count++; }
          if (cal.estado === 'confirmada') conf++;
        }
      }

      return {
        id: est.id,
        nombre: est.nombre,
        email: est.email,
        calificaciones: cals,
        promedio: count > 0 ? total / count : 0,
        confirmadas: conf,
      };
    });
  }, [estudiantesList, calificacionesPorEval, canManageMateria]);

  const sorted = useMemo(() => {
    return [...studentRows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'nombre') cmp = a.nombre.localeCompare(b.nombre);
      else if (sortField === 'promedio') cmp = a.promedio - b.promedio;
      else if (sortField === 'confirmadas') cmp = a.confirmadas - b.confirmadas;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [studentRows, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  if (canManageMateria) {
    const loadingCalifs = calificacionesQueries.some((q) => q.isLoading);

    return (
      <div className="space-y-4">
        {abiertas.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="font-semibold">{abiertas.length} evaluación(es) activa(s)</span>
            <span className="opacity-80">— las notas aparecerán cuando cierres las evaluaciones.</span>
          </div>
        )}

        {loadingCalifs || evaluacionesQuery.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : cerradas.length === 0 ? (
          <EmptyState icon={FileText} title="Sin evaluaciones cerradas" description="Las notas de tus estudiantes aparecerán aquí cuando cierres las evaluaciones." />
        ) : sorted.length === 0 ? (
          <EmptyState icon={Users} title="Sin estudiantes" description="Matricula estudiantes para ver sus notas." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border" role="region" aria-label="Calificaciones por estudiante y evaluación" tabIndex={0}>
            <table className="min-w-[640px] w-full text-sm">
              <caption className="sr-only">Calificaciones cerradas, promedios y estado de cada estudiante</caption>
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left">
                  <th className="sticky left-0 z-10 bg-surface-2 px-2 py-1 text-left font-semibold text-secondary" aria-sort={sortField === 'nombre' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => toggleSort('nombre')} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-md px-2">
                      Estudiante <SortIcon field="nombre" />
                    </button>
                  </th>
                  {cerradas.map((ev) => (
                    <th key={ev.id} className="px-3 py-3 font-semibold text-muted whitespace-nowrap text-center" title={ev.nombre}>
                      {ev.nombre.length > 12 ? ev.nombre.slice(0, 12) + '…' : ev.nombre}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center font-semibold text-secondary" aria-sort={sortField === 'promedio' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => toggleSort('promedio')} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-md px-2">
                      Promedio <SortIcon field="promedio" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="sticky left-0 bg-surface px-4 py-3 font-medium">{row.nombre}</td>
                    {cerradas.map((ev) => {
                      const cal = row.calificaciones.get(ev.id);
                      return (
                        <td key={ev.id} className="px-3 py-3 text-center">
                          {cal ? (
                            <span className={cn(
                              'font-semibold',
                              cal.estado === 'confirmada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                            )}>
                              {cal.nota_confirmada?.toFixed(1) ?? cal.nota_sugerida?.toFixed(1) ?? '-'}
                            </span>
                          ) : (
                            <span className="text-muted/40">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold">
                      {row.promedio > 0 ? row.promedio.toFixed(1) : <span className="text-muted/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Student view
  return <StudentBoletin materiaId={materia.id} />;
}

// Uses the existing BoletinPage API for student view
function StudentBoletin({ materiaId }: { materiaId: string }) {
  const { user } = useAuth();
  const estudianteId = user?.id ?? '';
  const { data: boletin, isLoading } = useQuery({
    queryKey: ['boletin', estudianteId, materiaId],
    queryFn: () => getBoletin(estudianteId, materiaId),
    enabled: Boolean(estudianteId) && Boolean(materiaId),
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  if (!boletin || boletin.length === 0) {
    return <EmptyState icon={FileText} title="Sin notas aún" description="Cuando tu docente confirme las notas, aparecerán aquí." />;
  }

  return (
    <div className="space-y-3">
      {boletin.map((item) => (
        <Card key={item.evaluacion_id} className="flex items-center justify-between p-5">
          <div>
            <p className="font-semibold">{item.evaluacion_nombre}</p>
            <p className="text-sm text-muted">{item.feedback ?? 'Sin retroalimentación'}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold">
              {item.nota_confirmada?.toFixed(1) ?? <span className="text-muted/40">—</span>}
            </p>
            <p className="text-xs text-muted">/ {item.nota_maxima.toFixed(1)}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
