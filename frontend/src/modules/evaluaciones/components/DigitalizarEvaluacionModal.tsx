import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Upload } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceRotations, hasUnusableEvidence, type EvidencePage } from '@/components/evidence/evidencePayload';
import { api, toApiError } from '@/lib/api';
import { addPendingDigitalization } from '@/modules/evaluaciones/digitalizationJobs';
import { DocumentProcessingAnimation } from './DocumentProcessingAnimation';

interface DigitalizationQueued { job_id: string; estado: 'queued' | 'retrying'; materia_id: string; nombre: string }
interface Props { open: boolean; onClose: () => void; materiaId: string; onCompleted: () => void }
const MAX_BYTES = 20 * 1024 * 1024;
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function DigitalizarEvaluacionModal({ open, onClose, materiaId, onCompleted }: Props) {
  const [pages, setPages] = useState<EvidencePage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'photos' | 'document'>('photos');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [notaMaxima, setNotaMaxima] = useState('5');
  const [modalidad, setModalidad] = useState<'fisica' | 'online' | 'mixta'>('fisica');
  const [queued, setQueued] = useState<DigitalizationQueued | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scope = useRef(0);
  const mounted = useRef(true);
  const submitLock = useRef(false);

  const digitalizar = useMutation({
    mutationFn: async ({ form, context }: { form: FormData; context: number }) => {
      const { data } = await api.post<DigitalizationQueued>('/evaluaciones/externa/digitalizar-con-archivo', form);
      return { data, context };
    },
    onSuccess: ({ data, context }) => {
      // An accepted job still belongs in the tracker, even after closing/changing subject.
      addPendingDigitalization({ jobId: data.job_id, materiaId: data.materia_id, nombre: data.nombre });
      if (!mounted.current || context !== scope.current) return;
      setQueued(data);
      toast.success('Documento recibido. Puedes seguir trabajando mientras lo digitalizamos.');
    },
    onError: (error, request) => {
      if (mounted.current && request.context === scope.current) toast.error(toApiError(error).detail);
    },
    onSettled: (_result, _error, request) => {
      if (request.context === scope.current) submitLock.current = false;
    },
  });
  const resetMutation = digitalizar.reset;
  useEffect(() => {
    scope.current += 1;
    submitLock.current = false;
    setPages([]); setFile(null); setQueued(null); setMode('photos');
    setNombre(''); setDescripcion(''); setNotaMaxima('5'); setModalidad('fisica');
    resetMutation();
  }, [open, materiaId, resetMutation]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; scope.current += 1; };
  }, []);

  const titleFromFile = (selected: File) => {
    if (!nombre.trim()) setNombre(selected.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220));
  };
  const selectDocument = (selected: File) => {
    if (![DOCX, 'application/pdf'].includes(selected.type) && !/\.(pdf|docx)$/i.test(selected.name)) {
      toast.error('Selecciona un PDF o Word. Para fotografías usa la opción Fotos.'); return;
    }
    if (selected.size > MAX_BYTES) { toast.error('El archivo no debe superar 20 MB.'); return; }
    setFile(selected); titleFromFile(selected);
  };
  const close = () => {
    scope.current += 1;
    if (queued) onCompleted();
    setQueued(null);
    onClose();
  };
  const submit = () => {
    const files = mode === 'photos' ? pages.map(page => page.file) : file ? [file] : [];
    if (!files.length || digitalizar.isPending || submitLock.current) return;
    submitLock.current = true;
    const form = new FormData();
    form.append('materia_id', materiaId); form.append('nombre', nombre.trim());
    form.append('nota_maxima', notaMaxima); form.append('modalidad', modalidad);
    if (descripcion.trim()) form.append('descripcion', descripcion.trim());
    files.forEach(selected => form.append('file', selected));
    if (mode === 'photos') form.append('rotaciones', JSON.stringify(evidenceRotations(pages)));
    digitalizar.mutate({ form, context: scope.current });
  };
  const canSubmit = nombre.trim().length >= 2 && Number(notaMaxima) > 0
    && (mode === 'document' ? Boolean(file) : pages.length > 0 && !hasUnusableEvidence(pages));

  return <Modal open={open} onClose={close} title="Digitalizar evaluación" className="max-w-3xl">
    {!queued ? <div className="min-w-0 space-y-5">
      <p className="text-sm leading-6 text-muted">Añade todas las hojas, incluida la lectura. Recibirás un borrador para revisar antes de publicar.</p>
      <Field label="Nombre de la evaluación" required>
        <Input value={nombre} onChange={event => setNombre(event.target.value)} minLength={2} maxLength={220}
          placeholder="Ej. Sociales · Hidrografía" disabled={digitalizar.isPending} />
      </Field>
      <div className="flex gap-2" role="group" aria-label="Cómo subir la evaluación">
        <Button variant={mode === 'photos' ? 'primary' : 'outline'} disabled={digitalizar.isPending} aria-pressed={mode === 'photos'} onClick={() => setMode('photos')}>Fotos</Button>
        <Button variant={mode === 'document' ? 'primary' : 'outline'} disabled={digitalizar.isPending} aria-pressed={mode === 'document'} onClick={() => setMode('document')}>PDF o Word</Button>
      </div>
      {mode === 'photos' ? <MultiPageEvidencePicker pages={pages} onChange={selected => {
        setPages(selected); if (selected[0]) titleFromFile(selected[0].file);
      }} contextKey={materiaId + ':' + scope.current} disabled={digitalizar.isPending} allowPdf={false}
        maxTotalBytes={MAX_BYTES} maxImageBytes={MAX_BYTES} />
        : <div className="space-y-3">
          <Button variant="outline" className="min-h-16 w-full" disabled={digitalizar.isPending} onClick={() => fileRef.current?.click()}>
            <Upload className="h-5 w-5" /> {file ? 'Cambiar documento' : 'Seleccionar PDF o Word'}
          </Button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-label="Seleccionar PDF o Word" className="hidden" disabled={digitalizar.isPending}
            onChange={event => { if (event.target.files?.[0]) selectDocument(event.target.files[0]); event.target.value = ''; }} />
          {file && <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3">
            <FileText className="h-5 w-5 shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1 break-words text-sm">{file.name}</span>
            <Button variant="ghost" size="sm" disabled={digitalizar.isPending} onClick={() => setFile(null)}>Quitar</Button>
          </div>}
        </div>}
      <p className="text-xs text-muted">Hasta 10 fotos y 20 MB en total, o un único PDF o Word de hasta 20 MB.</p>
      <details className="rounded-xl border border-border p-3">
        <summary className="min-h-8 cursor-pointer font-semibold">Opciones de la evaluación</summary>
        <div className="mt-3 space-y-4">
          <Field label="Nota máxima"><Input type="number" min="0.1" step="0.1" value={notaMaxima}
            disabled={digitalizar.isPending} onChange={event => setNotaMaxima(event.target.value)} /></Field>
          <Field label="Cómo se responderá"><Select value={modalidad} disabled={digitalizar.isPending}
            onChange={event => setModalidad(event.target.value as typeof modalidad)}>
            <option value="fisica">En papel / foto</option><option value="online">En línea</option><option value="mixta">Mixta</option>
          </Select></Field>
          <Field label="Descripción" hint="Opcional"><Textarea value={descripcion} disabled={digitalizar.isPending} onChange={event => setDescripcion(event.target.value)} /></Field>
        </div>
      </details>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={close}>Cerrar</Button>
        <Button onClick={submit} loading={digitalizar.isPending} disabled={!canSubmit || digitalizar.isPending}>Digitalizar</Button>
      </div>
    </div> : <div className="flex flex-col items-center py-4 text-center sm:py-7">
      <DocumentProcessingAnimation />
      <h3 className="mt-2 font-display text-xl font-bold">Estamos trabajando en tu documento</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">Estamos leyendo todas las hojas de <strong>{queued.nombre}</strong>. Puedes continuar navegando; te avisaremos cuando el borrador esté listo.</p>
      <Button className="mt-6 min-w-48" onClick={close}>Continuar navegando</Button>
    </div>}
  </Modal>;
}
export { DigitalizarEvaluacionModal };
