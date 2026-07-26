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
  return window.localStorage.getItem(tourStorageKey(identity)) === 'completed';
}

export function markTourCompleted(identity: TourIdentity) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(tourStorageKey(identity), 'completed');
}

export function resetTour(identity: TourIdentity) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(tourStorageKey(identity));
}