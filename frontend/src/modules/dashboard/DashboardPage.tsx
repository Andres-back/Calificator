import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  ListChecks,
  Plus,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { TOOLS } from '@/modules/herramientas/meta';
import { MATERIAL_CREATION_TOOLS } from '@/modules/herramientas/toolPickerModel';
import { listMaterials } from '@/modules/herramientas/api';
import { listMaterias } from '@/modules/materias/api';
import { Badge, Card, Skeleton } from '@/components/ui';
import { QueryBoundary, QueryEmpty } from '@/components/ui/QueryState';
import { DashboardEstudiante } from './DashboardEstudiante';
import { DashboardAdmin } from './DashboardAdmin';
import { cn } from '@/lib/cn';
import { routes } from '@/config/routes';
import type { MaterialListItem } from '@/types/api';

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.035, ease: [0.22, 1, 0.36, 1] } }),
};

const teacherActions = [
  {
    to: routes.materiasPara('calificar'),
    icon: Camera,
    title: 'Calificar por fotografía',
    description: 'Selecciona una materia y evaluación, luego sube o toma la foto de la evidencia.',
    badge: 'Visión IA',
    tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  {
    to: routes.materiasPara('asistencia'),
    icon: CalendarCheck2,
    title: 'Tomar asistencia',
    description: 'Elige la materia, marca a cada estudiante y guarda la lista del día.',
    badge: 'Registro diario',
    tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  {
    to: routes.materiasPara('seguimiento'),
    icon: ListChecks,
    title: 'Revisar calificaciones sugeridas',
    description: 'Confirma o ajusta cada resultado antes de convertirlo en nota definitiva.',
    badge: 'Decisión docente',
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    to: routes.materiasPara('evaluar'),
    icon: ClipboardCheck,
    title: 'Preparar una evaluación',
    description: 'Organiza criterios, preguntas y nota máxima para evaluar en línea, papel o ambas.',
    badge: 'Evaluaciones',
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
];

export function DashboardPage() {
  const user = useAuth((state) => state.user);
  if (user?.rol === 'admin') return <DashboardAdmin />;
  if (user?.rol === 'estudiante') return <DashboardEstudiante />;
  return <DashboardDocente />;
}

function WorkspaceMetric({ loading, value, label, icon: Icon }: { loading: boolean; value: number; label: string; icon: React.ElementType }) {
  return (
    <Card className={`flex items-center gap-3 p-4 ${loading ? 'opacity-60' : ''}`}>
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-extrabold">{loading ? '—' : value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </Card>
  );
}

function DashboardDocente() {
  const { user } = useAuth();
  const materialsQuery = useQuery({ queryKey: ['materials', 'recent'], queryFn: () => listMaterials() });
  const materiasQuery = useQuery({ queryKey: ['materias'], queryFn: listMaterias });
  const firstName = user?.nombre?.split(' ')[0] ?? 'Docente';

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="absolute inset-0 z-0">
          <img
            src="/branding/hero-classroom.png"
            alt=""
            className="h-full w-full object-cover opacity-15 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/95 to-surface/80" />
        </div>

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">Centro de trabajo docente</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Hola, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-muted">Elige una tarea: calificar, tomar asistencia o crear recursos para tu clase.</p>
          </div>
          <Link
            to={routes.materiasPara('calificar')}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Camera className="h-4 w-4" /> Calificar por foto
          </Link>
        </div>
      </header>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Flujo recomendado</p>
              <h2 className="mt-1 font-display text-xl font-bold">¿Qué necesitas hacer ahora?</h2>
            </div>
            <Badge tone="brand">IA con revisión</Badge>
          </div>
          <div className="mt-5 divide-y divide-border">
            {teacherActions.map((action, index) => (
              <motion.div key={action.title} custom={index} variants={fade} initial="hidden" animate="show">
                <Link to={action.to} className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', action.tone)}><action.icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{action.title}</span>
                      <span className="text-[11px] font-semibold text-muted">{action.badge}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{action.description}</span>
                  </span>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Tu espacio de trabajo */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display font-bold">Tu espacio de trabajo</h2>
              <p className="text-sm text-muted">Información disponible hoy.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <QueryBoundary
              query={materiasQuery}
              loading={<Skeleton className="h-20" />}
              empty={<WorkspaceMetric loading={false} value={0} label="Materias" icon={BookOpen} />}
            >
              {(materias) => (
                <WorkspaceMetric loading={false} value={materias.length} label="Materias" icon={BookOpen} />
              )}
            </QueryBoundary>
            <QueryBoundary
              query={materialsQuery}
              loading={<Skeleton className="h-20" />}
              empty={<WorkspaceMetric loading={false} value={0} label="Recursos" icon={Wand2} />}
            >
              {(recent) => (
                <WorkspaceMetric loading={false} value={recent.length} label="Recursos" icon={Wand2} />
              )}
            </QueryBoundary>
          </div>
          <div className="mt-5 rounded-lg border border-border bg-surface-2/60 p-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold">La IA sugiere. Tú decides.</p>
                <p className="mt-1 text-xs leading-5 text-muted">Ninguna nota sugerida se considera definitiva hasta que la confirmas o ajustas.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Recursos didácticos</p>
            <h2 className="mt-1 font-display text-xl font-bold">Crear para la clase</h2>
          </div>
          <Link to={routes.herramientas} className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-semibold text-brand-600 hover:text-brand-700">
            Ver herramientas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {MATERIAL_CREATION_TOOLS.slice(0, 6).map((tool, index) => (
            <motion.div key={tool.tipo} custom={index} variants={fade} initial="hidden" animate="show">
              <Link to={routes.herramientaNueva(tool.tipo)}>
                <Card interactive className="h-full p-4">
                  <div className={cn('mb-3 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm', tool.gradient)}>
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold">{tool.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{tool.description}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Continuidad</p>
            <h2 className="mt-1 font-display text-xl font-bold">Material reciente</h2>
          </div>
          <Link to={routes.herramientas + '?tipo=todos'} className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-semibold text-brand-600 hover:text-brand-700">
            Crear <Plus className="h-4 w-4" />
          </Link>
        </div>
        <QueryBoundary
          query={materialsQuery}
          loading={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          }
          empty={
            <QueryEmpty
              icon={Wand2}
              title="Sin materiales todavía"
              description="Crea tu primer material didáctico con la ayuda de la IA."
              action={
                <Link
                  to={routes.herramientaNueva()}
                  className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Crear material
                </Link>
              }
            />
          }
        >
          {(recent) => (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {recent.map((item: MaterialListItem, index: number) => {
                const meta = TOOLS.find((t) => t.tipo === item.tipo);
                const Icon = meta?.icon ?? Wand2;
                return (
                  <motion.div key={item.id} custom={index} variants={fade} initial="hidden" animate="show">
                    <Link to={routes.herramienta(item.id)}>
                      <Card interactive className="h-full p-4">
                        <div className={cn('mb-3 grid h-10 w-10 place-items-center rounded-lg', meta?.gradient ? `bg-gradient-to-br ${meta.gradient} text-white shadow-sm` : 'bg-brand-50 text-brand-600')}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="truncate text-sm font-semibold">{item.titulo ?? item.tipo}</p>
                        <p className="mt-1 text-xs text-muted">{meta?.label ?? item.tipo}</p>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </QueryBoundary>
      </section>
    </div>
  );
}
