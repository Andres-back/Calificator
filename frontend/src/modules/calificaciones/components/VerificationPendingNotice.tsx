export function VerificationPendingNotice({ status }: { status: unknown }) {
  if (status !== 'pending') return null;
  return <p role="status" className="max-w-32 text-right text-xs font-medium text-amber-800 [overflow-wrap:anywhere] dark:text-amber-200">
    Segunda revisión pendiente
    <span className="sr-only">. Conservamos la nota propuesta y la evidencia; revísalas antes de confirmar.</span>
  </p>;
}
