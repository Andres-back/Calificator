import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, ClipboardCheck, Send, Lock, FileText, Trash2, BookOpen, BookOpenCheck, UserPlus, Pencil, Sparkles, Eye } from 'lucide-react';
import { Button, Card, Badge, statusTone, Skeleton, EmptyState, Modal, Input, Field, Textarea, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias, MateriaSelect } from '@/modules/materias/MateriaSelect';
import { listDbaCombinado } from '@/modules/materias/dbaApi';
import { GenerationWizard } from './components/GenerationWizard';
import { EvaluationPreviewModal } from './components/EvaluationPreviewModal';
import { EvaluationCreateMenu } from './components/EvaluationCreateMenu';
import { DigitalizarEvaluacionModal } from './components/DigitalizarEvaluacionModal';
import { DBASelector } from './components/DBASelector';
import { queryKeys } from '@/config/queryKeys';
import {
  listEvaluaciones,
  createEvaluacion,
  generarBorradorEvaluacion,
  updateEvaluacion,
  publicarEvaluacion,
  cerrarEvaluacion,
  type EvaluacionCreate,
  type EvaluacionGenerarRequest,
  type EvaluacionUpdate,
} from './api';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useMobileFormViewport } from '@/hooks/useMobileFormViewport';
import { useAuth } from '@/stores/auth';
import type { DBAUnifiedItem, Evaluacion, EvaluacionEstado, EvaluacionModalidad } from '@/types/api';
import { getStudentEvaluationAction, getStudentEvaluationStatus } from './studentProgress';

const ESTADO_LABEL: Record<EvaluacionEstado, string> = {
  borrador: 'Borrador',
  publicada: 'Publicada',
  en_calificacion: 'En calificación',
  pendiente_revision: 'Por revisar',
  cerrada: 'Cerrada',
};

type ListField = 'metas' | 'criterios' | 'preguntas' | 'respuestas';

interface EvaluationForm {
  lectura: string;
  materia_id: string;
  nombre: string;
  descripcion: string;
  modalidad: EvaluacionModalidad;
  nota_maxima: number;
  tipo_origen: 'nativa';
  dba_ids: string[];
  dba_personalizado_ids: string[];
  metas: string[];
  criterios: string[];
  preguntas: string[];
  respuestas: string[];
  cantidad_ia: number;
  criterios_detalle: Record<string, unknown>[];
  preguntas_detalle: Record<string, unknown>[];
  respuestas_detalle: Record<string, unknown>[];
}

const emptyForm = (materiaId = ''): EvaluationForm => ({
  lectura: '',
  materia_id: materiaId,
  nombre: '',
  descripcion: '',
  modalidad: 'online',
  nota_maxima: 5,
  tipo_origen: 'nativa',
  dba_ids: [],
  dba_personalizado_ids: [],
  metas: [],
  criterios: [],
  preguntas: [],
  respuestas: [],
  cantidad_ia: 10,
  criterios_detalle: [],
  preguntas_detalle: [],
  respuestas_detalle: [],
});

const emptyPending: Record<ListField, string> = {
  metas: '',
  criterios: '',
  preguntas: '',
  respuestas: '',
};

function evaluacionToForm(ev: Evaluacion): EvaluationForm {
  return {
    lectura: ev.lectura ?? '',
    materia_id: ev.materia_id,
    nombre: ev.nombre,
    descripcion: ev.descripcion ?? '',
    modalidad: (ev.modalidad ?? 'online') as EvaluacionModalidad,
    nota_maxima: Number(ev.nota_maxima),
    tipo_origen: 'nativa',
    dba_ids: (ev.dba_ids ?? []) as string[],
    dba_personalizado_ids: (ev.dba_personalizado_ids ?? []) as string[],
    metas: (ev.metas_profesor ?? []) as string[],
    criterios: (ev.criterios ?? []).map((c: Record<string, unknown>) => (c.nombre as string) ?? ''),
    preguntas: (ev.preguntas ?? []).map((p: Record<string, unknown>) => (p.enunciado as string) ?? ''),
    respuestas: (ev.respuestas_esperadas ?? []).map(
      (r: Record<string, unknown>) => ((r.texto ?? r.respuesta) as string) ?? '',
    ),
    cantidad_ia: Math.max(3, ev.preguntas?.length ?? 10),
    criterios_detalle: ev.criterios ?? [],
    preguntas_detalle: ev.preguntas ?? [],
    respuestas_detalle: ev.respuestas_esperadas ?? [],
  };
}

function listIsValid(values: string[]) {
  return values.every((value) => value.trim().length > 0);
}

function DynamicTextList({
  label,
  placeholder,
  values,
  pending,
  onPendingChange,
  onAdd,
  onChange,
  onRemove,
  hint,
}: {
  label: string;
  placeholder: string;
  values: string[];
  pending: string;
  onPendingChange: (value: string) => void;
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  hint?: string;
}) {
  const multiline = label === 'Preguntas' || label === 'Respuestas esperadas';
  const TextControl = multiline ? Textarea : Input;
  return (
    <div className="space-y-2">
      <Field label={label} hint={hint}>
        <div className="flex items-start gap-2">
          <TextControl className={cn('min-w-0 flex-1 text-base', multiline && 'min-h-24')} value={pending} onChange={(event) => onPendingChange(event.target.value)} placeholder={placeholder} />
          <Button className="min-h-11 shrink-0 whitespace-nowrap" type="button" variant="secondary" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </Field>
      {values.length > 0 && (
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={index} className="flex items-start gap-2">
              <TextControl aria-label={`${label} ${index + 1}`} className={cn('min-w-0 flex-1 text-base', multiline && 'min-h-24')} value={value} onChange={(event) => onChange(index, event.target.value)} />
              <Button className="min-h-11 min-w-11 shrink-0" type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} aria-label="Eliminar">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationFormModal({
  open,
  onClose,
  title,
  form,
  setForm,
  pending,
  setPending,
  dbaItems,
  loadingDBA,
  dbaError,
  materias,
  isEdit,
  onSubmit,
  onGenerateAI,
  isPending,
  aiPending,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  form: EvaluationForm;
  setForm: React.Dispatch<React.SetStateAction<EvaluationForm>>;
  pending: Record<ListField, string>;
  setPending: React.Dispatch<React.SetStateAction<Record<ListField, string>>>;
  dbaItems: DBAUnifiedItem[] | undefined;
  loadingDBA: boolean;
  dbaError: boolean;
  materias: { id: string; nombre: string }[] | undefined;
  isEdit: boolean;
  onSubmit: () => void;
  onGenerateAI?: () => void;
  isPending: boolean;
  aiPending: boolean;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const mobile = useMobileFormViewport(open, formRef);
  const [optionsOpen, setOptionsOpen] = useState(() => !mobile.isMobile);

  function addListItem(field: ListField) {
    const value = pending[field].trim();
    if (!value) return;
    setForm((current) => {
      const next = { ...current, [field]: [...current[field], value] };
      if (field === 'criterios') next.criterios_detalle = [...current.criterios_detalle, {}];
      if (field === 'preguntas') next.preguntas_detalle = [...current.preguntas_detalle, {}];
      if (field === 'respuestas') next.respuestas_detalle = [...current.respuestas_detalle, {}];
      return next;
    });
    setPending((current) => ({ ...current, [field]: '' }));
  }

  function updateListItem(field: ListField, index: number, value: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function removeListItem(field: ListField, index: number) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
      };
      if (field === 'criterios') {
        next.criterios_detalle = current.criterios_detalle.filter((_, itemIndex) => itemIndex !== index);
      }
      if (field === 'preguntas') {
        next.preguntas_detalle = current.preguntas_detalle.filter((_, itemIndex) => itemIndex !== index);
      }
      if (field === 'respuestas') {
        next.respuestas_detalle = current.respuestas_detalle.filter((_, itemIndex) => itemIndex !== index);
      }
      return next;
    });
  }

  function toggleDBA(item: DBAUnifiedItem) {
    setForm((current) => ({
      ...current,
      dba_ids:
        item.fuente === 'oficial'
          ? current.dba_ids.includes(item.id)
            ? current.dba_ids.filter((value) => value !== item.id)
            : [...current.dba_ids, item.id]
          : current.dba_ids,
      dba_personalizado_ids:
        item.fuente === 'personalizado'
          ? current.dba_personalizado_ids.includes(item.id)
            ? current.dba_personalizado_ids.filter((value) => value !== item.id)
            : [...current.dba_personalizado_ids, item.id]
          : current.dba_personalizado_ids,
    }));
  }

  function handleFormMateriaChange(materia_id: string) {
    setForm((current) => ({ ...current, materia_id, dba_ids: [], dba_personalizado_ids: [] }));
  }

  function submitFromDialog() {
    // Presentation only: the existing submit handler still owns validation.
    const field = !form.nombre.trim() ? 'name'
      : !isEdit && (!Number.isFinite(form.nota_maxima) || form.nota_maxima <= 0) ? 'scale' : undefined;
    if (field) {
      if (field === 'scale') setOptionsOpen(true);
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[data-manual-field="${field}"]`)?.focus());
    }
    onSubmit();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}
      mobileViewport={mobile.viewport} mobileWriting={mobile.isWriting}
      className={cn('flex max-w-4xl flex-col overflow-hidden [&_input]:text-base [&_textarea]:text-base [&_select]:text-base [&_button]:min-h-11 [&_button]:min-w-11',
        mobile.isMobile && 'rounded-none p-3 [&>h2]:mb-2 [&>h2]:min-h-11 [&>h2]:text-base',
        mobile.isWriting && '[&_.writing-secondary]:hidden [&_label>span.text-secondary]:hidden')}>
      <div ref={formRef} className="flex min-h-0 flex-1 flex-col">
        <div data-mobile-scroll className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-3">
          <div className="writing-secondary grid gap-4 md:grid-cols-2">
            {mobile.isMobile && (isEdit || materias?.length === 1) && <p className="text-sm font-semibold md:col-span-2">{materias?.find(item => item.id === form.materia_id)?.nombre}</p>}
            <div className={cn(mobile.isMobile && (isEdit || materias?.length === 1) && 'hidden')}>
            <Field label="Materia" required>
              <Select value={form.materia_id} onChange={(event) => handleFormMateriaChange(event.target.value)} required disabled={isEdit || materias?.length === 1}>
                <option value="">Selecciona una materia</option>
                {materias?.map((materia) => <option key={materia.id} value={materia.id}>{materia.nombre}</option>)}
              </Select>
            </Field>
            </div>
            <Field label="Modalidad" required>
              <Select value={form.modalidad} onChange={(event) => setForm({ ...form, modalidad: event.target.value as EvaluacionModalidad })} required>
                <option value="online">En línea</option><option value="fisica">En papel</option><option value="mixta">Mixta</option>
              </Select>
            </Field>
          </div>
          <Field label="Nombre" required>
            <Input data-manual-field="name" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Examen unidad 1" required minLength={2} />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <DynamicTextList
              label="Preguntas"
              placeholder="Escribe una pregunta para la evaluación"
              values={form.preguntas}
              pending={pending.preguntas}
              onPendingChange={(value) => setPending({ ...pending, preguntas: value })}
              onAdd={() => addListItem('preguntas')}
              onChange={(index, value) => updateListItem('preguntas', index, value)}
              onRemove={(index) => removeListItem('preguntas', index)}
              hint="Las preguntas que responderán los estudiantes."
            />
            <DynamicTextList
              label="Respuestas esperadas"
              placeholder="Escribe la respuesta esperada para cada pregunta"
              values={form.respuestas}
              pending={pending.respuestas}
              onPendingChange={(value) => setPending({ ...pending, respuestas: value })}
              onAdd={() => addListItem('respuestas')}
              onChange={(index, value) => updateListItem('respuestas', index, value)}
              onRemove={(index) => removeListItem('respuestas', index)}
              hint="La IA usará esto para calificar. Sé específico."
            />
          </div>
          <details open={optionsOpen} onToggle={event => setOptionsOpen(event.currentTarget.open)}
            className={cn('rounded-xl border border-border p-3', !optionsOpen && 'writing-secondary')}>
            <summary className="writing-secondary min-h-11 cursor-pointer font-semibold">
              <span>Personalizar</span>
              <span className="ml-2 text-sm font-normal text-muted">{form.nota_maxima} puntos · {form.dba_ids.length + form.dba_personalizado_ids.length} criterios</span>
            </summary>
            <p className="writing-secondary mb-3 text-sm text-muted">
              Nota máxima: {form.nota_maxima} · {form.dba_ids.length + form.dba_personalizado_ids.length} criterios de aprendizaje seleccionados
            </p>
            <div className="space-y-4">
              <Field label="Nota maxima" required>
                <Input data-manual-field="scale" type="number" min={0.1} step="0.1" value={form.nota_maxima} onChange={(event) => setForm({ ...form, nota_maxima: Number(event.target.value) })} required />
              </Field>
            <Field label="Descripcion">
              <Textarea value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Proposito, alcance o instrucciones generales." />
            </Field>
            {isEdit && <Field label="Lectura o texto de apoyo" hint="Opcional. Se conserva junto a las preguntas.">
              <Textarea value={form.lectura} maxLength={60000} rows={8} className="min-h-48 text-base" onChange={(event) => setForm({ ...form, lectura: event.target.value })} placeholder="Texto que los estudiantes deben leer antes de responder." />
            </Field>}

              <div className="grid gap-5 md:grid-cols-2">
              <DynamicTextList
                label="Metas del profesor"
                placeholder="Ej. Identificar relaciones causa-efecto"
                values={form.metas}
                pending={pending.metas}
                onPendingChange={(value) => setPending({ ...pending, metas: value })}
                onAdd={() => addListItem('metas')}
                onChange={(index, value) => updateListItem('metas', index, value)}
                onRemove={(index) => removeListItem('metas', index)}
                hint="¿Qué quieres que aprendan los estudiantes?"
              />
              <DynamicTextList
                label="Criterios de evaluación / rúbrica"
                placeholder="Ej. Procedimiento claro, uso de vocabulario técnico"
                values={form.criterios}
                pending={pending.criterios}
                onPendingChange={(value) => setPending({ ...pending, criterios: value })}
                onAdd={() => addListItem('criterios')}
                onChange={(index, value) => updateListItem('criterios', index, value)}
                onRemove={(index) => removeListItem('criterios', index)}
                hint="Opcional. Si agregas criterios, la IA construirá una rúbrica con pesos y niveles."
              />

              </div>
              <Field label="Criterios de aprendizaje" hint="Opcional. Selecciona únicamente los aprendizajes que evaluarás; puedes añadir una rúbrica o continuar sin criterios.">
                <DBASelector
                  items={dbaItems}
                  selectedOfficial={form.dba_ids}
                  selectedCustom={form.dba_personalizado_ids}
                  loading={loadingDBA}
                  error={dbaError}
                  onToggle={toggleDBA}
                />
              </Field>

              {!isEdit && onGenerateAI && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">Borrador alineado con IA</p>
                      <p className="mt-1 text-xs text-muted">
                        Usa los criterios de aprendizaje que elijas, una rúbrica o generación libre. Se guarda como borrador para que lo revises.
                      </p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="sm:w-48">
                          <Field label="Cantidad de preguntas">
                            <Input
                              type="number"
                              min={3}
                              max={30}
                              value={form.cantidad_ia}
                              onChange={(event) => setForm({ ...form, cantidad_ia: Number(event.target.value) })}
                            />
                          </Field>
                        </div>
                        <Button type="button" onClick={onGenerateAI} loading={aiPending} disabled={isPending}>
                          <Sparkles className="h-4 w-4" />
                          Generar borrador con IA
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </details>
        </div>
        <footer className="shrink-0 border-t border-border pt-2">
          <Button className={cn('w-full', !mobile.isWriting && 'hidden')} type="button" onClick={mobile.finishWriting}>Listo</Button>
          <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', mobile.isWriting && 'hidden')}>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={submitFromDialog} loading={isPending} disabled={aiPending}>{isEdit ? 'Guardar cambios' : 'Crear manualmente'}</Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

function buildManualEvaluationPayload(form: EvaluationForm): EvaluacionCreate | null {
    const nombre = form.nombre.trim();
    if (!form.materia_id) { toast.error('Selecciona una materia'); return null; }
    if (!nombre) { toast.error('El nombre es obligatorio'); return null; }
    if (!form.modalidad) { toast.error('Selecciona una modalidad'); return null; }
    if (!Number.isFinite(form.nota_maxima) || form.nota_maxima <= 0) { toast.error('La nota maxima debe ser mayor que 0'); return null; }
    if (!listIsValid(form.criterios) || !listIsValid(form.preguntas) || !listIsValid(form.respuestas)) {
      toast.error('Las listas no deben contener elementos vacios'); return null;
    }
    return {
      materia_id: form.materia_id, nombre,
      descripcion: form.descripcion.trim() || undefined,
      tipo_origen: form.tipo_origen, modalidad: form.modalidad, nota_maxima: form.nota_maxima,
      dba_ids: form.dba_ids, dba_personalizado_ids: form.dba_personalizado_ids,
      metas_profesor: form.metas.map((m) => m.trim()).filter(Boolean),
      criterios: form.criterios.map((n) => ({ nombre: n.trim() })),
      preguntas: form.preguntas.map((e) => ({ enunciado: e.trim() })),
      respuestas_esperadas: form.respuestas.map((t) => ({ texto: t.trim() })),
    };
  }


export function ManualEvaluationDialog({ materia, onClose, onCompleted }: {
  materia: { id: string; nombre: string };
  onClose: () => void;
  onCompleted: (evaluation: Evaluacion) => void;
}) {
  const user = useAuth(state => state.user);
  const canCreate = user?.rol !== 'estudiante' && Boolean(user?.permissions?.includes('evaluations.create'));
  const [form, setForm] = useState(() => emptyForm(materia.id));
  const [pending, setPending] = useState<Record<ListField, string>>(emptyPending);
  const lock = useRef(false);
  const criteria = useQuery({
    queryKey: queryKeys.materias.dbaCombined(materia.id),
    queryFn: () => listDbaCombinado(materia.id),
    enabled: canCreate && Boolean(materia.id),
    retry: false,
  });
  const create = useMutation({
    mutationFn: (payload: EvaluacionCreate) => createEvaluacion(payload),
    onSuccess: evaluation => {
      if (useAuth.getState().user?.id === user?.id && evaluation.materia_id === materia.id) onCompleted(evaluation);
    },
    onError: error => toast.error(toApiError(error).detail),
    onSettled: () => { lock.current = false; },
  });
  if (!canCreate) return null;
  return <EvaluationFormModal open onClose={() => { if (!create.isPending) onClose(); }}
    title={`Crear manualmente · ${materia.nombre}`} form={form} setForm={setForm}
    pending={pending} setPending={setPending} materias={[materia]}
    dbaItems={criteria.data} loadingDBA={criteria.isLoading} dbaError={criteria.isError}
    isEdit={false} isPending={create.isPending} aiPending={false}
    onSubmit={() => {
      if (create.isPending || lock.current) return;
      const payload = buildManualEvaluationPayload(form);
      if (!payload) return;
      lock.current = true;
      create.mutate(payload);
    }}
  />;
}

export function EvaluacionesPage() {
  const user = useAuth((state) => state.user);
  const permissions = new Set(user?.permissions ?? []);
  const canCreate = user?.rol !== 'estudiante' && permissions.has('evaluations.create');
  const canUpdate = permissions.has('evaluations.update');
  const canPublish = permissions.has('evaluations.publish');
  const canSubmit = permissions.has('evaluations.submit');
  const canEnroll = permissions.has('subjects.enroll');
  const isStudent = canSubmit && !canCreate && !canUpdate && !canPublish;
  const [params, setParams] = useSearchParams();
  const { data: materias, isLoading: loadingMaterias } = useMaterias();
  const materiaId = params.get('materia') || materias?.[0]?.id || '';
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [digitalizeOpen, setDigitalizeOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null);
  const [previewEval, setPreviewEval] = useState<Evaluacion | null>(null);
  const [form, setForm] = useState<EvaluationForm>(() => emptyForm(materiaId));
  const [pending, setPending] = useState<Record<ListField, string>>(emptyPending);

  useEffect(() => {
    if (!params.get('materia') && materias?.[0]?.id) setParams({ materia: materias[0].id }, { replace: true });
  }, [materias, params, setParams]);

  const { data: evals, isLoading } = useQuery({
    queryKey: queryKeys.evaluaciones.list(materiaId),
    queryFn: () => listEvaluaciones(materiaId),
    enabled: !!materiaId,
    refetchOnWindowFocus: true,
  });

  const { data: dbaItems, isLoading: loadingDBA, isError: dbaError } = useQuery({
    queryKey: queryKeys.materias.dbaCombined(form.materia_id),
    queryFn: () => listDbaCombinado(form.materia_id),
    enabled: open && (editingEval ? canUpdate : canCreate) && !!form.materia_id,
    retry: false,
  });

  const create = useMutation({
    mutationFn: (payload: EvaluacionCreate) => createEvaluacion(payload),
    onSuccess: (evaluacion) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(evaluacion.materia_id) });
      setParams({ materia: evaluacion.materia_id }, { replace: true });
      toast.success('Evaluacion creada');
      setOpen(false);
      setForm(emptyForm(evaluacion.materia_id));
      setPending(emptyPending);
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const generate = useMutation({
    mutationFn: (payload: EvaluacionGenerarRequest) => generarBorradorEvaluacion(payload),
    onSuccess: (evaluacion) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(evaluacion.materia_id) });
      setParams({ materia: evaluacion.materia_id }, { replace: true });
      toast.success('Borrador IA creado. Revísalo antes de publicarlo.');
      setOpen(false);
      setForm(emptyForm(evaluacion.materia_id));
      setPending(emptyPending);
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EvaluacionUpdate }) => updateEvaluacion(id, payload),
    onSuccess: (evaluacion) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(evaluacion.materia_id) });
      toast.success('Evaluacion actualizada');
      setOpen(false);
      setEditingEval(null);
      setForm(emptyForm(evaluacion.materia_id));
      setPending(emptyPending);
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const publicar = useMutation({
    mutationFn: publicarEvaluacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(materiaId) });
      toast.success('Evaluacion publicada');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const cerrar = useMutation({
    mutationFn: cerrarEvaluacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(materiaId) });
      toast.success('Evaluacion cerrada');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const noMaterias = !loadingMaterias && (!materias || materias.length === 0);

  function openCreateModal() {
    setEditingEval(null);
    setForm(emptyForm(materiaId));
    setPending(emptyPending);
    setOpen(true);
  }

  function openEditModal(ev: Evaluacion) {
    setEditingEval(ev);
    setForm(evaluacionToForm(ev));
    setPending(emptyPending);
    setOpen(true);
  }

  function buildCreatePayload(): EvaluacionCreate | null {
    return buildManualEvaluationPayload(form);
  }

  function buildUpdatePayload(): EvaluacionUpdate | null {
    const nombre = form.nombre.trim();
    if (!nombre) { toast.error('El nombre es obligatorio'); return null; }
    if (!listIsValid(form.criterios) || !listIsValid(form.preguntas) || !listIsValid(form.respuestas)) {
      toast.error('Las listas no deben contener elementos vacios'); return null;
    }
    return {
      nombre, descripcion: form.descripcion.trim() || undefined,
      ...(form.lectura.trim() !== (editingEval?.lectura ?? '').trim() ? { lectura: form.lectura.trim() || null } : {}),
      expected_updated_at: editingEval?.updated_at,
      expected_content_version_id: editingEval?.contenido_version_id,
      modalidad: form.modalidad, nota_maxima: form.nota_maxima,
      dba_ids: form.dba_ids, dba_personalizado_ids: form.dba_personalizado_ids,
      metas_profesor: form.metas.map((m) => m.trim()).filter(Boolean),
      criterios: form.criterios.map((n, index) => ({
        ...(form.criterios_detalle[index] ?? {}),
        nombre: n.trim(),
      })),
      preguntas: form.preguntas.map((e, index) => ({
        ...(form.preguntas_detalle[index] ?? {}),
        enunciado: e.trim(),
      })),
      respuestas_esperadas: form.respuestas.map((t, index) => {
        const previous = form.respuestas_detalle[index] ?? {};
        return Object.prototype.hasOwnProperty.call(previous, 'respuesta')
          ? { ...previous, respuesta: t.trim() }
          : { ...previous, texto: t.trim() };
      }),
    };
  }

  function buildGeneratePayload(): EvaluacionGenerarRequest | null {
    const nombre = form.nombre.trim();
    if (!form.materia_id) { toast.error('Selecciona una materia'); return null; }
    if (nombre.length < 2) { toast.error('Escribe un nombre para la evaluación'); return null; }
    if (!Number.isInteger(form.cantidad_ia) || form.cantidad_ia < 3 || form.cantidad_ia > 30) {
      toast.error('La cantidad de preguntas debe estar entre 3 y 30'); return null;
    }
    if (!Number.isFinite(form.nota_maxima) || form.nota_maxima <= 0) {
      toast.error('La nota máxima debe ser mayor que 0'); return null;
    }
    return {
      materia_id: form.materia_id,
      nombre,
      tema: form.descripcion.trim() || nombre,
      descripcion: form.descripcion.trim() || undefined,
      modalidad: form.modalidad,
      nota_maxima: form.nota_maxima,
      cantidad_preguntas: form.cantidad_ia,
      tipos_pregunta: ['opcion_multiple', 'abierta'],
      dba_ids: form.dba_ids,
      dba_personalizado_ids: form.dba_personalizado_ids,
      usar_rubrica: form.criterios.some((value) => Boolean(value.trim())),
      metas_profesor: form.metas.map((value) => value.trim()).filter(Boolean),
      criterios_docente: form.criterios.map((value) => value.trim()).filter(Boolean),
    };
  }

  function handleGenerateAI() {
    const payload = buildGeneratePayload();
    if (payload) generate.mutate(payload);
  }

  function handleSubmit() {
    if (editingEval) {
      const payload = buildUpdatePayload();
      if (payload) update.mutate({ id: editingEval.id, payload });
    } else {
      const payload = buildCreatePayload();
      if (payload) create.mutate(payload);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/branding/feature-evaluate.webp"
            alt=""
            className="h-full w-full object-cover opacity-10 dark:opacity-5"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/95 to-surface/80" />
        </div>
        <div className="relative z-10">
          <PageHeader
            title="Evaluaciones"
            eyebrow={isStudent ? 'Tu aprendizaje' : 'Diseño evaluativo'}
            subtitle={isStudent ? 'Consulta las evaluaciones de tus materias y resuelve las que estén disponibles.' : 'Crea, publica y revisa evaluaciones con apoyo de IA.'}
            action={canCreate && !noMaterias && <EvaluationCreateMenu onAI={() => setWizardOpen(true)} onPhoto={() => setDigitalizeOpen(true)} onManual={openCreateModal} photoDisabled={!materias?.some(item => item.id === materiaId)} disabled={loadingMaterias || !materias?.some(item => item.id === materiaId)} />}
          />
        </div>
      </div>

      {noMaterias ? (
        <EmptyState
          icon={ClipboardCheck}
          title={isStudent ? 'Aún no tienes materias inscritas' : 'Primero crea una materia'}
          description={isStudent ? 'Únete a una materia con el código que te compartió tu docente para consultar sus evaluaciones.' : 'Las evaluaciones pertenecen a una materia.'}
          action={isStudent && canEnroll ? (
            <Link to="/app/materias?unirse=1" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
              <UserPlus className="h-4 w-4" /> Unirme a materia
            </Link>
          ) : undefined}
        />
      ) : (
        <>
          {materias && (
            <Card className={cn(
              'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
              isStudent && 'border-brand-100 bg-gradient-to-r from-surface to-brand-50/60 p-5 dark:border-brand-500/20 dark:to-brand-950/25',
            )}>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'grid place-items-center bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
                  isStudent ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-lg',
                )}><BookOpen className={isStudent ? 'h-5 w-5' : 'h-4 w-4'} /></span>
                <div><p className="text-sm font-semibold">Materia activa</p><p className="text-xs text-muted">Las evaluaciones se filtran por curso.</p></div>
              </div>
              <MateriaSelect value={materiaId} onChange={(id) => setParams({ materia: id })} materias={materias} />
            </Card>
          )}

          {isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : !evals || evals.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              image="/branding/empty-no-evals.webp"
              title="Sin evaluaciones"
              description={isStudent ? 'No hay evaluaciones disponibles para esta materia.' : 'Crea la primera evaluación de esta materia.'}
            />
          ) : (
            <div className="grid gap-3">
              {evals.map((ev, i) => (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={cn(
                    'flex flex-col gap-4 p-5 sm:flex-row sm:items-center',
                    isStudent
                      ? 'group border-emerald-100 bg-gradient-to-r from-surface via-surface to-emerald-50/50 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-card-hover dark:border-emerald-500/20 dark:to-emerald-950/20 sm:p-6'
                      : 'border-l-4 border-l-emerald-500',
                  )}>
                    <div className={cn(
                      'grid shrink-0 place-items-center bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
                      isStudent ? 'h-12 w-12 rounded-2xl shadow-sm' : 'h-10 w-10 rounded-lg',
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{ev.nombre}</p>
                        <Badge tone={isStudent ? getStudentEvaluationStatus(ev).tone : statusTone[ev.estado] ?? 'neutral'}>
                          {isStudent ? getStudentEvaluationStatus(ev).label : ESTADO_LABEL[ev.estado]}
                        </Badge>
                        {ev.blueprint?.reglas_feedback?.trazabilidad?.generada_por_ia && (
                          <Badge tone="violet"><Sparkles className="mr-1 h-3 w-3" /> Borrador IA</Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral" className="capitalize">{ev.modalidad ?? 'online'}</Badge>
                        <Badge tone="neutral">Nota máx: {Number(ev.nota_maxima)}</Badge>
                        <Badge tone="neutral">{ev.preguntas?.length ?? 0} preguntas</Badge>
                        {isStudent && ev.material_origen_id && <Badge tone="violet">Material incluido</Badge>}
                        {isStudent && (ev.intentos_realizados ?? 0) > 0 && (
                          <Badge tone="neutral">Intento {ev.intentos_realizados}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                      {user?.rol !== 'estudiante' && permissions.has('evaluations.read') && (
                        <Button size="sm" variant="outline" onClick={() => setPreviewEval(ev)}>
                          <Eye className="h-4 w-4" aria-hidden="true" /> Visualizar
                        </Button>
                      )}
                      {isStudent && canSubmit
                        && ['publicada', 'en_calificacion', 'pendiente_revision', 'cerrada'].includes(ev.estado) && (
                        <Link
                          to={`/app/evaluaciones/${ev.id}/resolver`}
                          className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md dark:border-brand-500 dark:bg-brand-600 sm:w-auto"
                        >
                          {ev.entrega_realizada || !ev.material_origen_id
                            ? <Eye className="h-4 w-4" />
                            : <BookOpenCheck className="h-4 w-4" />}
                          {getStudentEvaluationAction(ev)}
                        </Link>
                      )}
                      {ev.estado === 'borrador' && (canUpdate || canPublish) && (
                        <>
                          {canUpdate && <Button size="sm" variant="outline" onClick={() => openEditModal(ev)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>}
                          {canPublish && <Button size="sm" loading={publicar.isPending} onClick={() => publicar.mutate(ev.id)}>
                            <Send className="h-4 w-4" /> Publicar
                          </Button>}
                        </>
                      )}
                      {canUpdate && (ev.estado === 'publicada' || ev.estado === 'en_calificacion' || ev.estado === 'pendiente_revision') && (
                        <Button size="sm" variant="outline" loading={cerrar.isPending} onClick={() => cerrar.mutate(ev.id)}><Lock className="h-4 w-4" /> Cerrar</Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {previewEval && (
        <EvaluationPreviewModal evaluation={previewEval} onClose={() => setPreviewEval(null)}
          canEditPresentation={canUpdate}
          canViewSolutions={user?.rol === 'admin' || previewEval.profesor_id === user?.id} />
      )}
      {canCreate && digitalizeOpen && materias?.some(item => item.id === materiaId) && <DigitalizarEvaluacionModal open onClose={() => setDigitalizeOpen(false)} materiaId={materiaId} onCompleted={() => { queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(materiaId) }); setDigitalizeOpen(false); }} />}
      {user && canCreate && (
        <GenerationWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); }}
          userId={user.id}
          materias={materias}
          initialMateriaId={materiaId}
          onCompleted={(evaluacion) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.evaluaciones.list(evaluacion.materia_id) });
            setParams({ materia: evaluacion.materia_id }, { replace: true });
            toast.success('Evaluación creada como borrador.');
            setWizardOpen(false);
          }}
        />
      )}
      <EvaluationFormModal
        open={open && (editingEval ? canUpdate : canCreate)}
        onClose={() => { setOpen(false); setEditingEval(null); }}
        title={editingEval ? 'Editar evaluación' : 'Nueva evaluación'}
        form={form}
        setForm={setForm}
        pending={pending}
        setPending={setPending}
        dbaItems={dbaItems}
        loadingDBA={loadingDBA}
        dbaError={dbaError}
        materias={materias}
        isEdit={!!editingEval}
        onSubmit={handleSubmit}
        onGenerateAI={handleGenerateAI}
        isPending={create.isPending || update.isPending}
        aiPending={generate.isPending}
      />
    </div>
  );
}
