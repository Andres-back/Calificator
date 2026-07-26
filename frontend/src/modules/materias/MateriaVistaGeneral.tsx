import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, RefreshCw, Users, ClipboardCheck, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Badge, EmptyState } from '@/components/ui';
import { regenerateCode } from './api';
import { useMateriaContext } from './MateriaContext';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import type { MateriaConEstudiantes } from '@/types/api';

export function MateriaVistaGeneral() {
  const { materia, canManageMateria } = useMateriaContext();

  if (canManageMateria) {
    return <TeacherOverview materia={materia as MateriaConEstudiantes} />;
  }

  return <StudentOverview materiaId={materia.id} />;
}

function TeacherOverview({ materia }: { materia: MateriaConEstudiantes }) {
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
        // Fallback for HTTP (non-secure context)
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
          <Button variant="outline" size="sm" loading={regen.isPending} onClick={() => regen.mutate()}><RefreshCw className="h-4 w-4" /> Regenerar</Button>
        </div>
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

function StudentOverview({ materiaId }: { materiaId: string }) {
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
          <Link to={`/app/materias/${materiaId}/evaluaciones`}>
            <Button variant="secondary"><ClipboardCheck className="h-4 w-4" /> Ver evaluaciones</Button>
          </Link>
          <Link to={`/app/materias/${materiaId}/boletin`}>
            <Button variant="outline">Ver boletín</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
