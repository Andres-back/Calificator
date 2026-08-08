import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Search,
  TriangleAlert,
  UserRoundSearch,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  RichContent,
  Skeleton,
} from '@/components/ui';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import {
  getBoletin,
  listCalificaciones,
} from '@/modules/calificaciones/api';
import { routes } from '@/config/routes';
import { useAuth } from '@/stores/auth';
import type { Calificacion } from '@/types/api';
import { useMateriaContext } from './MateriaContext';
import {
  buildFollowUpRows,
  normalizeNumeric,
  summarizeFollowUp,
  type FollowUpCell,
  type FollowUpPriority,
  type FollowUpRow,
} from './gradebookModel';

type FollowUpFilter = 'todos' | 'prioridad' | 'por_revisar';

const priorityPresentation: Record<
  FollowUpPriority,
  {
    label: string;
    tone: 'error' | 'warning' | 'success' | 'neutral';
    cardClass: string;
  }
> = {
  alta: {
    label: 'Atención prioritaria',
    tone: 'error',
    cardClass:
      'border-rose-200 dark:border-rose-500/30',
  },
  seguimiento: {
    label: 'Conviene revisar',
    tone: 'warning',
    cardClass:
      'border-amber-200 dark:border-amber-500/30',
  },
  estable: {
    label: 'Seguimiento estable',
    tone: 'success',
    cardClass:
      'border-emerald-200 dark:border-emerald-500/30',
  },
  sin_datos: {
    label: 'Faltan datos',
    tone: 'neutral',
    cardClass: 'border-border',
  },
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function gradingHref(
  materiaId: string,
  evaluationId: string,
  studentId: string,
): string {
  const params = new URLSearchParams({
    evaluacion: evaluationId,
    estudiante: studentId,
  });
  return `${routes.materiaCalificar(materiaId)}?${params.toString()}`;
}

function suggestedScore(cell: FollowUpCell): number | null {
  return normalizeNumeric(cell.grade?.nota_sugerida);
}

function nextAction(row: FollowUpRow): {
  cell: FollowUpCell;
  label: string;
} | null {
  const pending = row.cells.find((cell) => cell.status === 'por_revisar');
  if (pending) return { cell: pending, label: 'Revisar sugerencia' };

  const missing = row.cells.find((cell) => cell.status === 'sin_nota');
  if (missing) return { cell: missing, label: 'Calificar evaluación pendiente' };

  const weakest = [...row.cells]
    .filter((cell) => cell.status === 'decidida')
    .sort(
      (a, b) =>
        (a.percentage ?? Number.POSITIVE_INFINITY) -
        (b.percentage ?? Number.POSITIVE_INFINITY),
    )[0];
  return weakest
    ? { cell: weakest, label: 'Revisar retroalimentación' }
    : null;
}

function GradeCell({ cell }: { cell: FollowUpCell }) {
  if (cell.status === 'decidida') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold" title={cell.evaluationName}>
            {cell.evaluationName}
          </p>
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300"
            aria-label="Decisión guardada"
          />
        </div>
        <p className="mt-2 font-display text-xl font-extrabold">
          {cell.score?.toFixed(1)}
          <span className="ml-1 text-sm font-semibold text-muted">
            / {cell.maximumScore.toFixed(1)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {cell.percentage?.toFixed(0)}% del puntaje
        </p>
      </div>
    );
  }

  if (cell.status === 'por_revisar') {
    const suggestion = suggestedScore(cell);
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold" title={cell.evaluationName}>
            {cell.evaluationName}
          </p>
          <CircleHelp
            className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
            aria-label="Pendiente de decisión docente"
          />
        </div>
        <Badge tone="warning" className="mt-2">
          Falta tu decisión
        </Badge>
        {suggestion != null ? (
          <p className="mt-2 text-xs text-muted">
            Sugerencia IA: {suggestion.toFixed(1)} · no definitiva
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-2/60 p-3">
      <p className="truncate text-sm font-semibold" title={cell.evaluationName}>
        {cell.evaluationName}
      </p>
      <Badge tone="neutral" className="mt-2">
        Sin calificación
      </Badge>
      <p className="mt-2 text-xs text-muted">
        Falta registrar o analizar la evidencia.
      </p>
    </div>
  );
}

function TeacherGradebook() {
  const { materia, canManageMateria } = useMateriaContext();
  const [filter, setFilter] = useState<FollowUpFilter>('todos');
  const [search, setSearch] = useState('');

  const students = useMemo(() => {
    if (
      'estudiantes' in materia &&
      Array.isArray((materia as { estudiantes: unknown }).estudiantes)
    ) {
      return (
        materia as {
          estudiantes: Array<{
            id: string;
            nombre: string;
            email: string;
          }>;
        }
      ).estudiantes;
    }
    return [];
  }, [materia]);

  const evaluationsQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const evaluations = evaluationsQuery.data ?? [];
  const trackedEvaluations = evaluations.filter(
    (evaluation) => evaluation.estado !== 'borrador',
  );
  const openEvaluations = trackedEvaluations.filter(
    (evaluation) => evaluation.estado !== 'cerrada',
  );

  const gradeQueries = useQueries({
    queries: trackedEvaluations.map((evaluation) => ({
      queryKey: ['calificaciones', evaluation.id],
      queryFn: () => listCalificaciones(evaluation.id),
      enabled: Boolean(evaluation.id) && canManageMateria,
    })),
  });

  const gradesByEvaluation = useMemo(() => {
    const grades = new Map<string, Calificacion[]>();
    trackedEvaluations.forEach((evaluation, index) => {
      const data = gradeQueries[index]?.data;
      if (data) grades.set(evaluation.id, data);
    });
    return grades;
  }, [trackedEvaluations, gradeQueries]);

  const rows = useMemo(
    () =>
      buildFollowUpRows({
        students,
        evaluations: trackedEvaluations,
        gradesByEvaluation,
      }),
    [trackedEvaluations, gradesByEvaluation, students],
  );
  const summary = useMemo(() => summarizeFollowUp(rows), [rows]);

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.nombre.toLocaleLowerCase('es').includes(normalizedSearch) ||
        row.email.toLocaleLowerCase('es').includes(normalizedSearch);
      if (!matchesSearch) return false;
      if (filter === 'prioridad') {
        return row.priority === 'alta' || row.priority === 'seguimiento';
      }
      if (filter === 'por_revisar') return row.pendingReview > 0;
      return true;
    });
  }, [filter, rows, search]);

  const isLoading =
    evaluationsQuery.isLoading ||
    gradeQueries.some((query) => query.isLoading);
  const failedQuery = gradeQueries.find((query) => query.isError);
  const isError = evaluationsQuery.isError || Boolean(failedQuery);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-52" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-center">
        <TriangleAlert className="mx-auto h-9 w-9 text-rose-600" />
        <h2 className="mt-3 font-display text-lg font-bold">
          No pudimos cargar el seguimiento
        </h2>
        <p className="mt-1 text-sm text-muted">
          Revisa tu conexión e inténtalo nuevamente.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            void evaluationsQuery.refetch();
            gradeQueries.forEach((query) => void query.refetch());
          }}
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  if (trackedEvaluations.length === 0) {
    return (
      <div className="space-y-4">
        {openEvaluations.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <strong>
              {openEvaluations.length}{' '}
              {openEvaluations.length === 1
                ? 'evaluación activa'
                : 'evaluaciones activas'}
            </strong>
            <span className="mt-1 block">
              El seguimiento aparecerá cuando cierres al menos una evaluación.
            </span>
          </div>
        ) : null}
        <EmptyState
          icon={BookOpenCheck}
          title="Todavía no hay evaluaciones publicadas"
          description="Publica una evaluación o taller para organizar aquí las notas y el seguimiento de cada estudiante."
        />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No hay estudiantes"
        description="Matricula estudiantes para ver su seguimiento académico."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <UserRoundSearch className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-extrabold">
              Libro de notas por evaluación
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              Empieza por quienes aparecen primero. La prioridad es una
              sugerencia basada en decisiones docentes, evaluaciones faltantes
              y porcentaje del puntaje; tú decides el acompañamiento.
            </p>
          </div>
        </div>
      </Card>

      {openEvaluations.length > 0 ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <strong>
            {openEvaluations.length}{' '}
            {openEvaluations.length === 1
              ? 'evaluación sigue activa'
              : 'evaluaciones siguen activas'}
          </strong>
          <span className="mt-1 block">
            Sus notas ya aparecen en este libro y pueden cambiar hasta que cierres cada evaluación.
          </span>
        </div>
      ) : null}

      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumen del seguimiento"
        aria-live="polite"
      >
        <Card className="border-rose-200 p-4 dark:border-rose-500/30">
          <TriangleAlert
            className="h-6 w-6 text-rose-700 dark:text-rose-300"
            aria-hidden="true"
          />
          <strong className="mt-3 block font-display text-2xl">
            {summary.highPriority}
          </strong>
          <span className="text-sm text-muted">Atención prioritaria</span>
        </Card>
        <Card className="border-amber-200 p-4 dark:border-amber-500/30">
          <UserRoundSearch
            className="h-6 w-6 text-amber-700 dark:text-amber-300"
            aria-hidden="true"
          />
          <strong className="mt-3 block font-display text-2xl">
            {summary.needsFollowUp}
          </strong>
          <span className="text-sm text-muted">Conviene revisar</span>
        </Card>
        <Card className="border-sky-200 p-4 dark:border-sky-500/30">
          <CircleHelp
            className="h-6 w-6 text-sky-700 dark:text-sky-300"
            aria-hidden="true"
          />
          <strong className="mt-3 block font-display text-2xl">
            {summary.pendingGrades}
          </strong>
          <span className="text-sm text-muted">Sugerencias sin decisión</span>
        </Card>
        <Card className="border-emerald-200 p-4 dark:border-emerald-500/30">
          <ClipboardCheck
            className="h-6 w-6 text-emerald-700 dark:text-emerald-300"
            aria-hidden="true"
          />
          <strong className="mt-3 block font-display text-2xl">
            {summary.teacherDecisions}
          </strong>
          <span className="text-sm text-muted">Decisiones guardadas</span>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-bold">Buscar estudiante</span>
            <span className="relative mt-1.5 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                placeholder="Escribe un nombre o correo"
              />
            </span>
          </label>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filtrar estudiantes"
          >
            {(
              [
                ['todos', `Todos (${summary.students})`],
                [
                  'prioridad',
                  `Prioridad (${summary.highPriority + summary.needsFollowUp})`,
                ],
                ['por_revisar', `Por decidir (${summary.pendingGrades})`],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? 'primary' : 'outline'}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No encontramos estudiantes"
          description="Prueba otro nombre o cambia el filtro seleccionado."
        />
      ) : (
        <div className="space-y-4">
          {visibleRows.map((row) => {
            const presentation = priorityPresentation[row.priority];
            const action = nextAction(row);
            return (
              <Card
                key={row.id}
                className={`overflow-hidden ${presentation.cardClass}`}
              >
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-sm font-extrabold">
                        {initials(row.nombre)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-bold">
                          {row.nombre}
                        </h3>
                        <p className="truncate text-sm text-muted">
                          {row.email}
                        </p>
                        <Badge tone={presentation.tone} className="mt-2">
                          {presentation.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">
                        Promedio comparable
                      </p>
                      <p className="mt-1 font-display text-3xl font-extrabold">
                        {row.averagePercent == null
                          ? '—'
                          : `${row.averagePercent.toFixed(0)}%`}
                      </p>
                      <p className="text-xs text-muted">
                        {row.decided} de {trackedEvaluations.length}{' '}
                        {trackedEvaluations.length === 1
                          ? 'decisión'
                          : 'decisiones'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-surface-2/70 p-3 text-sm">
                    <strong>Por qué aparece aquí:</strong>{' '}
                    <span className="text-muted">{row.reason}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {row.cells.map((cell) => (
                      <GradeCell key={cell.evaluationId} cell={cell} />
                    ))}
                  </div>
                </div>

                {action ? (
                  <div className="flex flex-col gap-3 border-t border-border bg-surface-2/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted">
                      Siguiente paso sugerido:{' '}
                      <strong className="text-fg">
                        {action.cell.evaluationName}
                      </strong>
                    </p>
                    <Link
                      to={gradingHref(
                        materia.id,
                        action.cell.evaluationId,
                        row.id,
                      )}
                      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-700 bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
                    >
                      {action.label}
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </Link>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4 text-sm text-muted">
        <strong className="text-fg">Cómo se calcula:</strong> cada nota se
        convierte al porcentaje de su puntaje máximo antes de promediar. Menos
        de 60% se muestra como atención prioritaria; entre 60% y 75%, datos
        faltantes o sugerencias sin decisión se muestran para revisión. Es una
        ayuda para organizar el trabajo, no un diagnóstico automático.
      </Card>
    </div>
  );
}

export function MateriaBoletin() {
  const { materia, canManageMateria } = useMateriaContext();
  return canManageMateria ? (
    <TeacherGradebook />
  ) : (
    <StudentGradebook materiaId={materia.id} />
  );
}

function StudentGradebook({ materiaId }: { materiaId: string }) {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const { data: boletin, isLoading, isError, refetch } = useQuery({
    queryKey: ['boletin', studentId, materiaId],
    queryFn: () => getBoletin(studentId, materiaId),
    enabled: Boolean(studentId) && Boolean(materiaId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-center">
        <TriangleAlert className="mx-auto h-9 w-9 text-rose-600" />
        <p className="mt-3 font-bold">No pudimos cargar tus notas.</p>
        <Button className="mt-4" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </Card>
    );
  }

  if (!boletin || boletin.length === 0) {
    return (
      <EmptyState
        icon={BookOpenCheck}
        title="Todavía no hay notas"
        description="Cuando tu docente revise y publique las notas, aparecerán aquí con su retroalimentación."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
        <h2 className="font-display text-xl font-extrabold">Mis avances</h2>
        <p className="mt-1 text-sm text-muted">
          Revisa la nota y, sobre todo, la retroalimentación de tu docente.
        </p>
      </Card>
      {boletin.map((item) => {
        const score = normalizeNumeric(item.nota_confirmada);
        const maximum = normalizeNumeric(item.nota_maxima);
        return (
          <Card key={item.evaluacion_id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold">
                  {item.evaluacion_nombre}
                </h3>
                <div className="mt-3 rounded-xl bg-surface-2 p-4 text-sm text-muted">
                  {item.feedback ? (
                    <RichContent content={item.feedback} variant="feedback" />
                  ) : (
                    'Tu docente todavía no agregó retroalimentación.'
                  )}
                </div>
              </div>
              <div className="min-w-24 rounded-xl bg-brand-700 p-4 text-center text-white">
                <p className="font-display text-3xl font-extrabold">
                  {score == null ? '—' : score.toFixed(1)}
                </p>
                <p className="text-xs text-white/75">
                  / {maximum == null ? '—' : maximum.toFixed(1)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
