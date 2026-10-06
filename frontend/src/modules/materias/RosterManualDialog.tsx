import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Field, Modal, Textarea } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { createManualRoster, type RosterRow } from './rosterImportApi';
import { RosterImportDialog } from './RosterImportDialog';

export function RosterManualDialog({ materiaId, onClose }: { materiaId: string; onClose: () => void }) {
  const [names, setNames] = useState('');
  const [operationId] = useState(() => crypto.randomUUID());
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows: RosterRow[] = names.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((name, index) => ({ id: String(index), orden: index + 1, nombre_detectado: name, nombre_revisado: name, confianza: 1, requiere_revision: false, duplicado_confirmado: false, decision: 'crear', estudiante_existente_id: null, advertencias: [] }));
  const create = useMutation({ mutationFn: () => createManualRoster(materiaId, operationId, rows), onSuccess: (batch) => { setBatchId(batch.id); setError(null); }, onError: (failure) => setError(toApiError(failure).detail), gcTime: 0 });
  return <>
    <Modal open={!batchId} onClose={() => { if (!create.isPending) onClose(); }} title="Registrar estudiantes" description="Un nombre completo por línea. Revisarás la lista antes de crear las cuentas.">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!create.isPending) create.mutate(); }}>
        {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-200">{error}</p>}
        <Field label="Nombres de los estudiantes"><Textarea aria-label="Nombres de los estudiantes" value={names} onChange={(event) => setNames(event.target.value)} className="min-h-48 text-base" disabled={create.isPending} /></Field>
        <p role="status" className="text-sm text-muted">{rows.length} nombres · máximo 100</p>
        <Button type="submit" loading={create.isPending} disabled={!rows.length || rows.length > 100 || rows.some((row) => row.nombre_revisado.length < 2 || row.nombre_revisado.length > 160)}>Revisar lista</Button>
      </form>
    </Modal>
    {batchId && <RosterImportDialog open materiaId={materiaId} initialBatchId={batchId} onClose={onClose} />}
  </>;
}
