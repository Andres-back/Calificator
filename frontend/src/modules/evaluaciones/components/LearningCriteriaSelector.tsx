import { useQuery } from '@tanstack/react-query';
import { BookCheck, Plus } from 'lucide-react';
import { Button, Field, Select, Skeleton } from '@/components/ui';
import { queryKeys } from '@/config/queryKeys';
import { routes } from '@/config/routes';
import { getLearningCriteriaCapabilities, listLearningCriteria } from '@/modules/materias/criterios/api';

export function LearningCriteriaSelector({
  materiaId,
  value,
  onChange,
}: {
  materiaId: string;
  value: string;
  onChange: (versionId: string, criteria: Array<{ key: string; nombre: string }>) => void;
}) {
  const capabilities = useQuery({
    queryKey: queryKeys.materias.learningCriteriaCapabilities,
    queryFn: getLearningCriteriaCapabilities,
    enabled: Boolean(materiaId),
    retry: false,
  });
  const query = useQuery({
    queryKey: queryKeys.materias.learningCriteria(materiaId),
    queryFn: () => listLearningCriteria(materiaId),
    enabled: Boolean(materiaId) && Boolean(capabilities.data?.ui),
    retry: false,
  });
  const approved = (query.data?.items ?? []).filter((item) => item.version_aprobada?.estado === 'aprobada');
  const selectedSet = approved.find((item) => item.version_aprobada?.id === value);
  const selectedVersion = selectedSet?.version_aprobada;

  if (!materiaId || !capabilities.data?.ui) return null;
  if (query.isLoading) return <Skeleton className="h-20" />;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-bold"><BookCheck className="h-5 w-5 text-emerald-700" /> Criterios de aprendizaje aprobados</p>
          <p className="mt-1 text-sm text-muted">Opcional. Al elegirlos se guarda esta versión exacta en la evaluación o recurso.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => window.open(routes.materiaCriterios(materiaId), '_blank', 'noopener,noreferrer')}>
          <Plus className="h-4 w-4" /> Crear o revisar
        </Button>
      </div>
      {query.isError ? (
        <p className="text-sm text-danger">No se pudieron cargar los criterios. Puedes continuar sin seleccionarlos.</p>
      ) : approved.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay versiones aprobadas. Puedes generar libremente o crear una desde el material trabajado.</p>
      ) : (
        <Field label="Versión que se aplicará">
          <Select
            value={value}
            onChange={(event) => {
              const versionId = event.target.value;
              const selected = approved.find((item) => item.version_aprobada?.id === versionId);
              onChange(versionId, selected?.version_aprobada?.criterios.map((item) => ({ key: item.stable_key, nombre: item.nombre })) ?? []);
            }}
          >
            <option value="">No aplicar una versión guardada</option>
            {approved.map((item) => (
              <option key={item.version_aprobada!.id} value={item.version_aprobada!.id}>
                {item.titulo} · v{item.version_aprobada!.version_number} · {item.version_aprobada!.criterios.length} criterios
              </option>
            ))}
          </Select>
        </Field>
      )}
      {selectedSet && selectedVersion && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-surface p-3 dark:border-emerald-500/30">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{selectedSet.titulo}</p>
              <p className="text-xs text-muted">Versión {selectedVersion.version_number} · {selectedVersion.criterios.length} criterios</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100">Aprobada</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Criterios incluidos">
            {selectedVersion.criterios.map((criterion) => (
              <li key={criterion.stable_key} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-semibold">{criterion.nombre}</span>
                <span className="ml-1 text-muted">· {Number(criterion.peso_porcentaje).toFixed(0)} %</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
            XCalificator propondrá qué criterio corresponde a cada pregunta. Podrás revisar esa relación antes de confirmar la evaluación y al revisar cada respuesta.
          </p>
        </div>
      )}
    </div>
  );
}
