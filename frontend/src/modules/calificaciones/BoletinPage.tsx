import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, GraduationCap, ShieldCheck, HelpCircle, CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import { Badge, statusTone, Button, Card, EmptyState, Field, Select, Skeleton, GuidedTour, RichContent, QueryError } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { getMateriaEstudiantes, listMaterias } from '@/modules/materias/api';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { getBoletin } from './api';
import { boletinTour } from './tourSteps';
import type { BoletinItem, User } from '@/types/api';

function studentLabel(student: User) {
  return student.nombre || student.email || student.id.slice(0, 8);
}

function formatScore(item: BoletinItem) {
  if (item.nota_confirmada == null) return 'Pendiente';
  return `${Number(item.nota_confirmada).toFixed(1)} / ${Number(item.nota_maxima).toFixed(1)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString();
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    en_calificacion: 'En calificación',
    pendiente_revision: 'Pendiente de revisión',
    confirmada: 'Confirmada',
    cerrada: 'Cerrada',
  };
  return labels[value] ?? value.split('_').join(' ');
}

function BoletinList({ items }: { items: BoletinItem[] }) {
  return (
    <div className="grid gap-3" data-tour="boletin-lista">
      {items.map((item) => {
        const confirmed = item.nota_confirmada != null;
        return (
          <Card key={`${item.evaluacion_id}-${item.estado}`} className={`border-l-4 p-5 ${confirmed ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.evaluacion_nombre}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={confirmed ? 'success' : 'warning'}>
                    {confirmed ? 'Nota confirmada' : 'Pendiente de confirmación docente'}
                  </Badge>
                  <Badge tone={statusTone[item.estado] ?? 'neutral'}>{formatStatus(item.estado)}</Badge>
                  <Badge tone="neutral">{formatDate(item.fecha)}</Badge>
                </div>
                {item.feedback && (
                  <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-muted">
                    <RichContent content={item.feedback} variant="feedback" />
                  </div>
                )}
              </div>
              <div className="min-w-[150px] rounded-lg bg-surface-2 px-4 py-3 text-left sm:text-right">
                <p className="font-display text-xl font-extrabold text-fg">{formatScore(item)}</p>
                <p className="text-xs text-muted">{confirmed ? 'definitiva' : 'no definitiva'}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function BoletinPage() {
  const user = useAuth((state) => state.user);
  const isStudent = user?.rol === 'estudiante';
  const [materiaId, setMateriaId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [tourOpen, setTourOpen] = useState(false);

  const { data: materias, isLoading: loadingMaterias, isError: materiasError, error: materiasQueryError, refetch: refetchMaterias } = useQuery({
    queryKey: ['materias'],
    queryFn: listMaterias,
  });

  useEffect(() => {
    if (!materiaId && materias?.[0]) setMateriaId(materias[0].id);
  }, [materiaId, materias]);

  const { data: materiaConEstudiantes, isLoading: loadingEstudiantes, isError: estudiantesError, error: estudiantesQueryError, refetch: refetchEstudiantes } = useQuery({
    queryKey: ['materia-estudiantes', materiaId],
    queryFn: () => getMateriaEstudiantes(materiaId),
    enabled: !!materiaId && !isStudent,
  });

  const estudiantes = useMemo(() => materiaConEstudiantes?.estudiantes ?? [], [materiaConEstudiantes?.estudiantes]);

  useEffect(() => {
    if (isStudent) {
      setStudentId(user?.id ?? '');
      return;
    }
    if (estudiantes.length > 0 && !estudiantes.find((student) => student.id === studentId)) {
      setStudentId(estudiantes[0].id);
    }
    if (estudiantes.length === 0) setStudentId('');
  }, [estudiantes, isStudent, studentId, user?.id]);

  const canFetchBoletin = Boolean(materiaId && (isStudent ? user?.id : studentId));
  const boletinStudentId = isStudent ? user?.id ?? '' : studentId;

  const {
    data: boletin,
    isLoading: loadingBoletin,
    error: boletinError,
    isError: boletinIsError,
    refetch: refetchBoletin,
  } = useQuery({
    queryKey: ['boletin', boletinStudentId, materiaId],
    queryFn: () => getBoletin(boletinStudentId, materiaId),
    enabled: canFetchBoletin,
    retry: false,
    refetchInterval: isStudent ? 10_000 : false,
    refetchOnWindowFocus: true,
  });

  const noMaterias = !loadingMaterias && (!materias || materias.length === 0);
  const boletinSummary = useMemo(() => {
    const items = boletin ?? [];
    const confirmed = items.filter((item) => item.nota_confirmada != null).length;
    return { total: items.length, confirmed, pending: items.length - confirmed };
  }, [boletin]);


  return (
    <div className="space-y-6">
      <PageHeader
        title={isStudent ? 'Mi boletin' : 'Boletin'}
        eyebrow="Seguimiento académico"
        subtitle="Consulta notas confirmadas y retroalimentación organizada. Este boletín es informativo y no editable."
        action={
          <Button variant="outline" onClick={() => setTourOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            ¿Cómo se usa?
          </Button>
        }
      />

      <GuidedTour steps={boletinTour} open={tourOpen} onClose={() => setTourOpen(false)} tourId="boletin" role={user?.rol ?? 'estudiante'} version={1} />

      <Card data-tour="boletin-info" className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
        <div>
          <p className="font-semibold">Solo las notas confirmadas son definitivas.</p>
          <p className="text-sm text-muted">Si una evaluación aún no tiene nota confirmada, aparecerá como pendiente de confirmación docente.</p>
        </div>
      </Card>

      {materiasError ? (
        <QueryError error={materiasQueryError} onRetry={() => void refetchMaterias()} />
      ) : noMaterias ? (
        <EmptyState icon={GraduationCap} title="No hay materias disponibles" />
      ) : (
        <>
          <Card className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Materia" required>
              {loadingMaterias ? (
                <Skeleton className="h-11" />
              ) : (
                <Select data-tour="boletin-materia" value={materiaId} onChange={(event) => setMateriaId(event.target.value)}>
                  <option value="">Selecciona una materia</option>
                  {materias?.map((materia) => <option key={materia.id} value={materia.id}>{materia.nombre}</option>)}
                </Select>
              )}
            </Field>

            {!isStudent && (
              <Field label="Estudiante" required>
                {loadingEstudiantes ? (
                  <Skeleton className="h-11" />
                ) : (
                  <Select data-tour="boletin-estudiante" value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={!materiaId || estudiantes.length === 0}>
                    {estudiantes.length === 0 && <option value="">Sin estudiantes matriculados</option>}
                    {estudiantes.map((student) => (
                      <option key={student.id} value={student.id}>{studentLabel(student)}</option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </Card>

          {!materiaId ? (
            <EmptyState icon={GraduationCap} title="Selecciona una materia" description="Debes seleccionar una materia para consultar el boletin." />
          ) : !isStudent && estudiantesError ? (
            <QueryError error={estudiantesQueryError} onRetry={() => void refetchEstudiantes()} title="No fue posible cargar los estudiantes" />
          ) : !isStudent && !studentId ? (
            <EmptyState icon={GraduationCap} title="Selecciona un estudiante" description="Debes seleccionar un estudiante para consultar su boletin." />
          ) : loadingBoletin ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
            </div>
          ) : boletinIsError ? (
            <QueryError
              error={boletinError}
              onRetry={() => void refetchBoletin()}
              title={toApiError(boletinError).status === 403 ? 'No tienes acceso a este boletín' : undefined}
            />          ) : !boletin || boletin.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Sin boletin disponible" description="Aun no hay notas confirmadas o registros para esta seleccion." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <BulletinMetric icon={ListChecks} label="Evaluaciones" value={boletinSummary.total} tone="neutral" />
                <BulletinMetric icon={CheckCircle2} label="Confirmadas" value={boletinSummary.confirmed} tone="success" />
                <BulletinMetric icon={Clock3} label="Pendientes" value={boletinSummary.pending} tone="warning" />
              </div>
              <BoletinList items={boletin} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BulletinMetric({ icon: Icon, label, value, tone }: { icon: typeof ListChecks; label: string; value: number; tone: 'neutral' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
      <div><p className="text-xl font-extrabold">{value}</p><p className="text-xs text-muted">{label}</p></div>
    </Card>
  );
}
