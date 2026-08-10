import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, ClipboardCheck, Camera, BarChart3, BookMarked, CalendarCheck2, LayoutGrid, Users } from 'lucide-react';
import { Badge, LoadingScreen, QueryError } from '@/components/ui';
import { getMateria, getMateriaEstudiantes } from './api';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/cn';

const ALL_TABS = [
  { label: 'Vista general', to: '', icon: LayoutGrid },
  { label: 'Evaluaciones', to: 'evaluaciones', icon: ClipboardCheck },
  { label: 'Calificar', to: 'calificar', icon: Camera, profesorOnly: true },
  { label: 'Asistencia', to: 'asistencia', icon: CalendarCheck2, profesorOnly: true },
  { label: 'Boletín', to: 'boletin', icon: BarChart3 },
  { label: 'DBA', to: 'dba', icon: BookMarked, profesorOnly: true },
] as const;

export function MateriaDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const user = useAuth((state) => state.user);
  const canManageMateria = user?.rol === 'profesor' || user?.rol === 'admin';
  const isStudent = user?.rol === 'estudiante';

  // Students can read a subject, but never request its administrative roster.
  const studentMateriaQuery = useQuery({
    queryKey: ['materia', id, 'student'],
    queryFn: () => getMateria(id),
    enabled: Boolean(id) && !canManageMateria,
  });
  const managedMateriaQuery = useQuery({
    queryKey: ['materia', id, 'manage'],
    queryFn: () => getMateriaEstudiantes(id),
    enabled: Boolean(id) && canManageMateria,
  });
  const materiaQuery = canManageMateria ? managedMateriaQuery : studentMateriaQuery;

  if (materiaQuery.isLoading) return <LoadingScreen />;

  if (materiaQuery.isError) {
    const apiError = toApiError(materiaQuery.error);
    const isNotFound = apiError.status === 404;
    const isForbidden = apiError.status === 403;
    const title = isNotFound
      ? 'Materia no encontrada'
      : isForbidden
        ? 'No tienes acceso a esta materia'
        : 'No fue posible cargar la materia';
    const description = isNotFound
      ? 'La materia pudo ser eliminada o la dirección no es válida.'
      : isForbidden
        ? 'Verifica que estés matriculado o contacta a tu docente.'
        : apiError.detail;

    return (
      <div className="space-y-5">
        <Link to="/app/materias" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Volver a Mis materias
        </Link>
        <QueryError
          error={materiaQuery.error}
          title={title}
          description={description}
          onRetry={isNotFound ? undefined : () => void materiaQuery.refetch()}
        />
      </div>
    );
  }

  const materia = materiaQuery.data;
  if (!materia) return <p className="text-muted">Materia no encontrada.</p>;

  const currentTab = location.pathname.replace(`/app/materias/${id}`, '') || '/';
  const isActiveTab = (tabPath: string) => {
    if (tabPath === '') return currentTab === '/' || currentTab === '';
    return currentTab.startsWith(`/${tabPath}`);
  };

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <Link to="/app/materias" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a {canManageMateria ? 'Materias' : 'Mis materias'}
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative flex flex-col gap-4 overflow-hidden sm:flex-row sm:items-start',
          canManageMateria
            ? 'teacher-page-header rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/80 p-5 shadow-card dark:border-indigo-500/20 dark:from-surface dark:via-surface dark:to-indigo-950/40 sm:p-6'
            : 'border-b border-border pb-4',
        )}
      >
        {canManageMateria && <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />}
        {canManageMateria && <div className="pointer-events-none absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-violet-300/10 blur-3xl" aria-hidden="true" />}
        <div className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-brand-200 bg-brand-50 text-brand-600 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={materia.estado === 'activa' ? 'success' : 'neutral'} className="capitalize">{materia.estado}</Badge>
            <span className="text-sm text-muted">{[materia.area, materia.grado].filter(Boolean).join(' · ') || 'Sin área o grado definidos'}</span>
            {'estudiantes' in materia && (
              <span className="flex items-center gap-1 text-sm text-muted">
                <Users className="h-3.5 w-3.5" /> {(materia as { estudiantes: unknown[] }).estudiantes.length} estudiantes
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{materia.nombre}</h1>
          {materia.descripcion && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{materia.descripcion}</p>}
        </div>
      </motion.section>

      {/* Tab navigation */}
      <nav aria-label="Secciones de la materia" className="teacher-scroll-region -mx-1 flex max-w-full snap-x gap-1 overflow-x-auto rounded-2xl border border-border bg-surface/90 p-1.5 shadow-sm">
        {ALL_TABS.filter((tab) => !isStudent || !('profesorOnly' in tab && tab.profesorOnly)).map((tab) => {
          const active = isActiveTab(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to ? `/app/materias/${id}/${tab.to}` : `/app/materias/${id}`}
              className={cn(
                'focus-ring flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'bg-gradient-to-r from-brand-700 to-indigo-600 text-white shadow-sm'
                  : 'text-secondary hover:bg-surface-2 hover:text-fg',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet context={{ materia, canManageMateria, isStudent }} />
    </div>
  );
}
