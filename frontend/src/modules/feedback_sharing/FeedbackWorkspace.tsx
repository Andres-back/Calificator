import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { feedbackAvailable } from './api';
import { useAuth } from '@/stores/auth';

const Workspace = lazy(() => import('./ShareFeedbackDialog').then(module => ({ default: module.ShareFeedbackDialog })));

export function FeedbackWorkspace({ evaluationId, gradeId, suggestedArea, onDirtyChange, onReview, fallback, onFinishEditing, onActiveChange }: {
  evaluationId: string; gradeId: string; suggestedArea?: string | null;
  onDirtyChange: (dirty: boolean) => void; onReview: () => void; fallback: ReactNode;
  onFinishEditing?: () => void;
  onActiveChange?: (active: boolean) => void;
}) {
  const user = useAuth(state => state.user);
  const permitted = ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.read'));
  const actor = [user?.id, user?.rol, [...(user?.permissions ?? [])].sort().join(',')].join(':');
  const [availability, setAvailability] = useState<{ actor: string; enabled: boolean | null } | null>(null);
  const [retry, setRetry] = useState(0);
  const active = permitted && availability?.actor === actor && availability.enabled === true;
  useEffect(() => {
    onActiveChange?.(active);
    return () => onActiveChange?.(false);
  }, [active, onActiveChange]);
  useEffect(() => {
    if (!permitted) return;
    const abort = new AbortController();
    void feedbackAvailable(abort.signal).then(enabled => { if (!abort.signal.aborted) setAvailability({ actor, enabled }); })
      .catch(() => { if (!abort.signal.aborted) setAvailability({ actor, enabled: null }); });
    return () => abort.abort();
  }, [actor, retry, permitted]);
  if (!permitted) return null;
  if (availability?.actor !== actor) return <p role="status">Abriendo retroalimentación…</p>;
  if (availability.enabled === null) return <div role="alert" className="space-y-3"><p>No pudimos abrir la retroalimentación. Tu nota no ha cambiado.</p><button type="button" className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold" onClick={() => { setAvailability(null); setRetry(value => value + 1); }}>Volver a intentar</button></div>;
  if (!availability.enabled) return <>{fallback}</>;
  return <Suspense fallback={<p role="status">Abriendo retroalimentación…</p>}><Workspace embedded evaluationId={evaluationId} initialGradeId={gradeId} suggestedArea={suggestedArea} onDirtyChange={onDirtyChange} onFinishEditing={onFinishEditing} onClose={() => {}} onReview={onReview} /></Suspense>;
}
