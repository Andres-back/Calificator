import { type ElementType } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Copy,
  Mail,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { routes } from '@/config/routes';
import { regenerateCode } from './api';
import { useMateriaContext } from './MateriaContext';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { getTeacherJourneyState } from './teacherFlowModel';
import type { MateriaConEstudiantes } from '@/types/api';

export function MateriaVistaGeneral() {
  const { materia, canManageMateria } = useMateriaContext();

  if (canManageMateria) {
    return <TeacherOverview materia={materia as MateriaConEstudiantes} />;
  }

  return <StudentOverview materiaId={materia.id} />;
}

function TeacherOverview({ materia }: { materia: MateriaConEstudiantes }) {
  const evaluationsQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const regen = useMutation({
    mutationFn: () => regenerateCode(materia.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materia', materia.id] });
      toast.success('Código regenerado');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(materia.codigo_matricula);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = materia.codigo_matricula;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Código copiado');
    } catch {
      toast.error('No fue posible copiar el código.');
    }
  };

  return (
    <div className="space-y-5">
      <TeacherJourney
        materiaId={materia.id}
        studentCount={materia.estudiantes.length}
        evaluationCount={evaluationsQuery.data?.length ?? 0}
        loading={evaluationsQuery.isLoading}
        error={evaluationsQuery.isError}
        onRetry={() => void evaluationsQuery.refetch()}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
        <Card id="codigo-inscripcion" className="scroll-mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">
                Código de inscripción
              </p>
              <p className="text-xs text-muted">
                Compártelo solo con estudiantes de esta materia.
              </p>
            </div>
            <Badge tone="brand">Activo</Badge>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-5 text-center dark:bg-brand-500/10">
            <p className="font-mono text-2xl font-extrabold text-brand-700 dark:text-brand-200">
              {materia.codigo_matricula}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={regen.isPending}
              onClick={() => regen.mutate()}
            >
              <RefreshCw className="h-4 w-4" /> Regenerar
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="inline-flex items-center gap-2 font-display font-bold">
                <Users className="h-5 w-5 text-brand-500" /> Estudiantes
              </p>
              <p className="text-xs text-muted">
                Listado de estudiantes matriculados en esta clase.
              </p>
            </div>
            <Badge tone="neutral">{materia.estudiantes.length}</Badge>
          </div>
          {materia.estudiantes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin estudiantes aún"
              description="Comparte el código de inscripción para que se unan."
            />
          ) : (
            <ul className="divide-y divide-border">
              {materia.estudiantes.map((estudiante) => (
                <li key={estudiante.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                    {estudiante.nombre
                      .split(' ')
                      .map((segment) => segment[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {estudiante.nombre}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      <Mail className="h-3 w-3" /> {estudiante.email}
                    </p>
                  </div>
                  <Badge tone="neutral">Matriculado</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function TeacherJourney({
  materiaId,
  studentCount,
  evaluationCount,
  loading,
  error,
  onRetry,
}: {
  materiaId: string;
  studentCount: number;
  evaluationCount: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const state = getTeacherJourneyState({ studentCount, evaluationCount });

  const recommended = {
    invite: {
      eyebrow: 'Paso recomendado: prepara el grupo',
      title: 'Invita a tus estudiantes',
      description:
        'Copia el código de inscripción y compártelo con el grupo. Cuando se unan aparecerán aquí.',
      label: 'Ver código de inscripción',
      to: '#codigo-inscripcion',
      icon: Users,
    },
    evaluate: {
      eyebrow: 'Paso recomendado: prepara la actividad',
      title: 'Crea la primera evaluación',
      description:
        'Define qué vas a evaluar y la nota máxima. Después podrás calificar las evidencias.',
      label: 'Preparar evaluación',
      to: routes.materiaEvaluaciones(materiaId),
      icon: ClipboardCheck,
    },
    grade: {
      eyebrow: 'Paso recomendado: revisa evidencias',
      title: 'Califica una evaluación',
      description:
        'Selecciona estudiante y evaluación, carga la foto y confirma o ajusta la sugerencia de la IA.',
      label: 'Ir al flujo de calificación',
      to: routes.materiaCalificar(materiaId),
      icon: Camera,
    },
  }[state.recommendedStep];

  const RecommendedIcon = recommended.icon;

  return (
    <Card className="overflow-hidden border-brand-200 dark:border-brand-500/30">
      <div className="border-b border-border bg-brand-50/70 p-5 dark:bg-brand-500/10 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-200">
              Ruta guiada de esta materia
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              ¿Qué sigue ahora?
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              XCalificator te muestra un paso recomendado y mantiene disponibles
              las tareas frecuentes de la clase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProgressBadge
              complete={state.hasStudents}
              label={`${studentCount} estudiante${studentCount === 1 ? '' : 's'}`}
            />
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <ProgressBadge
                complete={state.hasEvaluations}
                label={`${evaluationCount} ${evaluationCount === 1 ? 'evaluación' : 'evaluaciones'}`}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {loading ? (
          <Skeleton className="h-36 w-full" />
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">No pudimos revisar las evaluaciones</p>
              <p className="mt-1 text-sm text-muted">
                Puedes volver a intentarlo sin salir de la materia.
              </p>
            </div>
            <Button variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-brand-200 bg-surface p-5 shadow-sm dark:border-brand-500/25">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
                <RecommendedIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                  {recommended.eyebrow}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold">
                  {recommended.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {recommended.description}
                </p>
              </div>
              {state.recommendedStep === 'invite' ? (
                <a
                  href={recommended.to}
                  className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                >
                  {recommended.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  to={recommended.to}
                  className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                >
                  {recommended.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-bold">Acciones frecuentes</p>
          <div className="grid gap-3 md:grid-cols-3">
            <JourneyAction
              icon={CalendarCheck2}
              title="Tomar asistencia"
              description={
                state.hasStudents
                  ? 'Marca la lista de hoy y guarda los cambios.'
                  : 'Disponible cuando se inscriba al menos un estudiante.'
              }
              to={routes.materiaAsistencia(materiaId)}
              disabled={!state.hasStudents}
            />
            <JourneyAction
              icon={Camera}
              title="Calificar por foto"
              description={
                state.canGrade
                  ? 'La IA sugiere y tú confirmas o ajustas.'
                  : 'Necesitas estudiantes y una evaluación.'
              }
              to={routes.materiaCalificar(materiaId)}
              disabled={!state.canGrade}
            />
            <JourneyAction
              icon={BarChart3}
              title="Revisar seguimiento"
              description={
                state.canGrade
                  ? 'Consulta prioridades, notas y retroalimentación.'
                  : 'Se habilita cuando la clase esté lista para evaluar.'
              }
              to={routes.materiaBoletin(materiaId)}
              disabled={!state.canGrade}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProgressBadge({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold">
      {complete ? (
        <CheckCircle2
          className="h-4 w-4 text-success"
          aria-hidden="true"
        />
      ) : (
        <CircleDashed className="h-4 w-4 text-muted" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

function JourneyAction({
  icon: Icon,
  title,
  description,
  to,
  disabled,
}: {
  icon: ElementType;
  title: string;
  description: string;
  to: string;
  disabled: boolean;
}) {
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted">
          {description}
        </span>
      </span>
      {!disabled && (
        <ArrowRight
          className="mt-3 h-4 w-4 shrink-0 text-muted"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex min-h-28 items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-4 opacity-75"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="focus-ring flex min-h-28 items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-brand-300 hover:shadow-sm"
    >
      {content}
    </Link>
  );
}

function StudentOverview({ materiaId }: { materiaId: string }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="success">Acceso confirmado</Badge>
          <h2 className="mt-3 font-display text-xl font-bold">Tu materia</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Estás matriculado en esta materia. Consulta las evaluaciones
            disponibles y revisa tus resultados cuando el docente los confirme.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={routes.materiaEvaluaciones(materiaId)}>
            <Button variant="secondary">
              <ClipboardCheck className="h-4 w-4" /> Ver evaluaciones
            </Button>
          </Link>
          <Link to={routes.materiaBoletin(materiaId)}>
            <Button variant="outline">Ver boletín</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
