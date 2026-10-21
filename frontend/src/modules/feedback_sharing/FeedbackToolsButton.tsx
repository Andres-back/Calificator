import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { routes } from '@/config/routes';
import { feedbackAvailable } from './api';

const ShareFeedbackDialog = lazy(() => import('./ShareFeedbackDialog').then(module => ({ default: module.ShareFeedbackDialog })));

export function FeedbackToolsButton({ evaluationId, disabled = false }: { evaluationId: string; disabled?: boolean }) {
  const user = useAuth(state => state.user);
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<{ owner: typeof user; enabled: boolean } | null>(null);
  const [opened, setOpened] = useState<{ evaluationId: string; owner: typeof user } | null>(null);
  const permitted = ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read'));
  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController();
    void feedbackAvailable(controller.signal).then(enabled => {
      if (!controller.signal.aborted) setAvailability({ owner: user, enabled });
    }).catch(() => { if (!controller.signal.aborted) setAvailability({ owner: user, enabled: false }); });
    return () => controller.abort();
  }, [user, permitted]);
  if (!permitted || availability?.owner !== user || !availability.enabled || !evaluationId) return null;
  return <>
    <Button variant="outline" className="h-auto min-h-11 py-2" disabled={disabled} onClick={() => setOpened({ evaluationId, owner: user })}><MessageSquareText className="h-4 w-4" aria-hidden="true" /> Retroalimentaciones</Button>
    {opened?.owner === user && opened.evaluationId === evaluationId && createPortal(<Suspense fallback={<p role="status">Abriendo retroalimentaciones…</p>}><ShareFeedbackDialog evaluationId={evaluationId} onClose={() => setOpened(null)} onReview={gradeId => {
      setOpened(null);
      const params = new URLSearchParams({ evaluacion: evaluationId, calificacion: gradeId });
      navigate(`${routes.calificacionesWorkspace}?${params}`);
    }} /></Suspense>, document.body)}
  </>;
}
