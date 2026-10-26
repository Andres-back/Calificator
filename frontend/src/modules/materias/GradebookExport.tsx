import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import type { Calificacion, Evaluacion } from '@/types/api';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { listCalificaciones } from '@/modules/calificaciones/api';
import { downloadCsv } from '@/lib/csvExport';
import { getMateriaEstudiantes } from './api';
import { buildGradeExport, exportCsvRows, type ExportMode, type GradeExport } from './gradebookExportModel';

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
  const [mode, setMode] = useState<ExportMode>('final');
  const [report, setReport] = useState<{ key: string; data: GradeExport } | null>(null);
  const [revision, setRevision] = useState(0);
  const active = useRef(true);
  const permitted = Boolean(owner) && owner === user?.id && Boolean(user?.permissions?.includes('grading.read'));
  const selectionKey = JSON.stringify(selected);
  const contextKey = JSON.stringify([materiaId, owner, selectionKey]);
  const context = useRef(contextKey);
  context.current = contextKey;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    const valid = () => current && active.current && context.current === contextKey
      && useAuth.getState().user?.id === owner && Boolean(useAuth.getState().user?.permissions?.includes('grading.read'));
    setReport(null); setError(''); setMessage('');
    if (!permitted || !JSON.parse(selectionKey).length) { setBusy(false); return; }
    setBusy(true); setMessage('Leyendo notas para la vista previa…');
    void (async () => { try {
      const [subject, available] = await Promise.all([getMateriaEstudiantes(materiaId), listEvaluaciones(materiaId)]);
      if (!valid()) return;
      const ids: string[] = JSON.parse(selectionKey);
      const chosen = ids.map(id => available.find(item => item.id === id && item.materia_id === materiaId && item.estado !== 'borrador'));
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
      setReport({ key: contextKey, data: buildGradeExport(subject.estudiantes, scope, grades) });
      setMessage('Vista previa lista. La descarga no confirma ni publica notas.');
    } catch (cause) {
      if (valid()) { setError((cause instanceof Error ? cause.message + ' ' : '') + 'No se descargó ningún archivo. Puedes reintentar.'); setMessage(''); }
    } finally {
      if (valid()) setBusy(false);
    } })();
    return () => { current = false; };
  }, [contextKey, materiaId, owner, permitted, revision, selectionKey]);
  const data = report?.key === contextKey ? report.data : null;
  const canDownload = Boolean(data?.rows.length) && (mode === 'provisional' || Boolean(data?.counts.final));
  function exportNotes() {
    const actor = useAuth.getState().user;
    if (!active.current || !data || !canDownload || busy || actor?.id !== owner || !actor?.permissions?.includes('grading.read')) return;
    downloadCsv((mode === 'provisional' ? 'Informe-provisional-Notas-' : 'Notas-') + materiaName, exportCsvRows(data, mode));
    setMessage(`Descarga preparada: ${data.rows.length} estudiantes y ${data.headings.length} evaluaciones${mode === 'provisional' ? ' · informe provisional' : ''}.`);
  }
  if (!permitted) return null;
  return <Modal open onClose={() => { active.current = false; onClose(); }} title="Exportar notas" description="Incluye el grupo matriculado activo. Revisa qué notas contiene el archivo antes de descargarlo.">
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => setSelected(evaluations.map(item => item.id))}>Todas</Button><Button variant="outline" className="min-h-11" onClick={() => setSelected([])}>Ninguna</Button></div>
      <fieldset className="min-w-0 space-y-1"><legend className="mb-2 font-semibold">Evaluaciones</legend>
        {evaluations.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={event => { const checked = event.target.checked; setSelected(current => checked ? [...current, item.id] : current.filter(id => id !== item.id)); setError(''); setMessage(''); }} /><span className="min-w-0 break-words">{item.nombre}</span></label>)}
      </fieldset>
      <label className="block space-y-2"><span className="font-semibold">Contenido del archivo</span><select className="min-h-11 w-full rounded-lg border border-border bg-background p-2" value={mode} onChange={event => setMode(event.target.value as ExportMode)}>
        <option value="final">Notas finales</option><option value="provisional">Informe provisional (incluye sugerencias)</option>
      </select></label>
      <p className="text-sm text-muted">{selected.length} evaluaciones · {studentCount} estudiantes. Archivo privado compatible con Excel.</p>
      {data && <section aria-label="Vista previa de notas" className="min-w-0 space-y-3 rounded-lg border border-border p-3">
        {new Set(data.rows.map(row => row.nombre)).size < data.rows.length && <p className="text-sm text-muted">Hay nombres repetidos. Se conservará una fila independiente por estudiante, sin mezclar sus notas ni cambiar su nombre.</p>}
        <p className="break-words text-sm">{data.rows.length} estudiantes activos · {data.counts.final} notas finales · {data.counts.suggested} sugeridas · {data.counts.processing} calificando · {data.counts.missing} sin nota · {data.counts.error} con error</p>
        {mode === 'final' && <p className="text-sm text-muted">Solo notas confirmadas, ajustadas o publicadas. Las demás celdas quedan vacías; nunca se rellenan con cero.</p>}
        {mode === 'final' && !data.counts.final && <p role="status" className="text-sm">Todavía no hay notas finales para descargar. Revisa y confirma las notas o elige «Informe provisional» para incluir las sugerencias con su estado.</p>}
        {mode === 'provisional' && <p className="text-sm text-muted">PROVISIONAL: incluye sugerencias pendientes de revisión y el estado de cada nota. No equivale al boletín definitivo.</p>}
        <details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Ver muestra de {Math.min(3, data.rows.length)} estudiantes</summary>
          <div className="space-y-2">
            {data.rows.slice(0, 3).map(row => <div key={row.id} className="min-w-0 rounded-lg bg-surface p-2 text-sm"><p className="break-words font-semibold">{row.nombre}</p>{row.cells.slice(0, 3).map((cell, i) => <p key={i} className="break-words">{data.headings[i]}: {(cell.kind === 'final' || (mode === 'provisional' && cell.kind === 'suggested')) && cell.score != null ? String(cell.score).replace('.', ',') : '—'} · {cell.label}</p>)}</div>)}
            {data.headings.length > 3 && <p className="text-sm text-muted">Muestra de las primeras 3 evaluaciones. El archivo incluye las {data.headings.length} seleccionadas.</p>}
          </div>
        </details>
      </section>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button variant="outline" className="min-h-11 w-full" disabled={!selected.length || busy} onClick={() => setRevision(value => value + 1)}>Actualizar vista previa</Button>
      <Button className="min-h-11 w-full" disabled={!canDownload || busy} loading={busy} onClick={exportNotes}><Download className="h-4 w-4" /> Descargar notas CSV</Button>
    </div>
  </Modal>;
}
