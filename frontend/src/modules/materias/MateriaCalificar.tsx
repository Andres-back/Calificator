import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Field } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceFiles, evidenceRotations, hasUnusableEvidence, type EvidencePage } from '@/components/evidence/evidencePayload';
import { calificarFoto } from '@/modules/calificaciones/api';
import { addPendingGrading } from '@/modules/calificaciones/gradingJobs';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';

function normalizeStudentSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

function StudentPicker({ students, studentId, disabled, onStudentChange }: {
  students: { id: string; nombre: string }[];
  studentId: string;
  disabled: boolean;
  onStudentChange: (id: string) => void;
}) {
  const selected = students.find((item) => item.id === studentId);
  const [query, setQuery] = useState(selected?.nombre ?? '');
  const [open, setOpen] = useState(!selected);
  useEffect(() => {
    setQuery(selected?.nombre ?? '');
  }, [selected?.nombre]);
  const matches = useMemo(() => {
    const needle = normalizeStudentSearch(query);
    return students
      .filter((item) => !needle || normalizeStudentSearch(item.nombre).includes(needle))
      .slice(0, 12);
  }, [query, students]);

  const clear = () => {
    if (selected) { onStudentChange(''); return; }
    setQuery('');
    onStudentChange('');
    setOpen(true);
  };

  return (
    <Field label="Estudiante de esta entrega">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-6 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          role="combobox"
          aria-label="Buscar estudiante para esta entrega"
          aria-autocomplete="list"
          aria-controls="grading-student-options"
          aria-expanded={open}
          autoComplete="off"
          disabled={disabled}
          readOnly={Boolean(selected)}
          value={query}
          placeholder="Escribe el nombre del estudiante…"
          onFocus={() => { if (!selected) setOpen(true); }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (studentId) onStudentChange('');
            setOpen(true);
          }}
          className="focus-ring h-12 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-12 text-base disabled:cursor-not-allowed disabled:opacity-60"
        />
        {(query || studentId) && !disabled && (
          <button
            type="button"
            aria-label="Limpiar estudiante"
            onClick={clear}
            className="focus-ring absolute right-0 top-0 z-10 grid h-12 w-12 place-items-center rounded-xl text-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {open && !disabled && (
          <div
            id="grading-student-options"
            role="listbox"
            aria-label="Estudiantes encontrados"
            className="mt-2 max-h-[min(20rem,55dvh)] w-full overflow-y-auto rounded-xl border border-border bg-surface p-1"
          >
            {matches.length ? matches.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === studentId}
                onClick={() => {
                  setQuery(item.nombre);
                  onStudentChange(item.id);
                  setOpen(false);
                }}
                className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="min-w-0 break-words font-medium">{item.nombre}</span>
                {item.id === studentId && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
              </button>
            )) : (
              <p className="px-3 py-4 text-sm text-muted">{students.length ? 'No encontramos estudiantes con ese nombre.' : 'No quedan estudiantes pendientes de entrega. Consulta sus notas y entregas para revisar o reemplazar evidencia.'}</p>
            )}
            {!query && students.length > matches.length && (
              <p className="border-t border-border px-3 py-2 text-xs text-muted">Escribe parte del nombre para ver el resto de la lista.</p>
            )}
          </div>
        )}
      </div>
      {selected && (
        <p role="status" className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4" /> Seleccionado: {selected.nombre}
        </p>
      )}
    </Field>
  );
}

/** Carga contextual: las decisiones sobre la nota pertenecen al centro de revisión. */
export function GradingUploadPanel({ evaluationId, evaluationName, materiaName, eligibilityVerified, students, studentId, onStudentChange, onDirtyChange, onUploadAccepted }: {
  evaluationId: string;
  evaluationName: string;
  materiaName: string;
  eligibilityVerified: boolean;
  students: { id: string; nombre: string }[];
  studentId: string;
  onStudentChange: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onUploadAccepted: (studentId: string, name: string) => void;
}) {
  const [pages, setPages] = useState<EvidencePage[]>([]);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const upload = useMutation({
    mutationFn: (request: { evaluationId: string; studentId: string; name: string; pages: EvidencePage[] }) => calificarFoto(
      request.evaluationId, request.studentId, evidenceFiles(request.pages), evidenceRotations(request.pages),
    ),
    onSuccess: (grade, request) => {
      if (mounted.current) {
        setPages([]); setError('');
        // El blocker consulta la ref antes del siguiente render al cambiar la URL.
        onDirtyChange(false);
        onUploadAccepted(request.studentId, request.name);
        onStudentChange('');
      }
      const jobId = grade.resultado_json?.job_id;
      if (typeof jobId === 'string') addPendingGrading({
        jobId, evaluacionId: grade.evaluacion_id, materiaId: grade.materia_id,
        estudianteId: grade.estudiante_id, estudianteNombre: request.name,
      });
      void queryClient.invalidateQueries({ queryKey: ['evaluation-review', request.evaluationId] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', request.evaluationId] });
      toast.success('Entrega guardada y en cola. Puedes añadir la de otro estudiante.');
    },
    onError: (failure) => { if (mounted.current) setError(toApiError(failure).detail); },
    onSettled: () => { sending.current = false; },
  });
  useEffect(() => {
    onDirtyChange(pages.length > 0 || upload.isPending);
    return () => onDirtyChange(false);
  }, [onDirtyChange, pages.length, upload.isPending]);
  const student = students.find((item) => item.id === studentId);
  const qualityPending = pages.some((page) => page.file.type.startsWith('image/') && page.quality === undefined);
  const canSend = eligibilityVerified && Boolean(student) && pages.length > 0 && !qualityPending && !hasUnusableEvidence(pages) && !upload.isPending;
  const submit = () => {
    if (sending.current || !canSend || !student) return;
    sending.current = true;
    setError('');
    upload.mutate({ evaluationId, studentId: student.id, name: student.nombre, pages: pages.map((page) => ({ ...page })) });
  };
  return <Card className="mx-4 mb-4 space-y-4 p-4" aria-label="Añadir entrega a la evaluación">
    <h2 className="text-lg font-bold">Añadir entregas</h2>
    <p className="break-words font-semibold">{evaluationName} · {materiaName}</p>
    <p className="text-sm text-muted">Un paquete por estudiante: hasta 10 fotos ordenadas o un PDF de hasta 20 páginas.</p>
    <StudentPicker students={students} studentId={studentId} disabled={upload.isPending || !eligibilityVerified} onStudentChange={onStudentChange} />
    {studentId && !student && <p role="status" className="text-sm text-muted">Este estudiante no está disponible para otra entrega. Revisa su nota o elige uno pendiente.</p>}
    <MultiPageEvidencePicker pages={pages} onChange={(next) => { setPages(next); setError(''); }} disabled={!student || upload.isPending} onError={setError} />
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error} Conservamos las hojas para que puedas corregir o reintentar.</p>}
    {qualityPending && <p role="status" className="text-sm text-muted">Comprobando la calidad de las fotos…</p>}
    {pages.length > 0 && <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
      <p className="break-words font-semibold">Para: {student?.nombre ?? 'Selecciona un estudiante pendiente'}</p>
      <p className="mt-1 break-words">Evaluación: {evaluationName}</p>
      <p className="mt-1 break-words text-muted">{pages[0].file.type === 'application/pdf' ? `1 PDF · ${pages[0].file.name}` : `${pages.length} ${pages.length === 1 ? 'foto' : 'fotos'} en el orden mostrado`}. Revisa que la evidencia esté completa antes de enviar.</p>
    </div>}
    <Button className="min-h-11 w-full sm:w-auto" disabled={!canSend} loading={upload.isPending} onClick={submit}>Enviar a calificar</Button>
  </Card>;
}
