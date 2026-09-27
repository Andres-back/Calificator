import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Archive, BookCheck, ChevronDown, CircleHelp, Clock3, FileText, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Badge, Button, Card, EmptyState, GuidedTour, QueryError, Skeleton, useFirstVisitTour, type TourStep } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { queryKeys } from '@/config/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import type { LearningCriteriaSet } from '@/types/api';
import { useAuth } from '@/stores/auth';
import { getMateria } from '../api';
import { MateriaDbaPage } from '../MateriaDbaPage';
import { archiveLearningCriteria, cloneLearningCriteria, getLearningCriteriaCapabilities, listLearningCriteria } from './api';
import { LearningCriteriaWizard } from './LearningCriteriaWizard';

const STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  borrador: { label: 'Borrador', tone: 'neutral' },
  procesando: { label: 'Procesando', tone: 'info' },
  requiere_revision: { label: 'Requiere revisión', tone: 'warning' },
  aprobada: { label: 'Aprobado', tone: 'success' },
  sustituida: { label: 'Versión anterior', tone: 'neutral' },
};

const LEARNING_CRITERIA_TOUR: TourStep[] = [
  { target: '[data-tour="criteria-start"]', title: 'Empieza con lo que ya tienes', description: 'Puedes usar material de clase, escribir lo que enseñaste o reutilizar criterios aprobados.' },
  { target: '[data-tour="criteria-list"]', title: 'Tus criterios quedan organizados', description: 'Aquí ves borradores, propuestas en proceso y versiones aprobadas sin mezclar sus usos.' },
  { target: '[data-tour="criteria-standards"]', title: 'Los estándares son opcionales', description: 'Consulta DBA y referencias oficiales solo cuando aporten a tu planeación.' },
];

export function LearningCriteriaPage() {
  const capabilities = useQuery({
    queryKey: queryKeys.materias.learningCriteriaCapabilities,
    queryFn: getLearningCriteriaCapabilities,
    retry: false,
  });
  if (capabilities.isLoading) return <Skeleton className="h-32" />;
  if (!capabilities.data?.ui) return <MateriaDbaPage />;
  return <LearningCriteriaContent canWrite={capabilities.data.write} canGenerate={capabilities.data.generation} />;
}

function LearningCriteriaContent({ canWrite, canGenerate }: { canWrite: boolean; canGenerate: boolean }) {
  const { id = '' } = useParams();
  const user = useAuth((state) => state.user);
  const { open: tourOpen, openTour, closeTour } = useFirstVisitTour({ tourId: 'criterios-aprendizaje', role: user?.rol ?? 'profesor', version: 1 });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<LearningCriteriaSet | null>(null);
  const materiaQuery = useQuery({ queryKey: queryKeys.materias.detail(id), queryFn: () => getMateria(id), enabled: Boolean(id) });
  const criteriaQuery = useQuery({
    queryKey: queryKeys.materias.learningCriteria(id),
    queryFn: () => listLearningCriteria(id),
    enabled: Boolean(id),
    refetchInterval: (query) => Array.isArray(query.state.data?.items)
      && query.state.data.items.some((item) => item.version_trabajo?.estado === 'procesando') ? 3000 : false,
  });

  const archiveMutation = useMutation({
    mutationFn: archiveLearningCriteria,
    onSuccess: () => {
      toast.success('Conjunto archivado. Las actividades y notas que lo usan se conservan.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.materias.learningCriteria(id) });
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const cloneMutation = useMutation({
    mutationFn: cloneLearningCriteria,
    onSuccess: (value) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materias.learningCriteria(id) });
      setSelected(value);
      setWizardOpen(true);
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const openWizard = (item?: LearningCriteriaSet, approvedOnly = false) => {
    setSelected(item && approvedOnly ? { ...item, version_trabajo: null } : item ?? null);
    setWizardOpen(true);
  };
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.materias.learningCriteria(id) });
  const activeItems = (criteriaQuery.data?.items ?? []).filter((item) => item.estado !== 'archivado');
  const hasApproved = activeItems.some((item) => item.version_aprobada?.estado === 'aprobada');
  const browseExisting = () => {
    setWizardOpen(false);
    window.setTimeout(() => document.getElementById('learning-criteria-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Planeación y evaluación"
          title="Criterios de aprendizaje"
          subtitle="Define qué aprendizaje observarás, qué evidencia esperas y cómo se construirá la valoración. Los estándares oficiales son opcionales."
        />
        <div className="flex flex-wrap gap-2" data-tour="criteria-start">
          <Button variant="outline" onClick={openTour}><CircleHelp className="h-4 w-4" /> Ver guía</Button>
          {canWrite && <Button size="lg" onClick={() => openWizard()}><Plus className="h-5 w-5" /> Definir qué voy a evaluar</Button>}
        </div>
      </div>

      <Card className="overflow-hidden border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-5 dark:border-indigo-500/30 dark:from-indigo-950/40 dark:via-surface dark:to-sky-950/30 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-lg"><Sparkles className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-bold">Parte de lo que realmente enseñaste</h2><p className="mt-1 text-sm leading-6 text-secondary">Puedes usar fotos de un libro, PDF, Word, texto o nada. La IA ayuda a proponer; tú editas y apruebas antes de usarlo.</p></div>
          {canWrite && <Button variant="outline" onClick={() => openWizard()} className="bg-white/80 dark:bg-surface/80">Definir qué voy a evaluar</Button>}
        </div>
      </Card>

      <div id="learning-criteria-list" data-tour="criteria-list" className="scroll-mt-24">
      {criteriaQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_item, index) => <Skeleton key={index} className="h-52" />)}</div>
      ) : criteriaQuery.isError ? (
        <QueryError error={criteriaQuery.error} title="No fue posible cargar los criterios" onRetry={() => void criteriaQuery.refetch()} />
      ) : activeItems.length === 0 ? (
        <EmptyState
          icon={BookCheck}
          title="Aún no tienes criterios de aprendizaje"
          description="Crea el primero manualmente o desde el material que trabajaste en clase. No necesitas un DBA para empezar."
          action={canWrite ? <Button onClick={() => openWizard()}><Plus className="h-4 w-4" /> Crear mis primeros criterios</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeItems.map((item) => {
            const working = item.version_trabajo;
            const current = working ?? item.version_aprobada;
            const status = STATUS[current?.estado ?? 'borrador'];
            return (
              <Card key={item.id} className="flex min-h-56 flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"><BookCheck className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.titulo}</h3><Badge tone={status.tone}>{status.label}</Badge></div><p className="mt-1 line-clamp-2 text-sm text-muted">{item.descripcion || String(current?.intencion_docente.que_evaluar || 'Sin descripción adicional')}</p></div>
                </div>
                <div className="my-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center"><div><p className="text-lg font-bold">v{current?.version_number ?? 1}</p><p className="text-xs text-muted">Versión</p></div><div><p className="text-lg font-bold">{current?.criterios.length ?? 0}</p><p className="text-xs text-muted">Criterios</p></div><div><p className="text-lg font-bold">{current?.fuentes.length ?? 0}</p><p className="text-xs text-muted">Fuentes</p></div></div>
                {working?.estado === 'procesando' && <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100"><RefreshCw className="h-4 w-4 animate-spin" /><span>Estamos leyendo el material. Puedes seguir navegando.</span></div>}
                <div className="mt-auto flex flex-wrap gap-2">
                  {working && working.estado !== 'procesando' && canWrite && <Button onClick={() => openWizard(item)}>Revisar y editar</Button>}
                  {!working && item.version_aprobada && canWrite && <Button onClick={() => cloneMutation.mutate(item.id)} loading={cloneMutation.isPending}><Plus className="h-4 w-4" /> Nueva versión</Button>}
                  {item.version_aprobada && <Button variant="outline" onClick={() => openWizard(item, true)}><FileText className="h-4 w-4" /> Ver aprobada</Button>}
                  {canWrite && <Button variant="ghost" onClick={() => archiveMutation.mutate(item.id)} loading={archiveMutation.isPending} className="ml-auto text-muted"><Archive className="h-4 w-4" /> Archivar</Button>}
                </div>
                {item.usos ? <p className="mt-3 flex items-center gap-1 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" /> Usado en {item.usos} {item.usos === 1 ? 'actividad' : 'actividades'}</p> : null}
              </Card>
            );
          })}
        </div>
      )}
      </div>

      <details data-tour="criteria-standards" className="group rounded-2xl border border-border bg-surface">
        <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-3 font-semibold"><FileText className="h-5 w-5 text-muted" /><span className="flex-1">Estándares oficiales y registros históricos <span className="font-normal text-muted">(opcional)</span></span><ChevronDown className="h-5 w-5 transition group-open:rotate-180" /></summary>
        <div className="border-t border-border p-4 sm:p-5"><MateriaDbaPage /></div>
      </details>

      <GuidedTour steps={LEARNING_CRITERIA_TOUR} open={tourOpen} onClose={closeTour} tourId="criterios-aprendizaje" role={user?.rol ?? 'profesor'} version={1} />

      {wizardOpen && (
        <LearningCriteriaWizard
          key={`${selected?.id ?? 'new'}-${selected?.version_trabajo?.revision ?? 0}`}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          materiaId={id}
          materiaGrado={materiaQuery.data?.grado}
          initialSet={selected}
          onChanged={refresh}
          canGenerate={canGenerate}
          hasExisting={hasApproved}
          onBrowseExisting={browseExisting}
        />
      )}
    </div>
  );
}

export default LearningCriteriaPage;
