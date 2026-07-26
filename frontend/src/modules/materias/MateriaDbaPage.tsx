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

export function MateriaDbaPage() {
  const { id = '' } = useParams();
  const user = useAuth((state) => state.user);
  if (user?.rol === 'estudiante') return <Navigate to={`/app/materias/${id}`} replace />;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DBAPersonalizado | null>(null);
  const [form, setForm] = useState(EMPTY);
  const { target: confirmDeleteTarget, setTarget: setConfirmDeleteTarget, mutation: remove } = useDeleteConfirm({
    mutationFn: deleteDbaPersonalizado,
    queryKey: ['dba-personalizados', id],
    successMessage: 'DBA desactivado.',
  });

  const { data: materia } = useQuery({ queryKey: ['materia', id], queryFn: () => getMateria(id) });
  const { data, isLoading, isError } = useQuery({ queryKey: ['dba-personalizados', id], queryFn: () => listDbaPersonalizados(id) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dba-personalizados', id] });

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
      return editing ? updateDbaPersonalizado(editing.id, payload) : createDbaPersonalizado(id, payload);
    },
    onSuccess: () => { invalidate(); toast.success(editing ? 'DBA actualizado' : 'DBA creado'); setOpen(false); },
    onError: (e) => toast.error(toApiError(e).detail),
  });



  const valid = form.enunciado.trim().length >= 10;

  return (
    <div className="space-y-6">
      <Link to={`/app/materias/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a la materia
      </Link>

      <PageHeader
        title="DBA de la materia"
        subtitle={materia ? `${materia.nombre}${materia.area ? ` · ${materia.area}` : ''}${materia.grado ? ` · ${materia.grado}°` : ''}` : 'Criterios curriculares personalizados'}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo DBA</Button>}
      />

      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="No se pudieron cargar los DBA" description="Revisa tu conexión e inténtalo de nuevo." />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Sin DBA personalizados"
          description="Crea criterios curriculares propios para esta materia. No reemplazan los DBA oficiales del MEN."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo DBA</Button>}
        />
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {data.map((d, i) => (
              <motion.div key={d.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                      <BookMarked className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone="violet">Personalizado</Badge>
                        <Badge tone="neutral">{d.area} · {d.grado}°</Badge>
                      </div>
                      <p className="font-medium leading-relaxed">{d.enunciado}</p>
                      {d.evidencias_aprendizaje && <p className="mt-2 text-sm text-muted"><span className="font-semibold text-fg">Evidencias:</span> {d.evidencias_aprendizaje}</p>}
                      {d.ejemplo && <p className="mt-1 text-sm text-muted"><span className="font-semibold text-fg">Ejemplo:</span> {d.ejemplo}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(d)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" loading={remove.isPending}
                        onClick={() => setConfirmDeleteTarget({ id: d.id, title: d.enunciado })} title="Desactivar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar DBA' : 'Nuevo DBA personalizado'}>
        <form onSubmit={(e) => { e.preventDefault(); if (valid && !save.isPending) save.mutate(); }} className="space-y-4">
          <Field label="Enunciado" required hint="Mínimo 10 caracteres. Describe el aprendizaje o criterio.">
            <Textarea value={form.enunciado} onChange={(e) => setForm({ ...form, enunciado: e.target.value })} placeholder="El estudiante comprende…" required />
            {form.enunciado.length > 0 && form.enunciado.trim().length < 10 && (
              <span className="mt-1 block text-xs text-rose-500">Faltan {10 - form.enunciado.trim().length} caracteres.</span>
            )}
          </Field>
          <Field label="Evidencias de aprendizaje (opcional)">
            <Textarea value={form.evidencias_aprendizaje} onChange={(e) => setForm({ ...form, evidencias_aprendizaje: e.target.value })} placeholder="Cómo se demuestra el logro…" />
          </Field>
          <Field label="Ejemplo (opcional)">
            <Input value={form.ejemplo} onChange={(e) => setForm({ ...form, ejemplo: e.target.value })} placeholder="Un ejemplo concreto…" />
          </Field>
          <Button type="submit" loading={save.isPending} disabled={!valid} className="w-full">
            {editing ? 'Guardar cambios' : 'Crear DBA'}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteTarget)}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
        title="Desactivar DBA"
        confirmLabel="Desactivar"
        tone="danger"
        loading={remove.isPending}
        description="El DBA se desactivará, no se borra físicamente. Puedes volver a activarlo después."
      />
    </div>
  );
}
