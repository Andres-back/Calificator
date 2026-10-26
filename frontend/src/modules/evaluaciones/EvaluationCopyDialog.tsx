import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { listMaterias } from '@/modules/materias/api';
import { useAuth } from '@/stores/auth';
import type { Evaluacion, Materia } from '@/types/api';
import { getEvaluationCopy, getLatestEvaluationCopy, requestEvaluationCopy, type RecoveryDocumentRequest, type EvaluationCopyRequest, type EvaluationCopyStatus } from './api';

const pending = (value?: EvaluationCopyStatus | null) => Boolean(value && ['queued', 'running', 'retrying'].includes(value.estado));

export function EvaluationCopyDialog({ evaluation, onClose, recoveryDocument }: { evaluation: Evaluacion; onClose: () => void; recoveryDocument?: RecoveryDocumentRequest }) {
  const actor = useAuth(state => state.user);
  const [owner] = useState(actor?.id);
  const permitted = actor?.id === owner && Boolean(actor?.permissions?.includes('evaluations.create')) && Boolean(actor?.permissions?.includes('evaluations.read'))
    && (actor?.rol === 'admin' || evaluation.profesor_id === actor?.id) && (!recoveryDocument || Boolean(actor?.permissions?.includes('evaluations.update')));
  const storageKey = `${recoveryDocument ? 'xc-document-copy' : 'xc-copy'}:${owner}:${evaluation.id}`;
  const [subjects, setSubjects] = useState<Materia[]>([]);
  const [target, setTarget] = useState(recoveryDocument ? evaluation.materia_id : '');
  const [name, setName] = useState(evaluation.nombre);
  const [request, setRequest] = useState<EvaluationCopyRequest | null>(null);
  const [operation, setOperation] = useState<EvaluationCopyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovered, setDiscovered] = useState(false);
  const [resetAllowed, setResetAllowed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const mounted = useRef(true);
  const locked = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const mobile = useMobileFormViewport(permitted, formRef);
  const actorValid = () => mounted.current && useAuth.getState().user?.id === owner
    && Boolean(useAuth.getState().user?.permissions?.includes('evaluations.create')) && Boolean(useAuth.getState().user?.permissions?.includes('evaluations.read'))
    && (!recoveryDocument || Boolean(useAuth.getState().user?.permissions?.includes('evaluations.update')));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    if (!permitted) return;
    setLoading(true); setDiscovered(false); setError('');
    void (async () => {
      try {
        const [choices, latest] = await Promise.all([listMaterias(), getLatestEvaluationCopy(evaluation.id, Boolean(recoveryDocument))]);
        if (!current || !mounted.current) return;
        setSubjects(choices.filter(item => item.estado === 'activa' && (recoveryDocument ? item.id === evaluation.materia_id : item.id !== evaluation.materia_id) && item.profesor_id === evaluation.profesor_id));
        let stored: EvaluationCopyRequest | null = null;
        try { stored = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null'); } catch { /* Browser storage can be unavailable. */ }
        if (stored && typeof stored.request_key === 'string' && typeof stored.materia_destino_id === 'string' && typeof stored.expected_updated_at === 'string') {
          setRequest(stored); setTarget(stored.materia_destino_id); setName(stored.nombre ?? evaluation.nombre);
          try {
            const value = await getEvaluationCopy(stored.request_key);
            if (current && mounted.current) setOperation(value);
          } catch (cause) {
            if (current && mounted.current) setError(toApiError(cause).status === 404 ? 'La solicitud anterior no tiene confirmación. Usa «Reintentar la misma copia» para comprobarla sin duplicarla.' : toApiError(cause).detail);
          }
        } else if (latest?.job_id && latest.solicitud) {
          setRequest(latest.solicitud); setOperation(latest); setTarget(latest.materia_destino_id); setName(latest.solicitud.nombre ?? evaluation.nombre);
        }
        if (current && mounted.current) setDiscovered(true);
      } catch (cause) { if (current && mounted.current) setError(toApiError(cause).detail); }
      finally { if (current && mounted.current) setLoading(false); }
    })();
    return () => { current = false; };
  }, [evaluation.id, evaluation.materia_id, evaluation.nombre, evaluation.profesor_id, permitted, recoveryDocument, reload, storageKey]);
  useEffect(() => {
    if (!operation || !pending(operation) || !permitted) return;
    let current = true;
    let reading = false;
    const timer = window.setInterval(() => {
      if (reading) return;
      reading = true;
      void getEvaluationCopy(operation.job_id).then(value => {
        if (!current || !mounted.current) return;
        setOperation(value); setError('');
        if (value.estado === 'success') void queryClient.invalidateQueries({ queryKey: ['evaluaciones'] });
      }).catch(cause => { if (current && mounted.current) setError('No pudimos consultar el progreso. La solicitud sigue guardada. ' + toApiError(cause).detail); })
        .finally(() => { reading = false; });
    }, 2000);
    return () => { current = false; window.clearInterval(timer); };
  }, [operation, permitted]);
  async function copy() {
    if (!actorValid() || locked.current || loading || !discovered || pending(operation)) return;
    const payload = request ?? { materia_destino_id: target, request_key: crypto.randomUUID(), expected_updated_at: evaluation.updated_at,
      expected_content_version_id: evaluation.contenido_version_id ?? null, nombre: name.trim(),
      ...(recoveryDocument ? { recuperacion_documental: recoveryDocument } : {}) };
    locked.current = true; setRequest(payload); setSending(true); setError(''); setResetAllowed(false);
    // Owner-scoped editorial data only; never student keys, marks or evidence.
    try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); } catch { /* Optional browser storage. */ }
    try {
      const result = await requestEvaluationCopy(evaluation.id, payload);
      if (actorValid()) setOperation(result);
    } catch (cause) {
      if (actorValid()) {
        setError(toApiError(cause).detail + ' La solicitud conserva su identidad para reintentar sin duplicados.');
        if ([400, 404, 409, 422].includes(toApiError(cause).status ?? 0)) {
          try { const found = await getEvaluationCopy(payload.request_key); if (actorValid()) setOperation(found); }
          catch (lookupError) { if (actorValid() && toApiError(lookupError).status === 404) setResetAllowed(true); }
        }
      }
    }
    finally { locked.current = false; if (mounted.current) setSending(false); }
  }
  const destination = subjects.find(item => item.id === target);
  if (!permitted) return null;
  return <Modal open className="bg-surface backdrop-blur-none" mobileViewport={mobile.viewport} mobileWriting={mobile.isWriting} title={recoveryDocument ? 'Recuperar documento en una copia' : 'Usar en otra materia'} description="Crea un borrador independiente con lectura, preguntas, figuras disponibles, criterios y formato. No copia estudiantes, notas ni evidencias respondidas y no vuelve a usar IA." onClose={() => { mounted.current = false; onClose(); }}>
    <div ref={formRef} data-mobile-scroll className="min-w-0 space-y-4">
      {mobile.isWriting && <Button className="min-h-11" variant="ghost" onClick={mobile.finishWriting}>Listo</Button>}
      {loading ? <p role="status">Buscando tus materias y solicitudes guardadas…</p> : <>
        {!request && <>
          {recoveryDocument ? <p className="text-sm">Se creará en la misma materia. El original no cambiará.</p> : <Field label="Materia destino"><Select className="min-h-11 text-base sm:text-sm" value={target} onChange={event => setTarget(event.target.value)}><option value="">Selecciona otra materia</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.nombre}{item.grado ? ` · ${item.grado}` : ''}</option>)}</Select></Field>}
          {!subjects.length && <p role="status" className="text-sm">No hay una materia activa disponible como destino de esta copia.</p>}
          <Field label="Nombre de la copia"><Input className="text-base sm:text-sm" value={name} onChange={event => setName(event.target.value)} maxLength={220} /></Field>
          {destination && <p className="text-sm text-muted">Revisa que las preguntas sean adecuadas para {destination.area ?? 'el área'} y {destination.grado ?? 'el grado elegido'}. No se adaptarán automáticamente.</p>}
        </>}
        {request && <p className="break-words text-sm">Solicitud guardada para {subjects.find(item => item.id === request.materia_destino_id)?.nombre ?? 'la materia seleccionada'}. Puedes cerrar esta ventana y volver a abrir «Usar en otra materia» para consultar el resultado.</p>}
        {pending(operation) && <p role="status" className="rounded-lg border border-border p-3">{operation?.estado === 'queued' ? 'Copia en cola.' : 'Preparando la copia y sus figuras…'} El original no cambiará.</p>}
        {operation?.estado === 'success' && <div className="space-y-3 rounded-lg border border-border p-3"><p role="status">Copia lista como borrador. Revísala antes de publicarla.</p><Link className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-border px-3 font-semibold" to={`/app/materias/${operation.materia_destino_id}/evaluaciones`} onClick={onClose}>Ver materia destino</Link>
          {!recoveryDocument && <Button variant="outline" className="min-h-11" onClick={() => { try { sessionStorage.removeItem(storageKey); } catch { /* Optional browser storage. */ } setRequest(null); setOperation(null); setError(''); setTarget(''); }}>Crear otra copia</Button>}</div>}
        {operation && !pending(operation) && operation.estado !== 'success' && <p role="alert" className="text-sm text-danger">{operation.error ?? 'La copia necesita revisión. El original sigue intacto.'}</p>}
        {error && <p role="alert" className="break-words text-sm text-danger">{error}</p>}
        {!pending(operation) && operation?.estado !== 'success' && <Button className="min-h-11 w-full" loading={sending} disabled={!discovered || sending || (!request && (!target || name.trim().length < 2))} onClick={() => void copy()}><Copy className="h-4 w-4" />{request ? 'Reintentar la misma copia' : 'Crear copia como borrador'}</Button>}
        {resetAllowed && <Button variant="outline" className="min-h-11" onClick={() => { try { sessionStorage.removeItem(storageKey); } catch { /* Optional browser storage. */ } void queryClient.invalidateQueries({ queryKey: ['evaluaciones'] }); onClose(); }}>Cerrar y actualizar evaluación</Button>}
        {(!discovered || (!subjects.length && !request)) && <Button variant="outline" className="min-h-11" onClick={() => setReload(value => value + 1)}>Actualizar materias</Button>}
      </>}
    </div>
  </Modal>;
}
