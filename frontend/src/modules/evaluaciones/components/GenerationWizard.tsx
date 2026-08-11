import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bot, Check,
  ChevronDown, ChevronUp, Copy, FileImage, FileText, HelpCircle, ListChecks,
  Minus, Monitor, Plus, Printer, Send, Sparkles, Trash2, Type, X, Blend,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Textarea } from '@/components/ui';
import { BotonGrande } from '@/components/ui/BotonGrande';
import { queryKeys } from '@/config/queryKeys';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { MateriaSelect } from '@/modules/materias/MateriaSelect';
import { listDbaCombinado } from '@/modules/materias/dbaApi';
import { sendMessage } from '@/modules/xali/api';
import type { DBAUnifiedItem, Evaluacion, EvaluacionModalidad, Materia } from '@/types/api';
import { extraerReferenciaEvaluacion, generarBorradorEvaluacion, updateEvaluacion, type EvaluacionGenerarRequest } from '../api';
import { DBASelector } from './DBASelector';
import { PasosGuia } from './PasosGuia';
import {
  createBlankQuestion, createEmptyWizardState, discardWizardDraft, duplicateQuestion,
  evaluationToEditableQuestions, evaluationToWizardState, loadWizardDraft, MAX_QUESTIONS, MIN_QUESTIONS,
  moveQuestion, persistWizardDraft, QUESTION_TYPES, questionsToUpdatePayload,
  renumberQuestions, selectedQuestionTypes, totalQuestionCount, validateQuestion,
  validateReferenceFile, validateStep, type EditableQuestion, type QuestionType, type WizardState,
} from './generationWizardModel';

const TYPE_COPY: Record<QuestionType, { label: string; description: string; icon: typeof ListChecks }> = {
  opcion_multiple: { label: 'Opción múltiple', description: 'Varias opciones y una respuesta correcta', icon: ListChecks },
  verdadero_falso: { label: 'Verdadero o falso', description: 'Afirmaciones para analizar', icon: Check },
  abierta: { label: 'Respuesta abierta', description: 'El estudiante desarrolla su respuesta', icon: FileText },
  completar: { label: 'Completar', description: 'Frases con espacios por resolver', icon: Type },
};

const MODALITY_OPTIONS = [
  { value: 'fisica', label: 'En papel', description: 'El grupo responde una hoja y luego puedes calificarla por foto.', icon: Printer },
  { value: 'online', label: 'En línea', description: 'Los estudiantes responden desde un dispositivo.', icon: Monitor },
  { value: 'mixta', label: 'Mixta', description: 'Puedes usar la misma evaluación en papel y en línea.', icon: Blend },
] as const;

function QuestionCard({
  question, index, total, evaluationModality, onChange, onDelete, onDuplicate, onMove,
}: {
  question: EditableQuestion;
  index: number;
  total: number;
  evaluationModality: EvaluacionModalidad;
  onChange: (patch: Partial<EditableQuestion>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const error = validateQuestion(question, index);

  function changeOption(optionIndex: number, value: string) {
    const previous = question.opciones[optionIndex];
    onChange({
      opciones: question.opciones.map((option, current) => current === optionIndex ? value : option),
      respuestaEsperada: question.respuestaEsperada === previous ? value : question.respuestaEsperada,
    });
  }

  return (
    <article className={cn('rounded-2xl border-2 bg-surface', error ? 'border-amber-300' : 'border-border')}>
      <button
        type="button"
        onClick={() => onChange({ expanded: !question.expanded })}
        className="focus-ring flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left"
        aria-expanded={question.expanded}
        aria-controls={`question-${question.clientId}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-fg">{question.enunciado || 'Pregunta sin enunciado'}</span>
          <span className="text-sm text-muted">{TYPE_COPY[question.tipo].label} · {question.puntaje || 0} puntos</span>
        </span>
        {question.expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {question.expanded && (
        <div id={`question-${question.clientId}`} className="space-y-4 border-t border-border p-4">
          {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{error}</p>}
          <Field label="Tipo de pregunta" required>
            <select
              value={question.tipo}
              onChange={(event) => {
                const tipo = event.target.value as QuestionType;
                onChange({
                  tipo,
                  opciones: tipo === 'verdadero_falso'
                    ? ['Verdadero', 'Falso']
                    : tipo === 'opcion_multiple'
                      ? (question.opciones.length >= 3 ? question.opciones : ['', '', '', ''])
                      : [],
                  respuestaEsperada: '',
                });
              }}
              className="focus-ring min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-fg"
              aria-label={`Tipo de la pregunta ${index + 1}`}
            >
              {QUESTION_TYPES.map((type) => <option key={type} value={type}>{TYPE_COPY[type].label}</option>)}
            </select>
          </Field>
          <Field label="Enunciado" required>
            <Textarea value={question.enunciado} onChange={(event) => onChange({ enunciado: event.target.value })} className="min-h-24 text-base" />
          </Field>

          {evaluationModality === 'mixta' && (
            <Field label="Dónde responde el estudiante" required>
              <select
                value={question.modalidadRespuesta}
                onChange={(event) => onChange({ modalidadRespuesta: event.target.value as EditableQuestion['modalidadRespuesta'] })}
                className="focus-ring min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-fg"
                aria-label={`Modalidad de respuesta de la pregunta ${index + 1}`}
              >
                <option value="online">En línea</option>
                <option value="fisica">En papel / foto</option>
                <option value="archivo">Archivo adjunto</option>
              </select>
            </Field>
          )}

          {(question.tipo === 'opcion_multiple' || question.tipo === 'verdadero_falso') && (
            <div className="space-y-3">
              <p className="text-base font-semibold">Opciones</p>
              {question.opciones.map((option, optionIndex) => (
                <div key={optionIndex} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(event) => changeOption(optionIndex, event.target.value)}
                    disabled={question.tipo === 'verdadero_falso'}
                    className="min-h-12 text-base"
                    aria-label={`Opción ${optionIndex + 1} de la pregunta ${index + 1}`}
                  />
                  {question.tipo === 'opcion_multiple' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onChange({
                        opciones: question.opciones.filter((_, current) => current !== optionIndex),
                        respuestaEsperada: question.respuestaEsperada === option ? '' : question.respuestaEsperada,
                      })}
                      aria-label={`Eliminar opción ${optionIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {question.tipo === 'opcion_multiple' && (
                <Button type="button" variant="outline" onClick={() => onChange({ opciones: [...question.opciones, ''] })}>
                  <Plus className="h-4 w-4" /> Agregar opción
                </Button>
              )}
              <Field label="Respuesta correcta" required>
                <select
                  value={question.respuestaEsperada}
                  onChange={(event) => onChange({ respuestaEsperada: event.target.value })}
                  className="focus-ring min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-fg"
                >
                  <option value="">Selecciona la respuesta</option>
                  {question.opciones.filter(Boolean).map((option, optionIndex) => (
                    <option key={`${option}-${optionIndex}`} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {(question.tipo === 'abierta' || question.tipo === 'completar') && (
            <Field label="Respuesta esperada" required>
              <Textarea value={question.respuestaEsperada} onChange={(event) => onChange({ respuestaEsperada: event.target.value })} className="min-h-20 text-base" />
            </Field>
          )}

          <Field label="Puntaje" required>
            <Input type="number" min={0.01} step={0.01} value={question.puntaje} onChange={(event) => onChange({ puntaje: Number(event.target.value) })} className="min-h-12 max-w-40 text-base" />
          </Field>
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={onDuplicate}><Copy className="h-4 w-4" /> Duplicar</Button>
            <Button type="button" variant="outline" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /> Subir</Button>
            <Button type="button" variant="outline" onClick={() => onMove(1)} disabled={index === total - 1}><ArrowDown className="h-4 w-4" /> Bajar</Button>
            <Button type="button" variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" /> Eliminar</Button>
          </div>
        </div>
      )}
    </article>
  );
}

function XaliPanel({
  state, materiaNombre, onSuggestion,
}: {
  state: WizardState;
  materiaNombre: string;
  onSuggestion: (suggestion: string, target: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const context = useMemo(() => [
    `Materia: ${materiaNombre || 'sin seleccionar'}`,
    `Paso: ${state.step} de 6`,
    `Enfoque: ${[
      state.useDba ? `${state.dbaIds.length + state.dbaPersonalizadoIds.length} DBA` : '',
      state.useRubric ? `rúbrica (${state.rubricCriteria.length || 'criterios sugeridos por IA'})` : '',
    ].filter(Boolean).join(' + ') || 'tema e instrucciones del docente'}`,
    `Tipos: ${selectedQuestionTypes(state.counts).map((type) => TYPE_COPY[type].label).join(', ') || 'sin configurar'}`,
    `Preguntas generadas: ${state.questions.length}`,
  ], [materiaNombre, state]);
  const target = state.questions.length ? 'Enunciado de la primera pregunta' : 'Indicaciones adicionales para la IA';
  const chat = useMutation({
    mutationFn: () => sendMessage([
      'Contexto del wizard de creación de evaluaciones:',
      ...context,
      `Preguntas actuales: ${JSON.stringify(state.questions.slice(0, 12).map((question) => question.enunciado))}`,
      `Solicitud del docente: ${message.trim()}`,
      'Responde con una sugerencia breve. No modifiques ningún dato.',
    ].join('\n'), state.materiaId || undefined),
    onSuccess: (response) => { setSuggestion(response.respuesta); setMessage(''); },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  return (
    <aside className="rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-500/10" aria-label="Asistencia opcional de Xali">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-xl text-left" aria-expanded={expanded}>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white"><Bot className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-base font-bold">Pregúntale a Xali</span><span className="block text-sm text-muted">Asistencia opcional y separada</span></span>
        {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-violet-200 bg-surface p-3 dark:border-violet-500/30">
            <p className="flex items-center gap-2 text-sm font-bold"><HelpCircle className="h-4 w-4" /> Contexto que usará Xali</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">{context.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
          <Field label="¿Qué necesitas mejorar?">
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-24 text-base" placeholder="Ejemplo: haz más clara una pregunta..." />
          </Field>
          <Button type="button" onClick={() => chat.mutate()} loading={chat.isPending} disabled={!message.trim() || chat.isPending} className="w-full">
            <Send className="h-4 w-4" /> Enviar a Xali
          </Button>
          {suggestion && (
            <div className="space-y-3 rounded-xl border border-violet-300 bg-surface p-3">
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Sugerencia de Xali</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{suggestion}</p>
              <p className="text-sm text-muted"><strong>Campo que cambiará:</strong> {target}</p>
              <Button type="button" variant="outline" onClick={() => onSuggestion(suggestion, target)} className="w-full">Revisar y aplicar</Button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export function GenerationWizard({
  open, onClose, userId, materias, initialMateriaId = '', initialEvaluation = null, onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  materias: Materia[] | undefined;
  initialMateriaId?: string;
  initialEvaluation?: Evaluacion | null;
  onCompleted: (evaluation: Evaluacion) => void;
}) {
  const availableMaterias = useMemo(() => materias ?? [], [materias]);
  const [state, setState] = useState<WizardState>(() => createEmptyWizardState(initialMateriaId));
  const [restorePrompt, setRestorePrompt] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [rubricCriterion, setRubricCriterion] = useState('');
  const [xaliConfirmation, setXaliConfirmation] = useState<{ suggestion: string; target: string } | null>(null);
  const generateLock = useRef(false);
  const confirmLock = useRef(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const materiaNombre = availableMaterias.find((materia) => materia.id === state.materiaId)?.nombre ?? '';

  const dba = useQuery({
    queryKey: queryKeys.materias.dbaCombined(state.materiaId),
    queryFn: () => listDbaCombinado(state.materiaId),
    enabled: open && Boolean(state.materiaId) && state.useDba,
    retry: false,
  });

  const generate = useMutation({
    mutationFn: (payload: EvaluacionGenerarRequest) => generarBorradorEvaluacion(payload),
    onSuccess: (evaluation) => {
      setGenerationError(null);
      setState((current) => ({
        ...current,
        generatedEvaluationId: evaluation.id,
        generatedCriteria: (evaluation.criterios ?? []) as Record<string, unknown>[],
        questions: evaluationToEditableQuestions(evaluation),
      }));
      toast.success('Borrador generado. Revísalo antes de continuar.');
    },
    onError: (error) => setGenerationError(toApiError(error).detail),
    onSettled: () => { generateLock.current = false; },
  });

  const extractReference = useMutation({
    mutationFn: (file: File) => extraerReferenciaEvaluacion(state.materiaId, file),
    onSuccess: (result) => {
      patch({ referenceText: result.texto.slice(0, 12000) });
      if (result.advertencias.length) toast(result.advertencias.join(' '), { icon: '⚠️' });
      else toast.success('Material leído y listo para orientar la evaluación.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const confirm = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateEvaluacion>[1] }) => updateEvaluacion(id, payload),
    onSuccess: (evaluation) => {
      if (!initialEvaluation) discardWizardDraft(localStorage, userId);
      onCompleted(evaluation);
    },
    onError: (error) => toast.error(toApiError(error).detail),
    onSettled: () => { confirmLock.current = false; },
  });

  useEffect(() => {
    if (!open) return;
    setGenerationError(null);
    setCanPersist(false);
    if (initialEvaluation) {
      setState(evaluationToWizardState(initialEvaluation));
      setRestorePrompt(false);
      return;
    }
    const restored = loadWizardDraft(localStorage, userId);
    if (restored) {
      setState(restored);
      setRestorePrompt(true);
      return;
    }
    setState(createEmptyWizardState(initialMateriaId || availableMaterias[0]?.id || ''));
    setRestorePrompt(false);
    setCanPersist(true);
  }, [availableMaterias, initialEvaluation, initialMateriaId, open, userId]);

  useEffect(() => {
    if (open && canPersist && !initialEvaluation) persistWizardDraft(localStorage, userId, state);
  }, [canPersist, initialEvaluation, open, state, userId]);

  function patch(patchValue: Partial<WizardState>) {
    setState((current) => ({ ...current, ...patchValue }));
  }

  function toggleDba(item: DBAUnifiedItem) {
    setState((current) => item.fuente === 'personalizado'
      ? {
        ...current,
        dbaPersonalizadoIds: current.dbaPersonalizadoIds.includes(item.id)
          ? current.dbaPersonalizadoIds.filter((id) => id !== item.id)
          : [...current.dbaPersonalizadoIds, item.id],
      }
      : {
        ...current,
        dbaIds: current.dbaIds.includes(item.id)
          ? current.dbaIds.filter((id) => id !== item.id)
          : [...current.dbaIds, item.id],
      });
  }

  function addRubricCriterion() {
    const value = rubricCriterion.trim();
    if (!value || state.rubricCriteria.includes(value)) return;
    patch({ rubricCriteria: [...state.rubricCriteria, value] });
    setRubricCriterion('');
  }

  function selectReferenceFile(file: File | undefined) {
    if (!file) return;
    if (!state.materiaId) {
      toast.error('Selecciona una materia antes de subir el material.');
      return;
    }
    const error = validateReferenceFile(file);
    if (error) {
      toast.error(error);
      if (referenceInputRef.current) referenceInputRef.current.value = '';
      return;
    }
    patch({
      referenceFile: {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        needsReselection: false,
      },
    });
    extractReference.mutate(file);
  }

  function generateDraft() {
    if (generate.isPending || generateLock.current) return;
    const error = [1, 2, 3, 4].map((step) => validateStep(state, step)).find(Boolean);
    if (error) { setGenerationError(error); return; }
    const distribution = QUESTION_TYPES
      .filter((type) => state.counts[type] > 0)
      .map((type) => `${TYPE_COPY[type].label}: ${state.counts[type]}`)
      .join(', ');
    const instructions = [
      `Distribución requerida por tipo: ${distribution}.`,
      state.instruccionesAdicionales.trim(),
    ].filter(Boolean).join('\n\n');
    generateLock.current = true;
    generate.mutate({
      materia_id: state.materiaId,
      nombre: state.nombre.trim(),
      tema: state.descripcion.trim() || state.nombre.trim(),
      descripcion: state.descripcion.trim() || undefined,
      modalidad: state.modalidad,
      nota_maxima: state.notaMaxima,
      fecha_limite_entrega: state.fechaLimiteEntrega ? new Date(state.fechaLimiteEntrega).toISOString() : null,
      cantidad_preguntas: totalQuestionCount(state.counts),
      tipos_pregunta: selectedQuestionTypes(state.counts),
      dba_ids: state.useDba ? state.dbaIds : [],
      dba_personalizado_ids: state.useDba ? state.dbaPersonalizadoIds : [],
      usar_rubrica: state.useRubric,
      metas_profesor: [],
      criterios_docente: state.useRubric ? state.rubricCriteria : [],
      instrucciones_adicionales: instructions || undefined,
      material_referencia: state.referenceText.trim() || undefined,
    });
  }

  function confirmEvaluation() {
    if (confirm.isPending || confirmLock.current || !state.generatedEvaluationId) return;
    const error = validateStep(state, 5);
    if (error) { toast.error(error); return; }
    confirmLock.current = true;
    confirm.mutate({
      id: state.generatedEvaluationId,
      payload: {
        nombre: state.nombre.trim(),
        descripcion: state.descripcion.trim() || undefined,
        modalidad: state.modalidad,
        nota_maxima: state.notaMaxima,
        fecha_limite_entrega: state.fechaLimiteEntrega ? new Date(state.fechaLimiteEntrega).toISOString() : null,
        dba_ids: state.useDba ? state.dbaIds : [],
        dba_personalizado_ids: state.useDba ? state.dbaPersonalizadoIds : [],
        criterios: state.generatedCriteria,
        ...questionsToUpdatePayload(state.questions),
      },
    });
  }

  function resetDraft(close = false) {
    discardWizardDraft(localStorage, userId);
    setState(createEmptyWizardState(initialMateriaId || availableMaterias[0]?.id || ''));
    setRestorePrompt(false);
    setCanPersist(!close);
    if (close) onClose();
  }

  function applyXali() {
    if (!xaliConfirmation) return;
    if (state.questions.length) {
      const [first, ...rest] = state.questions;
      patch({ questions: [{ ...first, enunciado: `${first.enunciado}\n${xaliConfirmation.suggestion}`.trim(), expanded: true }, ...rest] });
    } else {
      patch({ instruccionesAdicionales: [state.instruccionesAdicionales, xaliConfirmation.suggestion].filter(Boolean).join('\n') });
    }
    setXaliConfirmation(null);
    toast.success('Sugerencia aplicada después de tu confirmación.');
  }

  const validation = validateStep(state);
  const total = totalQuestionCount(state.counts);
  const questionErrors = state.questions.filter((question, index) => validateQuestion(question, index)).length;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title=""
        ariaLabel={initialEvaluation ? 'Editar contenido de la evaluación' : 'Generar evaluación con IA'}
        className="max-w-6xl p-0 sm:p-0"
        showCloseButton={false}
        closeOnBackdrop={!generate.isPending && !confirm.isPending && !extractReference.isPending}
        closeOnEscape={!generate.isPending && !confirm.isPending && !extractReference.isPending}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col [&_button]:min-h-12 [&_button]:min-w-12">
          <header className="sticky top-0 z-10 border-b border-border bg-surface/95 p-4 backdrop-blur sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-100 text-brand-700"><Sparkles className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold">{initialEvaluation ? 'Editar contenido de la evaluación' : 'Crear evaluación paso a paso'}</h2>
                <p className="text-sm text-muted">{initialEvaluation ? 'Modifica, agrega, ordena o elimina preguntas antes de publicar.' : 'La IA prepara un borrador; tú revisas y decides.'}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={generate.isPending || confirm.isPending || extractReference.isPending} aria-label="Cerrar wizard"><X className="h-5 w-5" /></Button>
            </div>
            <div className="mt-4"><PasosGuia currentStep={state.step} /></div>
          </header>

          <div className="overflow-y-auto p-4 sm:p-5">
            {restorePrompt ? (
              <div role="alert" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:bg-amber-500/10">
                <p className="flex items-center gap-2 text-base font-bold text-amber-900 dark:text-amber-100"><AlertTriangle className="h-5 w-5" /> Encontramos una evaluación sin terminar.</p>
                {state.referenceFile?.needsReselection && <p className="mt-2 text-sm">Vuelve a seleccionar {state.referenceFile.name}; solo se conservó su información básica.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => { setRestorePrompt(false); setCanPersist(true); }}>Continuar</Button>
                  <Button type="button" variant="outline" onClick={() => resetDraft(true)}>Descartar</Button>
                  <Button type="button" variant="outline" onClick={() => resetDraft(false)}>Empezar de nuevo</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <main className="min-w-0 rounded-2xl border border-border bg-surface-2/50 p-4 sm:p-5">
                  {state.step === 1 && (
                    <section aria-labelledby="wizard-step-title" className="space-y-5">
                      <div><h3 id="wizard-step-title" className="text-xl font-bold">Datos básicos de la evaluación</h3><p className="mt-1 text-base text-muted">Confirma la materia, escribe un nombre y elige cómo responderá el grupo.</p></div>
                      <Field label="Materia" required>
                        {availableMaterias.length === 1 ? (
                          <div className="flex min-h-12 items-center rounded-xl border border-border bg-surface px-4 text-base font-semibold">
                            {availableMaterias[0]?.nombre}
                          </div>
                        ) : (
                          <div className="[&_select]:min-h-12 [&_select]:max-w-none [&_select]:text-base"><MateriaSelect value={state.materiaId} materias={availableMaterias} onChange={(materiaId) => patch({ materiaId, dbaIds: [], dbaPersonalizadoIds: [], generatedEvaluationId: null, questions: [] })} /></div>
                        )}
                      </Field>
                      <Field label="Nombre de la evaluación" required hint="Ejemplo: Evaluación de fracciones — período 2"><Input autoFocus value={state.nombre} onChange={(event) => patch({ nombre: event.target.value })} className="min-h-12 text-base" placeholder="Escribe un nombre claro" /></Field>
                      <Field label="Descripción breve" hint="Opcional"><Textarea value={state.descripcion} onChange={(event) => patch({ descripcion: event.target.value })} className="min-h-24 text-base" placeholder="¿Qué tema o unidad quieres evaluar?" /></Field>
                      <Field label="Fecha límite de entrega" hint="Opcional. Al vencer, quien no haya entregado recibirá 0.">
                        <Input type="datetime-local" value={state.fechaLimiteEntrega} onChange={(event) => patch({ fechaLimiteEntrega: event.target.value })} className="min-h-12 text-base" />
                      </Field>
                      <fieldset className="space-y-3">
                        <legend className="text-base font-semibold">¿Cómo responderán los estudiantes?</legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {MODALITY_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const selected = state.modalidad === option.value;
                            return (
                              <label key={option.value} className={cn('focus-within:ring-2 focus-within:ring-focus flex min-h-32 cursor-pointer gap-3 rounded-xl border-2 p-4', selected ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-border bg-surface')}>
                                <input type="radio" name="modalidad" value={option.value} checked={selected} onChange={() => patch({ modalidad: option.value })} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" />
                                <span><Icon className="h-6 w-6 text-brand-700" aria-hidden="true" /><span className="mt-2 block font-bold">{option.label}</span><span className="mt-1 block text-sm leading-5 text-muted">{option.description}</span></span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </section>
                  )}

                  {state.step === 2 && (
                    <section aria-labelledby="wizard-step-title" className="space-y-5">
                      <div>
                        <h3 id="wizard-step-title" className="text-xl font-bold">Elige cómo orientar la evaluación</h3>
                        <p className="mt-1 text-base text-muted">Puedes usar DBA, rúbrica, ambos o continuar sin ninguno. Tú decides.</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={cn('focus-within:ring-2 focus-within:ring-focus flex cursor-pointer gap-3 rounded-2xl border-2 p-4', state.useDba ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-border bg-surface')}>
                          <input
                            type="checkbox"
                            checked={state.useDba}
                            onChange={(event) => patch({
                              useDba: event.target.checked,
                              ...(!event.target.checked ? { dbaIds: [], dbaPersonalizadoIds: [] } : {}),
                            })}
                            className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                          />
                          <span><span className="block text-base font-bold">Alinear con DBA</span><span className="mt-1 block text-sm leading-5 text-muted">Relaciona las preguntas con aprendizajes oficiales o personalizados.</span></span>
                        </label>
                        <label className={cn('focus-within:ring-2 focus-within:ring-focus flex cursor-pointer gap-3 rounded-2xl border-2 p-4', state.useRubric ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-border bg-surface')}>
                          <input
                            type="checkbox"
                            checked={state.useRubric}
                            onChange={(event) => patch({ useRubric: event.target.checked })}
                            className="mt-1 h-5 w-5 shrink-0 accent-violet-600"
                          />
                          <span><span className="block text-base font-bold">Evaluar con rúbrica</span><span className="mt-1 block text-sm leading-5 text-muted">Crea criterios, pesos y niveles de desempeño para calificar.</span></span>
                        </label>
                      </div>

                      {!state.useDba && !state.useRubric && (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
                          <p className="font-bold">Generación libre seleccionada</p>
                          <p>La IA usará el tema, la descripción y tus indicaciones. Luego podrás revisar todas las preguntas.</p>
                        </div>
                      )}

                      {state.useDba && (
                        <div className="space-y-3 rounded-2xl border border-sky-200 bg-surface p-4 dark:border-sky-500/30">
                          <div><h4 className="font-bold">DBA para esta evaluación</h4><p className="text-sm text-muted">Seleccionados: {state.dbaIds.length + state.dbaPersonalizadoIds.length}</p></div>
                          <DBASelector items={dba.data} selectedOfficial={state.dbaIds} selectedCustom={state.dbaPersonalizadoIds} loading={dba.isLoading} error={dba.isError} onToggle={toggleDba} spacious />
                        </div>
                      )}

                      {state.useRubric && (
                        <div className="space-y-4 rounded-2xl border border-violet-200 bg-surface p-4 dark:border-violet-500/30">
                          <div><h4 className="font-bold">Criterios de la rúbrica</h4><p className="text-sm text-muted">Son opcionales. Si no agregas ninguno, la IA propondrá los adecuados para el tema.</p></div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={rubricCriterion}
                              onChange={(event) => setRubricCriterion(event.target.value)}
                              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addRubricCriterion(); } }}
                              placeholder="Ej. Argumentación y uso de evidencias"
                              aria-label="Nuevo criterio de rúbrica"
                              className="min-h-12 flex-1 text-base"
                            />
                            <Button type="button" variant="outline" onClick={addRubricCriterion} disabled={!rubricCriterion.trim()}><Plus className="h-4 w-4" /> Agregar criterio</Button>
                          </div>
                          {state.rubricCriteria.length > 0 && (
                            <div className="space-y-2">
                              {state.rubricCriteria.map((criterion, index) => (
                                <div key={`${criterion}-${index}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-violet-50 px-3 dark:bg-violet-500/10">
                                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-bold text-white">{index + 1}</span>
                                  <span className="min-w-0 flex-1 text-sm font-semibold">{criterion}</span>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => patch({ rubricCriteria: state.rubricCriteria.filter((_, current) => current !== index) })} aria-label={`Eliminar criterio ${criterion}`}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {state.step === 3 && (
                    <section aria-labelledby="wizard-step-title" className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div><h3 id="wizard-step-title" className="text-xl font-bold">Configura las preguntas</h3><p className="mt-1 text-base text-muted">Elige cuántas preguntas quieres de cada tipo.</p></div>
                        <div className="rounded-xl bg-brand-100 px-4 py-2 text-center text-brand-800"><span className="block text-2xl font-bold">{total}</span><span className="text-sm">preguntas en total</span></div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {QUESTION_TYPES.map((type) => {
                          const copy = TYPE_COPY[type];
                          const Icon = copy.icon;
                          const value = state.counts[type];
                          return (
                            <div key={type} className={cn('rounded-2xl border-2 p-4', value ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-border bg-surface')}>
                              <div className="flex gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-brand-700"><Icon className="h-6 w-6" /></span><div><p className="text-base font-bold">{copy.label}</p><p className="text-sm text-muted">{copy.description}</p></div></div>
                              <div className="mt-4 flex items-center justify-between">
                                <Button type="button" variant="outline" size="icon" onClick={() => patch({ counts: { ...state.counts, [type]: Math.max(0, value - 1) } })} disabled={!value} aria-label={`Quitar una pregunta de ${copy.label}`}><Minus className="h-5 w-5" /></Button>
                                <span className="text-3xl font-bold text-brand-700">{value}</span>
                                <Button type="button" variant="outline" size="icon" onClick={() => patch({ counts: { ...state.counts, [type]: Math.min(MAX_QUESTIONS, value + 1) } })} aria-label={`Agregar una pregunta de ${copy.label}`}><Plus className="h-5 w-5" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-sm text-muted">Mínimo {MIN_QUESTIONS} y máximo {MAX_QUESTIONS} preguntas.</p>
                    </section>
                  )}

                  {state.step === 4 && (
                    <section aria-labelledby="wizard-step-title" className="space-y-5">
                      <div><h3 id="wizard-step-title" className="text-xl font-bold">Añade material de referencia</h3><p className="mt-1 text-base text-muted">Es opcional. Pega texto o sube un PDF o una imagen; extraeremos su contenido para orientar la generación.</p></div>
                      <input
                        ref={referenceInputRef}
                        type="file"
                        className="sr-only"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(event) => selectReferenceFile(event.target.files?.[0])}
                        aria-label="Seleccionar material de referencia"
                      />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border-2 border-brand-500 bg-brand-50 p-4 dark:bg-brand-500/10"><FileText className="h-7 w-7 text-brand-700" /><p className="mt-2 text-base font-bold">Texto</p><Badge tone="success" className="mt-2">Compatible</Badge></div>
                        <button type="button" onClick={() => referenceInputRef.current?.click()} disabled={extractReference.isPending} className="focus-ring rounded-xl border-2 border-border bg-surface p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-brand-500/10"><FileImage className="h-7 w-7 text-brand-700" /><p className="mt-2 text-base font-bold">Subir imagen</p><p className="mt-1 text-sm text-muted">JPG, PNG o WebP · máximo 10 MB</p></button>
                        <button type="button" onClick={() => referenceInputRef.current?.click()} disabled={extractReference.isPending} className="focus-ring rounded-xl border-2 border-border bg-surface p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-brand-500/10"><FileText className="h-7 w-7 text-brand-700" /><p className="mt-2 text-base font-bold">Subir PDF</p><p className="mt-1 text-sm text-muted">Digital o escaneado · máximo 10 MB</p></button>
                      </div>
                      {extractReference.isPending && <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900 dark:bg-sky-500/10 dark:text-sky-100">Leyendo el archivo y extrayendo el contenido…</div>}
                      {state.referenceFile && (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:bg-emerald-500/10">
                          <FileText className="h-5 w-5 text-emerald-700" />
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{state.referenceFile.name}</p><p className="text-xs text-muted">{(state.referenceFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                          <Badge tone={state.referenceFile.needsReselection ? 'warning' : 'success'}>{state.referenceFile.needsReselection ? 'Vuelve a seleccionarlo' : 'Archivo cargado'}</Badge>
                          <Button type="button" size="sm" variant="ghost" onClick={() => { patch({ referenceFile: null, referenceText: '' }); if (referenceInputRef.current) referenceInputRef.current.value = ''; }} disabled={extractReference.isPending}><Trash2 className="h-4 w-4" /> Quitar</Button>
                        </div>
                      )}
                      <Field label="Texto de referencia y contenido extraído" hint={`${state.referenceText.length}/12000 caracteres`}><Textarea value={state.referenceText} onChange={(event) => patch({ referenceText: event.target.value })} className="min-h-48 text-base" maxLength={12000} placeholder="Pega aquí una lectura o sube un archivo para extraer su contenido..." /></Field>
                      <Field label="Indicaciones adicionales para la IA" hint="Opcional"><Textarea value={state.instruccionesAdicionales} onChange={(event) => patch({ instruccionesAdicionales: event.target.value })} className="min-h-24 text-base" maxLength={2000} /></Field>
                    </section>
                  )}

                  {state.step === 5 && (
                    !state.generatedEvaluationId ? (
                      <section aria-labelledby="wizard-step-title" className="space-y-5 text-center">
                        <div><h3 id="wizard-step-title" className="text-xl font-bold">Genera el borrador</h3><p className="mx-auto mt-2 max-w-xl text-base text-muted">La IA preparará {total} preguntas. Nada se publica sin tu revisión.</p></div>
                        {generationError && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-left text-base text-rose-900 dark:bg-rose-500/10 dark:text-rose-100">{generationError}</div>}
                        <BotonGrande onClick={generateDraft} loading={generate.isPending} disabled={generate.isPending} icon={<Sparkles className="h-5 w-5" />} className="mx-auto sm:w-auto">{generate.isPending ? 'Generando preguntas...' : 'Generar borrador'}</BotonGrande>
                      </section>
                    ) : (
                      <section aria-labelledby="wizard-step-title" className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div><h3 id="wizard-step-title" className="text-xl font-bold">Revisa y edita las preguntas</h3><p className="mt-1 text-base text-muted">Puedes cambiar el tipo, editar, agregar, duplicar, ordenar o eliminar preguntas.</p></div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={questionErrors || !state.questions.length ? 'warning' : 'success'}>{!state.questions.length ? 'Agrega una pregunta' : questionErrors ? `${questionErrors} por corregir` : 'Todas válidas'}</Badge>
                            <Button type="button" variant="outline" onClick={() => patch({ questions: createBlankQuestion(state.questions, state.modalidad) })} disabled={state.questions.length >= MAX_QUESTIONS}><Plus className="h-4 w-4" /> Agregar pregunta</Button>
                          </div>
                        </div>
                        {initialEvaluation && initialEvaluation.estado !== 'borrador' && (
                          <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                            <p className="font-bold">Estás editando una evaluación ya asignada.</p>
                            <p>Los cambios quedarán disponibles de inmediato. No se borrarán entregas ni notas anteriores; revísalas si modificas criterios, puntajes o respuestas correctas.</p>
                          </div>
                        )}
                        {state.useRubric && state.generatedCriteria.length > 0 && (
                          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
                            <div className="flex items-center justify-between gap-3"><h4 className="font-bold">Rúbrica generada</h4><Badge tone="violet">{state.generatedCriteria.length} criterios</Badge></div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {state.generatedCriteria.map((criterion, index) => (
                                <div key={`${String(criterion.nombre ?? 'criterio')}-${index}`} className="rounded-xl border border-violet-200 bg-surface p-3 dark:border-violet-500/20">
                                  <p className="font-semibold">{String(criterion.nombre ?? `Criterio ${index + 1}`)}</p>
                                  <p className="mt-1 text-sm leading-5 text-muted">{String(criterion.descripcion ?? '')}</p>
                                  <p className="mt-2 text-xs font-bold text-violet-700 dark:text-violet-200">Peso: {Number(criterion.peso_porcentaje ?? 0)}%</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                          {state.questions.map((question, index) => (
                            <QuestionCard
                              key={question.clientId}
                              question={question}
                              index={index}
                              total={state.questions.length}
                              evaluationModality={state.modalidad}
                              onChange={(questionPatch) => patch({ questions: state.questions.map((current, currentIndex) => currentIndex === index ? { ...current, ...questionPatch } : current) })}
                              onDelete={() => patch({ questions: renumberQuestions(state.questions.filter((_, currentIndex) => currentIndex !== index)) })}
                              onDuplicate={() => patch({ questions: duplicateQuestion(state.questions, index) })}
                              onMove={(direction) => patch({ questions: moveQuestion(state.questions, index, direction) })}
                            />
                          ))}
                        </div>
                      </section>
                    )
                  )}

                  {state.step === 6 && (
                    <section aria-labelledby="wizard-step-title" className="space-y-5">
                      <div><h3 id="wizard-step-title" className="text-xl font-bold">Confirma la evaluación</h3><p className="mt-1 text-base text-muted">{initialEvaluation ? 'Los cambios se guardarán en la evaluación actual.' : 'Se guardará como borrador en la lista normal.'}</p></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ['Nombre', state.nombre], ['Materia', materiaNombre],
                          ['Enfoque', [
                            state.useDba ? `${state.dbaIds.length + state.dbaPersonalizadoIds.length} DBA` : '',
                            state.useRubric ? 'Rúbrica' : '',
                          ].filter(Boolean).join(' + ') || 'Generación libre'],
                          ['Criterios', String(state.generatedCriteria.length)],
                          ['Preguntas', String(state.questions.length)],
                          ['Puntaje total', state.questions.reduce((sum, question) => sum + question.puntaje, 0).toFixed(2)],
                          ['Estado inicial', 'Borrador'],
                        ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-sm font-semibold text-muted">{label}</p><p className="mt-1 text-base font-bold">{value}</p></div>)}
                      </div>
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-base text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"><p className="font-bold">La IA sugiere. Tú decides.</p><p className="mt-1">{initialEvaluation && initialEvaluation.estado !== 'borrador' ? 'La evaluación conservará su estado y disponibilidad actuales.' : 'La evaluación no se publicará automáticamente.'}</p></div>
                    </section>
                  )}
                </main>
                <XaliPanel state={state} materiaNombre={materiaNombre} onSuggestion={(suggestion, target) => setXaliConfirmation({ suggestion, target })} />
              </div>
            )}
          </div>

          {!restorePrompt && (
            <footer className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-border bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <BotonGrande variant="outline" onClick={() => patch({ step: Math.max(1, state.step - 1) })} disabled={state.step === 1 || generate.isPending || confirm.isPending} icon={<ArrowLeft className="h-5 w-5" />} className="sm:w-auto">Atrás</BotonGrande>
              <div className="text-center text-sm text-muted" aria-live="polite">{validation ?? 'Paso completo. Puedes continuar.'}</div>
              {state.step === 6
                ? <BotonGrande onClick={confirmEvaluation} loading={confirm.isPending} disabled={Boolean(validation) || confirm.isPending} icon={<Check className="h-5 w-5" />} className="sm:w-auto">{initialEvaluation ? 'Guardar cambios' : 'Crear evaluación'}</BotonGrande>
                : <BotonGrande onClick={() => { const error = validateStep(state); if (error) toast.error(error); else patch({ step: Math.min(6, state.step + 1) }); }} disabled={Boolean(validation) || generate.isPending} icon={<ArrowRight className="h-5 w-5" />} className="sm:w-auto">Siguiente</BotonGrande>}
            </footer>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(xaliConfirmation)} onClose={() => setXaliConfirmation(null)} onConfirm={applyXali} title="¿Aplicar la sugerencia de Xali?" description="Xali nunca modifica el wizard sin tu aprobación." confirmLabel="Sí, aplicar">
        {xaliConfirmation && <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:bg-violet-500/10"><p className="text-sm"><strong>Campo:</strong> {xaliConfirmation.target}</p><p className="text-sm leading-6">{xaliConfirmation.suggestion}</p></div>}
      </ConfirmDialog>
    </>
  );
}
