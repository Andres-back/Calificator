import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Clock3, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { copyFeedbackAccesses, issueFeedbackAccesses, listFeedbackAccesses, previewFeedback, publishFeedbackBatch, readFeedbackBatch, type FeedbackAccess, type FeedbackPreview } from './api';
import { classifyAccesses, clearManifest, clearPreparations, createManifest, readManifest, storeManifest, validateIssued, type PreparationManifest } from './feedbackPreparation';
import { FeedbackDeliveryReview } from './FeedbackDeliveryReview';
import { FeedbackMessage } from './FeedbackMessage';
import { clearApproval, createApproval, readApproval, runApproval, storeApproval, type ApprovalManifest } from './feedbackApproval';
import { queryClient } from '@/lib/queryClient';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';

interface Target { calificacion_id?: string | null; nombre: string }
interface Prepared { gradeId: string; accessId: string; name: string; url: string }
type Outcome = 'confirmed' | 'failed' | 'uncertain' | 'unavailable';
interface ShareRow { id: string; name: string; preview?: FeedbackPreview; accesses: FeedbackAccess[]; kind: 'existing' | 'missing' | 'closed' | 'pending'; activeId?: string }

// This observer lives for as long as a recovery manifest can outlive its panel.
// It stores no credentials and removes recovery metadata on logout/revocation.
let stopWatching: (() => void) | undefined;
function watchRecovery(actorId: string) {
  if (stopWatching) return;
  stopWatching = useAuth.subscribe(state => {
    if (state.user?.id !== actorId || !['grading.read', 'grading.publish'].every(permission => state.user?.permissions?.includes(permission)) || !['profesor', 'admin'].includes(state.user.rol)) {
      try { clearPreparations(sessionStorage); } catch { /* Storage may be disabled. */ }
      stopWatching?.(); stopWatching = undefined;
    }
  });
}

export function FeedbackSharePanel({ actorId, evaluationId, rows, knownRows, signal, valid, onBusy, onDirtyChange, onBack, onManage, onPreviewChanged, onFinishEditing }: {
  actorId: string; evaluationId: string; rows: Target[]; knownRows?: Target[]; signal: AbortSignal; valid: () => boolean;
  onBusy: (busy: boolean) => void; onBack: () => void; onManage: (gradeId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPreviewChanged?: (preview: FeedbackPreview) => void;
  onFinishEditing?: () => void;
}) {
  const user = useAuth(state => state.user);
  const [targets] = useState(rows);
  const [names] = useState(knownRows ?? rows);
  const [items, setItems] = useState<ShareRow[]>([]);
  const [prepared, setPrepared] = useState<Prepared[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [days, setDays] = useState(3);
  const [evidence, setEvidence] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [retryLoad, setRetryLoad] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [approvalRecovery, setApprovalRecovery] = useState(false);
  const [progress, setProgress] = useState('');
  const approval = useRef<ApprovalManifest | null>(null);
  const manifest = useRef<PreparationManifest | null>(null);
  const lock = useRef(false);
  const abort = useRef(new AbortController());
  const panelRef = useRef<HTMLElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ kind: 'create' | 'manage' | 'review'; id: string } | null>(null);
  const validRef = useRef(valid); validRef.current = valid;
  const permitted = user?.id === actorId && ['profesor', 'admin'].includes(user.rol) && ['grading.read', 'grading.publish'].every(permission => user.permissions?.includes(permission));
  const current = useCallback(() => {
    const actor = useAuth.getState().user;
    return !signal.aborted && !abort.current.signal.aborted && validRef.current() && actor?.id === actorId && ['profesor', 'admin'].includes(actor.rol) && ['grading.read', 'grading.publish'].every(permission => actor.permissions?.includes(permission));
  }, [actorId, signal]);
  useEffect(() => {
    if (reviewingId && current()) panelRef.current?.querySelector<HTMLElement>('[data-feedback-review-form]')?.focus({ preventScroll: true });
  }, [reviewingId, current]);
  useLayoutEffect(() => {
    const request = pendingFocus.current;
    if (!request || busy || reviewDirty || reviewingId || !current()) return;
    const selector = request.kind === 'manage' ? '[data-manage-feedback]' : '[data-review-feedback]';
    const target = request.kind === 'create' ? createButtonRef.current
      : Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>(selector) ?? [])
        .find(button => (request.kind === 'manage' ? button.dataset.manageFeedback : button.dataset.reviewFeedback) === request.id);
    if (target && !target.disabled) {
      // The integrated panel sits inside the grade scroller. Safari can keep
      // its old textarea position after approval, even when the button focuses.
      if (request.kind === 'create') target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      target.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [busy, reviewDirty, reviewingId, items, current]);
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  useEffect(() => { onDirtyChange?.(reviewDirty); return () => onDirtyChange?.(false); }, [reviewDirty, onDirtyChange]);
  useEffect(() => {
    const controller = new AbortController(); abort.current = controller;
    const cancel = () => controller.abort(); signal.addEventListener('abort', cancel);
    setLoading(true); setError(''); setPrepared([]); setManual(''); setOutcomes({});
    async function load() {
      try {
        let previous: PreparationManifest | null = null;
        try { previous = readManifest(sessionStorage, actorId, evaluationId); } catch { /* Memory-only remains available. */ }
        const priorApproval = readApproval(sessionStorage, actorId, evaluationId);
        approval.current = priorApproval; setApprovalRecovery(Boolean(priorApproval));
        manifest.current = previous; setRecovery(Boolean(previous));
        if (priorApproval) { setDays(priorApproval.days); setEvidence(priorApproval.evidence); watchRecovery(actorId); }
        if (previous) {
          setDays(previous.days); setEvidence(previous.evidence); watchRecovery(actorId);
          setOutcomes(Object.fromEntries(previous.parts.flatMap(part => part.selections.map(item => [item.calificacion_id, part.confirmed ? 'confirmed' : 'uncertain']))));
        }
        const ids = priorApproval?.targetIds ?? (previous ? previous.parts.flatMap(part => part.selections.map(item => item.calificacion_id)) : targets.flatMap(row => row.calificacion_id ? [row.calificacion_id] : []));
        const previews: FeedbackPreview[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) previews.push(...await previewFeedback(evaluationId, ids.slice(offset, offset + 100), controller.signal));
        const accesses = await listFeedbackAccesses(evaluationId, controller.signal);
        if (controller.signal.aborted || !current()) return;
        if (previews.length !== ids.length || ids.some(id => previews.filter(item => item.calificacion_id === id).length !== 1)) throw new Error('Incomplete preview');
        const classified = ids.map(id => {
          const preview = previews.find(item => item.calificacion_id === id)!;
          const saved = classifyAccesses(id, accesses);
          return { id, name: names.find(row => row.calificacion_id === id)?.nombre ?? preview.resultado?.estudiante ?? 'Estudiante de la solicitud pendiente', preview, accesses: saved.accesses,
            kind: saved.kind === 'existing' ? 'existing' : !preview.elegible || !preview.fingerprint ? 'pending' : saved.kind, activeId: saved.active[0]?.id } as ShareRow;
        });
        setItems(classified);
        // Loading or recovering never issues or publishes. Existing credentials
        // are recovered once, then copied only by a separate user gesture.
        await recoverUrls(classified.flatMap(item => item.activeId ? [{ gradeId: item.id, accessId: item.activeId }] : []), classified, controller.signal);
      } catch { if (!controller.signal.aborted && current()) setError('No pudimos preparar todos los enlaces. Vuelve a consultar; no se creó ningún enlace por abrir esta vista.'); }
      finally { if (!controller.signal.aborted && current()) setLoading(false); }
    }
    void load();
    return () => { controller.abort(); signal.removeEventListener('abort', cancel); };
    // Targets are an immutable snapshot for this panel, not the current filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId, evaluationId, signal, current, targets, names, retryLoad]);

  async function recoverUrls(ids: { gradeId: string; accessId: string }[], source = items, requestSignal = abort.current.signal) {
    const recovered: Prepared[] = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const results = await copyFeedbackAccesses(evaluationId, batch.map(item => item.accessId), requestSignal);
      if (requestSignal.aborted || !current()) return;
      if (results.length !== batch.length || batch.some(item => results.filter(result => result.id === item.accessId).length !== 1)) throw new Error('Incomplete copy');
      for (const result of results) {
        const identity = batch.find(item => item.accessId === result.id)!;
        if (result.calificacion_id && result.calificacion_id !== identity.gradeId) throw new Error('Wrong context');
        if (result.url) recovered.push({ gradeId: identity.gradeId, accessId: result.id, name: source.find(item => item.id === identity.gradeId)?.name ?? result.estudiante ?? 'Estudiante seleccionado', url: result.url });
        else {
          setOutcomes(previous => ({ ...previous, [identity.gradeId]: 'unavailable' }));
          setError('Algunos enlaces no se pudieron recuperar. Revisa las opciones de esos estudiantes; no se renovaron ni crearon otros.');
        }
      }
    }
    if (!requestSignal.aborted && current()) setPrepared(previous => [...previous.filter(item => !recovered.some(next => next.gradeId === item.gradeId)), ...recovered]);
  }
  async function issue(source = items, intentDays = days, intentEvidence = evidence) {
    if (!current() || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice(''); setManual('');
    try {
      const op = manifest.current ?? createManifest(actorId, evaluationId, source.filter(item => item.kind === 'missing').map(item => ({ calificacion_id: item.id, fingerprint: item.preview!.fingerprint! })), intentDays, intentEvidence);
      if (!op.parts.length) return;
      if (op.expiresAt <= Date.now()) {
        clearManifest(sessionStorage, actorId, evaluationId); manifest.current = null;
        setRecovery(false); setUncertain(false); setNotice('La preparación caducó. Consultaremos el estado actual antes de que decidas si hace falta otra entrega.'); setRetryLoad(value => value + 1); return;
      }
      manifest.current = op;
      // Persist before the first write, not after a response could be lost.
      // Fail closed if recovery metadata cannot be saved.
      try { storeManifest(sessionStorage, op); }
      catch {
        manifest.current = null; setRecovery(false); setUncertain(false);
        setError('Tu navegador no permitió guardar la recuperación. No enviamos enlaces nuevos. Habilita el almacenamiento de esta página y vuelve a intentar.'); return;
      }
      watchRecovery(actorId); setRecovery(true);
      for (const part of op.parts) {
        if (!current()) return;
        if (!part.confirmed) {
          setOutcomes(previous => ({ ...previous, ...Object.fromEntries(part.selections.map(item => [item.calificacion_id, 'uncertain' as const])) }));
          const results = await issueFeedbackAccesses(evaluationId, { request_id: part.requestId, selecciones: part.selections, duracion_dias: op.days, evidencia: op.evidence }, abort.current.signal);
          if (!current()) return;
          validateIssued(part.selections, results);
          setOutcomes(previous => ({ ...previous, ...Object.fromEntries(results.map(result => [result.calificacion_id, result.error ? 'failed' as const : 'confirmed' as const])) }));
          part.accesses = results.flatMap(result => !result.error && result.id ? [{ gradeId: result.calificacion_id, accessId: result.id }] : []);
          part.confirmed = true; storeManifest(sessionStorage, op);
          const failures = results.filter(result => result.error || !result.id);
          if (failures.length) setError(`${failures.length} enlaces no se pudieron crear. Revisa esos estudiantes antes de preparar otra entrega.`);
          const ready = results.flatMap(result => result.id && result.url && result.credential_available && !result.error ? [{ gradeId: result.calificacion_id, accessId: result.id, name: source.find(item => item.id === result.calificacion_id)?.name ?? 'Estudiante seleccionado', url: result.url }] : []);
          setPrepared(previous => [...previous.filter(item => !ready.some(next => next.gradeId === item.gradeId)), ...ready]);
          await recoverUrls(part.accesses.filter(item => !ready.some(result => result.gradeId === item.gradeId)), source);
        } else await recoverUrls(part.accesses, source);
      }
      if (current()) { setUncertain(false); setRecovery(false); clearManifest(sessionStorage, actorId, evaluationId); clearApproval(sessionStorage, actorId, evaluationId); approval.current = null; setApprovalRecovery(false); setNotice('Preparación terminada. Comprueba los destinatarios y copia sus enlaces aquí.'); }
    } catch {
      if (current()) { setUncertain(Boolean(manifest.current)); setError('La última respuesta no está confirmada. Recupera esta misma solicitud; no cambies de selección para repetirla.'); }
    } finally { lock.current = false; if (current()) setBusy(false); }
  }
  async function approveAndPrepare() {
    if (!current() || lock.current || !useAuth.getState().user?.permissions?.includes('grading.grade')) return;
    lock.current = true; setBusy(true); setError(''); setNotice(''); setConfirming(false); setManual('');
    try {
      const candidates = items.filter(item => item.preview && (item.preview.elegible || (item.kind === 'pending' && !item.accesses.length && item.preview.batch_candidate)))
        .map(item => item.preview!);
      if (!approval.current) {
        const op = await createApproval(actorId, evaluationId, items.map(item => item.id), candidates, days, evidence);
        if (!current()) return;
        storeApproval(sessionStorage, op); approval.current = op; watchRecovery(actorId);
      }
      const op = approval.current;
      setApprovalRecovery(true); setProgress('Aprobando las notas y los mensajes que confirmaste…');
      const results = await runApproval(op, candidates, {
        publish: (evaluation, payload) => publishFeedbackBatch(evaluation, payload, abort.current.signal),
        read: (evaluation, requestId) => readFeedbackBatch(evaluation, requestId, abort.current.signal),
      }, () => storeApproval(sessionStorage, op), current);
      if (!current()) return;
      const failures = new Set(results.filter(result => result.estado === 'failed').map(result => result.calificacion_id));
      setOutcomes(previous => ({ ...previous, ...Object.fromEntries([...failures].map(id => [id, 'failed' as const])) }));
      setProgress('Comprobando las devoluciones aprobadas antes de crear los enlaces…');
      const previews: FeedbackPreview[] = [];
      for (let offset = 0; offset < op.targetIds.length; offset += 100) previews.push(...await previewFeedback(evaluationId, op.targetIds.slice(offset, offset + 100), abort.current.signal));
      const accesses = await listFeedbackAccesses(evaluationId, abort.current.signal);
      if (!current()) return;
      if (previews.length !== op.targetIds.length || op.targetIds.some(id => previews.filter(item => item.calificacion_id === id).length !== 1)) throw new Error('Incomplete current projection');
      const expected = new Map([...op.readySelections.map(item => [item.calificacion_id, item.fingerprint] as const),
        ...results.flatMap(result => result.estado !== 'failed' && result.fingerprint ? [[result.calificacion_id, result.fingerprint] as const] : [])]);
      const fresh: ShareRow[] = op.targetIds.map(id => {
        const preview = previews.find(item => item.calificacion_id === id)!;
        const saved = classifyAccesses(id, accesses);
        onPreviewChanged?.(preview);
        return { id, name: names.find(row => row.calificacion_id === id)?.nombre ?? 'Estudiante seleccionado', preview, accesses: saved.accesses,
          kind: saved.kind === 'existing' ? 'existing' : !preview.elegible || !preview.fingerprint ? 'pending' : saved.kind, activeId: saved.active[0]?.id };
      });
      setItems(fresh);
      setPrepared(previous => previous.filter(link => fresh.some(item => item.id === link.gradeId && item.accesses.some(access => access.id === link.accessId && access.estado === 'active' && access.copy_available !== false))));
      void queryClient.invalidateQueries({ queryKey: ['evaluation-review', evaluationId] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', evaluationId] });
      const allowed = fresh.filter(item => item.kind === 'missing' && !failures.has(item.id) && expected.get(item.id) === item.preview?.fingerprint);
      const changed = fresh.filter(item => item.kind === 'missing' && !failures.has(item.id) && expected.has(item.id) && expected.get(item.id) !== item.preview?.fingerprint);
      if (allowed.length || manifest.current) {
        setProgress('Creando únicamente los enlaces autorizados que faltan…');
        // Hand off synchronously to the existing durable issuance lock/receipt.
        lock.current = false;
        await issue(allowed, op.days, op.evidence);
      } else {
        clearApproval(sessionStorage, actorId, evaluationId); approval.current = null; setApprovalRecovery(false);
        setNotice('Aprobación comprobada. Los enlaces existentes conservan su estado; no se creó ni reactivó otro.');
      }
      if (current() && (failures.size || changed.length)) setError(`${failures.size + changed.length} estudiantes necesitan atención; no se crearon enlaces para ellos. Los demás resultados se conservan.`);
    } catch {
      if (current()) { setApprovalRecovery(Boolean(approval.current)); setError(approval.current ? 'No pudimos confirmar toda la preparación. Recupera la misma aprobación; no aceptaremos otra nota ni repetiremos cambios ya confirmados.' : 'No pudimos guardar la recuperación. No se aprobaron notas ni se crearon enlaces. Puedes volver a intentar.'); }
    } finally { lock.current = false; if (current()) { setBusy(false); setProgress(''); } }
  }
  async function copy(links: Prepared[]) {
    if (!current() || !links.length || lock.current) return;
    const ordered = [...links].sort((a, b) => a.name.localeCompare(b.name, 'es') || a.gradeId.localeCompare(b.gradeId));
    const text = ordered.map(item => `${item.name.replace(/[\r\n]+/g, ' ')}\n${item.url}`).join('\n\n');
    try { await navigator.clipboard.writeText(text); if (current()) { setNotice(`${links.length} ${links.length === 1 ? 'enlace copiado' : 'enlaces copiados'}. Entrégalos individualmente; no envíes la lista al grupo.`); setManual(''); } }
    catch { if (current()) { setManual(text); setNotice('El navegador no permitió copiar. Selecciona el texto y elige «Copiar».'); } }
  }
  function finishReviewInput() {
    // Safari may remove a focused field without dispatching focusout. Blur it
    // before unmounting so the surrounding mobile form can restore its actions.
    onFinishEditing?.();
    const active = document.activeElement;
    if (active instanceof HTMLElement && panelRef.current?.contains(active)) active.blur();
  }
  function reviewChanged(result: FeedbackPreview, action?: 'saved') {
    if (!current() || result.calificacion_id !== reviewingId) return;
    if (action !== 'saved' && (!result.elegible || !result.fingerprint)) {
      setError('No pudimos comprobar que la devolución esté lista. Conservamos el mensaje; vuelve a consultar antes de crear su enlace.');
      return;
    }
    setItems(previous => previous.map(item => {
      if (item.id !== result.calificacion_id) return item;
      const saved = classifyAccesses(item.id, item.accesses);
      return { ...item, preview: result, kind: !result.elegible || !result.fingerprint ? 'pending' : saved.kind };
    }));
    onPreviewChanged?.(result);
    setReviewDirty(false);
    if (action === 'saved') {
      setNotice('Mensaje guardado. Falta aprobar la devolución antes de preparar su enlace.');
      return;
    }
    const hasClosedAccess = items.find(item => item.id === result.calificacion_id)?.accesses.length;
    pendingFocus.current = { kind: hasClosedAccess ? 'manage' : 'create', id: result.calificacion_id };
    finishReviewInput(); setReviewingId(null);
    setNotice(hasClosedAccess ? 'Devolución aprobada. Revisa las opciones de su enlace anterior; no se reactivó ni creó otro.' : 'Devolución aprobada. Puedes crear su enlace aquí; todavía no se ha creado ninguno por esta aprobación.');
  }
  function cancelReview() {
    const id = reviewingId;
    if (id) pendingFocus.current = { kind: 'review', id };
    finishReviewInput(); setReviewDirty(false); setReviewingId(null);
  }
  if (!permitted) return null;
  const missing = items.filter(item => item.kind === 'missing');
  const canApprove = Boolean(user?.permissions?.includes('grading.grade'));
  const approvable = canApprove ? items.filter(item => item.kind === 'pending' && !item.accesses.length && item.preview?.batch_candidate) : [];
  const newLinkCount = missing.length + approvable.length;
  const reviewing = items.find(item => item.id === reviewingId);
  return <section ref={panelRef} className="flex min-h-0 flex-1 flex-col" aria-label="Compartir retroalimentaciones">
    <header className="shrink-0 space-y-2 border-b border-border p-4">
      {!confirming && <Button variant="link" disabled={busy || Boolean(reviewing)} onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a estudiantes</Button>}
      <h3 className="text-lg font-bold">{confirming ? 'Confirmar entrega' : 'Compartir enlaces individuales'}</h3>
      {!confirming && <p className="text-sm text-muted">{items.length || targets.length} destinatarios · Solo cada estudiante y su familia deben recibir su enlace.</p>}
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" data-mobile-scroll>
      {loading ? <p role="status">Comprobando devoluciones y enlaces…</p> : reviewing?.preview ? <FeedbackDeliveryReview key={reviewing.id} evaluationId={evaluationId} name={reviewing.name} preview={reviewing.preview} signal={abort.current.signal} valid={current} onApproved={reviewChanged} onCancel={cancelReview} onBusy={setBusy} onDirtyChange={setReviewDirty} /> : <>
        {recovery && <p className="rounded-xl border border-amber-400 p-3 text-sm">Hay una solicitud pendiente. Recuperarla conserva sus destinatarios y opciones originales, aunque hayas cambiado la selección.</p>}
        {newLinkCount > 0 && !manifest.current && !confirming && <fieldset className="space-y-3 rounded-xl border border-border p-3" disabled={busy || approvalRecovery}>
          <legend className="px-1 font-semibold">{newLinkCount === 1 ? 'Opciones del enlace nuevo' : `Opciones de los ${newLinkCount} enlaces nuevos`}</legend>
          <label className="block text-sm">Duración del enlace<select aria-label="Duración del enlace" value={days} onChange={event => setDays(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base">{Array.from({ length: 30 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} {value === 1 ? 'día' : 'días'}</option>)}</select></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={evidence} onChange={event => setEvidence(event.target.checked)} />Permitir ver las fotos de su propia entrega</label>
          <p className="text-sm text-muted">Al crear autorizas compartir nota y mensaje. Los enlaces activos conservan su vigencia y todos mantienen cinco preguntas a Xali cada diez minutos.</p>
        </fieldset>}
        {confirming && <section aria-label="Confirmar entrega" className="space-y-3">
          <h4 className="font-bold">Esto recibirá cada estudiante</h4>
          <p className="text-sm leading-6">Aceptarás las notas y los mensajes mostrados; tus notas ajustadas se conservan. Enlaces nuevos: {days} {days === 1 ? 'día' : 'días'}, {evidence ? 'con su propia evidencia' : 'sin fotografías'}. Los existentes no se renuevan.</p>
          <ul className="space-y-3">{[...approvable, ...missing].map(item => <li key={item.id} className="rounded-xl border border-border bg-surface p-3"><p className="font-semibold">{item.name} <span className="ml-2 tabular-nums">{formatGradeScore(Number(item.preview?.batch_candidate?.nota ?? item.preview?.resultado?.nota ?? item.preview?.borrador_docente?.nota))}</span></p><FeedbackMessage text={item.preview?.batch_candidate?.feedback_text ?? item.preview?.resultado?.retroalimentacion ?? ''} />{item.preview?.batch_candidate?.avisos.map(warning => <p key={warning} className="mt-2 text-sm text-muted">{warning}</p>)}</li>)}</ul>
        </section>}
        {!confirming && <ul className="space-y-2" aria-label="Destinatarios y enlaces">{items.map(item => {
          const ready = prepared.find(link => link.gradeId === item.id);
          const readyForApproval = canApprove && item.kind === 'pending' && !item.accesses.length && item.preview?.batch_candidate;
          return <li key={item.id} className="min-w-0 rounded-xl border border-border p-3">
            <p className="break-words font-semibold">{item.name}</p>
            <p className="mt-1 text-sm text-muted">{ready ? 'Enlace listo para copiar' : outcomes[item.id] === 'failed' ? 'No se pudo crear su enlace. Revisa este caso.' : outcomes[item.id] === 'uncertain' ? 'Pendiente de confirmar. Recupera la misma solicitud.' : outcomes[item.id] === 'unavailable' ? 'No pudimos recuperar su enlace. Revisa sus opciones.' : item.kind === 'closed' ? 'Su enlace necesita revisar vigencia o autorización.' : outcomes[item.id] === 'confirmed' ? 'Acceso guardado; falta recuperar su enlace.' : readyForApproval ? 'Lista para tu aprobación' : item.kind === 'missing' ? 'Falta crear su enlace' : item.kind === 'pending' ? item.preview?.motivo ?? 'Primero revisa la devolución' : 'Revisa su enlace antes de compartir'}</p>
            {item.kind === 'pending' && item.preview?.revision_docente && !manifest.current && <p className="mt-2 text-sm leading-6">{canApprove && !item.accesses.length && item.preview.batch_candidate ? 'Puedes aprobar esta nota y su mensaje con el botón inferior. Los puntajes pendientes no se compartirán.' : 'La nota ya está confirmada. Puedes revisar el mensaje y aprobar solo nota y retroalimentación, sin entregar los puntajes pendientes.'}</p>}
            {item.accesses.filter(access => access.estado === 'active').length > 1 && <p className="text-sm text-muted">Tiene varios enlaces guardados. Puedes elegir otro en sus opciones; no se reemplazó ninguno.</p>}
            <div className="mt-2 flex flex-wrap gap-2">{ready && <Button variant="outline" aria-label={'Copiar enlace de ' + item.name} className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left" disabled={busy} onClick={() => void copy([ready])}>Copiar enlace</Button>}
              {item.kind === 'pending' && (item.preview?.revision_docente || (canApprove && item.preview?.mensaje_editable)) && !manifest.current && !approvalRecovery
                ? <Button variant="outline" data-review-feedback={item.id} aria-label={(canApprove && item.preview?.batch_candidate && !item.accesses.length ? 'Editar mensaje de ' : 'Revisar y compartir devolución de ') + item.name} className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left" disabled={busy} onClick={() => { if (current()) { setError(''); setNotice(''); setReviewingId(item.id); } }}>{canApprove && item.preview?.batch_candidate && !item.accesses.length ? 'Editar mensaje' : 'Revisar y compartir'}</Button>
                : (item.kind === 'closed' || item.kind === 'pending' || (item.kind === 'existing' && !ready) || (manifest.current && !ready) || item.accesses.length > 1) && <Button variant="link" data-manage-feedback={item.id} aria-label={'Revisar enlace de ' + item.name} className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left" disabled={busy} onClick={() => onManage(item.id)}>Revisar caso</Button>}</div>
          </li>;
        })}</ul>}
      </>}
      {error && <div role="alert" className="space-y-2 rounded-xl border border-amber-400 p-3 text-sm"><p>{error}</p>{!reviewing && !uncertain && !busy && <Button variant="outline" onClick={() => setRetryLoad(value => value + 1)}>Volver a consultar</Button>}</div>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {progress && <p role="status" className="text-sm">{progress}</p>}
      {!reviewing && manual && <label className="block text-sm font-semibold">Enlaces para copiar manualmente<textarea readOnly aria-label="Enlaces para copiar manualmente" value={manual} onFocus={event => event.currentTarget.select()} className="mt-2 min-h-40 w-full rounded-xl border border-border bg-surface p-3 text-base font-normal" /></label>}
    </div>
    <footer className="sticky bottom-0 z-10 shrink-0 space-y-2 border-t border-border bg-surface p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4" data-feedback-actions>
      {reviewing ? <p className="text-sm" aria-live="polite">Revisa y aprueba el mensaje. Aprobar no crea ni envía su enlace.</p> : confirming ? <p className="text-sm text-muted">Confirma para preparar; después podrás copiar.</p> : !loading && <p className={`text-sm ${prepared.length ? '' : 'text-muted'}`} aria-live="polite">{prepared.length ? <Check className="mr-1 inline h-4 w-4" aria-hidden="true" /> : <Clock3 className="mr-1 inline h-4 w-4" aria-hidden="true" />}{prepared.length} de {items.length} enlaces listos{!prepared.length ? ' · revisa el estado de cada destinatario para continuar' : prepared.length < items.length ? ' · los demás no se incluyen en la copia' : ''}</p>}
      {!reviewing && <div className="grid gap-2 sm:flex sm:flex-wrap">
        {(uncertain || recovery) ? <Button disabled={busy || loading} loading={busy} onClick={() => void issue()}>Recuperar la misma solicitud</Button>
          : approvalRecovery ? <Button disabled={busy || loading || !canApprove} loading={busy} onClick={() => void approveAndPrepare()}>Recuperar aprobación y enlaces</Button>
            : confirming ? <><Button disabled={busy || loading} loading={busy} onClick={() => void approveAndPrepare()}>Confirmar y preparar {newLinkCount} {newLinkCount === 1 ? 'enlace' : 'enlaces'}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>Volver sin aprobar</Button></>
              : approvable.length > 0 && !manifest.current ? <Button disabled={busy || loading} onClick={() => setConfirming(true)}>Aprobar y crear {newLinkCount} {newLinkCount === 1 ? 'enlace' : 'enlaces'}</Button>
                : missing.length > 0 && !manifest.current && <Button ref={createButtonRef} disabled={busy || loading} loading={busy} onClick={() => void issue()}><Link2 className="h-4 w-4" aria-hidden="true" />Crear {missing.length} {missing.length === 1 ? 'enlace faltante' : 'enlaces faltantes'}</Button>}
        {prepared.length > 0 && <Button variant="outline" disabled={busy || loading} onClick={() => void copy(prepared)}><Copy className="h-4 w-4" aria-hidden="true" />Copiar {prepared.length}{prepared.length < items.length ? prepared.length === 1 ? ' disponible' : ' disponibles' : prepared.length === 1 ? ' enlace' : ' enlaces'}</Button>}
      </div>}
    </footer>
  </section>;
}
