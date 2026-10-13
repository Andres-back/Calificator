import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { Badge, EducationalIcon, getSubjectEducationalIcon, LoadingScreen, QueryError, Select } from '@/components/ui';
import { getMateria, getMateriaEstudiantes } from './api';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { isStandardStudentProfile } from '@/lib/authorization';

const ALL_TABS = [
  { label: 'Vista general', to: '', brandIcon: 'subjects', permissions: ['subjects.read'], staffOnly: false },
  { label: 'Evaluaciones', to: 'evaluaciones', brandIcon: 'prepare-evaluation', permissions: ['evaluations.read'], staffOnly: false },
  { label: 'Recursos', to: 'recursos', brandIcon: 'resources', permissions: ['resources.read'], staffOnly: false },
  { label: 'Calificar', to: 'calificar', brandIcon: 'grade-evidence', permissions: ['grading.read', 'grading.grade'], staffOnly: true },
  { label: 'Asistencia', to: 'asistencia', brandIcon: 'attendance', permissions: ['attendance.read', 'attendance.manage'], staffOnly: true },
  { label: 'Boletín', to: 'boletin', brandIcon: 'gradebook', permissions: ['gradebook.read'], staffOnly: false },
  { label: 'Criterios de aprendizaje', to: 'dba', brandIcon: 'curriculum-dba', permissions: ['dba.read', 'dba.manage'], staffOnly: true },
] as const;

export function MateriaDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const permissions = new Set(user?.permissions ?? []);
  const canManageMateria = user?.rol === 'admin'
    || user?.rol === 'profesor'
    || [
      'subjects.create',
      'subjects.update',
      'evaluations.create',
      'evaluations.update',
      'evaluations.publish',
      'evaluations.delete',
      'resources.create',
      'resources.update',
      'resources.assign',
      'resources.delete',
      'grading.grade',
      'grading.publish',
      'attendance.manage',
      'dba.manage',
    ].some((permission) => permissions.has(permission));
  const isStudent = isStandardStudentProfile(user);

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
  const visibleTabs = ALL_TABS
    .filter((tab) => !tab.staffOnly || !isStudent)
    .filter((tab) => tab.to !== 'calificar' || !permissions.has('evaluations.read'))
    .filter((tab) => tab.permissions.some((permission) => permissions.has(permission)));
  const tabHref = (tabPath: string) => tabPath ? `/app/materias/${id}/${tabPath}` : `/app/materias/${id}`;
  const selectedTabHref = tabHref(visibleTabs.find((tab) => isActiveTab(tab.to))?.to ?? '');

  return (
    <div className="space-y-3">
      {/* Back + header */}
      <Link to="/app/materias" className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a {canManageMateria ? 'Materias' : 'Mis materias'}
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative flex items-start gap-3 overflow-hidden',
          canManageMateria
            ? 'teacher-page-header rounded-xl border border-indigo-100 bg-surface p-2.5 dark:border-indigo-500/20 sm:p-4'
            : 'border-b border-border pb-4',
        )}
      >
        <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 sm:h-12 sm:w-12">
          <EducationalIcon name={getSubjectEducationalIcon(materia.area)} className="h-9 w-9 sm:h-11 sm:w-11" />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <h1 className="break-words font-display text-xl font-extrabold tracking-tight sm:text-2xl">{materia.nombre}</h1>
          {canManageMateria && materia.grado && <p className="text-sm text-muted">Grado {materia.grado}</p>}
          {materia.estado !== 'activa' && <Badge tone="warning" className="mt-1 capitalize">{materia.estado}</Badge>}
          <details className="mt-1">
          <summary className="focus-ring min-h-11 cursor-pointer content-center rounded-lg text-sm font-semibold text-muted">Información de la materia</summary>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={materia.estado === 'activa' ? 'success' : 'neutral'} className="capitalize">{materia.estado}</Badge>
            <span className="text-sm text-muted">{[materia.area, materia.grado].filter(Boolean).join(' · ') || 'Sin área o grado definidos'}</span>
            {'estudiantes' in materia && (
              <span className="flex items-center gap-1 text-sm text-muted">
                <Users className="h-3.5 w-3.5" /> {(materia as { estudiantes: unknown[] }).estudiantes.length} estudiantes
              </span>
            )}
          </div>
          {materia.descripcion && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{materia.descripcion}</p>}
          </details>
        </div>
      </motion.section>

      {/* Tab navigation */}
      <div className="md:hidden">
        <label htmlFor="materia-section" className="mb-1.5 block text-sm font-semibold text-fg">Sección de la materia</label>
        <Select
          id="materia-section"
          aria-label="Sección de la materia"
          value={selectedTabHref}
          onChange={(event) => navigate(event.target.value)}
        >
          {visibleTabs.map((tab) => <option key={tab.to} value={tabHref(tab.to)}>{tab.label}</option>)}
        </Select>
      </div>
      <nav aria-label="Secciones de la materia" className="teacher-scroll-region -mx-1 hidden max-w-full snap-x gap-1 overflow-x-auto rounded-2xl border border-border bg-surface/90 p-1.5 shadow-sm md:flex">
        {visibleTabs.map((tab) => {
          const active = isActiveTab(tab.to);
          return (
            <Link
              key={tab.to}
              to={tabHref(tab.to)}
              className={cn(
                'focus-ring flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'bg-gradient-to-r from-brand-700 to-indigo-600 text-white shadow-sm'
                  : 'text-secondary hover:bg-surface-2 hover:text-fg',
              )}
            >
              <EducationalIcon
                name={tab.brandIcon === 'subjects' ? getSubjectEducationalIcon(materia.area) : tab.brandIcon}
                className="h-7 w-7"
              />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet context={{ materia, canManageMateria, isStudent }} />
    </div>
  );
}
