import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileImage,
  FileText,
  Upload,
} from 'lucide-react';
import { Button, Card, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { api, toApiError } from '@/lib/api';

interface EstructuraDetectada {
  preguntas: {
    numero: number;
    tipo: string;
    enunciado: string;
    opciones?: string[];
    puntaje: string;
  }[];
  respuestas_esperadas: { numero: number; respuesta: string }[];
  criterios: { nombre: string; descripcion: string }[];
  errores_comunes: string[];
  reglas_feedback: Record<string, unknown>;
  clave_completa: boolean;
  advertencias: string[];
  nota_maxima: string;
}

interface DigitalizarResponse {
  evaluacion: {
    id: string;
    nombre: string;
    materia_id: string;
    estado: string;
    tipo_origen: string;
    modalidad: 'fisica' | 'online' | 'mixta';
    nota_maxima: number;
    preguntas_count: number;
    respuestas_count: number;
    clave_completa: boolean;
  };
  estructura_detectada: EstructuraDetectada;
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

function DigitalizarEvaluacionModal({ open, onClose, materiaId, onCompleted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [notaMaxima, setNotaMaxima] = useState('5');
  const [modalidad, setModalidad] = useState<'fisica' | 'online' | 'mixta'>('fisica');
  const [result, setResult] = useState<DigitalizarResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setNombre('');
    setDescripcion('');
    setNotaMaxima('5');
    setModalidad('fisica');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSelect = (selected: File) => {
    const extensionAllowed = /\.(pdf|docx|jpg|jpeg|png|webp)$/i.test(selected.name);
    if (!VALID_TYPES.includes(selected.type) && !extensionAllowed) {
      toast.error('Solo se aceptan PDF, Word o imágenes (JPEG/PNG/WebP).');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error('El archivo no debe superar 20 MB.');
      return;
    }
    setFile(selected);
    setResult(null);
    if (!nombre && selected.name) {
      setNombre(
        selected.name
          .replace(/\.[^.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
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
      const { data } = await api.post<DigitalizarResponse>(
        '/evaluaciones/externa/digitalizar-con-archivo',
        form,
      );
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Evaluación "${data.evaluacion.nombre}" creada como borrador.`);
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const handleClose = () => {
    if (result) onCompleted();
    reset();
    onClose();
  };

  const validMaxScore = Number(notaMaxima) > 0;

  return (
    <Modal open={open} onClose={handleClose} title="Digitalizar evaluación desde archivo" className="max-w-2xl">
      {!result ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-sm leading-6 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100">
            <p className="font-semibold">Convierte una evaluación impresa en borrador editable.</p>
            <p className="mt-1">
              Sube una foto, PDF o Word. La IA reconstruye preguntas, puntajes y clave; tú revisas antes de publicar.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <span className="rounded-lg bg-white/70 px-3 py-2 text-xs font-medium dark:bg-white/10">1. Datos básicos</span>
              <span className="rounded-lg bg-white/70 px-3 py-2 text-xs font-medium dark:bg-white/10">2. Archivo</span>
              <span className="rounded-lg bg-white/70 px-3 py-2 text-xs font-medium dark:bg-white/10">3. Revisar borrador</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Datos básicos</p>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem_12rem]">
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
                onChange={(event) => setModalidad(event.target.value as 'fisica' | 'online' | 'mixta')}
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
            <p className="mb-3 text-sm font-semibold text-foreground">Archivo de la evaluación</p>
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
            <Upload className="mb-3 h-10 w-10 text-muted" />
            <p className="text-sm font-semibold">Sube una foto, PDF o Word</p>
            <p className="mt-1 text-xs text-muted">
              Máximo 20 MB. En PDF escaneado se analizan hasta cinco páginas.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted">
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
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
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
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={digitalizar.isPending}>
                  Quitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => digitalizar.mutate()}
                  loading={digitalizar.isPending}
                  disabled={digitalizar.isPending || nombre.trim().length < 2 || !validMaxScore}
                >
                  Digitalizar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold">{result.evaluacion.nombre}</p>
              <p className="text-xs text-muted">
                {result.evaluacion.preguntas_count} preguntas · {result.evaluacion.respuestas_count} respuestas en la clave · {result.evaluacion.modalidad === 'fisica' ? 'En papel / foto' : result.evaluacion.modalidad === 'mixta' ? 'Mixta' : 'En línea'} · Nota máxima {result.evaluacion.nota_maxima}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Borrador creado. La IA sugiere; revisa la clave antes de publicar.
              </p>
            </div>
          </div>

          {result.estructura_detectada.advertencias.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" /> Revisa estas observaciones
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {result.estructura_detectada.advertencias.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {result.estructura_detectada.preguntas.map((question) => {
              const expected = result.estructura_detectada.respuestas_esperadas.find(
                (answer) => answer.numero === question.numero,
              );
              return (
                <Card key={question.numero} className="p-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                      {question.numero}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium">{question.enunciado}</p>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                          {question.puntaje} pts
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs capitalize text-muted">
                        {question.tipo.replace(/_/g, ' ')}
                      </p>
                      {question.opciones && question.opciones.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {question.opciones.map((option) => (
                            <li key={option} className="text-xs text-muted">{option}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
                        <span className="font-semibold">Clave sugerida:</span>{' '}
                        {expected?.respuesta ?? 'Revisión requerida'}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>
              <CheckCircle2 className="h-4 w-4" /> Cerrar y revisar borrador
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export { DigitalizarEvaluacionModal };