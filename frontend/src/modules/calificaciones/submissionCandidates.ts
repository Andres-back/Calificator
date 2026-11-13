export function summarizeCaptureRegistration(students: { id: string }[], registeredIds: Iterable<string>) {
  const group = new Set(students.map(student => student.id));
  const registered = new Set([...registeredIds].filter(id => group.has(id)));
  return { total: group.size, registered: registered.size };
}

/** Waits for one fresh roster check; later background refetches keep it (Spec 184). */
export function uploadEligibilityVerified(query: { isSuccess: boolean; isFetching: boolean; isFetchedAfterMount: boolean }) {
  return query.isSuccess && (query.isFetchedAfterMount || !query.isFetching);
}

export function excludeSubmittedStudents<T extends { id: string }>(
  students: T[],
  submittedStudentIds: Iterable<string>,
) {
  const submitted = new Set(submittedStudentIds);
  return students.filter((student) => !submitted.has(student.id));
}
