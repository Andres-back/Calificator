import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, LoaderCircle, Upload } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { cancelRosterImport, confirmRosterImport, createRosterImport, getRosterImport, listExistingStudents, listRosterImports, updateRosterImport, type RosterConfirmation, type RosterRow } from './rosterImportApi';
import { RosterReview } from './RosterReview';
import { RosterCredentials } from './RosterCredentials';

export function RosterImportDialog({ open, materiaId, onClose }: { open: boolean; materiaId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [result, setResult] = useState<RosterConfirmation | null>(null);
  const pendingBatches = useQuery({ queryKey: ['roster-imports', materiaId], queryFn: () => listRosterImports(materiaId), enabled: open && !batchId });
  const batch = useQuery({ queryKey: ['roster-import', materiaId, batchId], queryFn: () => getRosterImport(materiaId, batchId!), enabled: open && Boolean(batchId), refetchOnWindowFocus: false, refetchInterval: (query) => query.state.data?.estado === 'procesando' ? 1500 : false });
  const existing = useQuery({ queryKey: ['existing-students', materiaId], queryFn: () => listExistingStudents(materiaId), enabled: open });
  useEffect(() => { if (batch.data?.estado === 'revision') setRows(batch.data.filas); }, [batch.data?.estado, batch.data?.filas]);

  const upload = useMutation({ mutationFn: (file: File) => createRosterImport(materiaId, file), onSuccess: (created) => { setBatchId(created.id); setResult(null); }, onError: (error) => toast.error(toApiError(error).detail) });
  const cancel = useMutation({ mutationFn: () => cancelRosterImport(materiaId, batchId!), onSuccess: () => { setBatchId(null); setRows([]); void queryClient.invalidateQueries({ queryKey: ['roster-imports', materiaId] }); }, onError: (error) => toast.error(toApiError(error).detail) });
  const confirm = useMutation({ mutationFn: async () => { const saved = await updateRosterImport(materiaId, batchId!, rows); setRows(saved.filas); return confirmRosterImport(materiaId, batchId!); }, onSuccess: (value) => { setResult(value); void queryClient.invalidateQueries({ queryKey: ['materia', materiaId] }); toast.success('Estudiantes matriculados'); }, onError: (error) => toast.error(toApiError(error).detail) });
  const close = () => { setBatchId(null); setRows([]); setResult(null); void queryClient.invalidateQueries({ queryKey: ['roster-imports', materiaId] }); onClose(); };
  const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
  const unresolved = rows.some((row) => row.decision !== 'omitir' && (
    row.requiere_revision || !row.nombre_revisado.trim() ||
    (row.decision === 'asociar' && !row.estudiante_existente_id) ||
    (row.decision === 'crear' && !row.duplicado_confirmado && rows.filter((candidate) => candidate.decision === 'crear' && normalizeName(candidate.nombre_revisado) === normalizeName(row.nombre_revisado)).length > 1)
  ));

  return <Modal open={open} onClose={close} title="Importar estudiantes desde una foto" description="OpenCode extrae únicamente los nombres. Tú revisas y confirmas antes de crear accesos." className="max-w-3xl">
    {result ? <RosterCredentials result={result} /> : !batchId ? <div className="space-y-4">{Boolean(pendingBatches.data?.length) && <div className="space-y-2"><p className="text-sm font-bold">Listas recientes pendientes</p>{pendingBatches.data?.map((item) => <button type="button" key={item.id} className="focus-ring flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-left text-sm hover:border-brand-400" onClick={() => setBatchId(item.id)}><span className="truncate">{item.archivo_nombre}</span><span className="ml-3 font-semibold">{item.estado === 'revision' ? 'Revisar' : item.estado === 'error' ? 'Con error' : 'Procesando'}</span></button>)}</div>}<label className="focus-within:ring-2 focus-within:ring-brand-500 grid min-h-52 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-6 text-center dark:bg-brand-500/10">
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); }} />
      <span><Camera className="mx-auto h-10 w-10 text-brand-600" /><strong className="mt-3 block text-lg">Tomar foto o elegir imagen</strong><span className="mt-1 block text-sm text-muted">JPG, PNG o WEBP · máximo 20 MB</span>{upload.isPending && <span className="mt-4 inline-flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" /> Guardando foto…</span>}</span>
    </label></div> : batch.isLoading || batch.data?.estado === 'procesando' ? <div className="grid min-h-56 place-items-center text-center" role="status"><span><LoaderCircle className="mx-auto h-10 w-10 animate-spin text-brand-600" /><strong className="mt-3 block">Leyendo la lista en segundo plano</strong><span className="mt-1 block text-sm text-muted">Puedes cerrar y seguir navegando; la evidencia está protegida.</span><Button className="mx-auto mt-4" variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancelar lectura</Button></span></div> : batch.data?.estado === 'error' ? <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"><strong>No pudimos leer nombres con suficiente seguridad.</strong><p className="mt-1">Toma otra foto con buena luz y toda la lista visible.</p><Button className="mt-4" variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>Intentar con otra foto</Button></div> : <>
      <RosterReview rows={rows} existing={existing.data ?? []} onChange={setRows} />
      <div className="sticky bottom-0 mt-5 flex flex-col gap-2 border-t border-border bg-surface/95 pt-4 backdrop-blur sm:flex-row sm:justify-end"><Button variant="outline" onClick={close}>Cancelar</Button><Button loading={confirm.isPending} disabled={rows.length === 0 || unresolved} onClick={() => confirm.mutate()}><Upload className="h-4 w-4" /> Confirmar {rows.filter((row) => row.decision !== 'omitir').length} estudiantes</Button></div>
    </>}
  </Modal>;
}
