import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { getEvaluationReview } from '@/modules/calificaciones/api';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';
import type { ReviewStudent } from '@/types/api';
import { issueFeedbackAccesses, listFeedbackAccesses, prepareFeedbackPrint, previewFeedback, type FeedbackAccess, type FeedbackPreview, type FeedbackSelection, type IssuedFeedbackAccess } from './api';
import { FeedbackPrintSheet } from './FeedbackPrintSheet';
import type { FeedbackPrintEntry } from './printPagination';
import { IndividualLinks } from './IndividualLinks';
import { FeedbackAccessList } from './FeedbackAccessList';

type Row = ReviewStudent & { preview?: FeedbackPreview };
interface Link { id: string; estudiante: string; url: string; expires_at?: string }

export function ShareFeedbackDialog(props: { evaluationId: string; onClose: () => void; onReview: (gradeId: string) => void }) {
  // Replacing the evaluation unmounts all its private state, including one-time credentials.
  return <FeedbackDialogContent key={props.evaluationId} {...props} />;
}

function FeedbackDialogContent({ evaluationId, onClose, onReview }: { evaluationId: string; onClose: () => void; onReview: (gradeId: string) => void }) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user);
  const permitted = Boolean(owner) && user === owner && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read'));
  const canDeliver = permitted && Boolean(user?.permissions?.includes('grading.publish'));
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [accesses, setAccesses] = useState<FeedbackAccess[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [printEntries, setPrintEntries] = useState<FeedbackPrintEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [days, setDays] = useState(3);
  const [evidence, setEvidence] = useState(false);
  const controller = useRef(new AbortController());
  const locked = useRef(false);
  const creation = useRef<{ key: string; id: string } | null>(null);
  const valid = useCallback(() => useAuth.getState().user === owner && !controller.current.signal.aborted, [owner]);

  const refreshAccesses = useCallback(async () => {
    const signal = controller.current.signal;
    try { const items = await listFeedbackAccesses(evaluationId, signal); if (!signal.aborted && valid()) setAccesses(items); }
    catch { if (!signal.aborted && valid()) setError('No pudimos actualizar los enlaces. Vuelve a intentarlo antes de asumir que cambió su estado.'); }
  }, [evaluationId, valid]);

  useEffect(() => {
    if (!permitted) return;
    const abort = new AbortController(); controller.current = abort;
    const current = () => !abort.signal.aborted && valid();
    setLoading(true); setRows([]); setSelected([]); setError(''); setPrintEntries(null);
    async function load() {
      try {
        const students: ReviewStudent[] = [];
        let cursor: string | undefined;
        const seen = new Set<string>();
        do {
          const page = await getEvaluationReview(evaluationId, { filtro: 'todas', limit: 100, cursor }, abort.signal);
          if (!current()) return;
          students.push(...page.alumnos); cursor = page.siguiente_cursor ?? undefined;
          if (cursor && seen.has(cursor)) throw new Error('Lista incompleta');
          if (cursor) seen.add(cursor);
        } while (cursor);
        const ids = students.flatMap(item => item.calificacion_id ? [item.calificacion_id] : []);
        const previews: FeedbackPreview[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          previews.push(...await previewFeedback(evaluationId, ids.slice(offset, offset + 100), abort.signal));
          if (!current()) return;
        }
        if (ids.some(id => !previews.some(item => item.calificacion_id === id))) throw new Error('Falta un resultado');
        const merged = students.map(item => ({ ...item, preview: previews.find(preview => preview.calificacion_id === item.calificacion_id) }));
        merged.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        setRows(merged); setSelected(previews.filter(item => item.elegible && item.fingerprint).map(item => item.calificacion_id));
        await refreshAccesses();
      } catch { if (current()) setError('No pudimos cargar toda la evaluación. No mostramos una lista incompleta. Revisa la conexión y vuelve a intentarlo.'); }
      finally { if (current()) setLoading(false); }
    }
    void load();
    return () => abort.abort();
  }, [evaluationId, permitted, reload, refreshAccesses, valid]);

  const eligible = rows.filter(row => row.preview?.elegible && row.preview.fingerprint);
  const chosen = eligible.filter(row => selected.includes(row.calificacion_id!));
  const selections: FeedbackSelection[] = chosen.map(row => ({ calificacion_id: row.calificacion_id!, fingerprint: row.preview!.fingerprint! }));
  function received(result: IssuedFeedbackAccess, name: string, lifecycle = false) {
    if (lifecycle && result.id) setLinks(current => current.filter(link => link.id !== result.id));
    if (result.id && result.url && result.credential_available) setLinks(current => [...current.filter(link => link.id !== result.id), { id: result.id!, estudiante: name, url: result.url!, expires_at: result.expires_at }]);
    else if (!result.error) setNotice('El cambio quedó guardado, pero el enlace privado ya no está disponible para copiar. Si lo necesitas, reemplázalo desde «Controlar enlaces».');
  }
  async function createLinks() {
    if (!canDeliver || locked.current || !chosen.length || !valid()) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    const key = JSON.stringify([selections, days, evidence]);
    if (creation.current?.key !== key) creation.current = { key, id: crypto.randomUUID() };
    const requestId = creation.current.id;
    try {
      let successes = 0, failures = 0;
      for (let offset = 0; offset < selections.length; offset += 100) {
        const items = await issueFeedbackAccesses(evaluationId, { request_id: requestId, selecciones: selections.slice(offset, offset + 100), duracion_dias: days, evidencia: evidence }, controller.current.signal);
        if (!valid()) return;
        for (const item of items) {
          if (item.error) failures++; else { successes++; received(item, rows.find(row => row.calificacion_id === item.calificacion_id)?.nombre ?? 'Estudiante seleccionado'); }
        }
      }
      setNotice(`${successes} accesos confirmados${failures ? `; ${failures} no se pudieron crear. Revisa la lista antes de reintentar.` : '.'} Copia cada enlace por separado. Si un acceso no muestra enlace, consulta «Controlar enlaces» para reemplazarlo.`);
      await refreshAccesses();
    } catch { if (valid()) setError('No pudimos confirmar todos los enlaces. Actualiza «Controlar enlaces» para saber cuáles se guardaron. Reintentar esta misma selección no los duplica.'); }
    finally { locked.current = false; if (valid()) setBusy(false); }
  }
  async function preparePrint() {
    if (!canDeliver || locked.current || !chosen.length || !valid()) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const entries: FeedbackPrintEntry[] = [];
      for (let offset = 0; offset < selections.length; offset += 100) {
        const batch = selections.slice(offset, offset + 100);
        const items = await prepareFeedbackPrint(evaluationId, batch, controller.current.signal);
        if (!valid()) return;
        if (items.length !== batch.length || items.some(item => !item.resultado || item.error)) throw new Error('Cambió la selección');
        items.forEach(item => entries.push({ id: item.calificacion_id, ...item.resultado! }));
      }
      setPrintEntries(entries);
    } catch { if (valid()) setError('No preparamos la impresión porque falta información o cambió un resultado. Actualiza y revisa la lista antes de imprimir.'); }
    finally { locked.current = false; if (valid()) setBusy(false); }
  }
  if (!permitted) return null;
  const canClose = () => !busy && (!links.length || window.confirm('¿Ya copiaste los enlaces? Al cerrar no volverán a mostrarse. Podrás reemplazarlos si los pierdes.'));
  const visible = rows.filter(row => row.nombre.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  return <Modal open onClose={() => { if (canClose()) onClose(); }} closeOnBackdrop={!busy} closeOnEscape={!busy} title="Retroalimentaciones" className="max-w-4xl [overflow-wrap:anywhere]" description="Lista privada de esta evaluación. Revisa cada devolución antes de entregarla.">
    {printEntries ? <FeedbackPrintSheet entries={printEntries} onClose={() => setPrintEntries(null)} /> : loading ? <p role="status">Cargando estudiantes y retroalimentaciones…</p> : <div className="space-y-4">
      {error && <div role="alert" className="space-y-2 rounded-xl border border-amber-400 p-3"><p>{error}</p><Button variant="outline" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualizar lista</Button></div>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <p className="text-sm text-muted">{rows.length} estudiantes · {eligible.length} listos para entregar · {chosen.length} seleccionados</p>
      <label className="block text-sm font-semibold">Buscar estudiante<input type="search" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base" value={search} onChange={event => setSearch(event.target.value)} /></label>
      {canDeliver && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !eligible.length} onClick={() => setSelected(eligible.map(row => row.calificacion_id!))}>Todos los listos</Button><Button variant="outline" disabled={busy} onClick={() => setSelected([])}>Ninguno</Button><Button disabled={busy || !chosen.length} onClick={() => void preparePrint()}>Preparar impresión</Button></div>}
      <ul className="space-y-3" aria-label="Retroalimentaciones del grupo">{visible.map(row => <li key={row.estudiante_id} className="min-w-0 rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <label className="flex min-h-11 min-w-0 items-center gap-3 font-bold">{canDeliver && <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={'Seleccionar ' + row.nombre} checked={selected.includes(row.calificacion_id ?? '')} disabled={busy || !row.preview?.elegible} onChange={event => { const checked = event.target.checked; setSelected(current => checked ? [...current, row.calificacion_id!] : current.filter(id => id !== row.calificacion_id)); }} />}<span className="break-words">{row.nombre}</span></label>
          {(row.preview?.resultado ?? row.preview?.borrador_docente)?.nota != null && <span className="shrink-0 py-3 font-bold tabular-nums">{formatGradeScore(Number((row.preview!.resultado ?? row.preview!.borrador_docente)!.nota))} / {formatGradeScore(Number((row.preview!.resultado ?? row.preview!.borrador_docente)!.nota_maxima))}</span>}
        </div>
        {!row.preview?.elegible && <p className="text-sm text-muted">{row.preview?.motivo ?? 'Sin calificación todavía.'}</p>}
        {(row.preview?.resultado ?? row.preview?.borrador_docente)?.retroalimentacion && <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{(row.preview!.resultado ?? row.preview!.borrador_docente)!.retroalimentacion}</p>}
        {row.calificacion_id && <Button variant="link" className="mt-1 min-h-11 text-left" disabled={busy} onClick={() => { if (canClose()) onReview(row.calificacion_id!); }}>Revisar respuestas y evidencia</Button>}
      </li>)}</ul>
      {!visible.length && <p className="text-sm text-muted">No hay estudiantes que coincidan con la búsqueda.</p>}
      {canDeliver && <>
        <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-bold">Enlaces individuales</summary><div className="space-y-3 pt-2">
          <p className="text-sm">La familia abre su enlace sin iniciar sesión. Solo ve la devolución de ese estudiante y puede preguntar a Xali: máximo cinco preguntas cada diez minutos, mientras el enlace esté activo.</p>
          <label className="block text-sm">Duración<select aria-label="Duración del enlace" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3" disabled={busy} value={days} onChange={event => setDays(Number(event.target.value))}>{Array.from({ length: 30 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} {value === 1 ? 'día' : 'días'}{value === 3 ? ' · recomendado' : ''}</option>)}</select></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={evidence} disabled={busy} onChange={event => setEvidence(event.target.checked)} />Permitir ver las fotos de su propia entrega</label>
          <p className="text-sm text-muted">Al crear enlaces autorizas a compartir la nota y la retroalimentación seleccionadas. Quien reciba el enlace podrá abrirlo. Entrégalo de manera individual.</p>
          <Button className="h-auto min-h-11 py-2" disabled={busy || !chosen.length} loading={busy} onClick={() => void createLinks()}>Crear enlaces seleccionados</Button>
        </div></details>
        <IndividualLinks links={links} />
        <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-bold">Controlar enlaces</summary><FeedbackAccessList accesses={accesses} previews={rows.flatMap(row => row.preview ? [row.preview] : [])} signal={controller.current.signal} valid={valid} onChanged={refreshAccesses} onIssued={(result, name) => received(result, name, true)} /></details>
      </>}
    </div>}
  </Modal>;
}
