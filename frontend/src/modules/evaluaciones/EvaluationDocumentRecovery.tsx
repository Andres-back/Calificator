import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Select } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { Evaluacion, EvaluationDocumentStructure } from '@/types/api';
import { getDocumentRecovery, type DocumentRecovery } from './api';
import { EvaluationCopyDialog } from './EvaluationCopyDialog';
import { EvaluationDocumentOutline } from './components/EvaluationDocumentOutline';
import { evaluationToWizardState } from './components/generationWizardModel';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';

export function EvaluationDocumentRecovery({ evaluation, onClose }: { evaluation: Evaluacion; onClose: () => void }) {
  const actor = useAuth(state => state.user);
  const [owner] = useState(actor?.id);
  const permitted = actor?.id === owner && ['evaluations.read', 'evaluations.update', 'evaluations.create'].every(permission => actor?.permissions?.includes(permission))
    && (actor?.rol === 'admin' || actor?.id === evaluation.profesor_id);
  const [source, setSource] = useState<DocumentRecovery | null>(null);
  const [document, setDocument] = useState<EvaluationDocumentStructure | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sourceJob, setSourceJob] = useState('');
  const [copy, setCopy] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const mobile = useMobileFormViewport(permitted, form);
  useEffect(() => {
    if (!permitted) return;
    let current = true;
    setSource(null); setDocument(null); setError('');
    void getDocumentRecovery(evaluation.id, sourceJob || undefined).then(result => {
      if (!current) return;
      setSource(result);
      if (result.disponible) { setDocument(result.documento); setActive(String(result.preguntas[0]?.contenido_id ?? '') || null); }
    }).catch(cause => { if (current) setError(toApiError(cause).detail); });
    return () => { current = false; };
  }, [evaluation.id, permitted, sourceJob]);
  if (!permitted) return null;
  if (copy && source?.disponible && document?.revision?.confirmado) return <EvaluationCopyDialog
    evaluation={{ ...evaluation, nombre: `${evaluation.nombre} · Copia organizada`.slice(0, 220), updated_at: source.expected_updated_at,
      contenido_version_id: source.expected_content_version_id }} onClose={onClose}
    recoveryDocument={{ source_job_id: source.source_job_id, source_fingerprint: source.source_fingerprint, documento: document }} />;
  const questions = source?.disponible ? evaluationToWizardState({ ...evaluation, preguntas: source.preguntas, estructura_documento: source.documento }).questions : [];
  return <Modal open className="max-w-4xl bg-surface backdrop-blur-none" title="Recuperar secciones y lectura" onClose={onClose}
    mobileViewport={mobile.viewport} mobileWriting={mobile.isWriting}>
    <div ref={form} data-mobile-scroll className="min-w-0 space-y-4">
      <p className="text-sm leading-6">Compara la transcripción conservada con la propuesta. Solo crearemos una copia revisada: no cambiaremos el original, las respuestas correctas ni las notas anteriores.</p>
      {!source && !error && <p role="status">Consultando la fuente conservada…</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {source && <p className="text-sm leading-6">{source.mensaje}</p>}
      {source && !source.disponible && source.fuentes.length > 0 && <Select aria-label="Digitalización de origen" value={sourceJob} onChange={event => setSourceJob(event.target.value)}>
        <option value="">Selecciona la digitalización</option>{source.fuentes.map(item => <option key={item.id} value={item.id}>{new Date(item.fecha).toLocaleString()}</option>)}
      </Select>}
      {source?.disponible && document && <>
        {!source.original_disponible && <p role="status" className="rounded-xl border border-amber-300 p-3 text-sm leading-6">No conservamos el archivo original. Revisa las figuras con tu copia antes de publicar; no hemos recuperado imágenes inexistentes.</p>}
        <details open className="rounded-xl border border-border p-3"><summary className="focus-ring min-h-11 cursor-pointer py-2 font-semibold">Transcripción conservada</summary>
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-base leading-7">{source.texto}</p></details>
        <EvaluationDocumentOutline document={document} questions={questions} activeQuestionId={active} onSelectQuestion={setActive} onChange={setDocument} />
        <div className="sticky bottom-0 border-t border-border bg-surface py-3">
          <Button className="min-h-11 w-full sm:w-auto" disabled={!document.revision?.confirmado} onClick={() => setCopy(true)}>Continuar con la copia revisada</Button>
        </div>
      </>}
    </div>
  </Modal>;
}
