import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import type { Calificacion, Evaluacion } from '@/types/api';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { listCalificaciones } from '@/modules/calificaciones/api';
import { downloadCsv } from '@/lib/csvExport';
import { getMateriaEstudiantes } from './api';
import { buildFollowUpRows } from './gradebookModel';

export function GradebookExport({ materiaId, materiaName, evaluations, initialEvaluationId, studentCount, onClose }: {
  materiaId: string; materiaName: string; evaluations: Evaluacion[];
  initialEvaluationId: string; studentCount: number; onClose: () => void;
}) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user?.id);
  const [selected, setSelected] = useState(() => initialEvaluationId ? [initialEvaluationId] : evaluations.map(item => item.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const active = useRef(true);
  const locked = useRef(false);
  const permitted = Boolean(owner) && owner === user?.id && Boolean(user?.permissions?.includes('grading.read'));
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function exportNotes() {
    if (!permitted || !selected.length || locked.current) return;
    locked.current = true;
    const session = useAuth.getState().user;
    const valid = () => active.current && useAuth.getState().user === session && Boolean(session?.permissions?.includes('grading.read'));
    setBusy(true); setError(''); setMessage('Leyendo notas actuales…');
    try {
      const [subject, available] = await Promise.all([getMateriaEstudiantes(materiaId), listEvaluaciones(materiaId)]);
      if (!valid()) return;
      const chosen = selected.map(id => available.find(item => item.id === id && item.materia_id === materiaId && item.estado !== 'borrador'));
      if (subject.id !== materiaId || chosen.some(item => !item)) throw new Error('Una evaluación ya no está disponible. Cierra y vuelve a seleccionar.');
      const scope = chosen as Evaluacion[];
      const grades = new Map<string, Calificacion[]>();
      // Limitar lecturas concurrentes sin cambiar ni reintentar trabajos de IA.
      for (let offset = 0; offset < scope.length; offset += 3) {
        if (!valid()) return;
        const batch = await Promise.all(scope.slice(offset, offset + 3).map(async evaluation => {
          const values = await listCalificaciones(evaluation.id, { readOnly: true });
          return [evaluation.id, values] as const;
        }));
        batch.forEach(([id, values]) => grades.set(id, values));
      }
      if (!valid()) return;
      const rows = buildFollowUpRows({ students: subject.estudiantes, evaluations: scope, gradesByEvaluation: grades });
      const decimal = (value: number) => String(value).replace('.', ',');
      const reserved = new Set(scope.map(item => item.nombre));
      const used = new Set(['Nombre del estudiante']);
      const headings = scope.map(item => {
        let label = item.nombre;
        if (used.has(label) || scope.filter(other => other.nombre === label).length > 1) {
          let ordinal = 1;
          do { label = `${item.nombre} (${ordinal++})`; } while (reserved.has(label) || used.has(label));
        }
        used.add(label);
        return label;
      });
      downloadCsv('Notas-' + materiaName, [
        ['Nombre del estudiante', ...headings],
        ...rows.map(row => [row.nombre, ...row.cells.map(cell => cell.score == null ? '' : decimal(cell.score))]),
      ]);
      setMessage('Descarga preparada: ' + rows.length + ' estudiantes y ' + scope.length + ' evaluaciones.');
    } catch (cause) {
      if (valid()) { setError((cause instanceof Error ? cause.message + ' ' : '') + 'No se descargó ningún archivo. Puedes reintentar.'); setMessage(''); }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  if (!permitted) return null;
  return <Modal open onClose={onClose} title="Exportar notas" description="Nombre del estudiante y una columna de nota por evaluación. Incluye todo el grupo; las notas pendientes quedan vacías.">
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => setSelected(evaluations.map(item => item.id))}>Todas</Button><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => setSelected([])}>Ninguna</Button></div>
      <fieldset disabled={busy} className="min-w-0 space-y-1"><legend className="mb-2 font-semibold">Evaluaciones</legend>
        {evaluations.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={event => { const checked = event.target.checked; setSelected(current => checked ? [...current, item.id] : current.filter(id => id !== item.id)); setError(''); setMessage(''); }} /><span className="min-w-0 break-words">{item.nombre}</span></label>)}
      </fieldset>
      <p className="text-sm text-muted">{selected.length} evaluaciones · {studentCount} estudiantes. Archivo privado compatible con Excel.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button className="min-h-11 w-full" disabled={!selected.length || busy} loading={busy} onClick={() => void exportNotes()}><Download className="h-4 w-4" /> Descargar notas CSV</Button>
    </div>
  </Modal>;
}
