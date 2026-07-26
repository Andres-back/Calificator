import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { ActionCard, Card, Badge, Skeleton, EmptyState, QueryError } from '@/components/ui';
import { XaliAvatar } from '@/modules/xali/components/XaliAvatar';
import { useAuth } from '@/stores/auth';
import { getResumenAcademico } from '@/modules/calificaciones/api';
import { cn } from '@/lib/cn';

const QUICK_LINKS = [
  { to: '/app/materias', label: 'Mis materias', desc: 'Tus cursos inscritos', icon: BookOpen, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { to: '/app/materias/unirse', label: 'Unirme a materia', desc: 'Con el código del docente', icon: UserPlus, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  { to: '/app/evaluaciones', label: 'Evaluaciones', desc: 'Resuelve y envía', icon: ClipboardCheck, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { to: '/app/calificaciones/boletin', label: 'Mi boletín', desc: 'Tus notas confirmadas', icon: FileText, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  { to: '/app/xali', label: 'Asistente Xali', desc: 'Xali te ayuda a entender, practicar y mejorar', icon: Sparkles, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300', xali: true },
];

function fmt(n: number | null) {
  return n == null ? '—' : n.toFixed(1);
}

export function DashboardEstudiante() {
  const user = useAuth((state) => state.user);
  const firstName = user?.nombre?.split(' ')[0] ?? 'Estudiante';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-academic-summary', user?.id],
    queryFn: () => getResumenAcademico(user!.id),
    enabled: !!user?.id,
  });

  const hasData = !!data && data.total_notas > 0;

  return (
    <div className="space-y-7">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden border-b border-border pb-6"
      >
        {/* Hero Image Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/branding/hero-ai-brain.png" 
            alt="" 
            className="h-full w-full object-cover opacity-15 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/95 to-surface/80" />
        </div>
        
        <div className="relative z-10 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
              <GraduationCap className="h-3.5 w-3.5" /> Tu espacio de aprendizaje
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold">Hola, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-muted">
              Este es tu espacio para revisar tus avances y seguir mejorando.
            </p>
            <p className="mt-4 flex max-w-2xl items-start gap-2 border-l-2 border-brand-300 pl-3 text-sm text-muted">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-brand-500" />
              La constancia mejora tus resultados. Revisa tus materias, atiende la retroalimentación y sigue avanzando.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <img
              src="/branding/xali-hello.png"
              alt="Xali"
              className="h-24 w-24 object-contain"
            />
          </div>
        </div>
      </motion.div>

      <section aria-labelledby="student-next-title">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">Prioridad</p>
          <h2 id="student-next-title" className="section-title mt-1">¿Qué actividad tienes pendiente?</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            to="/app/evaluaciones"
            icon={ClipboardCheck}
            title="Revisar evaluaciones"
            description="Consulta las actividades publicadas y continúa las que tengas pendientes."
            tone="brand"
            meta="Abrir evaluaciones"
          />
          <ActionCard
            to="/app/xali"
            icon={Sparkles}
            title="Pedir ayuda a Xali"
            description="Aclara una duda o repasa la retroalimentación que ya recibiste."
            tone="info"
            meta="Conversar con Xali"
          />
        </div>
      </section>

      {/* Resumen académico */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Tu progreso</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : isError ? (
          <QueryError
            title="No pudimos cargar tu progreso"
            description="Tus calificaciones no se reemplazaron por ceros. Reintenta para consultar la información confirmada."
            error={error}
            onRetry={() => void refetch()}
          />
        ) : !hasData ? (
          <EmptyState
            icon={GraduationCap}
            title="Aún no hay calificaciones confirmadas"
            description="Cuando tus docentes revisen y confirmen tus evaluaciones, aquí verás tu mejor materia, tus áreas por fortalecer y tu progreso."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/app/evaluaciones" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
                  <ClipboardCheck className="h-4 w-4" /> Ver evaluaciones
                </Link>
                <Link to="/app/calificaciones/boletin" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2">
                  <FileText className="h-4 w-4" /> Ir a mi boletín
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {/* Mejor materia */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <img
                src="/branding/xali-celebrating.png"
                alt=""
                className="absolute -right-3 -top-3 h-20 w-20 object-contain opacity-90"
              />
              <div className="relative z-10">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Award className="h-5 w-5" />
                  </span>
                  <Badge tone="success">Tu mejor materia</Badge>
                </div>
                <p className="font-display text-lg font-bold">{data!.mejor?.materia_nombre}</p>
                <p className="mt-1 text-3xl font-extrabold text-fg">{fmt(data!.mejor?.promedio ?? null)}</p>
                <p className="mt-2 text-sm text-muted">¡Excelente! Mantén ese ritmo.</p>
              </div>
            </motion.div>

            {/* Materia por fortalecer */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <img
                src="/branding/xali-studying.png"
                alt=""
                className="absolute -right-3 -top-3 h-20 w-20 object-contain opacity-90"
              />
              <div className="relative z-10">
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('grid h-10 w-10 place-items-center rounded-lg', data!.por_mejorar ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300')}>
                    <Target className="h-5 w-5" />
                  </span>
                  <Badge tone={data!.por_mejorar ? 'warning' : 'success'}>{data!.por_mejorar ? 'Materia por fortalecer' : 'Sin alertas'}</Badge>
                </div>
                {data!.por_mejorar ? (
                  <>
                    <p className="font-display text-lg font-bold">{data!.por_mejorar.materia_nombre}</p>
                    <p className="mt-1 text-3xl font-extrabold text-amber-600 dark:text-amber-400">{fmt(data!.por_mejorar.promedio)}</p>
                    <p className="mt-2 text-sm text-muted">Puedes mejorar con práctica y revisando tus retroalimentaciones.</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-lg font-bold">¡Vas muy bien!</p>
                    <p className="mt-1 text-sm text-muted">Sigue así en tu materia y suma más evaluaciones para ver tu progreso completo.</p>
                  </>
                )}
              </div>
            </motion.div>

            {/* Promedio general */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="h-full p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <Badge tone="brand">Promedio general</Badge>
                </div>
                <p className="mt-1 text-3xl font-extrabold text-fg">{fmt(data!.promedio_general)}</p>
                <p className="mt-2 text-sm text-muted">
                  {data!.total_notas} nota{data!.total_notas === 1 ? '' : 's'} confirmada{data!.total_notas === 1 ? '' : 's'} en {data!.total_materias} materia{data!.total_materias === 1 ? '' : 's'}.
                </p>
              </Card>
            </motion.div>
          </div>
        )}

        {hasData && data!.por_mejorar && (
          <p className="mt-4 rounded-lg border border-border bg-surface-2/60 p-4 text-sm text-muted">
            <Sparkles className="mr-1.5 inline h-4 w-4 text-brand-500" />
            Vas bien. Enfócate esta semana en <strong className="text-fg">{data!.por_mejorar.materia_nombre}</strong> y revisa tus retroalimentaciones para mejorar.
          </p>
        )}
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link, i) => (
            <motion.div key={link.to} className="min-w-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={link.to} className="block min-w-0">
                <Card interactive className="group flex min-w-0 items-center gap-3 p-4">
                  {'xali' in link && link.xali ? (
                    <XaliAvatar size="md" mood="student" className="rounded-xl" />
                  ) : (
                    <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', link.tone)}>
                      <link.icon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{link.label}</p>
                    <p className="truncate text-xs text-muted">{link.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
