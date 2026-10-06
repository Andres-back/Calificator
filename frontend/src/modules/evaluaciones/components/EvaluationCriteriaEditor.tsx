import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, Field, Modal, Textarea } from '@/components/ui';
import { queryKeys } from '@/config/queryKeys';
import { toApiError } from '@/lib/api';
import { createDbaPersonalizado, listDbaCombinado } from '@/modules/materias/dbaApi';
import { useAuth } from '@/stores/auth';
import type { DBAUnifiedItem, Evaluacion } from '@/types/api';
import { getEvaluacion, updateEvaluacion } from '../api';
import { DBASelector } from './DBASelector';
import { RubricEditor } from './RubricEditor';
import { normalizeRubricCriteria, prepareRubricCriteriaForSave, validateRubricCriteria } from './generationWizardModel';

/** Mounted per opening: refetches never replace the teacher's in-progress draft. */
export function EvaluationCriteriaEditor({ evaluation, onClose, onCompleted }: {
  evaluation: Evaluacion;
  onClose: () => void;
  onCompleted: (evaluation: Evaluacion) => void;
}) {
  const client = useQueryClient();
  const canCreate = useAuth((state) => state.user?.permissions?.includes('dba.manage') ?? false);
  const [original, setOriginal] = useState(() => evaluation);
  const [official, setOfficial] = useState(original.dba_ids ?? []);
  const [custom, setCustom] = useState(original.dba_personalizado_ids ?? []);
  const [initialRubric, setInitialRubric] = useState(() => normalizeRubricCriteria(original.criterios ?? []));
  const [criteria, setCriteria] = useState(initialRubric);
  const [created, setCreated] = useState<DBAUnifiedItem[]>([]);
  const [description, setDescription] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const dirty = JSON.stringify([official, custom, criteria]) !== JSON.stringify([original.dba_ids ?? [], original.dba_personalizado_ids ?? [], initialRubric]);
  const rubricChanged = JSON.stringify(criteria) !== JSON.stringify(initialRubric);
  const validation = rubricChanged ? validateRubricCriteria(criteria) : null;
  const query = useQuery({
    queryKey: queryKeys.materias.dbaCombined(original.materia_id),
    queryFn: () => listDbaCombinado(original.materia_id), retry: false,
  });
  const items = [...(query.data ?? []), ...created.filter((item) => !query.data?.some((other) => other.id === item.id))];
  const unavailable = [...official, ...custom].filter((id) => !items.some((item) => item.id === id));
  const create = useMutation({
    mutationFn: () => createDbaPersonalizado(original.materia_id, { enunciado: description.trim() }),
    onSuccess: (item) => {
      setCreated((current) => [...current, { ...item, fuente: 'personalizado', codigo: null, descripcion: item.enunciado }]);
      setCustom((current) => current.includes(item.id) ? current : [...current, item.id]);
      setDescription(''); setError(null);
      void client.invalidateQueries({ queryKey: queryKeys.materias.dbaCombined(original.materia_id) });
    },
    onError: (failure) => setError(toApiError(failure).detail),
  });
  const save = useMutation({
    mutationFn: () => updateEvaluacion(original.id, {
      expected_updated_at: original.updated_at,
      ...(JSON.stringify(official) !== JSON.stringify(original.dba_ids ?? []) ? { dba_ids: official } : {}),
      ...(JSON.stringify(custom) !== JSON.stringify(original.dba_personalizado_ids ?? []) ? { dba_personalizado_ids: custom } : {}),
      ...(rubricChanged ? { criterios: prepareRubricCriteriaForSave(criteria, Number(original.nota_maxima)) } : {}),
    }),
    onSuccess: (result) => onCompleted(result),
    onError: (failure) => { const detail = toApiError(failure); setError(detail.detail); setConflict(detail.status === 409); },
  });
  const reload = useMutation({
    mutationFn: () => getEvaluacion(original.id),
    onSuccess: (current) => {
      const rubric = normalizeRubricCriteria(current.criterios ?? []);
      setOriginal(current); setOfficial(current.dba_ids ?? []); setCustom(current.dba_personalizado_ids ?? []);
      setInitialRubric(rubric); setCriteria(rubric); setError(null); setConflict(false); setReloadOpen(false);
    },
    onError: (failure) => { setError(toApiError(failure).detail); setReloadOpen(false); },
  });
  const busy = save.isPending || create.isPending || reload.isPending;
  function close() {
    if (busy) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  }
  function toggle(item: DBAUnifiedItem) {
    const update = (current: string[]) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id];
    if (item.fuente === 'personalizado') setCustom(update);
    else setOfficial(update);
  }
  return <>
    <Modal open={!discardOpen && !reloadOpen} onClose={close} title="Criterios y rúbrica" className="max-w-3xl">
      <form noValidate className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (dirty && !busy && !validation) { setError(null); save.mutate(); } }}>
        <p className="text-sm text-muted">Estos cambios se usarán en próximas calificaciones. No cambian preguntas, entregas ni notas anteriores.</p>
        {error && <p role="alert" className="rounded-xl border border-rose-300 p-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>}
        {conflict && <Button type="button" variant="outline" onClick={() => setReloadOpen(true)}>Cargar versión actual</Button>}
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <legend className="mb-3 font-bold">Criterios de aprendizaje de la materia</legend>
          <DBASelector items={items} selectedOfficial={official} selectedCustom={custom} loading={query.isLoading} error={query.isError} onToggle={toggle} spacious />
          {query.isError && <Button type="button" variant="outline" onClick={() => void query.refetch()}>Reintentar carga</Button>}
          {unavailable.length > 0 && !query.isLoading && <p role="status" className="text-sm text-muted">Se conservan {unavailable.length} referencias guardadas que no aparecen en el catálogo actual.</p>}
          {canCreate && <details className="rounded-xl border border-border p-3">
            <summary className="focus-ring flex min-h-11 cursor-pointer items-center font-semibold">Crear criterio de aprendizaje</summary>
            <div className="mt-3 space-y-3">
              <Field label="Qué aprenderá el estudiante" required><Textarea aria-label="Qué aprenderá el estudiante" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 text-base" maxLength={3000} /></Field>
              <Button type="button" variant="outline" disabled={description.trim().length < 5 || busy} loading={create.isPending} onClick={() => create.mutate()}>Crear y seleccionar</Button>
            </div>
          </details>}
          <RubricEditor criteria={criteria} onChange={setCriteria} showValidation={rubricChanged} />
        </fieldset>
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={save.isPending} disabled={!dirty || busy || Boolean(validation)}>Guardar criterios</Button>
        </div>
      </form>
    </Modal>
    <ConfirmDialog open={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={onClose} title="¿Descartar los cambios?" description="Los cambios de esta evaluación aún no se guardaron. Los criterios creados en la materia sí permanecen disponibles." confirmLabel="Descartar cambios" cancelLabel="Seguir editando" />
    <ConfirmDialog open={reloadOpen} onClose={() => { if (!reload.isPending) setReloadOpen(false); }} onConfirm={() => reload.mutate()} loading={reload.isPending} title="¿Cargar la evaluación actual?" description="Se descartarán tus cambios locales y se cargarán los criterios guardados por la otra sesión. Las preguntas y notas no se modifican." confirmLabel="Recargar y descartar" />
  </>;
}
