import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, RefreshCw, Users, ClipboardCheck, Mail, BookMarked, BookOpen } from 'lucide-react';
import { Button, Card, LoadingScreen, Badge, EmptyState, QueryError } from '@/components/ui';
import { getMateria, getMateriaEstudiantes, regenerateCode } from './api';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export function MateriaDetailPage() {
  const { id = '' } = useParams();
  const user = useAuth((state) => state.user);
  const canManageMateria = user?.rol === 'profesor' || user?.rol === 'admin';

  // Students can read a subject, but they must never request its administrative roster.
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

  const regen = useMutation({
    mutationFn: () => regenerateCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materia', id] });
      toast.success('Código regenerado');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

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

  const copy = () => {
    void navigator.clipboard.writeText(materia.codigo_matricula)
      .then(() => toast.success('Código copiado'))
      .catch(() => toast.error('No fue posible copiar el código.'));
  };

  return (
    <div className="space-y-6">
      <Link to="/app/materias" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a {canManageMateria ? 'Materias' : 'Mis materias'}
      </Link>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"><BookOpen className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={materia.estado === 'activa' ? 'success' : 'neutral'} className="capitalize">{materia.estado}</Badge>
            <span className="text-sm text-muted">{[materia.area, materia.grado].filter(Boolean).join(' · ') || 'Sin área o grado definidos'}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{materia.nombre}</h1>
          {materia.descripcion && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{materia.descripcion}</p>}
        </div>
      </motion.section>

      {canManageMateria ? (
        <TeacherMateriaView
          materia={managedMateriaQuery.data}
          copy={copy}
          isRegenerating={regen.isPending}
          onRegenerate={() => regen.mutate()}
        />
      ) : (
        <StudentMateriaView materiaId={materia.id} />
      )}
    </div>
  );
}

function TeacherMateriaView({
  materia,
  copy,
  isRegenerating,
  onRegenerate,
}: {
  materia: Awaited<ReturnType<typeof getMateriaEstudiantes>> | undefined;
  copy: () => void;
  isRegenerating: boolean;
  onRegenerate: () => void;
}) {
  if (!materia) return null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">Código de inscripción</p>
            <p className="text-xs text-muted">Compártelo solo con estudiantes de esta materia.</p>
          </div>
          <Badge tone="brand">Activo</Badge>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-5 text-center dark:bg-brand-500/10">
          <p className="font-mono text-2xl font-extrabold text-brand-700 dark:text-brand-200">{materia.codigo_matricula}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copiar</Button>
          <Button variant="outline" size="sm" loading={isRegenerating} onClick={onRegenerate}><RefreshCw className="h-4 w-4" /> Regenerar</Button>
        </div>
        <Link to={`/app/evaluaciones?materia=${materia.id}`}>
          <Button className="mt-3 w-full" variant="secondary"><ClipboardCheck className="h-4 w-4" /> Ver evaluaciones</Button>
        </Link>
        <Link to={`/app/materias/${materia.id}/dba`}>
          <Button className="mt-2 w-full" variant="outline"><BookMarked className="h-4 w-4" /> DBA de la materia</Button>
        </Link>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="inline-flex items-center gap-2 font-display font-bold"><Users className="h-5 w-5 text-brand-500" /> Estudiantes</p>
            <p className="text-xs text-muted">Listado de estudiantes matriculados en esta clase.</p>
          </div>
          <Badge tone="neutral">{materia.estudiantes.length}</Badge>
        </div>
        {materia.estudiantes.length === 0 ? (
          <EmptyState icon={Users} title="Sin estudiantes aún" description="Comparte el código de inscripción para que se unan." />
        ) : (
          <ul className="divide-y divide-border">
            {materia.estudiantes.map((estudiante) => (
              <li key={estudiante.id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                  {estudiante.nombre.split(' ').map((segment) => segment[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{estudiante.nombre}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted"><Mail className="h-3 w-3" /> {estudiante.email}</p>
                </div>
                <Badge tone="neutral">Matriculado</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StudentMateriaView({ materiaId }: { materiaId: string }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="success">Acceso confirmado</Badge>
          <h2 className="mt-3 font-display text-xl font-bold">Tu materia</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Estás matriculado en esta materia. Consulta las evaluaciones disponibles y revisa tus resultados cuando el docente los confirme.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/app/evaluaciones?materia=${materiaId}`}>
            <Button variant="secondary"><ClipboardCheck className="h-4 w-4" /> Ver evaluaciones</Button>
          </Link>
          <Link to="/app/calificaciones/boletin">
            <Button variant="outline">Ver boletín</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
