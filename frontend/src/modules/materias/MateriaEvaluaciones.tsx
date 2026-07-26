import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, ClipboardCheck, Lock, Clock, Pencil } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, QueryError, Skeleton, Textarea } from '@/components/ui';
import { listEvaluaciones, createEvaluacion, updateEvaluacion, cerrarEvaluacion, type EvaluacionUpdate } from '@/modules/evaluaciones/api';
import { useMateriaContext } from './MateriaContext';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Evaluacion } from '@/types/api';

export function MateriaEvaluaciones() {
  const { materia, canManageMateria } = useMateriaContext();
  const [open, setOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', nota_maxima: 5 });

  const evaluacionesQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const create = useMutation({
    mutationFn: () => createEvaluacion({
      materia_id: materia.id,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      nota_maxima: form.nota_maxima,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', materia.id] });
      toast.success('Evaluación creada');
      setOpen(false);
      setEditingEval(null);
      setForm({ nombre: '', descripcion: '', nota_maxima: 5 });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EvaluacionUpdate }) => updateEvaluacion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', materia.id] });
      toast.success('Evaluación actualizada');
      setOpen(false);
      setEditingEval(null);
      setForm({ nombre: '', descripcion: '', nota_maxima: 5 });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const cerrar = useMutation({
    mutationFn: (id: string) => cerrarEvaluacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluaciones', materia.id] });
      toast.success('Evaluación cerrada');
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  function openCreate() {
    setEditingEval(null);
    setForm({ nombre: '', descripcion: '', nota_maxima: 5 });
    setOpen(true);
  }

  function openEdit(ev: Evaluacion) {
    setEditingEval(ev);
    setForm({
      nombre: ev.nombre,
      descripcion: ev.descripcion ?? '',
      nota_maxima: Number(ev.nota_maxima),
    });
    setOpen(true);
  }

  function handleSubmit() {
    if (editingEval) {
      const payload: EvaluacionUpdate = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        nota_maxima: form.nota_maxima,
      };
      update.mutate({ id: editingEval.id, payload });
    } else {
      create.mutate();
    }
  }

  const evaluaciones = evaluacionesQuery.data;
  const { cerradas } = useMemo(() => {
    if (!evaluaciones) return { cerradas: [] };
    return {
      cerradas: evaluaciones.filter((e) => e.estado === 'cerrada'),
    };
  }, [evaluaciones]);

  return (
    <div className="space-y-5">
      {canManageMateria && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">
              {evaluaciones?.length ?? 0} evaluaciones · {cerradas.length} cerradas
            </p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nueva evaluación</Button>
        </div>
      )}

      {evaluacionesQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : evaluacionesQuery.isError ? (
        <QueryError error={evaluacionesQuery.error} onRetry={() => void evaluacionesQuery.refetch()} />
      ) : evaluaciones && evaluaciones.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {evaluaciones.map((evaluacion) => (
            <Card key={evaluacion.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={evaluacion.estado === 'cerrada' ? 'neutral' : 'success'}>{evaluacion.estado}</Badge>
                    <span className="text-xs text-muted">{evaluacion.nota_maxima} pts</span>
                    {evaluacion.tiempo_limite_minutos != null && (
                      <span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {evaluacion.tiempo_limite_minutos} min</span>
                    )}
                  </div>
                  <p className="mt-2 font-semibold">{evaluacion.nombre}</p>
                  {evaluacion.descripcion && <p className="mt-1 text-sm text-muted line-clamp-2">{evaluacion.descripcion}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {evaluacion.estado === 'borrador' && canManageMateria && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit(evaluacion)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  </>
                )}
                {evaluacion.estado !== 'cerrada' && (
                  <>
                    <Link to={`/app/materias/${materia.id}/calificar?evaluacion=${evaluacion.id}`}>
                      <Button size="sm" variant="secondary"><ClipboardCheck className="h-4 w-4" /> Calificar</Button>
                    </Link>
                    {canManageMateria && (
                      <Button size="sm" variant="outline" onClick={() => cerrar.mutate(evaluacion.id)} loading={cerrar.isPending}>
                        <Lock className="h-4 w-4" /> Cerrar
                      </Button>
                    )}
                  </>
                )}
                {evaluacion.estado === 'cerrada' && (
                  <span className="flex items-center gap-1 text-xs text-muted"><Lock className="h-3 w-3" /> Cerrada</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        canManageMateria ? (
          <EmptyState icon={ClipboardCheck} title="Sin evaluaciones" description="Crea la primera evaluación para esta materia."
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Crear evaluación</Button>} />
        ) : (
          <EmptyState icon={ClipboardCheck} title="Sin evaluaciones" description="Tu docente aún no ha creado evaluaciones para esta materia." />
        )
      )}

      {canManageMateria && (
        <Modal open={open} onClose={() => { setOpen(false); setEditingEval(null); }} title={editingEval ? 'Editar evaluación' : 'Nueva evaluación'}>
          <div className="space-y-4">
            <Field label="Nombre" required>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="p. ej., Fotografía 3er bimestre" />
            </Field>
            <Field label="Descripción">
              <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Opcional" />
            </Field>
            <Field label="Nota máxima">
              <Input type="number" min={1} max={100} value={form.nota_maxima} onChange={(e) => setForm({ ...form, nota_maxima: Number(e.target.value) || 5 })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); setEditingEval(null); }}>Cancelar</Button>
              <Button onClick={handleSubmit} loading={create.isPending || update.isPending} disabled={!form.nombre.trim()}>
                {editingEval ? 'Guardar cambios' : 'Crear'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
