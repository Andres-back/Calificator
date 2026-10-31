import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { buildReviewHref, resolveReviewContext } from '@/modules/calificaciones/reviewRoutes';
import { feedbackAvailable } from './api';

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
  const [availability, setAvailability] = useState<{ owner: string | undefined; enabled: boolean } | null>(null);
  const [opened, setOpened] = useState<{ evaluationId: string; owner: string | undefined } | null>(null);
  const permitted = user?.id === owner && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read')) && (!gradeId || Boolean(user?.permissions?.includes('grading.publish')));
  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController();
    void feedbackAvailable(controller.signal).then(enabled => {
      if (!controller.signal.aborted) setAvailability({ owner, enabled });
    }).catch(() => { if (!controller.signal.aborted) setAvailability({ owner, enabled: false }); });
    return () => controller.abort();
  }, [owner, permitted]);
  if (!permitted || availability?.owner !== owner || !availability?.enabled || !evaluationId) return null;
  return <>
    <Button variant="outline" className="h-auto min-h-11 py-2" disabled={disabled} onClick={() => setOpened({ evaluationId, owner })}><MessageSquareText className="h-4 w-4" aria-hidden="true" /> {gradeId ? 'Compartir retroalimentación' : 'Retroalimentación del grupo'}</Button>
    {opened?.owner === owner && opened?.evaluationId === evaluationId && createPortal(<Suspense fallback={<p role="status">Abriendo retroalimentaciones…</p>}><ShareFeedbackDialog evaluationId={evaluationId} initialGradeId={gradeId} initialSelectedIds={initialSelectedIds?.length ? initialSelectedIds : undefined} suggestedArea={suggestedArea} onClose={() => setOpened(null)} onReview={gradeId => {
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
