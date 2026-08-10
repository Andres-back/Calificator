import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Camera,
  ClipboardCheck,
  ListChecks,
  Plus,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { TOOLS } from '@/modules/herramientas/meta';
import { MATERIAL_CREATION_TOOLS } from '@/modules/herramientas/toolPickerModel';
import { listMaterials } from '@/modules/herramientas/api';
import { listMaterias } from '@/modules/materias/api';
import { Badge, Card } from '@/components/ui';
import { DashboardEstudiante } from './DashboardEstudiante';
import { DashboardAdmin } from './DashboardAdmin';
import { cn } from '@/lib/cn';
import { routes } from '@/config/routes';
import type { MaterialListItem } from '@/types/api';

const teacherActions = [
  {
    to: routes.materiasPara('calificar'),
    icon: Camera,
    title: 'Calificar por fotografía',
    description: 'Selecciona una materia y evaluación, luego sube o toma la foto de la evidencia.',
    badge: 'Visión IA',
    tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    accent: 'border-t-cyan-500',
  },
  {
    to: routes.materiasPara('asistencia'),
    icon: CalendarCheck2,
    title: 'Tomar asistencia',
    description: 'Elige la materia, marca a cada estudiante y guarda la lista del día.',
    badge: 'Registro diario',
    tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    accent: 'border-t-violet-500',
  },
  {
    to: routes.materiasPara('seguimiento'),
    icon: ListChecks,
    title: 'Revisar calificaciones sugeridas',
    description: 'Confirma o ajusta cada resultado antes de convertirlo en nota definitiva.',
    badge: 'Decisión docente',
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    accent: 'border-t-amber-500',
  },
  {
    to: routes.materiasPara('evaluar'),
    icon: ClipboardCheck,
    title: 'Preparar una evaluación',
    description: 'Organiza criterios, preguntas y nota máxima para evaluar en línea, papel o ambas.',
    badge: 'Evaluaciones',
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    accent: 'border-t-emerald-500',
  },
];

export function DashboardPage() {
  const user = useAuth((state) => state.user);
  if (user?.rol === 'admin') return <DashboardAdmin />;
  if (user?.rol === 'estudiante') return <DashboardEstudiante />;
  return <DashboardDocente />;
}

function DashboardDocente() {
  const { user } = useAuth();
  const materialsQuery = useQuery({ queryKey: ['materials', 'recent'], queryFn: () => listMaterials() });
  const materiasQuery = useQuery({ queryKey: ['materias'], queryFn: listMaterias });
  const firstName = user?.nombre?.split(' ')[0] ?? 'Docente';
  const todayLabel = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const recentMaterials = (materialsQuery.data ?? []).slice(0, 3) as MaterialListItem[];
  const metricValue = (loading: boolean, value: number | undefined) => loading ? '—' : String(value ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-900 via-indigo-700 to-sky-600 p-5 text-white shadow-2xl shadow-brand-900/15 sm:rounded-3xl sm:p-8">
        <img src="/branding/hero-classroom.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-screen" />
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-cyan-50 backdrop-blur">
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" /> Centro docente
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/10 px-3 py-1.5 capitalize text-indigo-50">
                <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" /> {todayLabel}
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-4xl">Buen día, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-indigo-50 sm:mt-3 sm:text-base sm:leading-6">Califica y prepara tu próxima clase desde un solo lugar.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:gap-3">
              <Link to={routes.materiasPara('calificar')} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-center text-sm font-bold text-brand-800 sm:px-5 sm:text-base shadow-sm transition hover:bg-cyan-50">
                <Camera className="h-5 w-5" /> Calificar evidencia
              </Link>
              <Link to={routes.materiasPara('evaluar')} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-3 text-center text-sm font-semibold text-white sm:px-5 sm:text-base backdrop-blur transition hover:bg-white/20">
                <ClipboardCheck className="h-5 w-5" /> Crear evaluación
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-72">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <BookOpen className="h-5 w-5 text-cyan-200" />
              <p className="mt-3 text-3xl font-extrabold">{metricValue(materiasQuery.isLoading, materiasQuery.data?.length)}</p>
              <p className="text-sm text-indigo-100">Materias</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <Wand2 className="h-5 w-5 text-amber-200" />
              <p className="mt-3 text-3xl font-extrabold">{metricValue(materialsQuery.isLoading, materialsQuery.data?.length)}</p>
              <p className="text-sm text-indigo-100">Recursos</p>
            </div>
            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/10 px-3 py-2.5 backdrop-blur">
              <img src="/branding/xali-hello.png" alt="" className="h-12 w-12 shrink-0 object-contain" />
              <div>
                <p className="text-xs font-extrabold text-white">Tu clase, bien organizada</p>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-100">{'Planifica, eval\u00faa y acompa\u00f1a desde el mismo lugar.'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="teacher-actions-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Acciones frecuentes</p><h2 id="teacher-actions-title" className="mt-1 font-display text-2xl font-bold">¿Qué quieres hacer?</h2></div>
          <Badge tone="brand" className="hidden sm:inline-flex">Tú tienes el control</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {teacherActions.map((action) => (
            <div key={action.title}>
              <Link to={action.to} className="group block h-full">
                <Card interactive className={cn('relative flex h-full min-h-0 items-center gap-3 overflow-hidden border-t-4 p-4 transition-transform duration-200 hover:-translate-y-1 sm:min-h-44 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5', action.accent)}>
                  <div className="flex shrink-0 items-start justify-between gap-3"><span className={cn('grid h-11 w-11 place-items-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl', action.tone)}><action.icon className="h-5 w-5 sm:h-6 sm:w-6" /></span><span className="hidden text-xs font-bold text-muted sm:inline">{action.badge}</span></div>
                  <div className="min-w-0 flex-1 sm:contents"><h3 className="font-display text-base font-bold leading-snug sm:mt-5 sm:text-lg">{action.title}</h3>
                  <p className="mt-2 hidden flex-1 text-sm leading-5 text-muted sm:block">{action.description}</p></div>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-600 sm:ml-0 sm:mt-4">Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Para tu próxima clase</p><h2 className="mt-1 font-display text-xl font-bold">Crear un recurso</h2></div><Link to={routes.herramientas} className="inline-flex min-h-10 items-center text-sm font-bold text-brand-600">Ver todos</Link></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MATERIAL_CREATION_TOOLS.slice(0, 4).map((tool) => (
              <Link key={tool.tipo} to={routes.herramientaNueva(tool.tipo)} className="focus-ring rounded-2xl border border-border p-4 transition hover:border-brand-300 hover:bg-brand-50/60 dark:hover:bg-brand-500/10">
                <span className={cn('grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white', tool.gradient)}><tool.icon className="h-5 w-5" /></span>
                <p className="mt-3 text-sm font-bold">{tool.label}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Continuar trabajando</p><h2 className="mt-1 font-display text-xl font-bold">Material reciente</h2></div><Link to={routes.herramientaNueva()} className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white" aria-label="Crear material"><Plus className="h-5 w-5" /></Link></div>
          {recentMaterials.length ? (
            <div className="mt-4 space-y-2">
              {recentMaterials.map((item) => { const meta = TOOLS.find((tool) => tool.tipo === item.tipo); const Icon = meta?.icon ?? Wand2; return (
                <Link key={item.id} to={routes.herramienta(item.id)} className="focus-ring flex min-h-14 items-center gap-3 rounded-xl border border-border px-3 transition hover:bg-surface-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.titulo ?? item.tipo}</span><span className="text-xs text-muted">{meta?.label ?? item.tipo}</span></span>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
              ); })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-2/60 p-5 text-center"><Wand2 className="mx-auto h-7 w-7 text-brand-500" /><p className="mt-2 font-bold">Aún no tienes materiales</p><p className="mt-1 text-sm text-muted">Crea uno desde Recursos.</p></div>
          )}
        </Card>
      </section>
    </div>
  );
}
