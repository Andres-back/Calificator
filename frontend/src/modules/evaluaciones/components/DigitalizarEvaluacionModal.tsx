import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, FileImage, FileText, Upload } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { api, toApiError } from '@/lib/api';
import { addPendingDigitalization } from '@/modules/evaluaciones/digitalizationJobs';
import { DocumentProcessingAnimation } from './DocumentProcessingAnimation';

interface DigitalizationQueued {
  job_id: string;
  estado: 'queued';
  materia_id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  materiaId: string;
  onCompleted: () => void;
}

const VALID_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function DigitalizarEvaluacionModal({
  open,
  onClose,
  materiaId,
  onCompleted,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [notaMaxima, setNotaMaxima] = useState('5');
  const [modalidad, setModalidad] = useState<'fisica' | 'online' | 'mixta'>('fisica');
  const [queued, setQueued] = useState<DigitalizationQueued | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setQueued(null);
    setNombre('');
    setDescripcion('');
    setNotaMaxima('5');
    setModalidad('fisica');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSelect = (selected: File) => {
    const extensionAllowed = /.(pdf|docx|jpg|jpeg|png|webp)$/i.test(selected.name);
    if (!VALID_TYPES.includes(selected.type) && !extensionAllowed) {
      toast.error('Solo se aceptan PDF, Word o imágenes (JPEG, PNG o WebP).');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error('El archivo no debe superar 20 MB.');
      return;
    }
    setFile(selected);
    setQueued(null);
    if (!nombre && selected.name) {
      setNombre(
        selected.name
          .replace(/.[^.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/s+/g, ' ')
          .trim(),
      );
    }
  };

  const digitalizar = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona un archivo.');
      const form = new FormData();
      form.append('materia_id', materiaId);
      form.append('nombre', nombre.trim());
      form.append('nota_maxima', notaMaxima);
      form.append('modalidad', modalidad);
      if (descripcion.trim()) form.append('descripcion', descripcion.trim());
      form.append('file', file);
      const { data } = await api.post<DigitalizationQueued>(
        '/evaluaciones/externa/digitalizar-con-archivo',
        form,
      );
      return data;
    },
    onSuccess: (data) => {
      addPendingDigitalization({
        jobId: data.job_id,
        materiaId: data.materia_id,
        nombre: data.nombre,
      });
      setQueued(data);
      toast.success('Documento recibido. Puedes seguir trabajando mientras lo digitalizamos.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const handleClose = () => {
    if (queued) onCompleted();
    reset();
    onClose();
  };

  const validMaxScore = Number(notaMaxima) > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Digitalizar evaluación desde archivo"
      className="max-w-2xl"
    >
      {!queued ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-cyan-50/70 p-4 text-sm leading-6 text-brand-950 dark:border-brand-500/30 dark:from-brand-500/10 dark:to-cyan-500/5 dark:text-brand-100">
            <p className="font-semibold">Convierte una hoja en un borrador editable.</p>
            <p className="mt-1">
              Xali reconstruye preguntas, puntajes y respuestas. Tú revisas todo antes de publicar.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-medium">
              <span className="rounded-lg bg-white/75 px-2 py-2 dark:bg-white/10">1. Completa</span>
              <span className="rounded-lg bg-white/75 px-2 py-2 dark:bg-white/10">2. Sube</span>
              <span className="rounded-lg bg-white/75 px-2 py-2 dark:bg-white/10">3. Revisa</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-fg">Datos básicos</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_12rem]">
              <Field label="Nombre de la evaluación" required>
                <Input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej: Evaluación de multiplicación"
                  required
                  minLength={2}
                />
              </Field>
              <Field label="Nota máxima" required hint="Escala final">
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={notaMaxima}
                  onChange={(event) => setNotaMaxima(event.target.value)}
                  aria-label="Nota máxima"
                />
              </Field>
              <Field label="Cómo se responderá" required>
                <Select
                  value={modalidad}
                  onChange={(event) => setModalidad(
                    event.target.value as 'fisica' | 'online' | 'mixta',
                  )}
                  aria-label="Modalidad de respuesta"
                >
                  <option value="fisica">En papel / foto</option>
                  <option value="online">En línea</option>
                  <option value="mixta">Mixta</option>
                </Select>
              </Field>
            </div>
          </div>

          <Field label="Descripción" hint="Opcional">
            <Textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="¿Qué temas cubre esta evaluación?"
            />
          </Field>

          <div>
            <p className="mb-3 text-sm font-semibold text-fg">Archivo</p>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/50 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/30 sm:p-8"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileRef.current?.click();
              }}
              tabIndex={0}
              role="button"
              aria-label="Subir evaluación desde archivo"
            >
              <Upload className="mb-3 h-10 w-10 text-brand-600" />
              <p className="text-sm font-semibold">Foto, PDF o Word</p>
              <p className="mt-1 text-xs text-muted">Máximo 20 MB</p>
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1"><FileImage className="h-4 w-4" /> Imagen</span>
                <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> PDF</span>
                <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> Word</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) handleSelect(selected);
                }}
              />
            </div>
          </div>

          {file && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                {file.type.startsWith('image/') ? (
                  <Camera className="h-5 w-5 shrink-0 text-brand-500" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-brand-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={digitalizar.isPending}
                >
                  Quitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => digitalizar.mutate()}
                  loading={digitalizar.isPending}
                  disabled={
                    digitalizar.isPending
                    || nombre.trim().length < 2
                    || !validMaxScore
                  }
                >
                  Digitalizar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 text-center sm:py-7">
          <DocumentProcessingAnimation />
          <h3 className="mt-2 font-display text-xl font-bold text-fg">
            Estamos trabajando en tu documento
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Estamos leyendo preguntas, puntajes y respuestas de <strong>{queued.nombre}</strong>.
            Puedes continuar navegando; te avisaremos cuando el borrador esté listo.
          </p>
          <div className="mt-5 flex items-center gap-2" aria-label="Proceso en segundo plano">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-200">
              Digitalización en segundo plano
            </span>
          </div>
          <Button className="mt-6 min-w-48" onClick={handleClose}>
            Continuar navegando
          </Button>
        </div>
      )}
    </Modal>
  );
}

export { DigitalizarEvaluacionModal };