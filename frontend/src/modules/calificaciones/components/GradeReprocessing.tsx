import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, History, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Modal, Textarea } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceIntentKey, scanPagesReviewed, scanSubmission, withoutEvidenceScan } from '@/components/evidence/scanSubmission';
import { useEvidenceScanCapability } from '@/components/evidence/useEvidenceScanCapability';
import { hasUnusableEvidence, type EvidencePage } from '@/components/evidence/evidencePayload';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/stores/auth';
import type { Calificacion, CalificacionDetalle } from '@/types/api';
import { listGradingRevisions, reprocessGrade } from '../api';

const previousStateLabels: Record<string, string> = {
  sugerida: 'Sugerida por IA', requiere_revision: 'Pendiente de revisión',
  confirmada: 'Confirmada', ajustada: 'Ajustada por el docente', publicada: 'Publicada',
};

function GradeReprocessingContent({ cal, onAccepted, onDirtyChange, disabled = false }: {
  cal: CalificacionDetalle; onAccepted: (grade: Calificacion) => void; onDirtyChange?: (dirty: boolean) => void; disabled?: boolean;
}) {
  const [mode, setMode] = useState<'regrade' | 'replace' | null>(null);
  const [reason, setReason] = useState('');
  const [pages, setPages] = useState<EvidencePage[]>([]);
  const [scanScope, setScanScope] = useState<string | null>(null);
  const capability = useEvidenceScanCapability(cal.evaluacion_id, cal.estudiante_id, mode === 'replace');
  const scanEnabled = pages.length ? scanScope === capability.scope : capability.available;
  const usingScan = scanEnabled && pages.length > 0 && pages.every((page) => page.file.type.startsWith('image/'));
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [expectedVersion, setExpectedVersion] = useState(cal.updated_at);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  const viewport = useMobileFormViewport(Boolean(mode), scope);
  const hasDecision = cal.revisado_por_docente || cal.nota_confirmada != null || ['confirmada', 'ajustada', 'publicada'].includes(cal.estado);
  const processing = cal.estado === 'procesando';
  useEffect(() => { onDirtyChange?.(mode !== null); }, [mode, onDirtyChange]);
  const history = useQuery({ queryKey: ['grading-revisions', cal.id], queryFn: () => listGradingRevisions(cal.id), enabled: historyOpen });
  const mutation = useMutation({
    mutationFn: () => reprocessGrade(cal.id, { requestId, version: expectedVersion, confirmed, reason,
      ...(mode === 'replace' ? { files: pages.map((page) => page.file),
        ...(usingScan ? { scan: scanSubmission(pages) } : { rotations: pages.map((page) => page.rotation) }) } : {}) }),
    onSuccess: (grade) => {
      setMode(null); setPages([]); setReason(''); setError('');
      for (const key of [['calificacion-detalle', cal.id], ['calificaciones', cal.evaluacion_id], ['evaluation-review', cal.evaluacion_id], ['grading-revisions', cal.id], ['grade-breakdown-history', cal.id]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      onAccepted(grade);
      toast.success('Enviado a calificar. Lo anterior se conserva en el historial.');
    },
    onError: (cause) => setError(toApiError(cause).detail),
  });
  const open = (next: 'regrade' | 'replace') => {
    setMode(next); setReason(''); setPages([]); setConfirmed(false); setError(''); setRequestId(crypto.randomUUID()); setExpectedVersion(cal.updated_at);
  };
  const changeRequest = () => { setRequestId(crypto.randomUUID()); setError(''); };
  const canSend = !disabled && !processing && !mutation.isPending && (!hasDecision || confirmed)
    && (mode !== 'replace' || (pages.length > 0 && !hasUnusableEvidence(pages) && (!usingScan || scanPagesReviewed(pages))));

  return <div className="min-w-0 space-y-3" aria-label="Corregir entrega y consultar historial">
    <details className="rounded-xl border border-border px-3">
      <summary className="focus-ring min-h-11 cursor-pointer py-3 text-sm font-semibold">Recalificar y cambiar evidencia</summary>
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
    <Modal open={mode !== null} onClose={() => { if (!mutation.isPending) setMode(null); }} title={mode === 'replace' ? 'Cambiar evidencia' : 'Volver a calificar'}
      className="max-w-3xl" closeOnBackdrop={!mutation.isPending} closeOnEscape={!mutation.isPending} showCloseButton={!mutation.isPending}
      mobileViewport={viewport.viewport} mobileWriting={viewport.isWriting}>
      <div ref={scope} className="min-w-0 space-y-4">
        <p className="font-semibold [overflow-wrap:anywhere]">{cal.estudiante_nombre} · {cal.evaluacion_nombre}</p>
        <p className="text-sm leading-6 text-muted">{mode === 'replace' ? 'Selecciona todas las hojas de la entrega correcta. La evidencia anterior quedará en el historial.' : 'Usaremos la evidencia guardada. El resultado anterior quedará en el historial.'} La nueva nota necesitará tu revisión.</p>
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
        <details><summary className="focus-ring min-h-11 cursor-pointer py-3 text-sm font-semibold">Añadir motivo (opcional)</summary>
          <Field label="Motivo (opcional)"><Textarea value={reason} maxLength={1000} disabled={mutation.isPending} onChange={(event) => { setReason(event.currentTarget.value); changeRequest(); }} /></Field>
        </details>
        {hasDecision && <label className="flex min-h-11 items-start gap-3 rounded-xl border border-amber-300 p-3 text-sm leading-6">
          <input type="checkbox" checked={confirmed} disabled={mutation.isPending} className="mt-1 h-5 w-5 shrink-0" onChange={(event) => { setConfirmed(event.currentTarget.checked); changeRequest(); }} />
          Confirmo reabrir esta nota. Lo anterior se conserva y la nueva nota no se publicará automáticamente.
        </label>}
        {error && <p role="alert" className="text-sm leading-6 text-rose-700 dark:text-rose-300">{error} Conservamos tus archivos para que puedas volver a intentarlo.</p>}
        <div className="flex flex-wrap gap-2"><Button type="button" loading={mutation.isPending} disabled={!canSend} onClick={() => mutation.mutate()}>Enviar a calificar</Button>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setMode(null)}>Cancelar</Button></div>
      </div>
    </Modal>
  </div>;
}

export function GradeReprocessing(props: Parameters<typeof GradeReprocessingContent>[0]) {
  const actorId = useAuth((state) => state.user?.id ?? '');
  return <GradeReprocessingContent key={`${actorId}:${props.cal.id}`} {...props} />;
}
