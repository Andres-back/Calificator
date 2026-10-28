import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/stores/auth';
import { getEvidenceScanCapability } from '@/modules/calificaciones/api';
import { createCornerAssistant } from './cornerAssistance';

export function useEvidenceScanCapability(evaluationId: string, studentId: string, enabled = true) {
  const actorId = useAuth((state) => state.user?.id ?? '');
  const suggestCorners = useMemo(() => createCornerAssistant(evaluationId, studentId, undefined, actorId), [actorId, evaluationId, studentId]);
  const role = useAuth((state) => state.user?.rol);
  const authorized = enabled && Boolean(actorId && evaluationId && studentId) && (role === 'profesor' || role === 'admin');
  const query = useQuery({
    queryKey: ['evidence-scan-capability', actorId, evaluationId, studentId],
    queryFn: ({ signal }) => getEvidenceScanCapability(evaluationId, studentId, signal),
    enabled: authorized,
    retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
  });
  // Absent/old/failed capability => existing flow, never a broken upload screen.
  const available = authorized && query.data?.schema_version === 1 && query.data.enabled === true
    && query.data.algorithm === 'opencv-4.13.0-scan2';
  return { available, limits: available ? query.data : undefined, scope: `${actorId}:${evaluationId}:${studentId}`,
    suggestCorners: available && query.data?.corner_assistance_enabled === true ? suggestCorners : undefined };
}
