import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, FileCheck2, Files, PenLine, Save, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import type { LearningCriteriaSet, LearningCriterion } from '@/types/api';
import { toApiError } from '@/lib/api';
import {
  addLearningTextSource,
  addLearningReferenceSource,
  approveLearningCriteria,
  createLearningCriteria,
  getLearningCriteria,
  proposeLearningCriteria,
  updateLearningCriteriaVersion,
  uploadLearningSource,
  type TeacherIntentPayload,
} from './api';
import { LearningCriteriaEditor, emptyCriterion } from './LearningCriteriaEditor';
import { LearningSourcePicker, type PendingLearningSources } from './LearningSourcePicker';

const PRIORITIES = ['procedimiento', 'comprensión', 'argumentación', 'ortografía', 'creatividad'];
const EMPTY_LEARNING_SOURCES: PendingLearningSources = {
  pages: [],
  document: null,
  textTitle: '',
  textContent: '',
  references: [],
};

export function LearningCriteriaWizard({
  open,
  onClose,
  materiaId,
  materiaGrado,
  initialSet,
  onChanged,
  canGenerate,
  hasExisting,
  onBrowseExisting,
}: {
  open: boolean;
  onClose: () => void;
  materiaId: string;
  materiaGrado?: string | null;
  initialSet?: LearningCriteriaSet | null;
  onChanged: () => void;
  canGenerate: boolean;
  hasExisting?: boolean;
  onBrowseExisting?: () => void;
}) {
  const initialVersion = initialSet?.version_trabajo ?? initialSet?.version_aprobada ?? null;
  const [step, setStep] = useState(initialSet ? 3 : 1);
  const [startMode, setStartMode] = useState<'choose' | 'material'>(initialSet ? 'material' : 'choose');
  const [sources, setSources] = useState<PendingLearningSources>(EMPTY_LEARNING_SOURCES);
  const [criteriaSet, setCriteriaSet] = useState<LearningCriteriaSet | null>(initialSet ?? null);
  const [title, setTitle] = useState(initialSet?.titulo ?? '');
  const [description, setDescription] = useState(initialSet?.descripcion ?? '');
  const [intent, setIntent] = useState<TeacherIntentPayload>({
    que_evaluar: String(initialVersion?.intencion_docente.que_evaluar ?? ''),
    como_evaluar: String(initialVersion?.intencion_docente.como_evaluar ?? ''),
    grado: String(initialVersion?.intencion_docente.grado ?? materiaGrado ?? ''),
    tipo_evidencia: String(initialVersion?.intencion_docente.tipo_evidencia ?? ''),
    prioridades: Array.isArray(initialVersion?.intencion_docente.prioridades)
      ? initialVersion.intencion_docente.prioridades.map(String)
      : [],
    restricciones: String(initialVersion?.intencion_docente.restricciones ?? ''),
  });
  const [criteria, setCriteria] = useState<LearningCriterion[]>(
    initialVersion?.criterios.length ? initialVersion.criterios : [emptyCriterion(1)],
  );
  const [busy, setBusy] = useState(false);
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);

  const version = criteriaSet?.version_trabajo ?? criteriaSet?.version_aprobada ?? null;
  const readOnly = version?.estado === 'aprobada' || version?.estado === 'sustituida';
  const totalWeight = useMemo(
    () => criteria.reduce((total, item) => total + Number(item.peso_porcentaje || 0), 0),
    [criteria],
  );
  const criteriaComplete = criteria.length > 0
    && criteria.every((item) => item.nombre.trim().length >= 2 && item.descripcion.trim().length >= 3 && item.evidencia_esperada.trim().length >= 3)
    && Math.abs(totalWeight - 100) < 0.01;

  const ensureDraft = async () => {
    if (criteriaSet) return criteriaSet;
    const created = await createLearningCriteria(materiaId, {
      titulo: title.trim(),
      descripcion: description.trim() || undefined,
      intencion_docente: intent,
    });
    const draftId = created.version_trabajo?.id;
    if (!draftId) throw new Error('El borrador no quedó disponible');
    if (sources.pages.length) {
      await uploadLearningSource(
        draftId,
        sources.pages.map((page) => page.file),
        sources.pages.map((page) => page.rotation),
      );
    } else if (sources.document) {
      await uploadLearningSource(draftId, [sources.document], [0]);
    }
    if (sources.textContent.trim()) {
      await addLearningTextSource(draftId, {
        titulo: sources.textTitle.trim() || 'Notas del docente',
        contenido: sources.textContent.trim(),
      });
    }
    for (const reference of sources.references) {
      await addLearningReferenceSource(draftId, reference);
    }
    const refreshed = await getLearningCriteria(created.id);
    setCriteriaSet(refreshed);
    return refreshed;
  };

  const startCriteria = async (withAI: boolean) => {
    if (title.trim().length < 2 || intent.que_evaluar.trim().length < 3) {
      toast.error('Escribe un título y qué quieres evaluar.');
      return;
    }
    setBusy(true);
    try {
      const created = await ensureDraft();
      const draft = created.version_trabajo;
      if (!draft) throw new Error('El borrador no quedó disponible');
      if (withAI) {
        await proposeLearningCriteria(draft.id);
        toast.success('Estamos proponiendo los criterios. Puedes continuar navegando; te avisaremos cuando estén listos.');
        onChanged();
        onClose();
        return;
      }
      setCriteria(draft.criterios.length ? draft.criterios : [emptyCriterion(1)]);
      setStep(3);
    } catch (error) {
      toast.error(toApiError(error).detail);
    } finally {
      setBusy(false);
    }
  };

  const persistDraft = async () => {
    const current = version;
    if (!current || current.estado === 'aprobada' || current.estado === 'sustituida') {
      throw new Error('Esta versión ya no se puede editar');
    }
    const updated = await updateLearningCriteriaVersion(current.id, {
      revision_esperada: current.revision,
      titulo: title.trim(),
      descripcion: description.trim(),
      intencion_docente: intent,
      criterios: criteria,
    });
    setCriteriaSet(updated);
    return updated;
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      await persistDraft();
      toast.success('Borrador guardado');
      onChanged();
    } catch (error) {
      toast.error(toApiError(error).detail);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!criteriaComplete) {
      toast.error('Completa los criterios y ajusta los pesos hasta sumar 100 %.');
      return;
    }
    setBusy(true);
    try {
      const updated = await persistDraft();
      const draft = updated.version_trabajo;
      if (!draft) throw new Error('No se encontró la versión para aprobar');
      await approveLearningCriteria(draft.id, draft.revision, acknowledgeWarnings);
      toast.success('Criterios aprobados y listos para reutilizar');
      onChanged();
      onClose();
    } catch (error) {
      toast.error(toApiError(error).detail);
    } finally {
      setBusy(false);
    }
  };

  const warnings = Array.isArray(version?.cobertura?.advertencias)
    ? version.cobertura.advertencias.map(String)
    : [];

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Preparar criterios de aprendizaje"
      description="Parte de lo que enseñaste, decide qué observar y conserva siempre la revisión final."
      className="max-w-6xl p-0"
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
    >
      <div className="border-y border-border px-4 py-3 sm:px-6">
        <ol className="grid grid-cols-4 gap-2" aria-label="Progreso">
          {['Referencia', 'Intención', 'Criterios', 'Aprobar'].map((label, index) => {
            const number = index + 1;
            return (
              <li key={label} className="min-w-0 text-center">
                <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${step >= number ? 'bg-brand-700 text-white' : 'bg-surface-2 text-muted'}`}>{step > number ? <Check className="h-4 w-4" /> : number}</span>
                <span className="mt-1 hidden truncate text-xs font-semibold sm:block">{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {step === 1 && (
          <div className="space-y-5">
            {startMode === 'choose' ? (
              <>
                <div className="mx-auto max-w-3xl text-center">
                  <h3 className="text-xl font-bold">¿Cómo quieres empezar?</h3>
                  <p className="mt-1 text-sm text-muted">Elige la opción que se parezca a lo que ya tienes. Podrás revisar todo antes de aprobar.</p>
                </div>
                <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setStartMode('material')}
                    className="focus-ring min-h-44 rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"><Files className="h-6 w-6" /></span>
                    <strong className="mt-4 block text-base">Usar foto, PDF o material</strong>
                    <span className="mt-2 block text-sm leading-6 text-muted">Parte de una guía, libro, planeación o material que trabajaste en clase.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSources(EMPTY_LEARNING_SOURCES); setStep(2); }}
                    className="focus-ring min-h-44 rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><PenLine className="h-6 w-6" /></span>
                    <strong className="mt-4 block text-base">Escribir lo que enseñé</strong>
                    <span className="mt-2 block text-sm leading-6 text-muted">Describe el aprendizaje con tus palabras, sin necesidad de subir archivos.</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBrowseExisting}
                    disabled={!hasExisting || !onBrowseExisting}
                    className="focus-ring min-h-44 rounded-2xl border border-border bg-surface p-5 text-left transition enabled:hover:border-brand-400 enabled:hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-55 dark:enabled:hover:bg-brand-500/10"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"><BookOpenCheck className="h-6 w-6" /></span>
                    <strong className="mt-4 block text-base">Usar criterios que ya tengo</strong>
                    <span className="mt-2 block text-sm leading-6 text-muted">Vuelve a una versión aprobada para consultarla o crear una nueva versión.</span>
                    {!hasExisting && <span className="mt-2 block text-xs font-semibold text-muted">Disponible cuando apruebes tu primer conjunto.</span>}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><h3 className="text-xl font-bold">Material de referencia</h3><p className="mt-1 text-sm text-muted">Añade lo trabajado en clase. Las fuentes permanecen privadas.</p></div>
                  <Button type="button" variant="ghost" onClick={() => setStartMode('choose')}><ArrowLeft className="h-4 w-4" /> Elegir otra forma</Button>
                </div>
                <LearningSourcePicker value={sources} onChange={setSources} disabled={busy} materiaId={materiaId} />
                <Button type="button" variant="outline" onClick={() => { setSources(EMPTY_LEARNING_SOURCES); setStep(2); }}>
                  Continuar sin material
                </Button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-3xl space-y-5">
            <div><h3 className="text-xl font-bold">¿Qué y cómo quieres evaluar?</h3><p className="mt-1 text-sm text-muted">Estas decisiones guían los criterios; el material no sustituye tu intención.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del conjunto" required><Input value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder="Ej. Fracciones equivalentes — capítulo 3" /></Field>
              <Field label="Grado"><Input value={intent.grado} onChange={(event) => setIntent({ ...intent, grado: event.currentTarget.value })} placeholder="Ej. 5°" /></Field>
            </div>
            <Field label="¿Qué quieres evaluar?" required hint="Describe el aprendizaje, no la nota."><Textarea value={intent.que_evaluar} onChange={(event) => setIntent({ ...intent, que_evaluar: event.currentTarget.value })} rows={4} placeholder="Quiero comprobar que representa y justifica fracciones equivalentes…" /></Field>
            <Field label="¿Cómo quieres valorarlo?"><Textarea value={intent.como_evaluar} onChange={(event) => setIntent({ ...intent, como_evaluar: event.currentTarget.value })} rows={3} placeholder="Dar mayor importancia al procedimiento y luego a la respuesta final…" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de evidencia"><Select value={intent.tipo_evidencia} onChange={(event) => setIntent({ ...intent, tipo_evidencia: event.currentTarget.value })}><option value="">Seleccionar</option><option value="taller_en_papel">Taller en papel</option><option value="evaluacion">Evaluación</option><option value="dictado">Dictado</option><option value="produccion_escrita">Producción escrita</option><option value="actividad_practica">Actividad práctica</option></Select></Field>
              <Field label="Descripción adicional"><Input value={description ?? ''} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="Opcional" /></Field>
            </div>
            <fieldset><legend className="mb-2 text-sm font-semibold">Aspectos prioritarios</legend><div className="flex flex-wrap gap-2">{PRIORITIES.map((priority) => { const selected = intent.prioridades.includes(priority); return <button key={priority} type="button" onClick={() => setIntent({ ...intent, prioridades: selected ? intent.prioridades.filter((item) => item !== priority) : [...intent.prioridades, priority] })} className={`focus-ring min-h-11 rounded-full border px-4 text-sm font-semibold ${selected ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-500/20 dark:text-brand-100' : 'border-border bg-surface text-secondary'}`}>{priority}</button>; })}</div></fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" size="lg" onClick={() => void startCriteria(false)} loading={busy}><Save className="h-5 w-5" /> Crear manualmente</Button>
              {canGenerate && <Button size="lg" onClick={() => void startCriteria(true)} loading={busy}><Sparkles className="h-5 w-5" /> Proponer con IA</Button>}
            </div>
            <p className="text-center text-sm text-muted">La propuesta de IA quedará en borrador. Nunca se aprobará ni se usará para calificar sin tu confirmación.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div><h3 className="text-xl font-bold">Criterios y rúbrica</h3><p className="mt-1 text-sm text-muted">Define qué observar, qué evidencia esperar y cuánto pesa cada aprendizaje.</p></div>
            <LearningCriteriaEditor value={criteria} onChange={setCriteria} readOnly={readOnly} sources={version?.fuentes ?? []} />
          </div>
        )}

        {step === 4 && (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10"><div className="flex gap-3"><FileCheck2 className="h-7 w-7 shrink-0 text-emerald-600" /><div><h3 className="text-xl font-bold">Revisión final</h3><p className="mt-1 text-sm leading-6 text-secondary"><strong>La IA propone; tú decides.</strong> Al aprobar, esta versión queda inmutable para que ninguna actividad o nota cambie después.</p></div></div></div>
            <dl className="grid gap-3 rounded-2xl border border-border p-5 sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase text-muted">Criterios</dt><dd className="mt-1 text-2xl font-bold">{criteria.length}</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">Peso total</dt><dd className="mt-1 text-2xl font-bold">{totalWeight.toFixed(2)} %</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">Fuentes</dt><dd className="mt-1 text-2xl font-bold">{version?.fuentes.length ?? 0}</dd></div></dl>
            <section aria-label="Resumen de los criterios" className="space-y-3">
              <h4 className="text-base font-bold">Qué vas a aprobar</h4>
              {criteria.map((criterion, index) => (
                <div key={criterion.stable_key} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h5 className="min-w-0 flex-1 font-semibold">{index + 1}. {criterion.nombre || 'Criterio sin nombre'}</h5>
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-100">{Number(criterion.peso_porcentaje).toFixed(2)} %</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-secondary">{criterion.descripcion}</p>
                  <p className="mt-2 text-sm leading-6"><strong>Evidencia esperada:</strong> {criterion.evidencia_esperada}</p>
                  {criterion.niveles.length > 0 && (
                    <details className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
                      <summary className="focus-ring min-h-10 cursor-pointer content-center font-semibold">Ver niveles de desempeño</summary>
                      <ul className="mt-2 space-y-2 border-t border-border pt-2">
                        {criterion.niveles.map((level, levelIndex) => <li key={`${levelIndex}-${level.nombre}`}><strong>{level.nombre}:</strong> {level.descripcion}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </section>
            {warnings.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"><p className="font-semibold">Advertencias de cobertura</p><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><label className="mt-4 flex min-h-11 items-center gap-3"><input type="checkbox" checked={acknowledgeWarnings} onChange={(event) => setAcknowledgeWarnings(event.currentTarget.checked)} /><span>Las revisé y deseo continuar.</span></label></div>}
            {readOnly ? (
              <Button size="lg" fullWidth onClick={onClose}>Cerrar versión aprobada</Button>
            ) : (
              <Button size="lg" fullWidth onClick={() => void approve()} loading={busy} disabled={!criteriaComplete || (warnings.length > 0 && !acknowledgeWarnings)}><Check className="h-5 w-5" /> Aprobar criterios</Button>
            )}
          </div>
        )}
      </div>

      {step !== 2 && !(step === 1 && startMode === 'choose') && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
          <Button variant="outline" onClick={() => step === 1 ? onClose() : setStep((current) => Math.max(1, current - 1))} disabled={busy}><ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Cancelar' : 'Atrás'}</Button>
          <div className="flex gap-2">
            {step === 3 && !readOnly && <Button variant="secondary" onClick={() => void saveDraft()} loading={busy}><Save className="h-4 w-4" /> Guardar borrador</Button>}
            {step < 4 && <Button onClick={() => setStep((current) => current + 1)} disabled={step === 3 && !criteriaComplete}><span>{step === 1 ? 'Continuar' : 'Revisar'}</span><ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
