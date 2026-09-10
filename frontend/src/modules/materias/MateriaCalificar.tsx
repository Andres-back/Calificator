import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Card, ConfirmDialog, Field, Select } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceFiles, evidenceRotations, type EvidencePage } from '@/components/evidence/evidencePayload';
import { calificarFoto } from '@/modules/calificaciones/api';
import { addPendingGrading } from '@/modules/calificaciones/gradingJobs';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';

/** Carga contextual: las decisiones sobre la nota pertenecen al centro de revisión. */
export function GradingUploadPanel({ evaluationId, students, studentId, onStudentChange, onDirtyChange, onClose }: {
  evaluationId: string;
  students: { id: string; nombre: string }[];
  studentId: string;
  onStudentChange: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
}) {
  const [pages, setPages] = useState<EvidencePage[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [savedName, setSavedName] = useState('');
  const upload = useMutation({
    mutationFn: (request: { studentId: string; name: string; pages: EvidencePage[] }) => calificarFoto(
      evaluationId, request.studentId, evidenceFiles(request.pages), evidenceRotations(request.pages),
    ),
    onSuccess: (grade, request) => {
      setPages([]); setConfirming(false); setError(''); setSavedName(request.name);
      const jobId = grade.resultado_json?.job_id;
      if (typeof jobId === 'string') addPendingGrading({
        jobId, evaluacionId: grade.evaluacion_id, materiaId: grade.materia_id,
        estudianteId: grade.estudiante_id, estudianteNombre: request.name,
      });
      void queryClient.invalidateQueries({ queryKey: ['evaluation-review', evaluationId] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', evaluationId] });
      toast.success('Entrega guardada y en cola. Puedes añadir la de otro estudiante.');
    },
    onError: (failure) => { setConfirming(false); setError(toApiError(failure).detail); },
  });
  useEffect(() => {
    onDirtyChange(pages.length > 0 || upload.isPending);
    return () => onDirtyChange(false);
  }, [onDirtyChange, pages.length, upload.isPending]);
  const student = students.find((item) => item.id === studentId);
  return <Card className="mx-4 mb-4 space-y-4 p-4" aria-label="Añadir entrega a la evaluación">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Añadir entregas</h2><Button variant="ghost" onClick={onClose} disabled={upload.isPending}>Volver a revisión</Button></div>
    <p className="text-sm text-muted">Un paquete por estudiante: hasta 10 fotos ordenadas o un PDF de hasta 20 páginas.</p>
    <Field label="Estudiante de esta entrega"><Select value={studentId} disabled={upload.isPending} onChange={(event) => onStudentChange(event.target.value)}><option value="">Selecciona un estudiante</option>{students.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select></Field>
    {savedName && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">Entrega de {savedName} guardada. La calificación continúa en segundo plano; no se ha publicado una nota.</p>}
    <MultiPageEvidencePicker pages={pages} onChange={(next) => { setPages(next); setError(''); }} disabled={!student || upload.isPending} onError={setError} />
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error} Conservamos las hojas para que puedas corregir o reintentar.</p>}
    <Button disabled={!student || !pages.length || upload.isPending} loading={upload.isPending} onClick={() => setConfirming(true)}>Enviar a calificar</Button>
    <ConfirmDialog open={confirming} onClose={() => !upload.isPending && setConfirming(false)} loading={upload.isPending}
      title={pages[0]?.file.type === 'application/pdf' ? 'Confirmar documento completo' : `Vas a entregar ${pages.length} ${pages.length === 1 ? 'hoja' : 'hojas'}`}
      description={`La evidencia se asociará a ${student?.nombre ?? 'este estudiante'}. Revisa el orden y que no falte ninguna hoja.`}
      confirmLabel="Confirmar y enviar" onConfirm={() => student && upload.mutate({ studentId: student.id, name: student.nombre, pages: [...pages] })} />
  </Card>;
}
