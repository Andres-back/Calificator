import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpenCheck,
  Search,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
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
import { isGradeProcessing } from '@/modules/calificaciones/gradePresentation';
import { useMateriaContext } from './MateriaContext';
import { StudentResultCard } from '@/modules/calificaciones/StudentResultCard';
import { GradebookExport } from './GradebookExport';
import { StudentGradebookPreview, StudentGradeSummary } from './StudentGradebookPreview';
import {
  buildFollowUpRows,
  summarizeFollowUp,
} from './gradebookModel';

type FollowUpFilter = 'todos' | 'prioridad' | 'por_revisar';

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
  returnTo?: string,
  gradeId?: string,
): string {
  const params = new URLSearchParams({
    materia: materiaId,
    evaluacion: evaluationId,
    estudiante: studentId,
  });
  if (returnTo) params.set('volver', returnTo);
  if (gradeId) params.set('calificacion', gradeId);
  return `${routes.calificacionesWorkspace}?${params.toString()}`;
}

function TeacherGradebook() {
  const { materia } = useMateriaContext();
  const user = useAuth((state) => state.user);
  const canReadGrades = Boolean(user?.permissions?.includes('grading.read'));
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<FollowUpFilter>(() => params.get('filtro') === 'prioridad' ? 'prioridad' : params.get('filtro') === 'por_revisar' ? 'por_revisar' : 'todos');
  const [search, setSearch] = useState(() => params.get('buscar') ?? '');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(() => params.get('evaluacion') ?? '');
  const [selectionNotice, setSelectionNotice] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [selection, setSelection] = useState<{ materiaId: string; userId: string; studentId: string } | null>(null);
  const students = useMemo(() => 'estudiantes' in materia ? materia.estudiantes : [], [materia]);
  const selectedStudent = canReadGrades && selection?.materiaId === materia.id && selection?.userId === user?.id
    ? students.find(student => student.id === selection.studentId)
    : undefined;
  useEffect(() => {
    if (!selectedStudent) setSelection(null);
  }, [selectedStudent]);

  const evaluationsQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });
  const trackedEvaluations = useMemo(() => (evaluationsQuery.data ?? []).filter(evaluation => evaluation.estado !== 'borrador'), [evaluationsQuery.data]);
  const selectedEvaluation = trackedEvaluations.find(evaluation => evaluation.id === selectedEvaluationId);
  const visibleEvaluations = useMemo(() => selectedEvaluation ? [selectedEvaluation] : trackedEvaluations, [selectedEvaluation, trackedEvaluations]);
  useEffect(() => {
    if (selectedEvaluationId && evaluationsQuery.isSuccess && !evaluationsQuery.isFetching && !trackedEvaluations.some(evaluation => evaluation.id === selectedEvaluationId)) {
      setSelectedEvaluationId('');
      setSelectionNotice('La evaluación seleccionada ya no está disponible. Mostramos todas las evaluaciones.');
    }
  }, [evaluationsQuery.isFetching, evaluationsQuery.isSuccess, selectedEvaluationId, trackedEvaluations]);

  const visibleIds = new Set(visibleEvaluations.map(evaluation => evaluation.id));
  const gradeQueries = useQueries({
    queries: trackedEvaluations.map(evaluation => ({
      queryKey: ['calificaciones', evaluation.id, 'solo-lectura', materia.id, user?.id],
      queryFn: () => listCalificaciones(evaluation.id, { readOnly: true }),
      enabled: canReadGrades && (visibleIds.has(evaluation.id) || Boolean(selectedStudent)),
      staleTime: 30_000,
      refetchInterval: (query: { state: { data: Calificacion[] | undefined } }) => query.state.data?.some(isGradeProcessing) ? 5_000 : false,
    })),
  });
  const visibleQueries = gradeQueries.filter((_, index) => visibleIds.has(trackedEvaluations[index].id));
  const gradesByEvaluation = new Map<string, Calificacion[]>();
  trackedEvaluations.forEach((evaluation, index) => {
    const data = gradeQueries[index]?.data;
    if (data) gradesByEvaluation.set(evaluation.id, data);
  });
  const rows = buildFollowUpRows({ students, evaluations: canReadGrades ? visibleEvaluations : [], gradesByEvaluation });
  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const searchRows = rows.filter(row => !normalizedSearch || row.nombre.toLocaleLowerCase('es').includes(normalizedSearch) || row.email.toLocaleLowerCase('es').includes(normalizedSearch));
  const summary = summarizeFollowUp(searchRows);
  const pendingStudents = searchRows.filter(row => row.pendingReview > 0).length;
  const visibleRows = searchRows.filter(row => !canReadGrades || filter === 'todos' || (filter === 'por_revisar' ? row.pendingReview > 0 : row.priority === 'alta' || row.priority === 'seguimiento'));
  const duplicateNames = new Set(students.filter((student, index) => students.findIndex(other => other.nombre.trim().toLocaleLowerCase('es') === student.nombre.trim().toLocaleLowerCase('es')) !== index).map(student => student.nombre.trim().toLocaleLowerCase('es')));
  const previewRow = selectedStudent ? buildFollowUpRows({ students: [selectedStudent], evaluations: trackedEvaluations, gradesByEvaluation })[0] : undefined;
  const previewError = gradeQueries.some(query => query.isError);
  const previewLoading = gradeQueries.some(query => query.data === undefined && !query.isError);
  const returnParams = new URLSearchParams();
  if (selectedEvaluationId) returnParams.set('evaluacion', selectedEvaluationId);
  if (search) returnParams.set('buscar', search);
  if (filter !== 'todos') returnParams.set('filtro', filter);
  const returnTo = `${routes.materiaBoletin(materia.id)}${returnParams.size ? `?${returnParams}` : ''}`;

  if (evaluationsQuery.isLoading || (canReadGrades && visibleQueries.some(query => query.isLoading))) {
    return <div role="status" aria-label="Cargando boletines" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40" />)}</div>;
  }
  if (evaluationsQuery.isError || (canReadGrades && visibleQueries.some(query => query.isError))) {
    return <Card className="p-6 text-center">
      <TriangleAlert className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
      <h2 className="mt-3 font-bold">No pudimos cargar el boletín</h2>
      <p className="mt-1 text-sm text-muted">Revisa tu conexión e inténtalo nuevamente.</p>
      <Button className="mt-4 min-h-11" onClick={() => {
        if (evaluationsQuery.isError) void evaluationsQuery.refetch();
        visibleQueries.filter(query => query.isError).forEach(query => void query.refetch());
      }}>Reintentar</Button>
    </Card>;
  }
  if (!students.length) {
    return <EmptyState icon={Users} title="No hay estudiantes" description="Matricula estudiantes para consultar sus notas." />;
  }

  return <div className="space-y-4">
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-extrabold">Boletines</h2><p className="mt-1 text-sm text-muted">Selecciona un estudiante para ver sus notas.</p></div>
        {canReadGrades && trackedEvaluations.length > 0 && <Button variant="outline" className="min-h-11" onClick={() => { setSelection(null); setExportOpen(true); }}>Exportar notas</Button>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0"><span className="text-sm font-semibold">Buscar estudiante</span>
          <span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input type="search" value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 pl-10 text-base" placeholder="Nombre o correo" />
          </span>
        </label>
        {canReadGrades && <label className="block min-w-0" htmlFor="gradebook-evaluation"><span className="text-sm font-semibold">Filtrar por evaluación</span>
          <Select id="gradebook-evaluation" className="mt-1 min-h-11 text-base" value={selectedEvaluationId} onChange={event => { setSelectedEvaluationId(event.target.value); setSelectionNotice(''); }}>
            <option value="">Todas las evaluaciones</option>
            {trackedEvaluations.map(evaluation => <option key={evaluation.id} value={evaluation.id}>{evaluation.nombre}</option>)}
          </Select>
        </label>}
      </div>
      {search && <Button variant="ghost" className="mt-2 min-h-11" onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
      {selectionNotice && <p role="status" className="mt-2 text-sm text-muted">{selectionNotice}</p>}
      {canReadGrades && <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar estudiantes">
        {([['todos', `Todos (${summary.students})`], ['prioridad', `Prioridad (${summary.highPriority + summary.needsFollowUp})`], ['por_revisar', `Por decidir (${pendingStudents})`]] as const).map(([value, label]) => <Button key={value} size="sm" className="min-h-11" variant={filter === value ? 'primary' : 'outline'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}
      </div>}
    </Card>

    {!canReadGrades && <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">No tienes permiso para consultar las notas.</p>}
    {visibleRows.length === 0 ? <div className="space-y-3">
      <EmptyState icon={Search} title="No encontramos estudiantes" description="Prueba otro nombre o cambia el filtro." />
      <Button variant="outline" className="min-h-11" onClick={() => { setFilter('todos'); setSearch(''); }}>Mostrar todo el grupo</Button>
    </div> : <ul aria-label="Estudiantes del boletín" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {visibleRows.map(row => <li key={row.id} className="min-w-0">
        <button type="button" aria-label={`Ver boletín de ${row.nombre}`} disabled={!canReadGrades} onClick={event => {
          if (user?.id && canReadGrades) {
            // Safari no enfoca los botones al tocarlos; Modal necesita el origen para devolver el foco sin mover la lista.
            event.currentTarget.focus({ preventScroll: true });
            setExportOpen(false);
            setSelection({ materiaId: materia.id, userId: user.id, studentId: row.id });
          }
        }} className="focus-ring group flex h-full min-h-11 w-full flex-col items-start rounded-2xl border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-50/50 disabled:cursor-default disabled:hover:bg-surface dark:hover:bg-brand-500/10 sm:p-4">
          <span className="mb-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200" aria-hidden="true">{initials(row.nombre)}</span>
          <span className="w-full break-words text-sm font-bold leading-5 [overflow-wrap:anywhere]">{row.nombre}</span>
          {duplicateNames.has(row.nombre.trim().toLocaleLowerCase('es')) && <span className="mt-1 w-full break-all text-xs text-muted">{row.email}</span>}
          {canReadGrades && <div className="mt-3 w-full">
            {selectedEvaluation ? <StudentGradeSummary cell={row.cells[0]} /> : trackedEvaluations.length ? <p className="text-xs leading-5 text-muted">{row.decided} con nota · {row.cells.length - row.decided} pendientes</p> : <p className="text-xs text-muted">Todavía no hay notas</p>}
          </div>}
          {canReadGrades && <span className="mt-auto flex min-h-11 items-center gap-1 pt-2 text-xs font-semibold text-brand-700 dark:text-brand-200">Ver boletín <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>}
        </button>
      </li>)}
    </ul>}

    {canReadGrades && trackedEvaluations.length > 0 && <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="focus-ring min-h-11 cursor-pointer py-2 font-semibold">Resumen y seguimiento{selectedEvaluation ? ' de esta evaluación' : ' del grupo'}</summary>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" aria-label="Resumen del seguimiento">
        {[['Atención prioritaria', summary.highPriority], ['Conviene revisar', summary.needsFollowUp], ['Sugerencias sin decisión', summary.pendingGrades], ['Decisiones guardadas', summary.teacherDecisions]].map(([label, value]) => <div key={label} className="rounded-xl bg-surface-2 p-3"><dt className="text-muted">{label}</dt><dd className="mt-1 text-xl font-bold">{value}</dd></div>)}
      </dl>
      <p className="mt-3 text-sm text-muted">La prioridad considera el promedio de las notas decididas según su escala y los resultados pendientes. Es una ayuda de seguimiento, no un diagnóstico.</p>
    </details>}

    {selectedStudent && previewRow && !exportOpen && <StudentGradebookPreview
      student={selectedStudent} materiaName={materia.nombre} cells={previewRow.cells}
      loading={previewLoading} error={previewError}
      onClose={() => setSelection(null)}
      onRetry={() => gradeQueries.filter(query => query.isError).forEach(query => void query.refetch())}
      explanationHref={cell => gradingHref(materia.id, cell.evaluationId, selectedStudent.id, returnTo, cell.grade?.id)}
    />}
    {exportOpen && canReadGrades && <GradebookExport materiaId={materia.id} materiaName={materia.nombre} evaluations={trackedEvaluations} initialEvaluationId={selectedEvaluationId} studentCount={students.length} onClose={() => setExportOpen(false)} />}
  </div>;
}

export function MateriaBoletin() {
  const { materia, canManageMateria } = useMateriaContext();
  const userId = useAuth(state => state.user?.id);
  return canManageMateria ? (
    <TeacherGradebook key={materia.id + userId} />
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
        <h2 className="font-display text-xl font-extrabold">Mis resultados</h2>
        <p className="mt-1 text-sm text-muted">
          Consulta tus notas y cómo mejorar.
        </p>
      </Card>
      {boletin.map((item) => <StudentResultCard key={item.evaluacion_id} item={item} />)}
    </div>
  );
}
