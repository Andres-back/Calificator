import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { getEvaluationReview } from '@/modules/calificaciones/api';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';
import type { ReviewStudent } from '@/types/api';
import { issueFeedbackAccesses, listFeedbackAccesses, prepareFeedbackPrint, previewFeedback, type FeedbackAccess, type FeedbackBatchResultItem, type FeedbackPreview, type FeedbackSelection, type IssuedFeedbackAccess } from './api';
import { FeedbackPrintSheet } from './FeedbackPrintSheet';
import type { FeedbackPrintEntry } from './printPagination';
import { IndividualLinks } from './IndividualLinks';
import { FeedbackAccessList } from './FeedbackAccessList';
import { FeedbackDeliveryReview } from './FeedbackDeliveryReview';
import { FeedbackMessage } from './FeedbackMessage';
import { FeedbackBatchPublish } from './FeedbackBatchPublish';
import { FeedbackLinkActions } from './FeedbackLinkActions';
import { queryClient } from '@/lib/queryClient';

type Row = ReviewStudent & { preview?: FeedbackPreview };
interface Link { id: string; estudiante: string; url: string; expires_at?: string }

interface WorkspaceProps { evaluationId: string; initialGradeId?: string; initialSelectedIds?: string[]; suggestedArea?: string | null; embedded?: boolean; onDirtyChange?: (dirty: boolean) => void; onClose: () => void; onReview: (gradeId: string) => void }

export function ShareFeedbackDialog(props: WorkspaceProps) {
  // Replacing the evaluation unmounts all private state, including copied credentials.
  return <FeedbackDialogContent key={props.evaluationId+'-'+(props.initialGradeId??'group')} {...props} />;
}

function FeedbackDialogContent({ evaluationId, initialGradeId, initialSelectedIds, suggestedArea, embedded, onDirtyChange, onClose, onReview }: WorkspaceProps) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user);
  const permitted = Boolean(owner) && user === owner && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read'));
  const canDeliver = permitted && Boolean(user?.permissions?.includes('grading.publish'));
  const canEditMessage = permitted && Boolean(user?.permissions?.includes('grading.grade'));
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
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<'print' | 'links' | null>(null);
  const firstLoad = useRef(true);
  const controller = useRef(new AbortController());
  const locked = useRef(false);
  const creation = useRef<{ key: string; id: string } | null>(null);
  const valid = useCallback(() => useAuth.getState().user === owner && !controller.current.signal.aborted, [owner]);
  const initialSelection = useRef(initialSelectedIds ?? (initialGradeId ? [initialGradeId] : []));
  useEffect(() => { onDirtyChange?.(reviewDirty || busy); return () => onDirtyChange?.(false); }, [reviewDirty, busy, onDirtyChange]);
  useEffect(() => {
    if (!reviewDirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [reviewDirty]);

  const refreshAccesses = useCallback(async () => {
    const signal = controller.current.signal;
    try { const items = await listFeedbackAccesses(evaluationId, signal); if (!signal.aborted && valid()) setAccesses(items); }
    catch { if (!signal.aborted && valid()) setError('No pudimos actualizar los enlaces. Vuelve a intentarlo antes de asumir que cambió su estado.'); }
  }, [evaluationId, valid]);

  useEffect(() => {
    if (!permitted) return;
    const abort = new AbortController(); controller.current = abort;
    const current = () => !abort.signal.aborted && valid();
    setLoading(true); setRows([]); setError(''); setPrintEntries(null); setReviewing(null); setPendingAction(null);
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
        const scopedStudents = initialGradeId ? students.filter(item=>item.calificacion_id===initialGradeId) : students;
        const ids = scopedStudents.flatMap(item => item.calificacion_id ? [item.calificacion_id] : []);
        const previews: FeedbackPreview[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          previews.push(...await previewFeedback(evaluationId, ids.slice(offset, offset + 100), abort.signal));
          if (!current()) return;
        }
        if (ids.some(id => !previews.some(item => item.calificacion_id === id))) throw new Error('Falta un resultado');
        const merged = scopedStudents.map(item => ({ ...item, preview: previews.find(preview => preview.calificacion_id === item.calificacion_id) }));
        merged.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        setRows(merged);
        const initial = firstLoad.current;
        setSelected(current => initial ? initialSelection.current.filter(id => ids.includes(id)) : current.filter(id => ids.includes(id)));
        firstLoad.current = false;
        await refreshAccesses();
      } catch { if (current()) setError('No pudimos cargar toda la evaluación. No mostramos una lista incompleta. Revisa la conexión y vuelve a intentarlo.'); }
      finally { if (current()) setLoading(false); }
    }
    void load();
    return () => abort.abort();
  }, [evaluationId, initialGradeId, permitted, reload, refreshAccesses, valid]);

  const eligible = rows.filter(row => row.preview?.elegible && row.preview.fingerprint);
  const chosen = eligible.filter(row => selected.includes(row.calificacion_id!));
  const selectedRows = rows.filter(row => selected.includes(row.calificacion_id ?? ''));
  const pendingRows = selectedRows.filter(row => !row.preview?.elegible || !row.preview.fingerprint);
  const reviewRow = rows.find(row => row.calificacion_id === reviewing);
  const selections: FeedbackSelection[] = chosen.map(row => ({ calificacion_id: row.calificacion_id!, fingerprint: row.preview!.fingerprint! }));
  function requestDelivery(action: 'print' | 'links') {
    if (pendingRows.length) { setPendingAction(action); return; }
    void (action === 'print' ? preparePrint() : createLinks());
  }
  function approved(result: FeedbackPreview, action?: 'saved') {
    if (!valid()) return;
    setRows(current => current.map(row => row.calificacion_id === result.calificacion_id ? { ...row, preview: { ...row.preview, ...result, batch_candidate: result.batch_candidate } } : row));
    setReviewing(null); setPendingAction(null); setNotice(action !== 'saved' && result.elegible ? 'Devolución aprobada. Ya puedes incluirla en la impresión o crear su enlace.' : 'Mensaje guardado. La nota y su estado no cambiaron; revisa su entrega antes de compartir.');
    setReviewDirty(false);
    setLinks([]);
    setReload(value => value + 1);
    void queryClient.invalidateQueries({queryKey:['calificacion-detalle',result.calificacion_id]});
    void refreshAccesses();
  }
  async function published(results: FeedbackBatchResultItem[], skipped: number) {
    if(!valid()) return;
    const successful=results.filter(item=>item.estado!=='failed');
    setSelected(current=>[...new Set([...current,...successful.map(item=>item.calificacion_id)])]);
    setNotice(`${successful.length} notas publicadas o ya publicadas. ${results.length-successful.length+skipped} necesitan atención. Puedes imprimir o preparar los enlaces de las listas.`);
    setBusy(false);
    void queryClient.invalidateQueries({queryKey:['evaluation-review',evaluationId]});
    void queryClient.invalidateQueries({queryKey:['calificaciones',evaluationId]});
    successful.forEach(item=>{void queryClient.invalidateQueries({queryKey:['calificacion-detalle',item.calificacion_id]});});
    setReload(value=>value+1);
  }
  function received(result: IssuedFeedbackAccess, name: string, lifecycle = false) {
    if (lifecycle && result.id) setLinks(current => current.filter(link => link.id !== result.id));
    if (result.id && result.url && result.credential_available) setLinks(current => [...current.filter(link => link.id !== result.id), { id: result.id!, estudiante: name, url: result.url!, expires_at: result.expires_at }]);
    else if (!result.error) setNotice('El cambio quedó guardado. Puedes volver a copiar el enlace desde «Copiar enlaces» o revisar sus opciones si es antiguo.');
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
      setNotice(`${successes} accesos confirmados${failures ? `; ${failures} no se pudieron crear. Revisa la lista antes de reintentar.` : '.'} Puedes copiar los nuevos enlaces ahora o recuperarlos después desde «Copiar enlaces». Entrégalos individualmente.`);
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
  const canClose = () => !busy && !reviewDirty;
  const visible = rows.filter(row => row.nombre.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  return <FeedbackFrame embedded={embedded} onClose={() => { if (canClose()) onClose(); else if (reviewDirty) setNotice('Guarda o descarta el mensaje antes de cerrar.'); }} canClose={canClose()} title={initialGradeId?'Retroalimentación del estudiante':'Retroalimentación del grupo'}>
    {reviewDirty && <p role="status" className="mb-3 rounded-xl border border-amber-400 p-3 text-sm">Tienes un mensaje sin guardar. Guarda o descarta los cambios antes de cerrar o cambiar de estudiante.</p>}
    {printEntries ? <FeedbackPrintSheet entries={printEntries} suggestedArea={suggestedArea} onClose={() => setPrintEntries(null)} /> : loading ? <p role="status">Cargando estudiantes y retroalimentaciones…</p> : reviewRow?.preview && (reviewRow.preview.revision_docente || reviewRow.preview.mensaje_editable) ? <FeedbackDeliveryReview
      key={reviewRow.calificacion_id} evaluationId={evaluationId} name={reviewRow.nombre} preview={reviewRow.preview}
      signal={controller.current.signal} valid={valid} onApproved={approved} onBusy={setBusy} onDirtyChange={setReviewDirty} onCancel={() => { setReviewDirty(false); setReviewing(null); }} /> : <div className="space-y-4">
      {error && <div role="alert" className="space-y-2 rounded-xl border border-amber-400 p-3"><p>{error}</p><Button variant="outline" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualizar lista</Button></div>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {!initialGradeId && <p className="text-sm text-muted">{rows.length} estudiantes · {eligible.length} listos para entregar · {selectedRows.length} seleccionados</p>}
      {canDeliver && (!initialGradeId || !eligible.length) && <FeedbackBatchPublish individual={Boolean(initialGradeId)} evaluationId={evaluationId} rows={rows} selectedIds={selected} signal={controller.current.signal} valid={valid} disabled={busy} onBusy={setBusy} onCompleted={published}/>}
      <Button variant="link" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualizar estudiantes y devoluciones</Button>
      {pendingAction && <section role="status" className="space-y-3 rounded-xl border border-amber-400 p-3">
        <p>{pendingRows.length} devoluciones seleccionadas necesitan revisión. No se entregarán sin tu aprobación.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => { const row = pendingRows[0]; if (row?.preview?.revision_docente) setReviewing(row.calificacion_id!); else if (row?.calificacion_id && canClose()) onReview(row.calificacion_id); }}>Revisar pendientes</Button>
          {chosen.length > 0 && <Button disabled={busy} onClick={() => { const action = pendingAction; setPendingAction(null); void (action === 'print' ? preparePrint() : createLinks()); }}>Entregar solo {chosen.length} {chosen.length === 1 ? 'lista' : 'listas'}</Button>}
          <Button variant="outline" disabled={busy} onClick={() => setPendingAction(null)}>Cancelar</Button>
        </div>
      </section>}
      {!initialGradeId && <label className="block text-sm font-semibold">Buscar estudiante<input type="search" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base" value={search} onChange={event => setSearch(event.target.value)} /></label>}
      {canDeliver && <div className="flex flex-wrap gap-2">{!initialGradeId && <><Button variant="outline" disabled={busy || !rows.some(row => row.preview?.seleccionable || row.preview?.elegible)} onClick={() => setSelected(rows.filter(row => row.preview?.seleccionable || row.preview?.elegible).map(row => row.calificacion_id!))}>Todos con nota</Button><Button variant="outline" disabled={busy || !eligible.length} onClick={() => setSelected(eligible.map(row => row.calificacion_id!))}>Todos los listos</Button><Button variant="outline" disabled={busy} onClick={() => setSelected([])}>Ninguno</Button></>}<Button disabled={busy || !selectedRows.length} onClick={() => requestDelivery('print')}>Preparar impresión</Button></div>}
      {canDeliver && <>
        <FeedbackLinkActions compact={Boolean(initialGradeId)} evaluationId={evaluationId} accesses={initialGradeId?accesses.filter(access=>access.calificacion_id===initialGradeId):accesses} selectedIds={selected} signal={controller.current.signal} valid={valid} disabled={busy} onBusy={setBusy}/>
        <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-bold">Enlaces individuales</summary><div className="space-y-3 pt-2">
          <p className="text-sm">La familia abre su enlace sin iniciar sesión. Solo ve la devolución de ese estudiante y puede preguntar a Xali: máximo cinco preguntas cada diez minutos, mientras el enlace esté activo.</p>
          <label className="block text-sm">Duración<select aria-label="Duración del enlace" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3" disabled={busy} value={days} onChange={event => setDays(Number(event.target.value))}>{Array.from({ length: 30 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} {value === 1 ? 'día' : 'días'}{value === 3 ? ' · recomendado' : ''}</option>)}</select></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={evidence} disabled={busy} onChange={event => setEvidence(event.target.checked)} />Permitir ver las fotos de su propia entrega</label>
          <p className="text-sm text-muted">Al crear enlaces autorizas a compartir la nota y la retroalimentación seleccionadas. Quien reciba el enlace podrá abrirlo. Entrégalo de manera individual.</p>
          <Button className="h-auto min-h-11 py-2" disabled={busy || !selectedRows.length} loading={busy} onClick={() => requestDelivery('links')}>Crear enlaces seleccionados</Button>
        </div></details>
        <IndividualLinks links={links} />
      </>}
      <ul className="space-y-3" aria-label="Retroalimentaciones del grupo">{visible.map(row => <li key={row.estudiante_id} className="min-w-0 rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <label className="flex min-h-11 min-w-0 items-center gap-3 font-bold">{canDeliver && !initialGradeId && <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={'Seleccionar ' + row.nombre} checked={selected.includes(row.calificacion_id ?? '')} disabled={busy || !(row.preview?.seleccionable || row.preview?.elegible)} onChange={event => { const checked = event.target.checked; setSelected(current => checked ? [...new Set([...current, row.calificacion_id!])] : current.filter(id => id !== row.calificacion_id)); }} />}<span className="break-words">{row.nombre}</span></label>
          {(row.preview?.resultado ?? row.preview?.borrador_docente)?.nota != null && <span className="shrink-0 py-3 font-bold tabular-nums">{formatGradeScore(Number((row.preview!.resultado ?? row.preview!.borrador_docente)!.nota))} / {formatGradeScore(Number((row.preview!.resultado ?? row.preview!.borrador_docente)!.nota_maxima))}</span>}
        </div>
        <p className="text-sm text-muted">{row.preview?.elegible ? 'Lista para entregar' : row.preview?.motivo ?? 'Sin calificación todavía.'}</p>
        {(row.preview?.resultado ?? row.preview?.borrador_docente)?.retroalimentacion && <details open={Boolean(initialGradeId)} className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Leer retroalimentación</summary><FeedbackMessage text={(row.preview!.resultado ?? row.preview!.borrador_docente)!.retroalimentacion} /></details>}
        {((canDeliver && row.preview?.revision_docente) || (canEditMessage && row.preview?.mensaje_editable)) && <Button variant={row.preview?.elegible ? 'link' : 'outline'} className="mt-2 h-auto min-h-11 py-2 text-left" disabled={busy} aria-label={'Revisar devolución de ' + row.nombre} onClick={() => setReviewing(row.calificacion_id!)}>Editar y revisar devolución</Button>}
        {row.calificacion_id && <Button variant="link" className="mt-1 min-h-11 text-left" disabled={busy} onClick={() => { if (canClose()) onReview(row.calificacion_id!); }}>Revisar respuestas y evidencia</Button>}
      </li>)}</ul>
      {!visible.length && <p className="text-sm text-muted">No hay estudiantes que coincidan con la búsqueda.</p>}
      {canDeliver && <>
        <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-bold">Controlar enlaces</summary><FeedbackAccessList evaluationId={evaluationId} accesses={initialGradeId?accesses.filter(access=>access.calificacion_id===initialGradeId):accesses} previews={rows.flatMap(row => row.preview ? [row.preview] : [])} signal={controller.current.signal} valid={valid} onChanged={refreshAccesses} onIssued={(result, name) => received(result, name, true)} /></details>
      </>}
    </div>}
  </FeedbackFrame>;
}

function FeedbackFrame({ embedded, onClose, canClose, title, children }: { embedded?: boolean; onClose: () => void; canClose: boolean; title: string; children: ReactNode }) {
  const description = 'Revisa el mensaje, imprime las fichas o comparte enlaces individuales. Es la misma devolución en todas las vistas.';
  if (embedded) return <section className="min-w-0 space-y-4" aria-label={title}><header className="space-y-2"><h2 className="text-lg font-bold">{title}</h2><p className="text-sm leading-6 text-muted">{description}</p></header>{children}</section>;
  return <Modal open onClose={onClose} closeOnBackdrop={canClose} closeOnEscape={canClose} title={title} className="max-w-6xl [overflow-wrap:anywhere] max-sm:!max-h-[100dvh] max-sm:!rounded-none max-sm:!p-4" description={description}>{children}</Modal>;
}
