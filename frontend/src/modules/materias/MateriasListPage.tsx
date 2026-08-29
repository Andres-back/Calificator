import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Camera,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleArrowRight,
  ClipboardCheck,
  GraduationCap,
  Plus,
  UserPlus,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EducationalIcon,
  Field,
  getSubjectEducationalIcon,
  Input,
  Modal,
  QueryState,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { listMaterias, createMateria } from './api';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { routes } from '@/config/routes';
import { JoinMateriaModal } from './UnirseMateriaPage';
import {
  getPostCreateDestination,
  getTeacherActionGuide,
  type TeacherActionIntent,
} from './teacherFlowModel';

const COURSE_TONES = [
  {
    border: 'border-l-brand-500',
  },
  {
    border: 'border-l-sky-500',
  },
  {
    border: 'border-l-emerald-500',
  },
  {
    border: 'border-l-amber-500',
  },
  {
    border: 'border-l-rose-500',
  },
  {
    border: 'border-l-cyan-500',
  },
];

const AREA_SUGGESTIONS = [
  'Ciencias Naturales y Educación Ambiental',
  'Ciencias Sociales',
  'Matemáticas',
  'Lengua Castellana',
  'Inglés',
  'Tecnología e Informática',
  'Educación Artística',
  'Educación Física',
  'Ética y Valores',
  'Educación Religiosa',
];

const GRADE_SUGGESTIONS = [
  'Transición',
  '1°',
  '2°',
  '3°',
  '4°',
  '5°',
  '6°',
  '7°',
  '8°',
  '9°',
  '10°',
  '11°',
  'Educación para adultos',
];

const EMPTY_FORM = {
  nombre: '',
  area: '',
  grado: '',
  descripcion: '',
};

const MAX_ACTIVE_MATERIAS = 6;
const LIMIT_MESSAGE = 'Has alcanzado el límite máximo de 6 materias.';

const ACTION_ICONS = {
  calificar: Camera,
  asistencia: CalendarCheck2,
  evaluar: ClipboardCheck,
  seguimiento: ChartNoAxesCombined,
} satisfies Record<TeacherActionIntent, typeof Camera>;

export function MateriasListPage() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(searchParams.get('unirse') === '1');
  const [form, setForm] = useState(EMPTY_FORM);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['materias'],
    queryFn: listMaterias,
  });
  const isStudent = user?.rol === 'estudiante';
  const isProfesor = user?.rol === 'profesor';
  const canCreateMateria = isProfesor;
  const activeMateriaCount =
    data?.filter((materia) => materia.estado === 'activa').length ?? 0;
  const reachedMateriaLimit =
    isProfesor && activeMateriaCount >= MAX_ACTIVE_MATERIAS;
  const requestedAction = isProfesor ? searchParams.get('accion') : null;
  const actionGuide = getTeacherActionGuide(requestedAction);
  const ActionGuideIcon = actionGuide
    ? ACTION_ICONS[actionGuide.intent]
    : null;
  const canSubmit =
    form.nombre.trim().length >= 2 &&
    form.area.trim().length > 0 &&
    form.grado.trim().length > 0 &&
    !reachedMateriaLimit;
  const nextStepLabel =
    actionGuide?.intent === 'evaluar'
      ? 'preparar la evaluación'
      : 'invitar a tus estudiantes';

  const subtitle = actionGuide
    ? actionGuide.description
    : isProfesor
      ? `Tus clases y sus estudiantes. Materias creadas: ${activeMateriaCount}/${MAX_ACTIVE_MATERIAS}.`
      : isStudent
        ? 'Consulta tus materias inscritas y únete a nuevas clases con el código de tu docente.'
        : 'Clases registradas en la institución.';

  const create = useMutation({
    mutationFn: () =>
      createMateria({
        nombre: form.nombre.trim(),
        area: form.area.trim(),
        grado: form.grado.trim(),
        descripcion: form.descripcion.trim() || undefined,
      }),
    onSuccess: (materia) => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      toast.success(
        actionGuide?.intent === 'evaluar'
          ? 'Materia creada. Ahora prepara la evaluación.'
          : 'Materia creada. Ahora invita a tus estudiantes.',
      );
      setOpen(false);
      setForm(EMPTY_FORM);
      navigate(
        getPostCreateDestination(actionGuide?.intent ?? null, materia.id),
      );
    },
    onError: (mutationError) => {
      const apiError = toApiError(mutationError);
      toast.error(
        apiError.status === 409 ? LIMIT_MESSAGE : apiError.detail,
      );
    },
  });

  function closeCreateModal() {
    if (create.isPending) return;
    setOpen(false);
    setForm(EMPTY_FORM);
  }

  function closeJoinModal() {
    setJoinOpen(false);
    if (searchParams.has('unirse')) {
      const next = new URLSearchParams(searchParams);
      next.delete('unirse');
      setSearchParams(next, { replace: true });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={actionGuide?.title ?? (isStudent ? 'Mis materias' : 'Materias')}
        eyebrow={actionGuide ? 'Paso 1 de 2' : (isStudent ? 'Tu aprendizaje' : 'Tus cursos')}
        subtitle={subtitle}
        badge={
          isProfesor ? (
            <Badge tone={reachedMateriaLimit ? 'warning' : 'neutral'}>
              {activeMateriaCount}/{MAX_ACTIVE_MATERIAS} activas
            </Badge>
          ) : undefined
        }
        action={
          isStudent ? (
            <Button type="button" onClick={() => setJoinOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Unirme a materia
            </Button>
          ) : canCreateMateria ? (
            <Button
              onClick={() => setOpen(true)}
              disabled={reachedMateriaLimit}
            >
              <Plus className="h-4 w-4" /> Nueva materia
            </Button>
          ) : undefined
        }
      />

      {isStudent && !!data?.length && (
        <Card className="relative overflow-hidden border-brand-100 bg-gradient-to-r from-white via-brand-50/70 to-sky-50 p-5 dark:border-brand-500/20 dark:from-slate-950 dark:via-brand-950/40 dark:to-sky-950/30 sm:p-6">
          <div className="relative z-10 max-w-2xl pr-20 sm:pr-28">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">Tus cursos inscritos</p>
            <p className="mt-2 font-display text-xl font-extrabold text-fg">Todo listo para continuar</p>
            <p className="mt-1 text-sm leading-6 text-secondary">
              Abre una materia para consultar sus actividades, evaluaciones y recursos de aprendizaje.
            </p>
          </div>
          <img
            src="/branding/xali-studying.png"
            alt=""
            className="absolute -bottom-3 right-2 h-24 w-24 object-contain sm:right-6 sm:h-28 sm:w-28"
          />
        </Card>
      )}

      {actionGuide && ActionGuideIcon && (
        <Card className="flex items-start gap-4 border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/25 dark:bg-brand-500/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-700 text-white">
            <ActionGuideIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold">Selecciona una de tus materias</p>
            <p className="mt-1 text-sm leading-5 text-muted">
              No necesitas buscar otra opción después: te llevaremos al lugar
              correcto.
            </p>
          </div>
        </Card>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={!data || data.length === 0}
        loading={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40" />
            ))}
          </div>
        }
        empty={
          <EmptyState
            icon={BookOpen}
            image="/branding/empty-no-subjects.png"
            title={
              isStudent
                ? 'Aún no estás inscrito en materias'
                : 'Aún no tienes materias'
            }
            description={
              isStudent
                ? 'Únete a una materia usando el código que te compartió tu docente.'
                : 'Crea tu primera clase. Después te guiaremos para invitar estudiantes.'
            }
            action={
              isStudent ? (
                <Button type="button" onClick={() => setJoinOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Unirme a materia
                </Button>
              ) : canCreateMateria ? (
                <Button
                  onClick={() => setOpen(true)}
                  disabled={reachedMateriaLimit}
                >
                  <Plus className="h-4 w-4" /> Crear mi primera materia
                </Button>
              ) : undefined
            }
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((materia, index) => {
            const tone = COURSE_TONES[index % COURSE_TONES.length];
            return (
              <motion.div
                key={materia.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={
                    actionGuide
                      ? actionGuide.destination(materia.id)
                      : routes.materia(materia.id)
                  }
                >
                  <Card
                    interactive
                    className={cn(
                      'group h-full p-5',
                      isStudent
                        ? 'relative overflow-hidden border-brand-100 bg-gradient-to-br from-surface via-surface to-brand-50/55 shadow-card hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover dark:to-brand-950/30 sm:p-6'
                        : 'border-l-4',
                      !isStudent && tone.border,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-border dark:bg-white/10">
                        <EducationalIcon name={getSubjectEducationalIcon(materia.area)} className="h-14 w-14" />
                      </div>
                      <Badge
                        tone={
                          materia.estado === 'activa'
                            ? 'success'
                            : 'neutral'
                        }
                        className="capitalize"
                      >
                        {isStudent && materia.estado === 'activa' ? 'Inscrita' : materia.estado}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <p className="line-clamp-1 font-display text-lg font-bold group-hover:text-brand-600">
                        {materia.nombre}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {[materia.area, materia.grado]
                          .filter(Boolean)
                          .join(' · ') || 'Sin área o grado definidos'}
                      </p>
                      {materia.descripcion && (
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
                          {materia.descripcion}
                        </p>
                      )}
                      {!isStudent && actionGuide ? (
                        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 font-semibold text-brand-700 dark:text-brand-200">
                          <span>{actionGuide.buttonLabel}</span>
                          <CircleArrowRight
                            className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </div>
                      ) : !isStudent ? (
                        <div className="mt-4 border-t border-border pt-4">
                          <p className="text-[11px] font-semibold uppercase text-muted">
                            Código de matrícula
                          </p>
                          <span className="mt-1 block font-mono text-sm font-extrabold text-brand-700 dark:text-brand-200">
                            {materia.codigo_matricula}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-5 flex items-center justify-between border-t border-brand-100 pt-4 font-semibold text-brand-700 dark:border-brand-500/20 dark:text-brand-200">
                          <span>Entrar a la materia</span>
                          <CircleArrowRight
                            className="h-5 w-5 transition-transform group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </QueryState>

      {isStudent && (
        <JoinMateriaModal open={joinOpen} onClose={closeJoinModal} />
      )}

      {canCreateMateria && (
        <Modal
          open={open}
          onClose={closeCreateModal}
          title="Crear una materia"
          className="max-w-2xl"
          closeOnBackdrop={!create.isPending}
          closeOnEscape={!create.isPending}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) create.mutate();
            }}
            className="space-y-5"
          >
            <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-700 text-white">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                  Paso 1 de 2
                </p>
                <p className="mt-1 font-bold">Identifica la clase</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Área y grado permiten mostrar los aprendizajes del MEN
                  correctos. Después te llevaremos a {nextStepLabel}.
                </p>
              </div>
            </div>

            <Field
              label="Nombre de la materia"
              hint="Usa un nombre corto que reconozcas fácilmente."
              required
            >
              <Input
                autoFocus
                value={form.nombre}
                onChange={(event) =>
                  setForm({ ...form, nombre: event.target.value })
                }
                placeholder="Ejemplo: Ciencias Naturales"
                required
                minLength={2}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Área"
                hint="Puedes elegir una sugerencia o escribir otra."
                required
              >
                <Input
                  list="materia-area-suggestions"
                  value={form.area}
                  onChange={(event) =>
                    setForm({ ...form, area: event.target.value })
                  }
                  placeholder="Ejemplo: Matemáticas"
                  required
                />
                <datalist id="materia-area-suggestions">
                  {AREA_SUGGESTIONS.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </Field>

              <Field
                label="Grado"
                hint="Puedes elegir una sugerencia o escribir otra."
                required
              >
                <Input
                  list="materia-grade-suggestions"
                  value={form.grado}
                  onChange={(event) =>
                    setForm({ ...form, grado: event.target.value })
                  }
                  placeholder="Ejemplo: 7°"
                  required
                />
                <datalist id="materia-grade-suggestions">
                  {GRADE_SUGGESTIONS.map((grade) => (
                    <option key={grade} value={grade} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field
              label="Descripción"
              hint="Opcional. Por ejemplo: curso 7A, jornada de la mañana."
            >
              <Textarea
                value={form.descripcion}
                onChange={(event) =>
                  setForm({ ...form, descripcion: event.target.value })
                }
                placeholder="Una nota breve para distinguir esta clase"
              />
            </Field>

            <div
              aria-live="polite"
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-sm',
                canSubmit
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                  : 'border-border bg-surface-2 text-muted',
              )}
            >
              <CheckCircle2
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  canSubmit ? 'text-emerald-600' : 'text-muted',
                )}
                aria-hidden="true"
              />
              <p>
                {canSubmit
                  ? `Todo listo. Crearemos la materia y continuaremos con ${nextStepLabel}.`
                  : 'Completa nombre, área y grado para continuar.'}
              </p>
            </div>

            {reachedMateriaLimit && (
              <p className="text-sm text-amber-700 dark:text-amber-300">{LIMIT_MESSAGE}</p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeCreateModal}
                disabled={create.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={create.isPending}
                disabled={!canSubmit || create.isPending}
              >
                Crear y continuar
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
