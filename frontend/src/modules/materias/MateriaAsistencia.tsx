import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileBarChart2,
  ShieldCheck,
  UserCheck,
  Users,
  Camera,
  UserPlus,
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
  patchAsistenciaDia,
} from './asistenciaApi';
import {
  localDateIso,
  searchAttendanceRecords,
  summarizeAttendanceDraft,
} from './attendanceModel';
import { MateriaAsistenciaReporte } from './MateriaAsistenciaReporte';
import { RosterImportDialog } from './RosterImportDialog';
import { ExistingStudentsDialog } from './ExistingStudentsDialog';
import { useAttendanceAutosave } from './useAttendanceAutosave';
import type { AsistenciaEstado } from './asistenciaApi';

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
      <div className="min-w-0 break-words">
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
  const [importOpen, setImportOpen] = useState(false);
  const [existingOpen, setExistingOpen] = useState(false);
  const [search, setSearch] = useState('');

  const attendanceQuery = useQuery({
    queryKey: ['asistencia', materia.id, selectedDate],
    queryFn: ({ signal }) => getAsistenciaDia(materia.id, selectedDate, signal),
    enabled: canReadAttendance && Boolean(materia.id),
  });

  const autosave = useAttendanceAutosave(materia.id, selectedDate, attendanceQuery.data,
    (payload) => patchAsistenciaDia(materia.id, payload),
    async (savedDay) => {
      // Do not allow an older GET to replace the acknowledged PATCH in the cache.
      await queryClient.cancelQueries({ queryKey: ['asistencia', savedDay.materia_id, savedDay.fecha], exact: true });
      queryClient.setQueryData(['asistencia', savedDay.materia_id, savedDay.fecha], savedDay);
      void queryClient.invalidateQueries({ queryKey: ['asistencia-reporte', savedDay.materia_id] });
    });
  const { draft, hasUnsavedChanges, updateStatus, updateObservation, markAllPending } = autosave;

  const summary = useMemo(() => summarizeAttendanceDraft(draft), [draft]);
  const visibleStudents = useMemo(() => searchAttendanceRecords(attendanceQuery.data?.registros ?? [], search), [attendanceQuery.data, search]);
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

  const changeDate = (nextDate: string) => {
    if (!nextDate || nextDate === selectedDate) return;
    if (
      hasUnsavedChanges &&
      !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos y cambiar de fecha?')
    ) {
      return;
    }
    setSelectedDate(nextDate);
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
      <div className='mb-6 flex flex-wrap justify-end gap-2'>
        <Button type="button" variant="outline" onClick={() => setExistingOpen(true)}><UserPlus className="h-4 w-4" /> Agregar registrados</Button>
        <Button type="button" onClick={() => setImportOpen(true)}><Camera className="h-4 w-4" /> Importar lista</Button>
        <a
          href='#reporte-asistencia'
          className='focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2'
        >
          <FileBarChart2 className='h-4 w-4' aria-hidden='true' />
          Crear reporte de asistencia
        </a>
      </div>
    <div className="space-y-6">
      <Card className="border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 shrink-0 text-brand-700 dark:text-brand-200" aria-hidden="true" />
          <h2 className="font-display text-xl font-extrabold">Tomar asistencia</h2>
        </div>
        <details className="mt-1">
          <summary className="focus-ring min-h-11 cursor-pointer content-center rounded-lg text-sm font-semibold text-brand-700 dark:text-brand-200">Cómo tomar asistencia</summary>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="mt-4 text-sm leading-6 text-muted">
                Cada selección se guarda automáticamente. Puedes seguir marcando mientras se guarda.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-surface/80 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              Puedes corregir cualquier marca; la corrección también se guarda.
            </div>
          </div>
          <div className="mt-6 grid gap-5 border-t border-brand-200 pt-5 dark:border-brand-500/20 md:grid-cols-3">
            <GuideStep number={1} title="Elige el día" description="Hoy aparece seleccionado automáticamente." />
            <GuideStep number={2} title="Marca cada estudiante" description="Usa uno de los cuatro estados grandes." />
            <GuideStep number={3} title="Comprueba el guardado" description="Cada alumno muestra Guardando, Guardado o Reintentar." />
          </div>
        </details>
      </Card>

      <Card className="p-5 max-[480px]:p-2 sm:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-end">
          <Field
            label="Fecha de la asistencia"
            hint="Puedes consultar o corregir un día anterior. No se permiten fechas futuras."
          >
            <Input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) => changeDate(event.target.value)}
              className="h-12 min-w-0 text-base max-[480px]:px-1"
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
                <Button type="button" className="h-auto min-h-11 py-2" variant="outline" onClick={markAllPending}>
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Marcar pendientes como presentes (todo el grupo)
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

          <Card className="space-y-3 p-4">
            <Field label="Buscar estudiante" hint="Por nombre o correo. Cada marca se guarda, aunque haya otros pendientes.">
              <div className="flex items-center gap-2">
                <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-0 text-base" placeholder="Escribe un nombre o correo" />
                {search && <Button type="button" variant="outline" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">Limpiar</Button>}
              </div>
            </Field>
            <p role="status" className="text-sm text-muted">{visibleStudents.length} de {attendanceQuery.data.registros.length} estudiantes</p>
            {visibleStudents.length === 0 && <div className="space-y-2"><p>No hay estudiantes con esa búsqueda.</p><Button type="button" variant="outline" onClick={() => setSearch('')}>Mostrar todo el grupo</Button></div>}
          </Card>

          <div className="space-y-4">
            {visibleStudents.map(({ student, index }) => {
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
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-extrabold text-secondary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
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
                      {autosave.status(student.estudiante_id) === 'error' ? 'No guardado'
                        : autosave.status(student.estudiante_id) === 'saving' ? 'Guardando…'
                        : autosave.status(student.estudiante_id) === 'pending' ? 'Pendiente de guardar'
                        : autosave.status(student.estudiante_id) === 'saved' ? 'Guardado' : 'Pendiente'}
                    </span>
                  </div>
                  {autosave.status(student.estudiante_id) === 'error' && (
                    <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
                      <span>No se pudo guardar. Tu selección sigue aquí.</span>
                      <Button type="button" variant="outline" onClick={() => autosave.retry(student.estudiante_id)} aria-label={`Reintentar asistencia para ${student.estudiante_nombre}`}>Reintentar</Button>
                    </div>
                  )}
                  {!current.estado && current.observacion.trim() && <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">Selecciona un estado para guardar la observación.</p>}

                  <fieldset className="mt-4">
                    <legend className="mb-2 text-sm font-semibold">Estado de asistencia</legend>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2">
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
                              'focus-ring flex min-h-12 min-w-0 flex-wrap items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors',
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
                      onBlur={() => autosave.flushObservation(student.estudiante_id)}
                      className="mt-2 text-base"
                      placeholder="Escribe una nota breve si la necesitas"
                      aria-label={`Observación para ${student.estudiante_nombre}`}
                    />
                  </label>
                </Card>
              );
            })}
          </div>

          <Card
            aria-label="Resumen y guardado de asistencia"
            className="relative border-brand-300 bg-surface p-3 dark:border-brand-500/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p aria-live="polite" className="text-sm font-semibold tabular-nums">
                {summary.total - summary.pendientes}/{summary.total} marcados · {summary.pendientes} pendientes
              </p>
              <p role="status" className="text-sm text-muted">
                {autosave.errors ? `${autosave.errors} cambios no guardados`
                  : hasUnsavedChanges ? 'Hay cambios pendientes de guardar' : 'No hay cambios sin guardar'}
              </p>
              {autosave.errors > 0 && <Button type="button" variant="outline" onClick={() => autosave.retry()}>Reintentar cambios</Button>}
            </div>
            <details className="mt-1">
              <summary className="focus-ring min-h-11 cursor-pointer content-center rounded-lg text-sm font-semibold text-brand-700 dark:text-brand-200">Ver desglose y estado</summary>
              <p className="mb-3 text-sm text-muted">
                Cada marca se guarda automáticamente. Los alumnos pendientes todavía no tienen estado seleccionado.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
            </details>
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
      <RosterImportDialog open={importOpen} materiaId={materia.id} onClose={() => setImportOpen(false)} />
      <ExistingStudentsDialog open={existingOpen} materiaId={materia.id} onClose={() => setExistingOpen(false)} />
    </div>
    </>
  );
}
