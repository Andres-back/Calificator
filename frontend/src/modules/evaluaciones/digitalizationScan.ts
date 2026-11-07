import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EvidenceScanCapability } from '@/modules/calificaciones/api';
import type { EvidencePage } from '@/components/evidence/evidencePayload';
import { scanSubmission } from '@/components/evidence/scanSubmission';
import type { EvidenceScanRecipe } from '@/components/evidence/scanTypes';
import { useAuth } from '@/stores/auth';

/** Spec 157: the teacher-level scan switch, without evaluation or student. */
export async function getDigitalizationScanCapability(signal?: AbortSignal): Promise<EvidenceScanCapability> {
  const { data } = await api.get<EvidenceScanCapability>('/evaluaciones/externa/capacidad-escaneo', { signal });
  return data;
}

export function useDigitalizationScanCapability(enabled: boolean): boolean {
  const actorId = useAuth((state) => state.user?.id ?? '');
  const query = useQuery({
    queryKey: ['digitalization-scan-capability', actorId],
    queryFn: ({ signal }) => getDigitalizationScanCapability(signal),
    enabled, retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
  });
  // Absent/old/failed capability => today's digitalization, never a broken picker.
  return enabled && query.data?.schema_version === 1 && query.data.enabled === true
    && query.data.algorithm === 'opencv-4.13.0-scan2';
}

/** One closed recipe (or null for the original photo) per page, in order. */
export function digitalizationRecipes(pages: EvidencePage[]): (EvidenceScanRecipe | null)[] {
  return scanSubmission(pages).pages.map((page) => page.recipe ?? null);
}
