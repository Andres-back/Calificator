import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, MessageSquareText, RefreshCw } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { getEvaluationReview } from '@/modules/calificaciones/api';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';
import { listFeedbackAccesses, prepareFeedbackPrint, previewFeedback, type FeedbackAccess, type FeedbackBatchResultItem, type FeedbackPreview, type FeedbackSelection } from './api';
import { FeedbackPrintSheet } from './FeedbackPrintSheet';
import type { FeedbackPrintEntry } from './printPagination';
import { FeedbackAccessList } from './FeedbackAccessList';
import { FeedbackDeliveryReview } from './FeedbackDeliveryReview';
import { FeedbackMessage } from './FeedbackMessage';
import { FeedbackBatchPublish } from './FeedbackBatchPublish';
import { FeedbackSelectionBar } from './FeedbackSelectionBar';
import { FeedbackSharePanel } from './FeedbackSharePanel';
import { FeedbackStudentList, type FeedbackStudentRow } from './FeedbackStudentList';
import { queryClient } from '@/lib/queryClient';

interface WorkspaceProps { evaluationId: string; initialGradeId?: string; initialSelectedIds?: string[]; suggestedArea?: string | null; embedded?: boolean; onDirtyChange?: (dirty: boolean) => void; onClose: () => void; onReview: (gradeId: string) => void }

export function ShareFeedbackDialog(props: WorkspaceProps) {
  const user = useAuth(state => state.user);
  // A renewed session for the same actor keeps selection. A changed account or
  // permission set unmounts private contents and rejects late responses.
  const context = [props.evaluationId, props.initialGradeId ?? 'group', user?.id, user?.rol, [...(user?.permissions ?? [])].sort().join(',')].join(':');
  return <FeedbackDialogContent key={context} {...props} />;
}

function FeedbackDialogContent({ evaluationId, initialGradeId, initialSelectedIds, suggestedArea, embedded, onDirtyChange, onClose, onReview }: WorkspaceProps) {
  const user = useAuth(state => state.user);
  const actorId = user?.id;
  const permitted = Boolean(actorId) && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read'));
  const canDeliver = permitted && Boolean(user?.permissions?.includes('grading.publish'));
  const canEditMessage = permitted && Boolean(user?.permissions?.includes('grading.grade'));
  const canBatchPublish = canDeliver && canEditMessage;
  const [rows, setRows] = useState<FeedbackStudentRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [accesses, setAccesses] = useState<FeedbackAccess[]>([]);
  const [printEntries, setPrintEntries] = useState<FeedbackPrintEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [detail, setDetail] = useState<string | null>(initialGradeId ?? null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [shareIds, setShareIds] = useState<string[] | null>(null);
  const [pendingPrint, setPendingPrint] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const firstLoad = useRef(true);
  const controller = useRef(new AbortController());
  const locked = useRef(false);
  const listScope = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnScope = useRef<HTMLElement | null>(null);
  const returnLabel = useRef('');
  const listPosition = useRef(0);
  const initialSelection = useRef(initialSelectedIds ?? (initialGradeId ? [initialGradeId] : []));
  const valid = useCallback(() => {
    const actor = useAuth.getState().user;
    return !controller.current.signal.aborted && actor?.id === actorId && ['profesor', 'admin'].includes(actor?.rol ?? '') && Boolean(actor?.permissions?.includes('grading.read'));
  }, [actorId]);
  useEffect(() => { onDirtyChange?.(reviewDirty || busy); return () => onDirtyChange?.(false); }, [reviewDirty, busy, onDirtyChange]);
  useEffect(() => {
    if (!reviewDirty && !busy) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [reviewDirty, busy]);
  const refreshAccesses = useCallback(async () => {
    const signal = controller.current.signal;
    try { const items = await listFeedbackAccesses(evaluationId, signal); if (!signal.aborted && valid()) setAccesses(items); }
    catch { if (!signal.aborted && valid()) setError('No pudimos actualizar los enlaces. Consulta de nuevo antes de asumir que cambió su estado.'); }
  }, [evaluationId, valid]);
  useEffect(() => {
    if (!permitted) return;
    const abort = new AbortController(); controller.current = abort;
    const current = () => !abort.signal.aborted && valid();
    setLoading(true); setError('');
    async function load() {
      try {
        const students: FeedbackStudentRow[] = []; let cursor: string | undefined;
        const seen = new Set<string>();
        do {
          const page = await getEvaluationReview(evaluationId, { filtro: 'todas', limit: 100, cursor }, abort.signal);
          if (!current()) return;
          students.push(...page.alumnos); cursor = page.siguiente_cursor ?? undefined;
          if (cursor && seen.has(cursor)) throw new Error('Incomplete list');
          if (cursor) seen.add(cursor);
        } while (cursor);
        const scoped = initialGradeId ? students.filter(item => item.calificacion_id === initialGradeId) : students;
        const ids = scoped.flatMap(item => item.calificacion_id ? [item.calificacion_id] : []);
        const previews: FeedbackPreview[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          previews.push(...await previewFeedback(evaluationId, ids.slice(offset, offset + 100), abort.signal));
          if (!current()) return;
        }
        if (ids.length !== previews.length || ids.some(id => previews.filter(item => item.calificacion_id === id).length !== 1)) throw new Error('Incomplete preview');
        setRows(scoped.map(item => ({ ...item, preview: previews.find(preview => preview.calificacion_id === item.calificacion_id) })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        const initial = firstLoad.current;
        setSelected(previous => initial ? initialSelection.current.filter(id => ids.includes(id)) : previous.filter(id => ids.includes(id)));
        firstLoad.current = false;
        await refreshAccesses();
      } catch { if (current()) { setRows([]); setError('No pudimos cargar toda la evaluación. No mostramos una lista incompleta. Revisa la conexión y vuelve a intentarlo.'); } }
      finally { if (current()) setLoading(false); }
    }
    void load(); return () => abort.abort();
  }, [evaluationId, initialGradeId, permitted, reload, refreshAccesses, valid]);

  const eligible = rows.filter(row => row.preview?.elegible && row.preview.fingerprint);
  const selectedRows = rows.filter(row => selected.includes(row.calificacion_id ?? ''));
  const chosen = eligible.filter(row => selected.includes(row.calificacion_id!));
  const pendingRows = selectedRows.filter(row => !row.preview?.elegible || !row.preview.fingerprint);
  const reviewRow = rows.find(row => row.calificacion_id === reviewing);
  const detailRow = detail ? rows.find(row => row.calificacion_id === detail) : undefined;
  const visible = rows.filter(row => row.nombre.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')) && (filter === 'all' || (filter === 'ready' ? row.preview?.elegible : !row.preview?.elegible)));
  const hiddenSelected = selectedRows.filter(row => !visible.includes(row)).length;
  const blocked = busy || reviewDirty;
  const rememberFocus = (trigger?: HTMLElement) => { returnFocus.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null); returnLabel.current = returnFocus.current?.getAttribute('aria-label') ?? returnFocus.current?.textContent ?? ''; returnScope.current = returnFocus.current?.closest<HTMLElement>('[role="dialog"], section[aria-label="Retroalimentación del estudiante"]') ?? null; };
  function restoreFocus() { requestAnimationFrame(() => { const scope = returnScope.current?.isConnected ? returnScope.current : listScope.current; const restored = returnFocus.current?.isConnected ? returnFocus.current : Array.from(scope?.querySelectorAll<HTMLElement>('input, button') ?? []).find(element => (element.getAttribute('aria-label') ?? element.textContent) === returnLabel.current); restored?.focus({ preventScroll: true }); }); }
  function openDetail(id: string, trigger?: HTMLElement) { if (blocked) return; rememberFocus(trigger); setDetail(id); setPublishing(false); }
  function openShare(ids: string[], trigger?: HTMLElement) { if (blocked || !canDeliver) return; rememberFocus(trigger); setShareIds([...ids]); }
  function leaveShare() { setShareIds(null); void refreshAccesses(); restoreFocus(); }
  function approved(result: FeedbackPreview, action?: 'saved') {
    if (!valid()) return;
    setRows(current => current.map(row => row.calificacion_id === result.calificacion_id ? { ...row, preview: { ...row.preview, ...result, batch_candidate: result.batch_candidate } } : row));
    setReviewing(null); setPendingPrint(false); setReviewDirty(false);
    setNotice(action !== 'saved' && result.elegible ? 'Devolución aprobada. Ya puedes incluirla en la impresión o compartir su enlace.' : 'Mensaje guardado. La nota y su estado no cambiaron.');
    setReload(value => value + 1);
    void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', result.calificacion_id] });
  }
  async function published(results: FeedbackBatchResultItem[], skipped: number) {
    if (!valid()) return;
    const successful = results.filter(item => item.estado !== 'failed');
    setSelected(current => [...new Set([...current, ...successful.map(item => item.calificacion_id)])]);
    setNotice(`${successful.length} notas publicadas o ya publicadas. ${results.length - successful.length + skipped} necesitan atención. Compartir e imprimir siguen disponibles en la barra de selección.`);
    setBusy(false);
    setPublishing(false);
    void queryClient.invalidateQueries({ queryKey: ['evaluation-review', evaluationId] });
    void queryClient.invalidateQueries({ queryKey: ['calificaciones', evaluationId] });
    successful.forEach(item => { void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', item.calificacion_id] }); });
    setReload(value => value + 1);
  }
  async function preparePrint() {
    if (!canDeliver || locked.current || !chosen.length || !valid()) return;
    locked.current = true; setBusy(true); setError('');
    const selections: FeedbackSelection[] = chosen.map(row => ({ calificacion_id: row.calificacion_id!, fingerprint: row.preview!.fingerprint! }));
    try {
      const entries: FeedbackPrintEntry[] = [];
      for (let offset = 0; offset < selections.length; offset += 100) {
        const batch = selections.slice(offset, offset + 100);
        const items = await prepareFeedbackPrint(evaluationId, batch, controller.current.signal);
        if (!valid()) return;
        if (items.length !== batch.length || batch.some(selection => items.filter(item => item.calificacion_id === selection.calificacion_id).length !== 1) || items.some(item => !item.resultado || item.error)) throw new Error('Changed result');
        items.forEach(item => entries.push({ id: item.calificacion_id, ...item.resultado! }));
      }
      setPrintEntries(entries); setPendingPrint(false);
    } catch { if (valid()) setError('No preparamos la impresión porque falta información o cambió un resultado. Actualiza y revisa la lista antes de imprimir.'); }
    finally { locked.current = false; if (valid()) setBusy(false); }
  }
  if (!permitted) return null;
  const score = detailRow?.preview?.resultado ?? detailRow?.preview?.borrador_docente;
  const close = () => { if (!blocked) onClose(); else if (reviewDirty) setNotice('Guarda o descarta el mensaje antes de cerrar.'); };
  const detailView = detailRow && <section className="space-y-4 p-4" aria-label={'Devolución de ' + detailRow.nombre}>
    {!initialGradeId && <Button variant="link" disabled={blocked} onClick={() => { setDetail(null); restoreFocus(); }}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver a la lista</Button>}
    <h3 className="break-words text-lg font-bold">{detailRow.nombre}</h3>
    {score?.nota != null && <p className="text-xl font-bold tabular-nums">{formatGradeScore(Number(score.nota))} / {formatGradeScore(Number(score.nota_maxima))}</p>}
    <p className="text-sm text-muted">{detailRow.preview?.elegible ? 'Lista para entregar' : detailRow.preview?.motivo ?? 'Primero revisa la devolución.'}</p>
    {score?.retroalimentacion && <FeedbackMessage text={score.retroalimentacion} />}
    <div className="flex flex-wrap gap-2">
      {((canDeliver && detailRow.preview?.revision_docente) || (canEditMessage && detailRow.preview?.mensaje_editable)) && <Button variant="outline" disabled={blocked} aria-label={'Revisar devolución de ' + detailRow.nombre} onClick={event => { rememberFocus(event.currentTarget); setReviewing(detailRow.calificacion_id!); }}>Editar y revisar devolución</Button>}
      {canDeliver && <Button disabled={blocked} onClick={event => openShare([detailRow.calificacion_id!], event.currentTarget)}>Compartir devolución</Button>}
      <Button variant="link" disabled={blocked} onClick={() => onReview(detailRow.calificacion_id!)}>Revisar respuestas y evidencia</Button>
    </div>
    {canDeliver && <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Opciones de sus enlaces</summary><FeedbackAccessList evaluationId={evaluationId} accesses={accesses.filter(access => access.calificacion_id === detailRow.calificacion_id)} previews={detailRow.preview ? [detailRow.preview] : []} signal={controller.current.signal} valid={valid} onBusy={setBusy} onChanged={refreshAccesses} onIssued={() => { setNotice('Cambio guardado. Abre Compartir devolución para recuperar y copiar el enlace vigente.'); }} /></details>}
  </section>;
  return <FeedbackFrame embedded={embedded} onClose={close} canClose={!blocked} title={initialGradeId ? 'Retroalimentación del estudiante' : 'Retroalimentación del grupo'}>
    {reviewDirty && <p role="status" className="shrink-0 border-b border-amber-400 p-3 text-sm">Tienes un mensaje sin guardar. Guarda o descarta los cambios antes de cerrar o cambiar de estudiante.</p>}
    {notice && <p role="status" className="shrink-0 border-b border-border px-4 py-2 text-sm">{notice}</p>}
    {shareIds && actorId ? <FeedbackSharePanel key={shareIds.join(':')} actorId={actorId} evaluationId={evaluationId} rows={rows.filter(row => shareIds.includes(row.calificacion_id ?? ''))} knownRows={rows} signal={controller.current.signal} valid={valid} onBusy={setBusy} onBack={leaveShare} onManage={id => { leaveShare(); if (rows.some(row => row.calificacion_id === id)) setDetail(id); else { setDetail(null); setNotice('Esta devolución ya no aparece en la lista actual. La consultaremos de nuevo antes de continuar.'); setReload(value => value + 1); } }} /> : printEntries ? <div className="min-h-0 flex-1 overflow-y-auto p-4" data-mobile-scroll><FeedbackPrintSheet entries={printEntries} suggestedArea={suggestedArea} onClose={() => { setPrintEntries(null); restoreFocus(); }} /></div> : reviewRow?.preview && (reviewRow.preview.revision_docente || reviewRow.preview.mensaje_editable) ? <div className="min-h-0 flex-1 overflow-y-auto p-4" data-mobile-scroll><FeedbackDeliveryReview key={reviewRow.calificacion_id} evaluationId={evaluationId} name={reviewRow.nombre} preview={reviewRow.preview} signal={controller.current.signal} valid={valid} onApproved={approved} onBusy={setBusy} onDirtyChange={setReviewDirty} onCancel={() => { setReviewDirty(false); setReviewing(null); restoreFocus(); }} /></div> : <>
      {loading ? <p role="status" className="p-4">Cargando estudiantes y retroalimentaciones…</p> : <>
        {error && <div role="alert" className="shrink-0 space-y-2 border-b border-amber-400 p-3 text-sm"><p>{error}</p><Button variant="outline" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualizar lista</Button></div>}
        {pendingPrint && <section role="status" className="shrink-0 space-y-2 border-b border-amber-400 p-3 text-sm"><p>{pendingRows.length} devoluciones seleccionadas necesitan revisión. No se entregarán sin tu aprobación.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { const row = pendingRows[0]; if (row?.preview?.revision_docente) setReviewing(row.calificacion_id!); else if (row?.calificacion_id) onReview(row.calificacion_id); }}>Revisar pendientes</Button>{chosen.length > 0 && <Button disabled={busy} onClick={() => void preparePrint()}>Entregar solo {chosen.length} {chosen.length === 1 ? 'lista' : 'listas'}</Button>}<Button variant="outline" onClick={() => setPendingPrint(false)}>Cancelar</Button></div></section>}
        {publishing ? <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" data-mobile-scroll><Button variant="link" disabled={busy} onClick={() => { setPublishing(false); restoreFocus(); }}>Volver a estudiantes</Button><FeedbackBatchPublish individual={Boolean(initialGradeId)} evaluationId={evaluationId} rows={rows} selectedIds={selected} signal={controller.current.signal} valid={valid} disabled={busy} onBusy={setBusy} onCompleted={published} /></div> : <div className="flex min-h-0 flex-1">
          {!initialGradeId && <div ref={listScope} className={`min-h-0 min-w-0 flex-1 flex-col xl:flex xl:max-w-md xl:border-r xl:border-border ${detail ? 'hidden' : 'flex'}`}>
            <header className="shrink-0 space-y-2 border-b border-border p-3">
              <p className="text-sm text-muted" data-feedback-secondary>{rows.length} estudiantes · {eligible.length} listos para entregar</p>
              <label className="block text-sm font-semibold">Buscar estudiante<input type="search" className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base" value={search} onChange={event => setSearch(event.target.value)} /></label>
              <div className="flex flex-wrap items-center gap-1" data-feedback-secondary><label className="text-sm"><span className="sr-only">Mostrar</span><select aria-label="Filtrar devoluciones" className="min-h-11 max-w-28 rounded-lg border border-border bg-surface px-2 text-sm" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos</option><option value="ready">Listos</option><option value="pending">Por revisar</option></select></label>
              {canDeliver && <><Button variant="link" className="px-2 text-xs" aria-label="Todos con nota del filtro" disabled={busy || !visible.some(row => row.preview?.seleccionable || row.preview?.elegible)} onClick={() => setSelected(current => [...new Set([...current, ...visible.filter(row => row.preview?.seleccionable || row.preview?.elegible).map(row => row.calificacion_id!)])])}>Con nota</Button><Button variant="link" className="px-2 text-xs" aria-label="Listos del filtro" disabled={busy || !visible.some(row => row.preview?.elegible)} onClick={() => setSelected(current => [...new Set([...current, ...visible.filter(row => row.preview?.elegible).map(row => row.calificacion_id!)])])}>Listos</Button><Button variant="link" className="px-2 text-xs" aria-label="Limpiar selección" disabled={busy} onClick={() => setSelected([])}>Limpiar</Button></>}</div>
              <div className="flex flex-wrap items-center gap-1" data-feedback-secondary><span className="text-xs text-muted">Seleccionar: solo el filtro actual</span><Button variant="link" className="ml-auto min-w-11 px-2" disabled={busy} aria-label="Actualizar estudiantes y devoluciones" title="Actualizar" onClick={() => setReload(value => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button>{canBatchPublish && <Button variant="link" className="px-2 text-xs" aria-label="Revisar y publicar notas" disabled={busy} onClick={event => { rememberFocus(event.currentTarget); setPublishing(true); }}>Revisar notas</Button>}</div>
            </header>
            <div ref={element => { if (element) element.scrollTop = listPosition.current; }} onScroll={event => { listPosition.current = event.currentTarget.scrollTop; }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" data-mobile-scroll data-feedback-list-scroll><FeedbackStudentList rows={visible} accesses={accesses} selected={selected} detailId={detail} canDeliver={canDeliver} busy={busy} onToggle={(id, checked) => setSelected(current => checked ? [...new Set([...current, id])] : current.filter(item => item !== id))} onOpen={openDetail} onShare={(id, trigger) => openShare([id], trigger)} />{!visible.length && <p className="p-3 text-sm text-muted">No hay estudiantes que coincidan con la búsqueda.</p>}</div>
          </div>}
          <div className={`${initialGradeId || detail ? 'block' : 'hidden xl:block'} min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain`} data-mobile-scroll>{detailView ?? <div className="grid h-full place-content-center gap-3 p-8 text-center text-muted"><MessageSquareText className="mx-auto h-8 w-8" aria-hidden="true" /><p>Selecciona estudiantes para compartir o imprimir.</p><p className="text-sm">Abre una devolución para leerla o revisarla aquí.</p></div>}</div>
        </div>}
        {initialGradeId && canBatchPublish && !publishing && !eligible.length && <div className="shrink-0 border-t border-border p-3"><Button variant="outline" onClick={event => { rememberFocus(event.currentTarget); setPublishing(true); }}>Revisar antes de publicar</Button></div>}
        {canDeliver && !publishing && <FeedbackSelectionBar count={selectedRows.length} hiddenCount={hiddenSelected} busy={busy} onShare={trigger => openShare(selected, trigger)} onPrint={trigger => { rememberFocus(trigger); if (pendingRows.length) setPendingPrint(true); else void preparePrint(); }} />}
      </>}
    </>}
  </FeedbackFrame>;
}

function FeedbackFrame({ embedded, onClose, canClose, title, children }: { embedded?: boolean; onClose: () => void; canClose: boolean; title: string; children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const viewport = useMobileFormViewport(!embedded, scope);
  const body = <div ref={scope} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [overflow-wrap:anywhere]">{viewport.isWriting && <Button variant="link" className="shrink-0 self-end" onClick={viewport.finishWriting}>Listo</Button>}{children}</div>;
  if (embedded) return <section className="flex h-[min(70dvh,48rem)] min-h-80 min-w-0 flex-col rounded-xl border border-border bg-surface" aria-label={title}><h2 className="shrink-0 border-b border-border p-4 text-lg font-bold">{title}</h2>{body}</section>;
  return <Modal open onClose={onClose} closeOnBackdrop={canClose} closeOnEscape={canClose} mobileViewport={viewport.viewport} mobileWriting={viewport.isWriting} title={<span className="block p-4 pt-[max(1rem,env(safe-area-inset-top))]">{title}</span>} className="flex h-[min(90dvh,56rem)] max-w-6xl flex-col !overflow-hidden !bg-surface !p-0 !backdrop-blur-none [&>h2]:!mb-0 [&>h2]:shrink-0 [&>h2]:border-b [&>h2]:border-border [&>button]:top-[max(.75rem,env(safe-area-inset-top))] [&[data-writing=true]_[data-feedback-secondary]]:hidden max-sm:!max-h-[100dvh] max-sm:!rounded-none">{body}</Modal>;
}
