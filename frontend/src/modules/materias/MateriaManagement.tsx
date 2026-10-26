import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Archive, Pencil, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, ConfirmDialog, Field, Input, Modal, Textarea } from '@/components/ui';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/stores/auth';
import type { Materia } from '@/types/api';
import { updateMateria } from './api';

export function MateriaManagement({ materia }: { materia: Materia }) {
  const actor = useAuth(state => state.user);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState({ nombre: materia.nombre, area: materia.area ?? '', grado: materia.grado ?? '', descripcion: materia.descripcion ?? '' });
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const mobile = useMobileFormViewport(editing, formRef);
  const archived = materia.estado === 'archivada';
  const permitted = Boolean(actor?.permissions?.includes('subjects.update')) && (actor?.rol === 'admin' || actor?.id === materia.profesor_id);
  const mutation = useMutation({
    mutationFn: (transition: boolean) => updateMateria(materia.id, {
      expected_updated_at: materia.updated_at,
      ...(transition ? { estado: archived ? 'activa' : 'archivada' } : {
        nombre: form.nombre.trim(), area: form.area.trim(), grado: form.grado.trim(), descripcion: form.descripcion.trim(),
      }),
    }),
    onSuccess: async (_, transition) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['materias'] }), queryClient.invalidateQueries({ queryKey: ['materia', materia.id] })]);
      setEditing(false); setConfirm(false); setError('');
      toast.success(transition ? archived ? 'Materia restaurada. Las inscripciones y entregas siguen cerradas.' : 'Materia archivada. Su historial sigue disponible en Archivadas.' : 'Materia actualizada.');
    },
    onError: cause => setError(toApiError(cause).detail),
  });
  if (!permitted) return null;
  return <div className="min-w-0 space-y-2">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="min-h-11" onClick={() => { setForm({ nombre: materia.nombre, area: materia.area ?? '', grado: materia.grado ?? '', descripcion: materia.descripcion ?? '' }); setError(''); setEditing(true); }}><Pencil className="h-4 w-4" />Editar materia</Button>
      <Button variant="outline" className="min-h-11" onClick={() => { setError(''); setConfirm(true); }}>{archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{archived ? 'Restaurar materia' : 'Eliminar de mis materias'}</Button>
    </div>
    <Modal open={editing} onClose={() => { if (!mutation.isPending) setEditing(false); }} title="Editar materia" description="Solo cambia la información de la materia. Conservaremos estudiantes, evaluaciones y notas." mobileViewport={mobile.viewport} mobileWriting={mobile.isWriting} closeOnBackdrop={!mutation.isPending} closeOnEscape={!mutation.isPending}>
      <form ref={formRef} className="flex min-h-0 flex-col gap-3" onSubmit={event => { event.preventDefault(); if (permitted && !mutation.isPending) mutation.mutate(false); }}>
        {mobile.isWriting && <Button className="min-h-11 self-end" variant="ghost" onClick={mobile.finishWriting}>Listo</Button>}
        <div data-mobile-scroll className="min-h-0 space-y-3 overflow-y-auto px-1">
          <Field label="Nombre de la materia" required><Input className="text-base sm:text-sm" required minLength={2} maxLength={180} value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Área"><Input className="text-base sm:text-sm" maxLength={100} value={form.area} onChange={event => setForm({ ...form, area: event.target.value })} /></Field><Field label="Grado"><Input className="text-base sm:text-sm" maxLength={30} value={form.grado} onChange={event => setForm({ ...form, grado: event.target.value })} /></Field></div>
          <Field label="Descripción"><Textarea className="text-base sm:text-sm" value={form.descripcion} onChange={event => setForm({ ...form, descripcion: event.target.value })} /></Field>
        </div>
        {error && <p role="alert" className="break-words text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11" loading={mutation.isPending} disabled={form.nombre.trim().length < 2 || mutation.isPending}>Guardar cambios</Button><Button variant="outline" className="min-h-11" disabled={mutation.isPending} onClick={() => setEditing(false)}>Cancelar</Button></div>
      </form>
    </Modal>
    <ConfirmDialog open={confirm} title={archived ? 'Restaurar materia' : 'Eliminar de mis materias'}
      description={archived ? `«${materia.nombre}» volverá a tus materias activas si tienes cupo. No se abrirán automáticamente las inscripciones ni las entregas.` : `«${materia.nombre}» se moverá a Archivadas y podrás restaurarla. No borra estudiantes, notas, evaluaciones, evidencias ni asistencias. Se cerrarán nuevas inscripciones y entregas; lo que ya esté en proceso podrá terminar.`}
      confirmLabel={archived ? 'Restaurar' : 'Archivar materia'} loading={mutation.isPending} onClose={() => { if (!mutation.isPending) setConfirm(false); }} onConfirm={() => { if (permitted && !mutation.isPending) mutation.mutate(true); }}>
      {error && <p role="alert" className="break-words text-sm text-danger">{error}</p>}
    </ConfirmDialog>
  </div>;
}
