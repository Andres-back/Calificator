import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCheck, Search, UserPlus } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { enrollExistingStudents, listExistingStudents } from './rosterImportApi';

export function ExistingStudentsDialog({ open, materiaId, onClose }: { open: boolean; materiaId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const students = useQuery({ queryKey: ['existing-students', materiaId], queryFn: () => listExistingStudents(materiaId), enabled: open });
  const visible = useMemo(() => (students.data ?? []).filter((student) => `${student.nombre} ${student.email}`.toLowerCase().includes(search.toLowerCase())), [search, students.data]);
  const visibleIds = useMemo(() => visible.map((student) => student.id), [visible]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const toggleAllVisible = () => {
    setSelected((current) => {
      if (allVisibleSelected) {
        const visibleSet = new Set(visibleIds);
        return current.filter((id) => !visibleSet.has(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };
  const enroll = useMutation({ mutationFn: () => enrollExistingStudents(materiaId, selected), onSuccess: (result) => { toast.success(`${result.matriculados} estudiantes añadidos`); void queryClient.invalidateQueries({ queryKey: ['materia', materiaId] }); setSelected([]); onClose(); }, onError: (error) => toast.error(toApiError(error).detail) });
  return <Modal open={open} onClose={onClose} title="Agregar estudiantes existentes" description="Reutiliza cuentas verificadas de tus otras materias. Mantendrán el mismo usuario, contraseña e historial." className="max-w-2xl">
    <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted" /><Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o usuario" /></div>
    <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
      <span className="text-sm text-muted">{selected.length} seleccionados</span>
      <Button
        variant="outline"
        disabled={visibleIds.length === 0 || students.isLoading || enroll.isPending}
        aria-label={allVisibleSelected ? 'Desmarcar todos los estudiantes visibles' : 'Seleccionar todos los estudiantes visibles'}
        aria-pressed={allVisibleSelected}
        onClick={toggleAllVisible}
      >
        <CheckCheck className="h-4 w-4" aria-hidden="true" /> Todos
      </Button>
    </div>
    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{visible.map((student) => <label key={student.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:border-brand-400"><input aria-label={student.nombre} type="checkbox" className="mt-1 h-5 w-5" checked={selected.includes(student.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /><span className="min-w-0"><strong className="block">{student.nombre}</strong><span className="block truncate text-xs text-muted">{student.email}</span><span className="block text-xs text-brand-600">{student.materias.join(', ')}</span></span></label>)}{!students.isLoading && visible.length === 0 && <p className="py-8 text-center text-sm text-muted">No hay cuentas disponibles en tus otras materias.</p>}</div>
    <div className="mt-5 flex justify-end"><Button disabled={selected.length === 0} loading={enroll.isPending} onClick={() => enroll.mutate()}><UserPlus className="h-4 w-4" /> Matricular {selected.length || ''}</Button></div>
  </Modal>;
}
