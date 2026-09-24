export function excludeSubmittedStudents<T extends { id: string }>(
  students: T[],
  submittedStudentIds: Iterable<string>,
) {
  const submitted = new Set(submittedStudentIds);
  return students.filter((student) => !submitted.has(student.id));
}
