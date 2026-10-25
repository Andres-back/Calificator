import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Bot, Check,
  ChevronDown, ChevronUp, Copy, HelpCircle, Plus, Send, Sparkles, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Textarea } from '@/components/ui';
import { queryKeys } from '@/config/queryKeys';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { listDbaCombinado } from '@/modules/materias/dbaApi';
import { sendMessage } from '@/modules/xali/api';
import type { DBAUnifiedItem, Evaluacion, EvaluacionModalidad, Materia } from '@/types/api';
import { extraerReferenciaEvaluacion, generarBorradorEvaluacion, getEvaluacion, updateEvaluacion, type EvaluacionGenerarRequest } from '../api';
import { EvaluationPreparation } from './EvaluationPreparation';
import { TYPE_COPY } from './generationWizardOptions';
import { RubricEditor } from './RubricEditor';
import { EvaluationCriteriaEditor } from './EvaluationCriteriaEditor';
import { EvaluationSourceReview } from './EvaluationSourceReview';
import { QuestionVisualEditor } from './QuestionVisualEditor';
import { QuestionNavigator } from './QuestionNavigator';
import { getVisualCapabilities } from '../visualApi';
import { PasosGuia } from './PasosGuia';
import {
  createBlankQuestion, createEmptyWizardState, discardWizardDraft, duplicateQuestion, getWizardStorage,
  evaluationToEditableQuestions, evaluationToWizardState, loadWizardDraft, MAX_QUESTIONS,
  moveQuestion, normalizeRubricCriteria, persistWizardDraft, prepareRubricCriteriaForSave, QUESTION_TYPES, questionsToUpdatePayload,
  renumberQuestions, selectedQuestionTypes, totalQuestionCount, validateQuestion,
  updateWizardTopic, updateQuestionVisual, reconcileVisualQuestions, validatePreparation, validateReferenceFile, validateRubricCriteria, validateStep, type EditableQuestion, type QuestionType, type WizardState,
  loadVisualEditDraft, discardVisualEditDraft,
} from './generationWizardModel';

function QuestionCard({
  question, index, total, evaluationModality, onChange, onDelete, onDuplicate, onMove, visualEditor,
}: {
  question: EditableQuestion;
  index: number;
  total: number;
  evaluationModality: EvaluacionModalidad;
  onChange: (patch: Partial<EditableQuestion>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  visualEditor?: ReactNode;
}) {
  const confirmAnswer = (respuestaEsperada: string): Partial<EditableQuestion> => ({
    respuestaEsperada,
    answerOrigin: respuestaEsperada ? 'confirmacion_docente' : 'pendiente',
    answerConfidence: respuestaEsperada ? 1 : 0,
    answerExplanation: respuestaEsperada
      ? 'Respuesta confirmada o editada por el docente.'
      : undefined,
  });
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
      <div className="writing-secondary flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold">Pregunta {index + 1} de {total}</h4>
          <span className="text-sm text-muted">{TYPE_COPY[question.tipo].label}</span>
        </div>
      </div>

      {(
        <div id={`question-${question.clientId}`} className="space-y-4 border-t border-border p-4">
          {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{error}</p>}
          <Field label="Enunciado" required>
            <Textarea value={question.enunciado} onChange={(event) => onChange({ enunciado: event.target.value })} className="min-h-28 text-base leading-7" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
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
            <Field label="Puntaje" required>
              <Input type="number" min={0.01} step={0.01} value={question.puntaje} onChange={(event) => onChange({ puntaje: Number(event.target.value) })} className="min-h-12 w-full text-base" aria-label={`Puntaje de la pregunta ${index + 1}`} />
            </Field>
          </div>
          {visualEditor}

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
                  onChange={(event) => onChange(confirmAnswer(event.target.value))}
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
              <Textarea value={question.respuestaEsperada} onChange={(event) => onChange(confirmAnswer(event.target.value))} className="min-h-20 text-base" />
            </Field>
          )}

          {!question.respuestaEsperada.trim() ? (
            <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-bold">Respuesta correcta por confirmar</p>
              <p>No usamos como clave lo que escribió o marcó el estudiante. Completa esta respuesta antes de publicar.</p>
            </div>
          ) : question.answerExplanation ? (
            <div role="note" className="writing-secondary rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              <p className="font-bold">Por qué se propone esta respuesta</p>
              <p>{question.answerExplanation}</p>
            </div>
          ) : null}

          <div className="writing-secondary flex flex-wrap gap-2 border-t border-border pt-3">
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
  const [expanded, setExpanded] = useState(true);
  const [message, setMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const context = useMemo(() => [
    `Materia: ${materiaNombre || 'sin seleccionar'}`,
    `Etapa: ${state.step === 5 ? 'Revisar' : 'Preparar'}`,
    `Enfoque: ${[
      state.useDba ? `${state.dbaIds.length + state.dbaPersonalizadoIds.length} criterios de aprendizaje` : '',
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
        <span className="min-w-0 flex-1"><span className="block text-base font-bold">Pregúntale a Xali</span><span className="text-sm text-muted"><span className="sm:hidden">Ayuda opcional</span><span className="hidden sm:inline">Asistencia opcional y separada</span></span></span>
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
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [gradingOptionsOpen, setGradingOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState(false);
  const [xaliConfirmation, setXaliConfirmation] = useState<{ suggestion: string; target: string } | null>(null);
  const generateLock = useRef(false);
  const generationOwner = useRef<{ userId: string; materiaId: string } | null>(null);
  const confirmLock = useRef(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const initializedKey = useRef<string | null>(null);
  const savedEvaluation = useRef<Evaluacion | null>(initialEvaluation);
  const initialSavedState = useRef<WizardState | null>(null);
  const activeContext = useRef({ userId, materiaId: state.materiaId, id: state.generatedEvaluationId });
  activeContext.current = { userId, materiaId: state.materiaId, id: state.generatedEvaluationId };
  const [criteriaEditing, setCriteriaEditing] = useState<Evaluacion | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [closePrompt, setClosePrompt] = useState(false);
  const editorBaseline = useRef<string | null>(null);
  const activeQuestionIndex = Math.max(0, state.questions.findIndex(question => question.clientId === activeQuestionId));
  const mobile = useMobileFormViewport(open && !criteriaEditing, formRef);
  const generationWarnings = state.generationWarnings ?? [];
  const selectedMateria = availableMaterias.find((materia) => materia.id === state.materiaId);
  const materiaNombre = selectedMateria?.nombre ?? '';
  const fixedContext = Boolean(initialMateriaId || initialEvaluation);
  const visualCapabilities = useQuery({ queryKey: ['evaluation-visual-capabilities'], queryFn: getVisualCapabilities,
    enabled: open && state.step === 5, staleTime: 30_000, retry: false });

  const dba = useQuery({
    queryKey: queryKeys.materias.dbaCombined(state.materiaId),
    queryFn: () => listDbaCombinado(state.materiaId),
    enabled: open && Boolean(state.materiaId) && state.useDba,
    retry: false,
  });

  const generate = useMutation({
    mutationFn: (payload: EvaluacionGenerarRequest) => generarBorradorEvaluacion(payload),
    onSuccess: (evaluation, payload) => {
      if (activeContext.current.userId !== generationOwner.current?.userId || activeContext.current.materiaId !== payload.materia_id) return;
      if (evaluation.materia_id !== payload.materia_id) { setGenerationError('No pudimos asociar el borrador a esta materia. Revisa la evaluación antes de continuar.'); return; }
      savedEvaluation.current = evaluation;
      editorBaseline.current = JSON.stringify(evaluationPayload(evaluationToWizardState(evaluation)));
      setGenerationError(null);
      setState((current) => ({
        ...current,
        step: 5,
        generatedEvaluationId: evaluation.id,
        generatedUpdatedAt: evaluation.updated_at,
        generationWarnings: evaluation.blueprint?.reglas_feedback?.trazabilidad?.advertencias ?? [],
        generatedCriteria: normalizeRubricCriteria((evaluation.criterios ?? []) as Record<string, unknown>[]),
        questions: evaluationToEditableQuestions(evaluation),
      }));
    },
    onError: (error) => setGenerationError(toApiError(error).detail),
    onSettled: () => { generateLock.current = false; },
  });

  const restoreGenerated = useMutation({
    mutationFn: (context: { userId: string; materiaId: string; id: string; version?: string }) => getEvaluacion(context.id),
    onSuccess: (evaluation, context) => {
      if (activeContext.current.userId !== context.userId || activeContext.current.materiaId !== context.materiaId || activeContext.current.id !== context.id) return;
      if (evaluation.id !== context.id || evaluation.materia_id !== context.materiaId) {
        setRestoreError('No pudimos comprobar que este borrador pertenezca a la materia. Conservamos tus cambios, pero no podemos guardarlos.');
        return;
      }
      if (context.version && context.version !== evaluation.updated_at) {
        setRestoreError('La evaluación cambió desde que dejaste este borrador. Conservamos tus cambios; abre la versión actual antes de guardar.');
        return;
      }
      savedEvaluation.current = evaluation;
      patch({ generatedUpdatedAt: evaluation.updated_at });
      editorBaseline.current = JSON.stringify(evaluationPayload(evaluationToWizardState(evaluation)));
      setRestoreError(null);
    setSaveError(null);
    },
    onError: (_error, context) => {
      if (activeContext.current.userId === context.userId && activeContext.current.materiaId === context.materiaId && activeContext.current.id === context.id) {
        setRestoreError('No pudimos comprobar este borrador. Revisa tu conexión y tu acceso a la evaluación antes de guardar.');
      }
    },
  });

  const extractReference = useMutation({
    mutationFn: (context: { file: File; userId: string; materiaId: string }) => extraerReferenciaEvaluacion(context.materiaId, context.file),
    onSuccess: (result, context) => {
      if (activeContext.current.userId !== context.userId || activeContext.current.materiaId !== context.materiaId) return;
      patch({ referenceText: result.texto.slice(0, 12000) });
      if (result.advertencias.length) toast(result.advertencias.join(' '), { icon: '⚠️' });
      else toast.success('Material leído y listo para orientar la evaluación.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const confirm = useMutation({
    mutationFn: ({ id, payload }: { userId: string; id: string; payload: Parameters<typeof updateEvaluacion>[1] }) => updateEvaluacion(id, payload),
    onSuccess: (evaluation, context) => {
      if (activeContext.current.userId !== context.userId || activeContext.current.id !== context.id) return;
      if (!initialEvaluation) discardWizardDraft(getWizardStorage(), userId, state.materiaId);
      else discardVisualEditDraft(getWizardStorage(), userId, initialEvaluation.id);
      setSaveError(null);
      onCompleted(evaluation);
    },
    onError: (_error, context) => {
      if (activeContext.current.userId === context.userId && activeContext.current.id === context.id) setSaveError('No pudimos guardar los cambios. Se conservan aquí; revisa tu conexión y vuelve a guardar.');
    },
    onSettled: () => { confirmLock.current = false; },
  });

  useEffect(() => {
    if (!open) { initializedKey.current = null; setCriteriaEditing(null); return; }
    const materiaId = initialMateriaId || availableMaterias[0]?.id || '';
    const key = `${userId}:${initialEvaluation?.id ?? 'new'}:${materiaId}`;
    if (initializedKey.current === key) return;
    initializedKey.current = key;
    setActiveQuestionId(null); setClosePrompt(false);
    editorBaseline.current = initialEvaluation ? JSON.stringify(evaluationPayload(evaluationToWizardState(initialEvaluation))) : null;
    savedEvaluation.current = initialEvaluation;
    initialSavedState.current = initialEvaluation ? evaluationToWizardState(initialEvaluation) : null;
    setGenerationError(null);
    setRestoreError(null);
    setSaveError(null);
    setPersonalizationOpen(false);
    setGradingOptionsOpen(false);
    setHelpOpen(false);
    setStorageNotice(false);
    setCanPersist(false);
    if (initialEvaluation) {
      const restored = loadVisualEditDraft(getWizardStorage(), userId, initialEvaluation.id);
      setState(restored || initialSavedState.current!);
      setRestorePrompt(Boolean(restored));
      setCanPersist(!restored);
      return;
    }
    const restored = materiaId ? loadWizardDraft(getWizardStorage(), userId, Date.now(), materiaId) : null;
    if (restored) {
      setState(restored);
      setRestorePrompt(true);
      return;
    }
    setState(createEmptyWizardState(materiaId));
    setRestorePrompt(false);
    setCanPersist(true);
  }, [availableMaterias, initialEvaluation, initialMateriaId, open, userId]);

  useEffect(() => {
    if (open && canPersist && state.materiaId && (!initialEvaluation || state.contenidoVisual || state.visualJobs)
        && !persistWizardDraft(getWizardStorage(), userId, state, Date.now(), initialEvaluation?.id)) setStorageNotice(true);
  }, [canPersist, initialEvaluation, open, state, userId]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [open, state.step]);

  function patch(patchValue: Partial<WizardState>) {
    setState((current) => ({ ...current, ...patchValue }));
  }

  function selectQuestion(index: number) {
    const question = state.questions[index];
    if (!question) return;
    setActiveQuestionId(question.clientId);
    // Keep the question editor in view; do not focus a text field/open a keyboard.
    window.requestAnimationFrame(() => contentRef.current?.querySelector<HTMLElement>('[aria-label="Preguntas editables"]')?.scrollIntoView({ block: 'nearest' }));
  }

  function requestClose() {
    if (generate.isPending || confirm.isPending || extractReference.isPending || restoreGenerated.isPending) return;
    if (state.generatedEvaluationId && editorBaseline.current !== JSON.stringify(evaluationPayload(state))) setClosePrompt(true);
    else onClose();
  }

  function selectMateria(materiaId: string) {
    const restored = loadWizardDraft(getWizardStorage(), userId, Date.now(), materiaId);
    setState(restored ?? createEmptyWizardState(materiaId));
    setRestorePrompt(Boolean(restored));
    setCanPersist(!restored);
    setGenerationError(null);
    setRestoreError(null);
    setSaveError(null);
  }

  function continueDraft() {
    setRestorePrompt(false);
    setCanPersist(true);
    if (state.generatedEvaluationId) restoreGenerated.mutate({ userId, materiaId: state.materiaId, id: state.generatedEvaluationId, version: state.generatedUpdatedAt });
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
    extractReference.mutate({ file, userId, materiaId: state.materiaId });
  }

  function focusPreparationError() {
    const selector = !state.materiaId ? 'select'
      : state.nombreAutomatico && !state.descripcion.trim() ? '[data-prepare-field="topic"]'
        : state.nombre.trim().length < 2 || state.nombre.trim().length > 220 ? '[data-prepare-field="name"]'
          : !Number.isFinite(state.notaMaxima) || state.notaMaxima <= 0 ? '[data-prepare-field="scale"]'
            : state.fechaLimiteEntrega && !Number.isFinite(new Date(state.fechaLimiteEntrega).getTime()) ? '[data-prepare-field="deadline"]'
              : validateStep(state, 2) ? '[aria-label="Buscar criterios de aprendizaje"]'
                : validateStep(state, 3) ? '[aria-label^="Agregar una pregunta"]'
                  : 'textarea';
    setPersonalizationOpen(true);
    window.requestAnimationFrame(() => contentRef.current?.querySelector<HTMLElement>(selector)?.focus());
  }

  function generateDraft() {
    if (generate.isPending || generateLock.current || state.generatedEvaluationId || extractReference.isPending) return;
    const error = validatePreparation(state);
    if (error) {
      setGenerationError(error);
      focusPreparationError();
      return;
    }
    const distribution = QUESTION_TYPES
      .filter((type) => state.counts[type] > 0)
      .map((type) => `${TYPE_COPY[type].label}: ${state.counts[type]}`)
      .join(', ');
    const instructions = [
      `Distribución requerida por tipo: ${distribution}.`,
      state.instruccionesAdicionales.trim(),
    ].filter(Boolean).join('\n\n');
    generateLock.current = true;
    generationOwner.current = { userId, materiaId: state.materiaId };
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

  function revealReviewErrors() {
    if (validateStep(state, 1)) {
      patch({ step: 1 });
      focusPreparationError();
      return;
    }
    if (state.useRubric && validateRubricCriteria(state.generatedCriteria)) {
      setGradingOptionsOpen(true);
      window.requestAnimationFrame(() => contentRef.current?.querySelector<HTMLElement>('[aria-label="Editor de rúbrica"] input')?.focus());
      return;
    }
    const index = state.questions.findIndex((question, position) => validateQuestion(question, position));
    if (index < 0) return;
    const question = state.questions[index];
    setActiveQuestionId(question.clientId);
    const invalidScore = question.enunciado.trim() && (!Number.isFinite(question.puntaje) || question.puntaje <= 0);
    const selector = invalidScore ? `[aria-label="Puntaje de la pregunta ${index + 1}"]` : 'textarea';
    const requestedBy = document.activeElement;
    patch({ questions: state.questions.map((question, position) => position === index ? { ...question, expanded: true } : question) });
    window.requestAnimationFrame(() => {
      // Do not steal focus if the teacher already moved to another field.
      if (document.activeElement !== requestedBy) return;
      contentRef.current?.querySelector<HTMLElement>(`#question-${question.clientId} ${selector}`)?.focus();
    });
  }

  function confirmEvaluation() {
    if (confirm.isPending || confirmLock.current || !state.generatedEvaluationId || restoreGenerated.isPending || restoreError || !savedEvaluation.current) return;
    const error = validateStep(state, 5);
    if (error) { toast.error(error); return; }
    setSaveError(null);
    confirmLock.current = true;
    const currentPayload = evaluationPayload(state);
    const initialPayload = initialSavedState.current ? evaluationPayload(initialSavedState.current) : null;
    const payload = initialEvaluation && initialPayload
      ? Object.fromEntries(Object.entries(currentPayload).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initialPayload[key as keyof typeof initialPayload])))
      : currentPayload;
    confirm.mutate({
      userId,
      id: state.generatedEvaluationId,
      payload: { ...payload, expected_updated_at: savedEvaluation.current?.updated_at,
        ...(savedEvaluation.current?.contenido_version_id ? { expected_content_version_id: savedEvaluation.current.contenido_version_id } : {}) },
    });
  }

  function evaluationPayload(current: WizardState) {
    return {
      nombre: current.nombre.trim(), descripcion: current.descripcion.trim() || undefined,
      ...(current.lectura !== undefined ? { lectura: current.lectura.trim() || null } : {}),
      modalidad: current.modalidad, nota_maxima: current.notaMaxima,
      fecha_limite_entrega: current.fechaLimiteEntrega ? new Date(current.fechaLimiteEntrega).toISOString() : null,
      dba_ids: current.useDba ? current.dbaIds : [],
      dba_personalizado_ids: current.useDba ? current.dbaPersonalizadoIds : [],
      criterios: current.useRubric ? prepareRubricCriteriaForSave(current.generatedCriteria, current.notaMaxima) : current.generatedCriteria,
      ...questionsToUpdatePayload(current.questions),
      ...(current.contenidoVisual ? { contenido_visual: current.contenidoVisual, claves_visuales_revisadas: current.visualKeysReviewed ?? [] } : {}),
    };
  }

  function editCriteria() {
    if (!savedEvaluation.current) return;
    setCriteriaEditing({ ...savedEvaluation.current,
      dba_ids: state.useDba ? state.dbaIds : [], dba_personalizado_ids: state.useDba ? state.dbaPersonalizadoIds : [],
      criterios: evaluationPayload(state).criterios,
    });
  }

  function resetDraft(close = false) {
    if (initialEvaluation) {
      discardVisualEditDraft(getWizardStorage(), userId, initialEvaluation.id);
      setState(evaluationToWizardState(initialEvaluation)); setRestorePrompt(false); setCanPersist(!close);
      if (close) onClose();
      return;
    }
    discardWizardDraft(getWizardStorage(), userId, state.materiaId);
    setState(createEmptyWizardState(initialMateriaId || state.materiaId || availableMaterias[0]?.id || ''));
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

  const validation = state.step === 5 ? validateStep(state, 5) : validatePreparation(state);
  const questionErrors = state.questions.filter((question, index) => validateQuestion(question, index)).length;
  const editingQuestions = state.step === 5 && Boolean(state.generatedEvaluationId);
  const busy = generate.isPending || confirm.isPending || extractReference.isPending || restoreGenerated.isPending;

  return (
    <>
      <Modal
        open={open && !criteriaEditing}
        onClose={requestClose}
        title=""
        ariaLabel={initialEvaluation ? 'Editar contenido de la evaluación' : 'Generar evaluación con IA'}
        className={cn(initialEvaluation ? 'max-w-[min(96vw,90rem)]' : 'max-w-6xl', 'bg-surface overflow-hidden p-0 sm:p-0 max-sm:fixed max-sm:inset-0 max-sm:max-w-none max-sm:max-h-none max-sm:rounded-none')}
        mobileViewport={mobile.viewport}
        mobileWriting={mobile.isWriting}
        initialFocusRef={closeRef}
        showCloseButton={false}
        closeOnBackdrop={!busy}
        closeOnEscape={!busy}
      >
        <div ref={formRef} className={cn('flex flex-col', mobile.isMobile ? 'h-[var(--mobile-form-height,100dvh)]' : 'h-[100dvh] sm:h-[calc(100dvh-2rem)] sm:max-h-[56rem]', mobile.isWriting ? '[&_button]:min-h-11 [&_button]:min-w-11 [&_.writing-secondary]:hidden [&_.writing-secondary]:m-0' : '[&_button]:min-h-12 [&_button]:min-w-12')}>
          <header className="shrink-0 border-b border-border bg-surface p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5" style={mobile.isWriting ? { padding: '4px 8px', paddingTop: 'max(4px, env(safe-area-inset-top))' } : undefined}>
            <div className="flex items-center gap-3">
              <span className="writing-secondary hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 sm:grid"><Sparkles className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold sm:text-xl">{mobile.isWriting ? (state.step === 5 ? 'Editar pregunta' : 'Escribir evaluación') : initialEvaluation ? 'Editar evaluación' : 'Crear evaluación'}</h2>
                <p className="writing-secondary hidden text-sm text-muted sm:block">{initialEvaluation ? 'Modifica, agrega, ordena o elimina criterios y preguntas antes de guardar.' : 'La IA prepara un borrador; tú revisas y decides.'}</p>
              </div>
              <Button type="button" ref={closeRef} variant="ghost" size="icon" onClick={requestClose} disabled={busy} aria-label="Cerrar asistente"><X className="h-5 w-5" /></Button>
            </div>
            {!initialEvaluation && <div className="writing-secondary mt-2"><PasosGuia currentStep={state.step === 5 ? 2 : 1} /></div>}
          </header>

          <div ref={contentRef} data-testid="evaluation-wizard-content" data-mobile-scroll className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", mobile.isWriting ? "p-2" : "p-3 sm:p-5")}>
            {restorePrompt ? (
              <div role="alert" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:bg-amber-500/10">
                <p className="flex items-center gap-2 text-base font-bold text-amber-900 dark:text-amber-100"><AlertTriangle className="h-5 w-5" /> Encontramos una evaluación sin terminar.</p>
                {state.referenceFile?.needsReselection && <p className="mt-2 text-sm">Vuelve a seleccionar {state.referenceFile.name}; solo se conservó su información básica.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={continueDraft}>Continuar</Button>
                  <Button type="button" variant="outline" onClick={() => resetDraft(true)}>Descartar</Button>
                  <Button type="button" variant="outline" onClick={() => resetDraft(false)}>Empezar de nuevo</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <main className={cn('min-w-0', !editingQuestions && 'rounded-2xl border border-border bg-surface-2/50 p-3 sm:p-5', editingQuestions && 'order-2', mobile.isWriting && 'border-transparent bg-transparent p-0 sm:p-0')}>
                  {generationError && <p role="alert" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">{generationError}</p>}
                  {saveError && <p role="alert" className="mb-3 rounded-xl border border-amber-300 p-3 text-sm">{saveError}</p>}
                  {restoreError && <div role="alert" className="mb-3 space-y-2 rounded-xl border border-amber-300 p-3 text-sm"><p>{restoreError}</p><Button type="button" variant="outline" disabled={restoreGenerated.isPending} onClick={continueDraft}>Volver a comprobar</Button></div>}
                  {restoreGenerated.isPending && <p role="status" className="mb-3 text-sm text-muted">Comprobando tu borrador…</p>}
                  {storageNotice && <p role="status" className="mb-3 text-xs text-muted">No pudimos conservar el borrador en este dispositivo. Mantén esta ventana abierta hasta guardarlo.</p>}
                  {state.step !== 5 && <fieldset disabled={busy} className="min-w-0"><EvaluationPreparation
                    state={state} materias={availableMaterias} fixedContext={fixedContext} mobile={mobile.isMobile}
                    expanded={personalizationOpen} onExpandedChange={setPersonalizationOpen}
                    onPatch={patch} onTopicChange={topic => setState(current => updateWizardTopic(current, topic))}
                    onMateriaChange={selectMateria} onToggleCriterion={toggleDba}
                    criteria={{ items: dba.data, loading: dba.isLoading, error: dba.isError }}
                    referenceInputRef={referenceInputRef} extracting={extractReference.isPending} onReferenceFile={selectReferenceFile}
                  /></fieldset>}
                  {state.step === 5 && (
                    <section aria-labelledby="wizard-step-title" className="space-y-4">
                        {generationWarnings.length > 0 && <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">{generationWarnings.join(' ')}</div>}
                        <div className="writing-secondary flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <h3 id="wizard-step-title" className="text-base font-bold">Revisa y edita la evaluación</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={questionErrors || !state.questions.length ? 'warning' : 'success'}>{!state.questions.length ? 'Agrega una pregunta' : questionErrors ? `${questionErrors} por corregir` : 'Todas válidas'}</Badge>
                            <Button type="button" variant="outline" onClick={() => { const next = createBlankQuestion(state.questions, state.modalidad); setActiveQuestionId(next[next.length - 1].clientId); patch(reconcileVisualQuestions(state, next)); }} disabled={state.questions.length >= MAX_QUESTIONS}><Plus className="h-4 w-4" /> Agregar pregunta</Button>
                          </div>
                        </div>
                        {initialEvaluation && initialEvaluation.estado !== 'borrador' && (
                          <details className="writing-secondary rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                            <summary className="focus-ring min-h-11 cursor-pointer py-2 font-semibold">Evaluación asignada: los cambios se aplican al guardar</summary>
                            <p className="pb-3 leading-6">Se conservan las entregas y notas anteriores. Si cambias criterios, puntajes o respuestas correctas, revisa las calificaciones afectadas.</p>
                          </details>
                        )}
                        <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
                        <QuestionNavigator questions={state.questions} activeIndex={activeQuestionIndex} onSelect={selectQuestion} />
                        <div role="list" aria-label="Preguntas editables" className="min-w-0 space-y-4">
                          {visualCapabilities.isError && <div role="status" className="rounded-lg border border-border p-3 text-sm"><p>El contenido guardado sigue disponible. No pudimos cargar las opciones para añadir figuras.</p><Button variant="outline" onClick={() => { void visualCapabilities.refetch(); }}>Cargar opciones de figuras</Button></div>}
                          {state.contenidoVisual && state.generatedEvaluationId && <EvaluationSourceReview
                            evaluationId={state.generatedEvaluationId} versionId={state.contenidoVersionId} manifest={state.contenidoVisual}
                            onChange={visualCapabilities.data?.editor ? contenidoVisual => patch({ contenidoVisual, visualKeysReviewed: [], visualKeysPending: contenidoVisual.pregunta_ids }) : undefined}
                            questions={state.questions.filter(question => question.contenidoId).map(question => ({ id: question.contenidoId!, label: `Pregunta ${question.numero}` }))} />}
                          {state.questions.map((question, index) => index === activeQuestionIndex && (
                            <QuestionCard
                              key={question.clientId}
                              question={question}
                              index={index}
                              total={state.questions.length}
                              evaluationModality={state.modalidad}
                              visualEditor={visualCapabilities.data?.editor && state.generatedEvaluationId ? <div className="min-w-0 space-y-3">
                                {state.contenidoVisual?.bloques.filter(block => block.pregunta_ids.includes(question.contenidoId || '')).map(block => <QuestionVisualEditor
                                  key={block.id} existing={block} evaluationId={state.generatedEvaluationId!} materiaId={state.materiaId} questionId={question.contenidoId!}
                                  suggestedArea={selectedMateria?.area}
                                  versionId={state.contenidoVersionId} generationEnabled={visualCapabilities.data.generacion}
                                  pendingJobId={state.visualJobs?.[`${question.contenidoId}:${block.id}`]}
                                  onJobChange={jobId => setState(current => { const visualJobs = { ...current.visualJobs }; const key = `${question.contenidoId}:${block.id}`; if (jobId) visualJobs[key] = jobId; else delete visualJobs[key]; return { ...current, visualJobs }; })}
                                  onAccept={value => setState(current => updateQuestionVisual(current, question.contenidoId!, value, block.id))}
                                  onRemove={() => setState(current => updateQuestionVisual(current, question.contenidoId!, null, block.id))} />)}
                                <QuestionVisualEditor evaluationId={state.generatedEvaluationId} materiaId={state.materiaId} questionId={question.contenidoId || ''}
                                  suggestedArea={selectedMateria?.area}
                                  pendingJobId={state.visualJobs?.[`${question.contenidoId}:new`]}
                                  onJobChange={jobId => setState(current => { const visualJobs = { ...current.visualJobs }; const key = `${question.contenidoId}:new`; if (jobId) visualJobs[key] = jobId; else delete visualJobs[key]; return { ...current, visualJobs }; })}
                                  onBegin={() => setState(current => ({ ...current, questions: current.questions.map(item => ({ ...item, contenidoId: item.contenidoId || crypto.randomUUID() })) }))}
                                  versionId={state.contenidoVersionId} generationEnabled={visualCapabilities.data.generacion}
                                  onAccept={value => setState(current => updateQuestionVisual(current, value.pregunta_ids[0], value))} />
                                {state.visualKeysPending?.includes(question.contenidoId || '') && <label className="flex min-h-11 items-start gap-2 text-sm leading-6"><input type="checkbox" checked={state.visualKeysReviewed?.includes(question.contenidoId || '') || false}
                                  onChange={event => { const checked = event.target.checked; setState(current => ({ ...current,
                                    visualKeysReviewed: checked ? [...new Set([...(current.visualKeysReviewed ?? []), question.contenidoId!])] : (current.visualKeysReviewed ?? []).filter(id => id !== question.contenidoId) })); }} />He comprobado la respuesta correcta con este material.</label>}
                              </div> : undefined}
                              onChange={(questionPatch) => patch({ questions: state.questions.map((current, currentIndex) => currentIndex === index ? { ...current, ...questionPatch } : current) })}
                              onDelete={() => { const next = renumberQuestions(state.questions.filter((_, currentIndex) => currentIndex !== index)); setActiveQuestionId(next[Math.min(index, next.length - 1)]?.clientId ?? null); patch(reconcileVisualQuestions(state, next)); }}
                              onDuplicate={() => { const next = duplicateQuestion(state.questions, index); setActiveQuestionId(next[index + 1].clientId); patch(reconcileVisualQuestions(state, next, question.contenidoId)); }}
                              onMove={(direction) => patch(reconcileVisualQuestions(state, moveQuestion(state.questions, index, direction)))}
                            />
                          ))}
                        </div>
                        </div>
                        <details className="rounded-xl border border-border bg-surface p-3" open={Boolean(state.lectura)}>
                          <summary className="writing-secondary focus-ring min-h-11 cursor-pointer py-2 font-semibold">Lectura o texto de apoyo</summary>
                          <p className="writing-secondary mb-2 text-xs text-muted">Se muestra antes de las preguntas y se conserva al imprimir.</p>
                          <Textarea aria-label="Lectura o texto de apoyo" value={state.lectura ?? ''} maxLength={60000} rows={8}
                            className="min-h-48 text-base leading-7" placeholder="Añade o corrige aquí la lectura de la evaluación."
                            onChange={event => patch({ lectura: event.target.value })} />
                        </details>
                        <details open={gradingOptionsOpen} onToggle={event => setGradingOptionsOpen(event.currentTarget.open)} className="rounded-xl border border-border bg-surface p-3">
                          <summary className="writing-secondary focus-ring min-h-12 cursor-pointer py-2 font-semibold">Cómo se calificará</summary>
                          {state.useRubric && <RubricEditor criteria={state.generatedCriteria} onChange={(generatedCriteria) => patch({ generatedCriteria })} />}
                          <Button type="button" variant="outline" onClick={editCriteria}>Criterios y rúbrica</Button>
                        </details>
                      </section>
                  )}
                </main>
                <div className="order-3">
                  <Button type="button" variant="ghost" className="writing-secondary" aria-expanded={helpOpen} onClick={() => setHelpOpen(value => !value)} disabled={busy}>Necesito ayuda</Button>
                  {helpOpen && <XaliPanel state={state} materiaNombre={materiaNombre} onSuggestion={(suggestion, target) => setXaliConfirmation({ suggestion, target })} />}
                </div>
              </div>
            )}
          </div>

          {!restorePrompt && (
            <footer className="shrink-0 border-t border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5" style={mobile.isWriting ? { padding: "4px 8px", paddingBottom: "max(4px, env(safe-area-inset-bottom))" } : undefined}>
              {validation && (!mobile.isWriting || state.step === 5) && <div className="mb-2 flex flex-wrap items-center gap-2"><p className="min-w-0 flex-1 text-xs text-muted" aria-live="polite">{validation}</p>{state.step === 5 && <Button type="button" variant="ghost" onClick={revealReviewErrors}>Revisar pendientes</Button>}</div>}
              <Button type="button" className={cn('w-full', !mobile.isWriting && 'hidden')} onClick={mobile.finishWriting}>Listo</Button>
              <div className={cn("flex items-center justify-between gap-2", mobile.isWriting && "hidden")}>
                {state.step === 5 ? <Button variant="outline" className="shrink-0 whitespace-nowrap px-3 sm:px-5" onClick={() => patch({ step: 1 })} disabled={busy} icon={<ArrowLeft className="h-5 w-5" />}>Preparar</Button> : <span className="hidden text-xs text-muted sm:inline">No se publicará automáticamente.</span>}
                {state.step === 5
                  ? <Button onClick={confirmEvaluation} loading={confirm.isPending} disabled={Boolean(validation) || busy || Boolean(restoreError)} icon={<Check className="h-5 w-5" />}>{initialEvaluation ? 'Guardar cambios' : 'Guardar borrador'}</Button>
                  : state.generatedEvaluationId
                    ? <Button onClick={() => patch({ step: 5 })} disabled={busy}>Revisar preguntas</Button>
                    : <Button className="w-full sm:w-auto" onClick={generateDraft} loading={generate.isPending} disabled={busy || !state.nombre.trim()} icon={<Sparkles className="h-5 w-5" />}>Generar evaluación</Button>}
              </div>
            </footer>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={closePrompt} onClose={() => setClosePrompt(false)} onConfirm={() => { setClosePrompt(false); resetDraft(true); }}
        title="¿Salir sin guardar los cambios?" description="Los cambios de esta edición se descartarán. Puedes seguir editando y guardarlos antes de salir."
        confirmLabel="Descartar y salir" cancelLabel="Seguir editando" tone="danger" />

      {criteriaEditing && <EvaluationCriteriaEditor evaluation={criteriaEditing} onClose={() => setCriteriaEditing(null)} onCompleted={(evaluation) => {
        savedEvaluation.current = evaluation;
        const next = evaluationToWizardState(evaluation);
        const criteriaPatch = { generatedUpdatedAt: evaluation.updated_at, dbaIds: next.dbaIds, dbaPersonalizadoIds: next.dbaPersonalizadoIds, useDba: next.useDba, generatedCriteria: next.generatedCriteria, useRubric: next.useRubric };
        if (initialSavedState.current) initialSavedState.current = { ...initialSavedState.current, ...criteriaPatch };
        if (editorBaseline.current) {
          const saved = evaluationPayload(next);
          editorBaseline.current = JSON.stringify({ ...JSON.parse(editorBaseline.current), criterios: saved.criterios, dba_ids: saved.dba_ids, dba_personalizado_ids: saved.dba_personalizado_ids });
        }
        patch(criteriaPatch); setCriteriaEditing(null);
        toast.success('Criterios guardados. Tus preguntas en edición se conservan.');
      }} />}

      <ConfirmDialog open={Boolean(xaliConfirmation)} onClose={() => setXaliConfirmation(null)} onConfirm={applyXali} title="¿Aplicar la sugerencia de Xali?" description="Xali nunca modifica el wizard sin tu aprobación." confirmLabel="Sí, aplicar">
        {xaliConfirmation && <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:bg-violet-500/10"><p className="text-sm"><strong>Campo:</strong> {xaliConfirmation.target}</p><p className="text-sm leading-6">{xaliConfirmation.suggestion}</p></div>}
      </ConfirmDialog>
    </>
  );
}
