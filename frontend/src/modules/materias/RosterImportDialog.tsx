import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, LoaderCircle, Paperclip, Upload } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { cancelRosterImport, confirmRosterImport, createRosterImport, getRosterImport, listExistingStudents, listRosterImports, updateRosterImport, type RosterConfirmation, type RosterRow } from './rosterImportApi';
import { RosterReview } from './RosterReview';
import { RosterCredentials } from './RosterCredentials';
import { rosterImportError } from './rosterImportErrors';

/** Spec 202: además de la cámara, la lista puede venir de la galería o de un archivo. */
const ROSTER_ACCEPT = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf', '.pdf', '.docx', '.xlsx', '.csv', '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain',
].join(',');

export function RosterImportDialog({ open, materiaId, onClose, initialBatchId }: { open: boolean; materiaId: string; onClose: () => void; initialBatchId?: string }) {
  const queryClient = useQueryClient();
  const [batchId, setBatchId] = useState<string | null>(initialBatchId ?? null);
  const active = useRef(open);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [result, setResult] = useState<RosterConfirmation | null>(null);
  const pendingBatches = useQuery({ queryKey: ['roster-imports', materiaId], queryFn: () => listRosterImports(materiaId), enabled: open && !batchId });
  const batch = useQuery({ queryKey: ['roster-import', materiaId, batchId], queryFn: () => getRosterImport(materiaId, batchId!), enabled: open && Boolean(batchId), refetchOnWindowFocus: false, refetchInterval: (query) => query.state.data?.estado === 'procesando' ? 1500 : false });
  const existing = useQuery({ queryKey: ['existing-students', materiaId], queryFn: () => listExistingStudents(materiaId), enabled: open });
  useEffect(() => { if (batch.data?.estado === 'revision') setRows(batch.data.filas); }, [batch.data?.estado, batch.data?.filas]);

  const upload = useMutation({ mutationFn: (file: File) => createRosterImport(materiaId, file), onSuccess: (created) => { setBatchId(created.id); setResult(null); }, onError: (error) => toast.error(toApiError(error).detail) });
  const cancel = useMutation({ mutationFn: () => cancelRosterImport(materiaId, batchId!), onSuccess: () => { setBatchId(null); setRows([]); void queryClient.invalidateQueries({ queryKey: ['roster-imports', materiaId] }); }, onError: (error) => toast.error(toApiError(error).detail) });
  const confirm = useMutation({ gcTime: 0, mutationFn: async () => {
    const current = await getRosterImport(materiaId, batchId!);
    if (current.estado === 'confirmado') return confirmRosterImport(materiaId, batchId!);
    const saved = await updateRosterImport(materiaId, batchId!, rows);
    setRows(saved.filas);
    try { return await confirmRosterImport(materiaId, batchId!); }
    catch (failure) {
      // A lost response after commit must not repeat PUT or recreate accounts.
      const recovered = await getRosterImport(materiaId, batchId!).catch(() => null);
      if (recovered?.estado === 'confirmado') return confirmRosterImport(materiaId, batchId!);
      throw failure;
    }
  }, onSuccess: (value) => { if (active.current) setResult(value); void queryClient.invalidateQueries({ queryKey: ['materia', materiaId] }); toast.success('Estudiantes matriculados'); }, onError: (error) => toast.error(toApiError(error).detail) });
  const close = () => { if (confirm.isPending) return; active.current = false; setBatchId(null); setRows([]); setResult(null); confirm.reset(); upload.reset(); cancel.reset(); void queryClient.invalidateQueries({ queryKey: ['roster-imports', materiaId] }); onClose(); };
  const resetConfirm = confirm.reset;
  const readingError = rosterImportError(batch.data?.resultado_json?.codigo);
  useEffect(() => { if (confirm.data) resetConfirm(); }, [confirm.data, resetConfirm]);
  useEffect(() => { active.current = open; if (!open) { setResult(null); setRows([]); setBatchId(initialBatchId ?? null); resetConfirm(); } return () => { active.current = false; }; }, [open, materiaId, initialBatchId, resetConfirm]);
  const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
  const unresolved = rows.some((row) => row.decision !== 'omitir' && (
    row.requiere_revision || !row.nombre_revisado.trim() ||
    (row.decision === 'asociar' && !row.estudiante_existente_id) ||
    (row.decision === 'crear' && !row.duplicado_confirmado && rows.filter((candidate) => candidate.decision === 'crear' && normalizeName(candidate.nombre_revisado) === normalizeName(row.nombre_revisado)).length > 1)
  ));

  return <Modal open={open} onClose={close} closeOnEscape={!confirm.isPending} closeOnBackdrop={!confirm.isPending} showCloseButton={!confirm.isPending} title={initialBatchId ? 'Revisar estudiantes' : 'Importar estudiantes desde una foto o un archivo'} description="Revisa los nombres antes de crear y matricular cuentas." className="max-w-3xl">
    {result ? <RosterCredentials result={result} subjectName={materiaId} /> : !batchId ? <div className="space-y-4">{Boolean(pendingBatches.data?.length) && <div className="space-y-2"><p className="text-sm font-bold">Listas recientes pendientes</p>{pendingBatches.data?.map((item) => <button type="button" key={item.id} className="focus-ring flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-left text-sm hover:border-brand-400" onClick={() => setBatchId(item.id)}><span className="truncate">{item.archivo_nombre}</span><span className="ml-3 font-semibold">{item.estado === 'revision' ? 'Revisar' : item.estado === 'error' ? 'Con error' : 'Procesando'}</span></button>)}</div>}<div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-5 text-center dark:bg-brand-500/10" data-roster-source>
      <Camera className="mx-auto h-10 w-10 text-brand-600" aria-hidden="true" />
      <strong className="mt-3 block text-lg">Trae la lista como te quede más fácil</strong>
      <span className="mt-1 block text-sm text-muted">Una foto de la lista, o un archivo de Excel, Word, PDF o CSV · máximo 20 MB</span>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className={`focus-within:ring-2 focus-within:ring-brand-500 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white transition hover:bg-brand-800 ${upload.isPending ? 'pointer-events-none opacity-60' : ''}`}>
          <Camera className="h-5 w-5" aria-hidden="true" /> Tomar foto
          <input type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Tomar una foto de la lista" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file); }} />
        </label>
        <label className={`focus-within:ring-2 focus-within:ring-brand-500 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 font-semibold transition hover:bg-surface-2 ${upload.isPending ? 'pointer-events-none opacity-60' : ''}`}>
          <Paperclip className="h-5 w-5" aria-hidden="true" /> Elegir foto o archivo
          <input type="file" accept={ROSTER_ACCEPT} className="sr-only" aria-label="Elegir una foto o un archivo con la lista" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file); }} />
        </label>
      </div>
      {upload.isPending && <span className="mt-4 inline-flex items-center gap-2 text-sm" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Subiendo la lista…</span>}
    </div></div> : batch.isLoading || batch.data?.estado === 'procesando' ? <div className="grid min-h-56 place-items-center text-center" role="status"><span><LoaderCircle className="mx-auto h-10 w-10 animate-spin text-brand-600" /><strong className="mt-3 block">Leyendo la lista en segundo plano</strong><span className="mt-1 block text-sm text-muted">Puedes cerrar y seguir navegando; la evidencia está protegida.</span><Button className="mx-auto mt-4" variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancelar lectura</Button></span></div> : batch.data?.estado === 'error' ? <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"><strong>{readingError.title}</strong><p className="mt-1">{readingError.detail}</p><Button className="mt-4" variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>Intentar con otra foto</Button></div> : <>
      {batch.isError ? <div role="alert" className="space-y-3"><p>No pudimos consultar el estado de la lista.</p><Button variant="outline" onClick={() => void batch.refetch()}>Reintentar</Button></div> : batch.data?.estado === 'confirmado' ? <div className="space-y-3"><p>Esta lista ya se registró. Consultar el resultado no crea cuentas ni renueva claves.</p><Button loading={confirm.isPending} onClick={() => confirm.mutate()}>Ver resultado</Button></div> : batch.data?.estado === 'cancelado' ? <p role="status">Esta lista fue cancelada. Cierra y registra una nueva lista.</p> : <>
      <fieldset disabled={confirm.isPending}><RosterReview rows={rows} existing={existing.data ?? []} onChange={setRows} /></fieldset>
      <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button variant="outline" disabled={confirm.isPending} onClick={close}>Cancelar</Button><Button loading={confirm.isPending} disabled={rows.length === 0 || unresolved} onClick={() => confirm.mutate()}><Upload className="h-4 w-4" /> Confirmar {rows.filter((row) => row.decision !== 'omitir').length} estudiantes</Button></div>
      </>}
    </>}
  </Modal>;
}
