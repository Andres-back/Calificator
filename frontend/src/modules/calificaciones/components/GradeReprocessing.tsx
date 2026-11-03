import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, History, RotateCcw, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, ConfirmDialog, Field, Modal, Textarea } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceIntentKey, scanPagesReviewed, scanSubmission, withoutEvidenceScan } from '@/components/evidence/scanSubmission';
import { useEvidenceScanCapability } from '@/components/evidence/useEvidenceScanCapability';
import { hasUnusableEvidence, type EvidencePage } from '@/components/evidence/evidencePayload';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/stores/auth';
import type { Calificacion, CalificacionDetalle } from '@/types/api';
import { getCalificacionDetalle, getEvidenceEditContext, getRegradingContext, listGradingRevisions, reprocessGrade } from '../api';
import { EvidenceEditDraft } from './EvidenceEditDraft';
import { buildEvidenceEdit, evidenceDraftChanged, makeEvidenceDraft, type EvidenceDraftPage } from './evidenceEditModel';

const previousStateLabels: Record<string, string> = {
  sugerida: 'Sugerida por IA', requiere_revision: 'Pendiente de revisión',
  confirmada: 'Confirmada', ajustada: 'Ajustada por el docente', publicada: 'Publicada',
};
const scoreFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 });
const formatPoints = (value: string) => Number.isFinite(Number(value)) ? scoreFormat.format(Number(value)) : value;

function GradeReprocessingContent({ cal, onAccepted, onDirtyChange, disabled = false, evidenceView = false }: {
  cal: CalificacionDetalle; onAccepted: (grade: Calificacion) => void; onDirtyChange?: (dirty: boolean) => void; disabled?: boolean; evidenceView?: boolean;
}) {
  const actorId = useAuth((state) => state.user?.id ?? '');
  const [mode, setMode] = useState<'regrade' | 'replace' | 'edit' | null>(null);
  const [draftPages, setDraftPages] = useState<EvidenceDraftPage[] | null>(null);
  const [discardEdit, setDiscardEdit] = useState(false);
  const [editSession, setEditSession] = useState(0);
  const [reason, setReason] = useState('');
  const [pages, setPages] = useState<EvidencePage[]>([]);
  const [scanScope, setScanScope] = useState<string | null>(null);
  const capability = useEvidenceScanCapability(cal.evaluacion_id, cal.estudiante_id, mode === 'replace');
  const scanEnabled = pages.length ? scanScope === capability.scope : capability.available;
  const usingScan = scanEnabled && pages.length > 0 && pages.every((page) => page.file.type.startsWith('image/'));
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [expectedVersion, setExpectedVersion] = useState(cal.updated_at);
  const [refreshedGrade, setRefreshedGrade] = useState<CalificacionDetalle | null>(null);
  const mounted = useRef(false);
  const openEpoch = useRef(0);
  const mutationEpoch = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; openEpoch.current += 1;
      void queryClient.cancelQueries({ queryKey: ['grading-reprocessing-detail', actorId, cal.id], exact: true });
    };
  }, [actorId, cal.id]);
  const [contextGeneration, setContextGeneration] = useState(0);
  const [acceptedScoreFingerprint, setAcceptedScoreFingerprint] = useState<string | null>(null);
  const [contextNeedsRefresh, setContextNeedsRefresh] = useState(false);
  const [refreshingContext, setRefreshingContext] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  const viewport = useMobileFormViewport(Boolean(mode), scope);
  const currentGrade = refreshedGrade ?? cal;
  const hasDecision = currentGrade.revisado_por_docente || currentGrade.nota_confirmada != null || ['confirmada', 'ajustada', 'publicada'].includes(currentGrade.estado);
  const processing = currentGrade.estado === 'procesando';
  useEffect(() => { onDirtyChange?.(mode !== null); }, [mode, onDirtyChange]);
  const history = useQuery({ queryKey: ['grading-revisions', cal.id], queryFn: () => listGradingRevisions(cal.id), enabled: historyOpen });
  const scoreContext = useQuery({ queryKey: ['grading-reprocessing-context', actorId, cal.id, contextGeneration], queryFn: () => getRegradingContext(cal.id),
    enabled: mode !== null, retry: false, staleTime: Infinity, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const context = scoreContext.data;
  const editQuery = useQuery({ queryKey: ['grading-evidence-edit', actorId, cal.id, editSession],
    queryFn: ({ signal }) => getEvidenceEditContext(cal.id, signal), enabled: mode === 'edit',
    retry: false, gcTime: 0, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const editContext = editQuery.data;
  const editPages = draftPages ?? (editContext ? makeEvidenceDraft(editContext) : []);
  const editVersionMatches = Boolean(editContext && Date.parse(editContext.version_esperada) === Date.parse(expectedVersion));
  const editChanged = Boolean(editContext && evidenceDraftChanged(editContext, editPages));
  const currentPointsAccepted = Boolean(context?.fingerprint && context.version_objetivo_id && acceptedScoreFingerprint === context.fingerprint);
  const mutation = useMutation({
    onMutate: () => { mutationEpoch.current = openEpoch.current; },
    mutationFn: () => reprocessGrade(cal.id, { requestId, version: expectedVersion, confirmed, reason,
      ...(context?.estado === 'puntajes_actualizados' && currentPointsAccepted ? { useCurrentScores: true,
        targetScoreVersion: context.version_objetivo_id!, scoreContextFingerprint: context.fingerprint! } : {}),
      ...(mode === 'replace' ? { files: pages.map((page) => page.file),
        ...(usingScan ? { scan: scanSubmission(pages) } : { rotations: pages.map((page) => page.rotation) }) } : {}),
      ...(mode === 'edit' && editContext ? buildEvidenceEdit(editContext, editPages) : {}) }),
    onSuccess: (grade) => {
      if (!mounted.current || mutationEpoch.current !== openEpoch.current) return;
      openEpoch.current += 1;
      setMode(null); setPages([]); setReason(''); setError('');
      for (const key of [['calificacion-detalle', cal.id], ['calificaciones', cal.evaluacion_id], ['evaluation-review', cal.evaluacion_id], ['grading-revisions', cal.id], ['grade-breakdown-history', cal.id]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      onAccepted(grade);
      toast.success('Enviado a calificar. Lo anterior se conserva en el historial.');
    },
    onError: (cause) => {
      if (!mounted.current || mutationEpoch.current !== openEpoch.current) return;
      const failure = toApiError(cause);
      setError(failure.detail);
      if (failure.status === 409) {
        setAcceptedScoreFingerprint(null); setContextNeedsRefresh(true);
      }
    },
  });
  const open = (next: 'regrade' | 'replace' | 'edit') => {
    openEpoch.current += 1;
    setMode(next); setReason(''); setPages([]); setConfirmed(false); setError(''); setRequestId(crypto.randomUUID()); setExpectedVersion(cal.updated_at);
    setRefreshedGrade(null);
    setDraftPages(null);
    setEditSession(value => value + 1);
    setAcceptedScoreFingerprint(null); setContextNeedsRefresh(false); setRefreshingContext(false); setContextGeneration((value) => value + 1);
  };
  const close = () => {
    if (mutation.isPending) return;
    if (mode === 'edit' && editChanged) { setDiscardEdit(true); return; }
    openEpoch.current += 1; setMode(null);
  };
  const changeRequest = () => { setRequestId(crypto.randomUUID()); setError(''); };
  const refreshPoints = async () => {
    const epoch = openEpoch.current;
    const isCurrentOpening = () => mounted.current && openEpoch.current === epoch;
    setAcceptedScoreFingerprint(null); setRefreshingContext(true); changeRequest();
    try {
      const fresh = await queryClient.fetchQuery({ queryKey: ['grading-reprocessing-detail', actorId, cal.id],
        queryFn: () => getCalificacionDetalle(cal.id), staleTime: 0, gcTime: 0, retry: false });
      if (!isCurrentOpening()) return;
      if (fresh.id !== cal.id || !fresh.updated_at || !Number.isFinite(Date.parse(fresh.updated_at))) throw new Error('No pudimos comprobar la nota actual.');
      if (fresh.estado !== currentGrade.estado || fresh.revisado_por_docente !== currentGrade.revisado_por_docente
        || fresh.nota_confirmada !== currentGrade.nota_confirmada) setConfirmed(false);
      setRefreshedGrade(fresh);
      setExpectedVersion(fresh.updated_at);
      setContextGeneration((value) => value + 1);
      setContextNeedsRefresh(false);
    } catch {
      if (!isCurrentOpening()) return;
      setContextNeedsRefresh(true);
      setError('No pudimos comprobar la nota actual. Pulsa «Actualizar puntos» para volver a intentarlo.');
    } finally {
      if (isCurrentOpening()) setRefreshingContext(false);
    }
  };
  const contextReady = scoreContext.isSuccess && !scoreContext.isFetching && !contextNeedsRefresh && !refreshingContext
    && context && ['sin_cambios', 'contenido_modificado', 'puntajes_actualizados'].includes(context.estado)
    && (context.estado !== 'puntajes_actualizados' || currentPointsAccepted);
  const canSend = !disabled && !processing && !mutation.isPending && (!hasDecision || confirmed)
    && contextReady && (mode !== 'edit' || (editVersionMatches && editChanged && editPages.length > 0 && confirmed))
    && (mode !== 'replace' || (pages.length > 0 && !hasUnusableEvidence(pages) && (!usingScan || scanPagesReviewed(pages))));

  return <div className="min-w-0 space-y-3" aria-label="Corregir entrega y consultar historial">
    {evidenceView && cal.entrega_archivo_url && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <div><p className="text-sm font-bold text-fg">Gestionar hojas</p><p className="text-xs leading-5 text-muted">Añade, quita, ajusta u ordena las fotos.</p></div>
      <Button type="button" variant="outline" className="min-h-11" disabled={disabled || processing} onClick={() => open('edit')}><ScanLine className="h-4 w-4" aria-hidden="true" />Editar hojas</Button>
    </div>}
    <details className={evidenceView ? 'border-t border-border' : 'rounded-xl border border-border px-3'}>
      <summary className="focus-ring min-h-11 cursor-pointer py-3 text-sm font-semibold text-muted">Recalificar y cambiar evidencia</summary>
      <div className="space-y-3 pb-3">
    {cal.entrega_archivo_url && <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={disabled || processing} onClick={() => open('regrade')}><RotateCcw className="h-4 w-4" /> Volver a calificar</Button>
      <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={disabled || processing} onClick={() => open('replace')}><Camera className="h-4 w-4" /> Cambiar evidencia</Button>
    </div>}
    <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)} className="rounded-xl border border-border p-3">
      <summary className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Evidencias y resultados anteriores</summary>
      {history.isPending && historyOpen ? <p role="status" className="py-2 text-sm text-muted">Cargando historial…</p> : null}
      {history.isError && <div role="alert" className="py-2 text-sm"><p>No pudimos abrir el historial. Tus datos se conservan.</p><Button size="sm" variant="outline" onClick={() => void history.refetch()}>Volver a intentar</Button></div>}
      {history.data?.length === 0 && <p className="py-2 text-sm text-muted">Todavía no has vuelto a calificar ni cambiado la evidencia de esta entrega.</p>}
      {history.data?.length === 100 && <p className="py-2 text-sm text-muted">Se muestran los 100 cambios más recientes.</p>}
      {history.data?.map((item) => <article key={item.id} className="space-y-2 border-t border-border py-3 text-sm [overflow-wrap:anywhere]">
        <p className="font-semibold">{item.accion === 'cambiar_evidencia' ? 'Se cambió la evidencia' : 'Se volvió a calificar'}</p>
        <p className="text-muted">{new Date(item.created_at).toLocaleString('es-CO')} · {item.actor_nombre}</p>
        {item.nota_anterior != null && <p>Nota anterior: <strong>{Number(item.nota_anterior).toFixed(2)}</strong>{item.estado_anterior && previousStateLabels[item.estado_anterior] && <span className="text-muted"> · {previousStateLabels[item.estado_anterior]}</span>}</p>}
        {item.feedback_anterior && <details><summary className="focus-ring min-h-11 cursor-pointer py-3">Ver retroalimentación anterior</summary><p className="whitespace-pre-wrap leading-6">{item.feedback_anterior}</p></details>}
        {item.motivo && <p>Motivo: {item.motivo}</p>}
        {item.evidencia_url && <a href={item.evidencia_url} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center font-semibold text-brand-700 dark:text-brand-200">Abrir evidencia anterior</a>}
        {item.evidencia_url && (item.originales_paginas ?? 0) > 0 && <details>
          <summary className="focus-ring min-h-11 cursor-pointer py-3 font-semibold">Ver fotos originales anteriores</summary>
          <div className="flex flex-wrap gap-2">{Array.from({ length: Math.min(10, item.originales_paginas ?? 0) }, (_, index) => <a
            key={index} href={`${item.evidencia_url}/paginas/${index + 1}?version=original`} target="_blank" rel="noreferrer"
            className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-border px-3 font-semibold text-brand-700 dark:text-brand-200">Original · hoja {index + 1}</a>)}</div>
        </details>}
      </article>)}
    </details>
      </div>
    </details>
    <Modal open={mode !== null} onClose={close} title={mode === 'edit' ? 'Editar hojas' : mode === 'replace' ? 'Cambiar evidencia' : 'Volver a calificar'}
      className="max-w-3xl" closeOnBackdrop={!mutation.isPending} closeOnEscape={!mutation.isPending} showCloseButton={!mutation.isPending}
      mobileViewport={viewport.viewport} mobileWriting={viewport.isWriting}>
      <div ref={scope} className="min-w-0 space-y-4">
        <p className="font-semibold [overflow-wrap:anywhere]">{cal.estudiante_nombre} · {cal.evaluacion_nombre}</p>
        <p className="text-sm leading-6 text-muted">{mode === 'edit' ? 'Ajusta o añade fotos sin volver a subir las hojas que ya están guardadas.' : mode === 'replace' ? 'Selecciona todas las hojas de la entrega correcta. La evidencia anterior quedará en el historial.' : 'Usaremos la evidencia guardada. El resultado anterior quedará en el historial.'} La nueva nota necesitará tu revisión.</p>
        {processing && <p role="status" className="text-sm leading-6 text-muted">Esta entrega ya está calificándose. Espera a que termine antes de enviarla otra vez.</p>}
        {scoreContext.isFetching && <p role="status" className="text-sm leading-6 text-muted">Comprobando los puntos de la entrega…</p>}
        {scoreContext.isError && !error && <div role="alert" className="space-y-2 rounded-xl border border-border p-3 text-sm">
          <p>No pudimos comprobar los puntos de esta entrega.</p>
          <Button type="button" variant="outline" className="min-h-11" disabled={mutation.isPending || refreshingContext} onClick={() => void refreshPoints()}>Consultar puntos de nuevo</Button>
        </div>}
        {scoreContext.isSuccess && context && !scoreContext.isFetching && <section data-testid="regrading-context-ready" aria-label="Puntos para esta recalificación"
          className={`min-w-0 space-y-3 rounded-xl border p-3 text-sm leading-6 ${context.estado === 'puntajes_actualizados' ? 'border-brand-300 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-950/30' : 'border-border'}`}>
          {context.estado === 'puntajes_actualizados' && <h3 className="font-semibold">El reparto de puntos cambió</h3>}
          <p>{context.mensaje}</p>
          {context.estado === 'puntajes_actualizados' && <>
            <dl className="divide-y divide-border">{context.cambios.map((change) => <div key={change.numero} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <dt className="font-semibold [overflow-wrap:anywhere]">Pregunta {change.numero}</dt>
              <dd className="shrink-0 tabular-nums"><span className="sr-only">Antes: </span><del className="text-muted">{formatPoints(change.puntaje_anterior)}</del><span aria-hidden="true"> → </span><span className="sr-only">Ahora: </span><strong>{formatPoints(change.puntaje_actual)}</strong></dd>
            </div>)}</dl>
            <label className="flex min-h-11 items-start gap-3 py-1">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={currentPointsAccepted} disabled={mutation.isPending || contextNeedsRefresh}
                onChange={(event) => { setAcceptedScoreFingerprint(event.currentTarget.checked ? context.fingerprint : null); changeRequest(); }} />
              Usar los puntos actuales al volver a calificar.
            </label>
          </>}
          {context.estado === 'version_no_disponible' && <Button type="button" variant="outline" className="min-h-11" disabled={mutation.isPending || refreshingContext} onClick={() => void refreshPoints()}>Consultar puntos de nuevo</Button>}
        </section>}
        {mode === 'replace' && <MultiPageEvidencePicker pages={pages} contextKey={`${capability.scope}:${cal.id}:${mode}`} scanEnabled={scanEnabled} suggestCorners={capability.suggestCorners}
          maxImageBytes={capability.limits?.max_file_bytes} maxTotalBytes={capability.limits?.max_total_bytes}
          maxFiles={capability.limits?.max_pages}
          onChange={(next) => {
            if (!pages.length && next.length) setScanScope(capability.available ? capability.scope : null);
            if (evidenceIntentKey(next) !== evidenceIntentKey(pages)) changeRequest();
            setPages(next);
          }} disabled={mutation.isPending} onError={setError} />}
        {mode === 'replace' && usingScan && <div className="space-y-2 rounded-xl border border-border p-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={mutation.isPending} onClick={() => {
            setScanScope(null); setPages(withoutEvidenceScan(pages)); changeRequest();
          }}>Continuar sin escaneo</Button>
          <p className="text-sm leading-6 text-muted">Conserva estas fotos en la selección y usa el envío habitual. No se guardará la copia original adicional del escáner. Todavía debes pulsar «Enviar a calificar».</p>
        </div>}
        {mode === 'replace' && usingScan && !scanPagesReviewed(pages) && <p role="status" className="text-sm text-muted">Revisa cada hoja o elige usar su foto original antes de enviar.</p>}
        {mode === 'edit' && <>
          {editQuery.isPending && <p role="status" className="text-sm text-muted">Consultando las hojas guardadas…</p>}
          {editQuery.isError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{toApiError(editQuery.error).detail}</p>}
          {editContext && !editVersionMatches && <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">La entrega cambió. Cierra el editor y abre la versión actual antes de guardar.</p>}
          {editContext && <EvidenceEditDraft gradeId={cal.id} context={editContext} pages={editPages} disabled={mutation.isPending || !editVersionMatches}
            onChange={next => { setDraftPages(next); changeRequest(); }} />}
        </>}
        <details><summary className="focus-ring min-h-11 cursor-pointer py-3 text-sm font-semibold">Añadir motivo (opcional)</summary>
          <Field label="Motivo (opcional)"><Textarea value={reason} maxLength={1000} disabled={mutation.isPending} onChange={(event) => { setReason(event.currentTarget.value); changeRequest(); }} /></Field>
        </details>
        {(hasDecision || mode === 'edit') && <label className="flex min-h-11 items-start gap-3 rounded-xl border border-amber-300 p-3 text-sm leading-6">
          <input type="checkbox" checked={confirmed} disabled={mutation.isPending} className="mt-1 h-5 w-5 shrink-0" onChange={(event) => { setConfirmed(event.currentTarget.checked); changeRequest(); }} />
          {mode === 'edit' ? 'Confirmo guardar las hojas y volver a calificar. El original y el resultado anterior quedarán en el historial. Los enlaces compartidos se suspenden y la nueva nota no se publica automáticamente.' : 'Confirmo reabrir esta nota. Lo anterior se conserva y la nueva nota no se publicará automáticamente.'}
        </label>}
        {error && <p role="alert" className="text-sm leading-6 text-rose-700 dark:text-rose-300">{error} Conservamos tus archivos para que puedas volver a intentarlo.</p>}
        {contextNeedsRefresh && <Button type="button" variant="outline" className="min-h-11" disabled={mutation.isPending || scoreContext.isFetching || refreshingContext} onClick={() => void refreshPoints()}>Actualizar puntos</Button>}
        <div className="flex flex-wrap gap-2"><Button type="button" loading={mutation.isPending} disabled={!canSend} onClick={() => mutation.mutate()}>{mode === 'edit' ? 'Guardar y volver a calificar' : 'Enviar a calificar'}</Button>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancelar</Button></div>
      </div>
    </Modal>
    <ConfirmDialog open={discardEdit} onClose={() => setDiscardEdit(false)} title="¿Descartar los cambios en las hojas?"
      description="La evidencia guardada y la nota no cambiarán." confirmLabel="Descartar cambios" cancelLabel="Seguir editando"
      onConfirm={() => { openEpoch.current += 1; setDiscardEdit(false); setDraftPages(null); setMode(null); }} />
  </div>;
}

export function GradeReprocessing(props: Parameters<typeof GradeReprocessingContent>[0]) {
  const actorId = useAuth((state) => state.user?.id ?? '');
  return <GradeReprocessingContent key={`${actorId}:${props.cal.id}`} {...props} />;
}
