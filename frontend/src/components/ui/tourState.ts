export interface TourIdentity {
  tourId: string;
  role: string;
  version: number;
}

export function tourStorageKey({ tourId, role, version }: TourIdentity) {
  return `xcalificator:tour:${role}:${tourId}:v${version}`;
}

export function hasCompletedTour(identity: TourIdentity) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(tourStorageKey(identity)) === 'completed';
  } catch {
    return false;
  }
}

export function markTourCompleted(identity: TourIdentity) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(tourStorageKey(identity), 'completed');
  } catch {
    // The guide remains usable when storage is disabled or private.
  }
}

export function resetTour(identity: TourIdentity) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(tourStorageKey(identity));
  } catch {
    // Nothing to reset when storage is unavailable.
  }
}
