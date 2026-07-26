import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, BookMarked, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState, Modal, Input, Field, Textarea, ConfirmDialog } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { getMateria } from './api';
import { listDbaPersonalizados, createDbaPersonalizado, updateDbaPersonalizado, deleteDbaPersonalizado } from './dbaApi';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useDeleteConfirm } from '@/lib/hooks';
import type { DBAPersonalizado } from '@/types/api';

const EMPTY = { enunciado: '', evidencias_aprendizaje: '', ejemplo: '' };

function DbaContent({ materiaId }: { materiaId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DBAPersonalizado | null>(null);
  const [form, setForm] = useState(EMPTY);
  const { target: confirmDeleteTarget, setTarget: setConfirmDeleteTarget, mutation: remove } = useDeleteConfirm({
    mutationFn: deleteDbaPersonalizado,
    queryKey: ['dba-personalizados', materiaId],
    successMessage: 'DBA desactivado.',
  });

  const { data: materia } = useQuery({ queryKey: ['materia', materiaId], queryFn: () => getMateria(materiaId) });
  const { data, isLoading, isError } = useQuery({ queryKey: ['dba-personalizados', materiaId], queryFn: () => listDbaPersonalizados(materiaId) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dba-personalizados', materiaId] });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d: DBAPersonalizado) => {
    setEditing(d);
    setForm({ enunciado: d.enunciado, evidencias_aprendizaje: d.evidencias_aprendizaje ?? '', ejemplo: d.ejemplo ?? '' });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        enunciado: form.enunciado.trim(),
        evidencias_aprendizaje: form.evidencias_aprendizaje.trim() || undefined,
        ejemplo: form.ejemplo.trim() || undefined,
      };
      return editing ? updateDbaPersonalizado(editing.id, payload) : createDbaPersonalizado(materiaId, payload);
    },
    onSuccess: () => { invalidate(); toast.success(editing ? 'DBA actualizado' : 'DBA creado'); setOpen(false); },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const valid = form.enunciado.trim().length >= 10;

  if (isLoading) {
    return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <PageHeader
            title="DBA personalizados"
            eyebrow="Derechos Básicos de Aprendizaje"
            subtitle={materia ? `Gestiona los DBA personalizados para ${materia.nombre}.` : 'Crea y gestiona DBA personalizados para esta materia.'}
          />
        </div>
        <Button onClick={openCreate} disabled={save.isPending}>
          <Plus className="h-4 w-4" /> Nuevo DBA
        </Button>
      </div>

      {isError ? (
        <Card className="flex items-start gap-3 border-rose-200 p-5 dark:border-rose-500/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-500" />
          <div>
            <p className="font-semibold">No se pudieron cargar los DBA</p>
            <p className="mt-1 text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Sin DBA personalizados"
          description="Crea tu primer Derecho Básico de Aprendizaje personalizado para esta materia."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo DBA</Button>}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4">
            {data.map((dba, i) => (
              <motion.div key={dba.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{dba.enunciado}</p>
                      {dba.evidencias_aprendizaje && <p className="mt-2 text-sm text-muted"><b>Evidencias:</b> {dba.evidencias_aprendizaje}</p>}
                      {dba.ejemplo && <p className="mt-1 text-sm text-muted"><b>Ejemplo:</b> {dba.ejemplo}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(dba)} aria-label={`Editar DBA ${dba.enunciado}`} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteTarget({ id: dba.id, title: dba.enunciado })} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label={`Eliminar DBA ${dba.enunciado}`} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar DBA' : 'Nuevo DBA'}>
        <div className="space-y-4">
          <Field label="Enunciado" required hint="Describe el derecho básico de aprendizaje. Mínimo 10 caracteres.">
            <Textarea
              value={form.enunciado}
              onChange={(event) => setForm((prev) => ({ ...prev, enunciado: event.currentTarget.value }))}
              placeholder="Ej: Comprende la relación entre los seres vivos y su entorno."
              rows={3}
              aria-invalid={Boolean(form.enunciado && !valid)}
            />
          </Field>
          <Field label="Evidencias de aprendizaje" hint="Opcional. Indicadores observables de que el estudiante alcanzó el DBA.">
            <Textarea
              value={form.evidencias_aprendizaje}
              onChange={(event) => setForm((prev) => ({ ...prev, evidencias_aprendizaje: event.currentTarget.value }))}
              placeholder="Ej: Identifica factores bióticos y abióticos en un ecosistema local."
              rows={2}
            />
          </Field>
          <Field label="Ejemplo" hint="Opcional. Situación o caso concreto que ilustra el DBA.">
            <Textarea
              value={form.ejemplo}
              onChange={(event) => setForm((prev) => ({ ...prev, ejemplo: event.currentTarget.value }))}
              placeholder="Ej: Al visitar un humedal, el estudiante clasifica los organismos que observa."
              rows={2}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!valid || save.isPending} loading={save.isPending}>
              {editing ? 'Actualizar' : 'Crear DBA'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteTarget)}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
        title="Desactivar DBA"
        description="El DBA se desactivará y ya no estará disponible para nuevas evaluaciones. Las evaluaciones existentes no se ven afectadas."
        confirmLabel="Desactivar"
        tone="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

export function MateriaDbaPage() {
  const { id = '' } = useParams();
  const user = useAuth((state) => state.user);
  const materiaId = id;

  // Students cannot manage DBA — redirect to the subject overview
  if (user?.rol === 'estudiante') {
    return <Navigate to={`/app/materias/${materiaId}`} replace />;
  }

  return <DbaContent materiaId={materiaId} />;
}
