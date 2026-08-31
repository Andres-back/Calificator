import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileBarChart2,
  Save,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  QueryError,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMateriaContext } from './MateriaContext';
import {
  getAsistenciaDia,
  saveAsistenciaDia,
  type AsistenciaEstado,
} from './asistenciaApi';
import {
  buildAttendancePayload,
  createAttendanceDraft,
  isAttendanceDraftDirty,
  localDateIso,
  markPendingPresent,
  summarizeAttendanceDraft,
  type AttendanceDraft,
} from './attendanceModel';
import { MateriaAsistenciaReporte } from './MateriaAsistenciaReporte';

const STATUS_OPTIONS: {
  value: AsistenciaEstado;
  label: string;
  shortLabel: string;
  icon: typeof Check;
  selectedClass: string;
}[] = [
  {
    value: 'presente',
    label: 'Presente',
    shortLabel: 'Presentes',
    icon: Check,
    selectedClass: 'border-emerald-700 bg-emerald-700 text-white',
  },
  {
    value: 'tarde',
    label: 'Llegó tarde',
    shortLabel: 'Tarde',
    icon: Clock3,
    selectedClass: 'border-amber-600 bg-amber-500 text-slate-950',
  },
  {
    value: 'ausente',
    label: 'Ausente',
    shortLabel: 'Ausentes',
    icon: X,
    selectedClass: 'border-rose-700 bg-rose-700 text-white',
  },
  {
    value: 'excusa',
    label: 'Con excusa',
    shortLabel: 'Excusas',
    icon: FileCheck2,
    selectedClass: 'border-sky-700 bg-sky-700 text-white',
  },
];

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00`));
}

function GuideStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-extrabold text-white">
        {number}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted">{description}</p>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={cn('rounded-lg border px-3 py-3 text-center', className)}>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

export function MateriaAsistencia() {
  const { materia } = useMateriaContext();
  const user = useAuth((state) => state.user);
  const permissions = new Set(user?.permissions ?? []);
  const canReadAttendance = permissions.has('attendance.read');
  const canManageAttendance = permissions.has('attendance.manage');
  const queryClient = useQueryClient();
  const today = useMemo(() => localDateIso(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState<AttendanceDraft>({});
  const [baseline, setBaseline] = useState<AttendanceDraft>({});

  const attendanceQuery = useQuery({
    queryKey: ['asistencia', materia.id, selectedDate],
    queryFn: () => getAsistenciaDia(materia.id, selectedDate),
    enabled: canReadAttendance && Boolean(materia.id),
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    const loadedDraft = createAttendanceDraft(attendanceQuery.data);
    setDraft(loadedDraft);
    setBaseline(loadedDraft);
  }, [attendanceQuery.data]);

  const summary = useMemo(() => summarizeAttendanceDraft(draft), [draft]);
  const hasUnsavedChanges = useMemo(
    () => isAttendanceDraftDirty(draft, baseline),
    [baseline, draft],
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!hasUnsavedChanges || typeof window === 'undefined') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildAttendancePayload(selectedDate, draft);
      if (!payload) throw new Error('Completa la asistencia antes de guardar.');
      return saveAsistenciaDia(materia.id, payload);
    },
    onSuccess: (savedDay) => {
      queryClient.setQueryData(['asistencia', materia.id, selectedDate], savedDay);
      void queryClient.invalidateQueries({ queryKey: ['asistencia-reporte', materia.id] });
      const savedDraft = createAttendanceDraft(savedDay);
      setDraft(savedDraft);
      setBaseline(savedDraft);
      toast.success('Asistencia guardada correctamente.');
    },
    onError: (error) => {
      const message = error instanceof Error && !('response' in error)
        ? error.message
        : toApiError(error).detail;
      toast.error(message);
    },
  });

  const changeDate = (nextDate: string) => {
    if (!nextDate || nextDate === selectedDate) return;
    if (
      hasUnsavedChanges &&
      !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos y cambiar de fecha?')
    ) {
      return;
    }
    setDraft({});
    setBaseline({});
    setSelectedDate(nextDate);
  };

  const updateStatus = (studentId: string, estado: AsistenciaEstado) => {
    setDraft((current) => ({
      ...current,
      [studentId]: {
        observacion: current[studentId]?.observacion ?? '',
        estado,
      },
    }));
  };

  const updateObservation = (studentId: string, observacion: string) => {
    setDraft((current) => ({
      ...current,
      [studentId]: {
        estado: current[studentId]?.estado ?? null,
        observacion,
      },
    }));
  };

  const markAllPending = () => {
    setDraft((current) => markPendingPresent(current));
  };

  if (!canReadAttendance) return null;

  if (!canManageAttendance) {
    return (
      <div className="space-y-6">
        <Card className="border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/25 dark:bg-brand-500/10">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
              <FileBarChart2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold">Reporte de asistencia</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Puedes consultar el seguimiento del grupo. Para marcar o modificar asistencia necesitas el permiso de gestión.
              </p>
            </div>
          </div>
        </Card>
        <MateriaAsistenciaReporte
          materiaId={materia.id}
          materiaNombre={materia.nombre}
          today={today}
        />
      </div>
    );
  }

  return (
    <>
      <div className='mb-6 flex justify-end'>
        <a
          href='#reporte-asistencia'
          className='focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2'
        >
          <FileBarChart2 className='h-4 w-4' aria-hidden='true' />
          Crear reporte de asistencia
        </a>
      </div>
    <div className="space-y-6">
      <Card className="overflow-hidden border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/25 dark:bg-brand-500/10 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-700 text-white">
                <UserCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-200">
                  Registro guiado
                </p>
                <h2 className="font-display text-2xl font-extrabold">Tomar asistencia</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Marca a todo el grupo y revisa el resumen. Nada se guarda hasta que pulses
              <strong className="text-fg"> Guardar asistencia</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-surface/80 dark:text-emerald-200">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            Puedes corregir cualquier marca antes de guardar.
          </div>
        </div>
        <div className="mt-6 grid gap-5 border-t border-brand-200 pt-5 dark:border-brand-500/20 md:grid-cols-3">
          <GuideStep number={1} title="Elige el día" description="Hoy aparece seleccionado automáticamente." />
          <GuideStep number={2} title="Marca cada estudiante" description="Usa uno de los cuatro estados grandes." />
          <GuideStep number={3} title="Revisa y guarda" description="No podrás guardar si queda alguien pendiente." />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(240px,360px)_1fr] md:items-end">
          <Field
            label="1. Fecha de la asistencia"
            hint="Puedes consultar o corregir un día anterior. No se permiten fechas futuras."
          >
            <Input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) => changeDate(event.target.value)}
              className="h-12 text-base"
            />
          </Field>
          <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Día seleccionado</p>
            <p className="mt-1 text-base font-bold capitalize">{formatDate(selectedDate)}</p>
          </div>
        </div>
      </Card>

      {attendanceQuery.isLoading ? (
        <div className="space-y-3" role="status" aria-label="Cargando lista de estudiantes">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : attendanceQuery.isError ? (
        <QueryError
          error={attendanceQuery.error}
          title="No fue posible cargar la asistencia"
          description={toApiError(attendanceQuery.error).detail}
          onRetry={() => void attendanceQuery.refetch()}
        />
      ) : attendanceQuery.data && attendanceQuery.data.registros.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay estudiantes activos"
          description="Comparte el código de matrícula y espera a que los estudiantes se inscriban antes de tomar asistencia."
        />
      ) : attendanceQuery.data ? (
        <>
          <section aria-labelledby="attendance-progress-title" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Paso 2 de 3</p>
                <h3 id="attendance-progress-title" className="mt-1 font-display text-xl font-bold">
                  Marca a cada estudiante
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {summary.pendientes > 0
                    ? `Faltan ${summary.pendientes} de ${summary.total} estudiantes.`
                    : `Lista completa: ${summary.total} de ${summary.total} estudiantes marcados.`}
                </p>
              </div>
              {summary.pendientes > 0 && (
                <Button type="button" variant="outline" onClick={markAllPending}>
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Marcar pendientes como presentes
                </Button>
              )}
            </div>

            <div
              role="progressbar"
              aria-label="Progreso de asistencia"
              aria-valuemin={0}
              aria-valuemax={summary.total}
              aria-valuenow={summary.total - summary.pendientes}
              className="h-3 overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-[width]"
                style={{
                  width: `${summary.total > 0 ? ((summary.total - summary.pendientes) / summary.total) * 100 : 0}%`,
                }}
              />
            </div>
          </section>

          <div className="space-y-4">
            {attendanceQuery.data.registros.map((student, index) => {
              const current = draft[student.estudiante_id] ?? {
                estado: student.estado,
                observacion: student.observacion ?? '',
              };
              return (
                <Card
                  key={student.estudiante_id}
                  className={cn(
                    'p-4 transition-colors sm:p-5',
                    current.estado === null && 'border-amber-300 dark:border-amber-500/40',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-extrabold text-secondary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-bold">{student.estudiante_nombre}</p>
                      <p className="truncate text-sm text-muted">{student.estudiante_email}</p>
                    </div>
                    <span
                      className={cn(
                        'ml-auto rounded-full px-2.5 py-1 text-xs font-bold',
                        current.estado
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
                      )}
                    >
                      {current.estado ? 'Marcado' : 'Pendiente'}
                    </span>
                  </div>

                  <fieldset className="mt-4">
                    <legend className="mb-2 text-sm font-semibold">Estado de asistencia</legend>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      {STATUS_OPTIONS.map((option) => {
                        const selected = current.estado === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${option.label} para ${student.estudiante_nombre}`}
                            onClick={() => updateStatus(student.estudiante_id, option.value)}
                            className={cn(
                              'focus-ring flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors',
                              selected
                                ? option.selectedClass
                                : 'border-border bg-surface text-fg hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10',
                            )}
                          >
                            <option.icon className="h-5 w-5" aria-hidden="true" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold">Observación (opcional)</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Ejemplo: llegó con autorización o presentó excusa médica.
                    </span>
                    <Input
                      value={current.observacion}
                      maxLength={300}
                      onChange={(event) =>
                        updateObservation(student.estudiante_id, event.target.value)
                      }
                      className="mt-2"
                      placeholder="Escribe una nota breve si la necesitas"
                      aria-label={`Observación para ${student.estudiante_nombre}`}
                    />
                  </label>
                </Card>
              );
            })}
          </div>

          <Card className="sticky bottom-4 z-10 border-brand-300 bg-surface/95 p-4 shadow-xl backdrop-blur dark:border-brand-500/40 sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-live="polite">
              <SummaryItem
                label="Presentes"
                value={summary.presentes}
                className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
              />
              <SummaryItem
                label="Tarde"
                value={summary.tarde}
                className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"
              />
              <SummaryItem
                label="Ausentes"
                value={summary.ausentes}
                className="border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
              />
              <SummaryItem
                label="Excusas"
                value={summary.excusas}
                className="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200"
              />
              <SummaryItem
                label="Pendientes"
                value={summary.pendientes}
                className="col-span-2 border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200 sm:col-span-1"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Paso 3. Revisa y guarda</p>
                <p className="mt-0.5 text-sm text-muted">
                  {summary.pendientes > 0
                    ? 'Completa los estudiantes pendientes para habilitar el guardado.'
                    : hasUnsavedChanges
                      ? 'La lista está completa y tiene cambios sin guardar.'
                      : 'La asistencia de este día ya está guardada.'}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-auto"
                disabled={summary.pendientes > 0 || !hasUnsavedChanges}
                loading={saveMutation.isPending}
                loadingLabel="Guardando asistencia…"
                onClick={() => saveMutation.mutate()}
              >
                <Save className="h-5 w-5" aria-hidden="true" />
                {summary.pendientes > 0
                  ? 'Completa la lista'
                  : hasUnsavedChanges
                    ? 'Guardar asistencia'
                    : 'Asistencia guardada'}
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      <MateriaAsistenciaReporte
        materiaId={materia.id}
        materiaNombre={materia.nombre}
        today={today}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Hay cambios sin guardar"
        description="Si sales ahora, perderás las marcas de asistencia que todavía no has guardado."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir registrando"
        tone="danger"
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
    </>
  );
}
