import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, ConfirmDialog, Field } from '@/components/ui';
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
  const [open, setOpen] = useState(false);
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
    setQuery('');
    onStudentChange('');
    setOpen(true);
  };

  return (
    <Field label="Estudiante de esta entrega">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
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
            className="absolute z-30 mt-2 max-h-[min(20rem,55dvh)] w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl"
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
              <p className="px-3 py-4 text-sm text-muted">No encontramos estudiantes con ese nombre.</p>
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
export function GradingUploadPanel({ evaluationId, students, studentId, onStudentChange, onDirtyChange }: {
  evaluationId: string;
  students: { id: string; nombre: string }[];
  studentId: string;
  onStudentChange: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
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
    <h2 className="text-lg font-bold">Añadir entregas</h2>
    <p className="text-sm text-muted">Un paquete por estudiante: hasta 10 fotos ordenadas o un PDF de hasta 20 páginas.</p>
    <StudentPicker students={students} studentId={studentId} disabled={upload.isPending} onStudentChange={onStudentChange} />
    {savedName && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">Entrega de {savedName} guardada. La calificación continúa en segundo plano; no se ha publicado una nota.</p>}
    <MultiPageEvidencePicker pages={pages} onChange={(next) => { setPages(next); setError(''); }} disabled={!student || upload.isPending} onError={setError} />
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error} Conservamos las hojas para que puedas corregir o reintentar.</p>}
    <Button disabled={!student || !pages.length || hasUnusableEvidence(pages) || upload.isPending} loading={upload.isPending} onClick={() => setConfirming(true)}>Enviar a calificar</Button>
    <ConfirmDialog open={confirming} onClose={() => !upload.isPending && setConfirming(false)} loading={upload.isPending}
      title={pages[0]?.file.type === 'application/pdf' ? 'Confirmar documento completo' : `Vas a entregar ${pages.length} ${pages.length === 1 ? 'hoja' : 'hojas'}`}
      description={`La evidencia se asociará a ${student?.nombre ?? 'este estudiante'}. Revisa el orden y que no falte ninguna hoja.`}
      confirmLabel="Confirmar y enviar" onConfirm={() => student && upload.mutate({ studentId: student.id, name: student.nombre, pages: [...pages] })} />
  </Card>;
}
