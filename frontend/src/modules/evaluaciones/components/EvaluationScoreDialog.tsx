import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { toApiError } from '@/lib/api';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import type { Evaluacion } from '@/types/api';
import { applyScoreNotes, previewScoreNotes, readScoreDefinition, readScoreReceipt, saveScoreDefinition, type ScoreApplyRequest, type ScoreDefinition, type ScorePreview, type ScoreReceipt } from '../scoreApi';
import { compileScorePlan, type ScorePlan } from './scoreAllocation';
import { ScorePlanEditor } from './ScorePlanEditor';

type Stage = 'edit' | 'preview' | 'confirm' | 'uncertain' | 'result';

export function EvaluationScoreDialog({ evaluation, onClose, onSaved }: { evaluation: Evaluacion; onClose: () => void; onSaved: () => void }) {
  const actor = useAuth(state => state.user);
  const [owner] = useState(actor?.id);
  const permitted = actor?.id === owner && (actor?.rol === 'admin' || actor?.rol === 'profesor' && actor?.id === evaluation.profesor_id)
    && Boolean(actor?.permissions?.includes('evaluations.read')) && Boolean(actor?.permissions?.includes('evaluations.update'));
  const canPreview = Boolean(actor?.permissions?.includes('grading.read'));
  const canApply = canPreview && Boolean(actor?.permissions?.includes('grading.grade'));
  const prefix = `xc-score:${owner}:${evaluation.id}`, operationKey = `xc-score-operation:${owner}:${evaluation.id}`;
  const [definition, setDefinition] = useState<ScoreDefinition | null>(null);
  const [plan, setPlan] = useState<ScorePlan | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<ScorePreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [operation, setOperation] = useState<ScoreApplyRequest | null>(null);
  const [receipt, setReceipt] = useState<ScoreReceipt | null>(null);
  const [stage, setStage] = useState<Stage>('edit');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const controller = useRef<AbortController | null>(null), running = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const mobile = useMobileFormViewport(permitted, formRef);
  useLayoutEffect(() => {
    // A shorter preview must not inherit the long editor's scroll position.
    // Do this before paint, never in a late frame that could steal a user's focus.
    if (formRef.current) formRef.current.scrollTop = 0;
    stageHeading.current?.focus({ preventScroll: true });
  }, [stage]);
  function alive(signal: AbortSignal) {
    const current = useAuth.getState().user;
    return !signal.aborted && current?.id === owner && current?.permissions?.includes('evaluations.read') && current?.permissions?.includes('evaluations.update');
  }
  function begin() {
    if (!permitted || running.current) return null;
    controller.current?.abort(); controller.current = new AbortController(); running.current = true; setBusy(true); setError('');
    return controller.current.signal;
  }
  function finish(signal: AbortSignal) { if (alive(signal)) { running.current = false; setBusy(false); } }
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort;
    if (!permitted) return () => abort.abort();
    running.current = true; setBusy(true); setError('');
    void (async () => {
      try {
        const value = await readScoreDefinition(evaluation.id, abort.signal);
        if (!alive(abort.signal)) return;
        setDefinition(value); setPlan(value.plan); setDirty(false);
        try {
          const draft = JSON.parse(sessionStorage.getItem(prefix) || 'null');
          if (draft?.fingerprint === value.definition_fingerprint && draft.plan?.schema_version === 1 && Array.isArray(draft.plan.grupos)) {
            setPlan(draft.plan); setDirty(true); setNotice('Recuperamos tu reparto sin guardar. Revísalo antes de confirmarlo.');
          } else if (draft) setNotice('Hay un borrador de otra versión. Se conserva en este navegador; no se aplicará sobre la versión nueva.');
          const saved = JSON.parse(sessionStorage.getItem(operationKey) || 'null');
          if (canApply && saved?.confirmar === true && typeof saved.request_id === 'string' && Array.isArray(saved.selecciones) && saved.selecciones.length <= 100) {
            setOperation(saved); setStage('uncertain');
            try {
              const result = await readScoreReceipt(evaluation.id, saved.request_id, abort.signal);
              if (alive(abort.signal)) { setReceipt(result); setStage('result'); }
            } catch { /* Unknown is not failure: only an explicit retry can resubmit the same request. */ }
          }
        } catch { setNotice('No pudimos recuperar el borrador de este navegador. No se ha cambiado ninguna nota.'); }
      } catch (issue) { if (alive(abort.signal)) setError(toApiError(issue).detail); }
      finally { finish(abort.signal); }
    })();
    return () => { abort.abort(); running.current = false; };
    // Each mounted dialog belongs to exactly one actor/evaluation. Late results
    // are discarded on revocation, unmount or a newer explicit read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permitted, reload, evaluation.id, owner]);

  useEffect(() => {
    if (canPreview && (canApply || !['confirm', 'result', 'uncertain'].includes(stage))) return;
    setPreview(null); setSelected([]); setReceipt(null);
    if (stage !== 'edit') {
      controller.current?.abort(); running.current = false; setBusy(false); setStage('edit');
      setError('Los permisos de notas cambiaron. Conservamos la confirmación para consultar su resultado cuando recuperes el acceso.');
    }
  }, [canPreview, canApply, stage]);

  function changePlan(value: ScorePlan) {
    setPlan(value); setDirty(true); setError('');
    try { sessionStorage.setItem(prefix, JSON.stringify({ fingerprint: definition?.definition_fingerprint, plan: value })); }
    catch { setNotice('El navegador no permite guardar el borrador. Mantén abierta esta ventana hasta guardarlo.'); }
  }
  async function save() {
    if (!definition || !plan) return;
    const signal = begin(); if (!signal) return;
    try {
      const value = await saveScoreDefinition(evaluation.id, definition, plan, signal);
      if (!alive(signal)) return;
      setDefinition(value); setPlan(value.plan); setDirty(false); setPreview(null);
      try { sessionStorage.removeItem(prefix); } catch { /* The saved server definition remains authoritative. */ }
      setNotice('Reparto guardado. Las notas anteriores no han cambiado.'); onSaved();
    } catch (issue) { if (alive(signal)) setError(toApiError(issue).detail); }
    finally { finish(signal); }
  }
  async function loadPreview(cursor?: string | null) {
    if (!canPreview || dirty) return;
    const signal = begin(); if (!signal) return;
    try {
      const value = await previewScoreNotes(evaluation.id, cursor, signal);
      if (!alive(signal) || !useAuth.getState().user?.permissions?.includes('grading.read')) return;
      if (value.definition_fingerprint !== definition?.definition_fingerprint) throw new Error('El reparto cambió. Cierra y vuelve a abrir para revisar la versión actual.');
      setPreview(value); setSelected([]); setStage('preview');
    } catch (issue) { if (alive(signal)) setError(issue instanceof Error && !('response' in issue) ? issue.message : toApiError(issue).detail); }
    finally { finish(signal); }
  }
  async function submit(request: ScoreApplyRequest) {
    if (!canApply) return;
    const signal = begin(); if (!signal) return;
    try {
      const result = await applyScoreNotes(evaluation.id, request, signal);
      if (!alive(signal) || !useAuth.getState().user?.permissions?.includes('grading.grade')) return;
      setReceipt(result); setStage('result'); onSaved();
    } catch (issue) {
      if (alive(signal)) { setError(toApiError(issue).detail); setStage('uncertain'); }
    } finally { finish(signal); }
  }
  async function confirm() {
    if (!preview || !canApply || busy) return;
    const request: ScoreApplyRequest = { request_id: crypto.randomUUID(), definition_fingerprint: preview.definition_fingerprint, confirmar: true,
      selecciones: preview.resultados.filter(row => row.elegible && row.fingerprint && selected.includes(row.calificacion_id)).map(row => ({ calificacion_id: row.calificacion_id, fingerprint: row.fingerprint! })) };
    if (!request.selecciones.length) return;
    // Persist the exact manifest before the POST. Never mint another operation
    // just because the browser did not receive the committed server response.
    try { sessionStorage.setItem(operationKey, JSON.stringify(request)); }
    catch { setError('El navegador bloqueó la recuperación de esta confirmación. Habilita el almacenamiento de esta pestaña antes de actualizar notas.'); return; }
    setOperation(request); await submit(request);
  }
  async function recover() {
    if (!operation || !canApply) return;
    const signal = begin(); if (!signal) return;
    try {
      const result = await readScoreReceipt(evaluation.id, operation.request_id, signal);
      if (alive(signal) && useAuth.getState().user?.permissions?.includes('grading.grade')) { setReceipt(result); setStage('result'); onSaved(); }
    } catch (issue) { if (alive(signal)) setError(toApiError(issue).detail); }
    finally { finish(signal); }
  }
  if (!permitted) return null;
  let validation = '';
  if (plan && definition) try { compileScorePlan(plan, definition.preguntas.map(q => q.clave), definition.nota_maxima); }
  catch (issue) { validation = issue instanceof Error ? issue.message : 'Revisa el reparto.'; }
  const selectedRows = preview?.resultados.filter(row => selected.includes(row.calificacion_id)) || [];
  return <Modal open onClose={() => { if (!busy) onClose(); }} title="Repartir puntos" description={evaluation.nombre} className="flex h-[min(54rem,calc(100dvh-2rem))] max-w-4xl flex-col overflow-hidden" fullScreen mobileViewport={mobile.viewport} mobileWriting={mobile.isWriting} closeOnBackdrop={!busy} closeOnEscape={!busy} showCloseButton={!busy}>
    <div ref={formRef} data-mobile-scroll className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-1">
      {mobile.isWriting && <Button variant="outline" onClick={mobile.finishWriting}>Listo, cerrar teclado</Button>}
      <p className="text-sm leading-6 text-muted">Cambiar el reparto no cambia las preguntas ni las evidencias. Guardar conserva todas las notas anteriores; actualizarlas requiere otra confirmación.</p>
      {notice && <p role="status" className="rounded-xl border border-border bg-surface-2 p-3 text-sm leading-6">{notice}</p>}
      {error && <p role="alert" className="break-words rounded-lg border border-danger p-3 text-sm">{error}</p>}
      {busy && <p role="status">{stage === 'confirm' || stage === 'uncertain' ? 'Comprobando y actualizando los casos confirmados…' : 'Consultando…'}</p>}
      {stage === 'edit' && <>
        {definition && plan && <ScorePlanEditor plan={plan} questions={definition.preguntas} maximum={definition.nota_maxima} disabled={busy} onChange={changePlan} />}
        {evaluation.estructura_documento?.puntuacion_secciones && <p className="text-sm leading-6">Al guardar, este reparto sustituye al reparto anterior de secciones. Sus títulos, lecturas y preguntas se conservan; no se ponderan dos veces.</p>}
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-surface py-3 sm:flex-row">
          <Button className="min-h-11" disabled={busy || !definition || !plan || Boolean(validation)} onClick={() => void save()}>Guardar reparto</Button>
          {canPreview && <Button className="min-h-11" variant="outline" disabled={busy || dirty || !definition} onClick={() => void loadPreview()}>Actualizar notas anteriores</Button>}
        </div>
        {dirty && <p className="text-sm text-muted">Guarda el reparto antes de consultar las notas anteriores.</p>}
        {error && !definition && <Button variant="outline" onClick={() => setReload(v => v + 1)}>Consultar de nuevo</Button>}
      </>}
      {(stage === 'preview' || stage === 'confirm') && preview && canPreview && <>
        <h3 ref={stageHeading} tabIndex={-1} className="font-semibold">{stage === 'confirm' ? 'Confirma los cambios seleccionados' : 'Vista previa de notas anteriores'}</h3>
        <p className="text-sm leading-6">{preview.aviso} Las respuestas, imágenes e historial se conservan. No se publica ninguna nota nueva ni se llama a la IA.</p>
        {stage === 'preview' && canApply && <Button variant="outline" disabled={busy} onClick={() => setSelected(preview.resultados.filter(row => row.elegible).map(row => row.calificacion_id))}>Seleccionar disponibles de esta página</Button>}
        <div className="space-y-2">{(stage === 'confirm' ? selectedRows : preview.resultados).map(row => <label key={row.calificacion_id} className="flex min-w-0 items-start gap-3 rounded-xl border border-border p-3">
          {stage === 'preview' && <input type="checkbox" className="mt-1 min-h-6 min-w-6" aria-label={`Seleccionar ${row.nombre}`} disabled={busy || !canApply || !row.elegible} checked={selected.includes(row.calificacion_id)} onChange={e => setSelected(current => e.target.checked ? [...current, row.calificacion_id] : current.filter(id => id !== row.calificacion_id))} />}
          <span className="min-w-0 space-y-1"><span className="block break-words font-semibold">{row.nombre}</span><span className="block text-sm">Actual: {row.nota_actual ?? 'Pendiente'}{row.elegible && ` → Propuesta: ${row.nota_propuesta}`}</span>{row.motivo && <span className="block text-sm text-muted">{row.motivo}</span>}</span>
        </label>)}</div>
        {!preview.resultados.length && <p>No hay notas anteriores para actualizar.</p>}
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-surface py-3 sm:flex-row">
          <Button variant="outline" disabled={busy} onClick={() => setStage(stage === 'confirm' ? 'preview' : 'edit')}>Volver</Button>
          {stage === 'preview' && canApply && <Button disabled={busy || !selected.length} onClick={() => setStage('confirm')}>Revisar {selected.length} cambios</Button>}
          {stage === 'confirm' && canApply && <Button disabled={busy || !selected.length} onClick={() => void confirm()}>Confirmar actualización de {selected.length} notas</Button>}
        </div>
        {stage === 'preview' && preview.siguiente_cursor && <Button variant="outline" disabled={busy} onClick={() => void loadPreview(preview.siguiente_cursor)}>Siguiente página (descarta la selección actual)</Button>}
      </>}
      {stage === 'uncertain' && operation && canApply && <>
        <h3 ref={stageHeading} tabIndex={-1} className="font-semibold">Comprobar una confirmación anterior</h3>
        <p className="text-sm leading-6">La respuesta no está confirmada en esta pantalla. Consulta el resultado antes de iniciar otra operación. Reintentar usa exactamente los mismos casos y no duplica cambios.</p>
        <Button disabled={busy || !canApply} onClick={() => void recover()}>Consultar resultado</Button>
        <Button variant="outline" disabled={busy || !canApply} onClick={() => void submit(operation)}>Reintentar la misma confirmación</Button>
      </>}
      {stage === 'result' && receipt && canApply && <>
        <h3 ref={stageHeading} tabIndex={-1} role="status" className="font-semibold">{receipt.resultados.filter(row => row.estado === 'applied').length} actualizadas</h3>
        <p className="text-sm text-muted">Los casos excluidos o modificados mientras revisabas no se sobrescriben. Sus notas anteriores se conservan.</p>
        <ul className="space-y-2">{receipt.resultados.map((row, index) => <li key={row.calificacion_id} className="rounded-xl border border-border p-3 text-sm">
          <p className="font-semibold">{preview?.resultados.find(item => item.calificacion_id === row.calificacion_id)?.nombre || `Caso ${index + 1}`}</p>
          {row.estado === 'applied' ? <p>Actualizada: {row.nota_anterior} → {row.nota_nueva}</p> : <p>{row.motivo || 'Sin cambios. Revisa este caso.'}</p>}
        </li>)}</ul>
        <Button disabled={busy} onClick={() => { try { sessionStorage.removeItem(operationKey); } catch { /* No new request is sent here. */ } setOperation(null); setReceipt(null); setPreview(null); setSelected([]); setStage('edit'); setError(''); }}>Volver al reparto</Button>
      </>}
    </div>
  </Modal>;
}
