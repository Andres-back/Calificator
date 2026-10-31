import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { buildReviewHref, resolveReviewContext } from '@/modules/calificaciones/reviewRoutes';
import { copyFeedbackAccesses, feedbackAvailable, listFeedbackAccesses } from './api';

const ShareFeedbackDialog = lazy(() => import('./ShareFeedbackDialog').then(module => ({ default: module.ShareFeedbackDialog })));

export function FeedbackToolsButton(props: { evaluationId: string; materiaId?: string; gradeId?: string; initialSelectedIds?: string[]; disabled?: boolean; suggestedArea?: string | null }) {
  const user = useAuth(state => state.user);
  return <FeedbackToolsContent key={[props.evaluationId, props.gradeId ?? 'group', user?.id, user?.rol, [...(user?.permissions ?? [])].sort().join(',')].join(':')} {...props} />;
}

function FeedbackToolsContent({ evaluationId, materiaId, gradeId, initialSelectedIds, disabled = false, suggestedArea }: { evaluationId: string; materiaId?: string; gradeId?: string; initialSelectedIds?: string[]; disabled?: boolean; suggestedArea?: string | null }) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const controller = useRef(new AbortController());
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState('');
  const [availability, setAvailability] = useState<{ owner: string | undefined; enabled: boolean } | null>(null);
  const [opened, setOpened] = useState<{ evaluationId: string; owner: string | undefined } | null>(null);
  const permitted = user?.id === owner && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read')) && (!gradeId || Boolean(user?.permissions?.includes('grading.publish')));
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort;
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController();
    void feedbackAvailable(controller.signal).then(enabled => {
      if (!controller.signal.aborted) setAvailability({ owner, enabled });
    }).catch(() => { if (!controller.signal.aborted) setAvailability({ owner, enabled: false }); });
    return () => controller.abort();
  }, [owner, permitted]);
  async function openOrCopy() {
    if (locked.current || disabled || !permitted) return;
    if (!gradeId) { setOpened({ evaluationId, owner }); return; }
    const signal = controller.current.signal;
    const current = () => !signal.aborted && useAuth.getState().user?.id === owner && Boolean(useAuth.getState().user?.permissions?.includes('grading.publish'));
    locked.current = true; setBusy(true); setMessage(''); setManual('');
    try {
      const accesses = await listFeedbackAccesses(evaluationId, signal, gradeId);
      if (!current()) return;
      const active = accesses.filter(item => item.calificacion_id === gradeId && item.estado === 'active');
      const access = active.find(item => item.copy_available) ?? active[0];
      if (!access) { setOpened({ evaluationId, owner }); return; }
      const results = await copyFeedbackAccesses(evaluationId, [access.id], signal);
      if (!current()) return;
      const result = results.length === 1 && results[0].id === access.id ? results[0] : undefined;
      if (!result?.url) { setMessage(result?.error ?? 'No pudimos recuperar el enlace. Abre las opciones para revisar su estado.'); return; }
      try { await navigator.clipboard.writeText(result.url); if (current()) setMessage('Enlace copiado. Entrégalo solo a este estudiante o su familia.'); }
      catch { if (current()) { setManual(result.url); setMessage('Selecciona el enlace y elige «Copiar».'); } }
    } catch { if (current()) setMessage('No pudimos recuperar el enlace. Inténtalo de nuevo; no se creó ni cambió ningún acceso.'); }
    finally { locked.current = false; if (current()) setBusy(false); }
  }
  if (!permitted || availability?.owner !== owner || !availability?.enabled || !evaluationId) return null;
  return <>
    <Button variant="outline" className="h-auto min-h-11 py-2" disabled={disabled || busy} onClick={() => void openOrCopy()}><MessageSquareText className="h-4 w-4" aria-hidden="true" /> {gradeId ? 'Copiar enlace' : 'Retroalimentación del grupo'}</Button>
    {gradeId && <Button variant="link" className="min-h-11" disabled={disabled || busy} onClick={() => setOpened({ evaluationId, owner })}>Opciones para compartir</Button>}
    {message && <p role="status" className="w-full text-sm">{message}</p>}
    {manual && <label className="w-full text-sm">Enlace para copiar<textarea aria-label="Enlace para copiar" className="mt-1 min-h-24 w-full rounded-lg border border-border bg-surface p-3 text-base" readOnly value={manual} onFocus={event => event.currentTarget.select()} /></label>}
    {opened?.owner === owner && opened?.evaluationId === evaluationId && createPortal(<Suspense fallback={<p role="status">Abriendo retroalimentaciones…</p>}><ShareFeedbackDialog evaluationId={evaluationId} initialGradeId={gradeId} initialSelectedIds={initialSelectedIds} suggestedArea={suggestedArea} onClose={() => setOpened(null)} onReview={gradeId => {
      setOpened(null);
      const params = new URLSearchParams(location.search);
      const context = resolveReviewContext(location.pathname, params);
      const sameEvaluation = context.evaluationId === evaluationId && !context.conflictingQuery;
      const reviewParams = sameEvaluation ? params : new URLSearchParams();
      reviewParams.delete('estudiante'); reviewParams.delete('pregunta'); reviewParams.delete('hoja');
      navigate(buildReviewHref({ evaluationId, materiaId: materiaId ?? (sameEvaluation ? context.materiaId : undefined),
        gradeId, params: reviewParams, permissions: useAuth.getState().user?.permissions }));
    }} /></Suspense>, document.body)}
  </>;
}
