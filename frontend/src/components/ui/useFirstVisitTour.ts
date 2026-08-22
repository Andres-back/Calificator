import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasCompletedTour, markTourCompleted, type TourIdentity } from './tourState';

export interface FirstVisitTourOptions extends TourIdentity {
  enabled?: boolean;
  delayMs?: number;
}

/**
 * Opens a contextual tour once for each role, tour id and version.
 * The stored marker is written when the automatic tour is presented, so
 * dismissing it never traps the user in a tour that reappears on every visit.
 */
export function useFirstVisitTour({
  tourId,
  role,
  version,
  enabled = true,
  delayMs = 500,
}: FirstVisitTourOptions) {
  const [open, setOpen] = useState(false);
  const identity = useMemo(() => ({ tourId, role, version }), [role, tourId, version]);

  useEffect(() => {
    if (!enabled || hasCompletedTour(identity)) return;
    const timer = window.setTimeout(() => {
      markTourCompleted(identity);
      setOpen(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, enabled, identity]);

  const openTour = useCallback(() => setOpen(true), []);
  const closeTour = useCallback(() => setOpen(false), []);

  return { open, openTour, closeTour };
}
