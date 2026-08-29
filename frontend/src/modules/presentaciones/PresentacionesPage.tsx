import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDeleteConfirm } from '@/lib/hooks';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Plus,
  Presentation,
  Trash2,
} from 'lucide-react';
import { Badge, BrandFeatureIcon, Button, Card, ConfirmDialog, EmptyState, Modal, QueryError, Skeleton, StatCard } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import {
  createPresentacion,
  deletePresentacion,
  listPresentaciones,
  type PresentacionCreate,
} from './api';
import { PresentacionForm } from './PresentacionForm';
import { PresentationFileLink } from './PresentationFileLink';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { PresentationPreviewModal } from './PresentationPreviewModal';

const STATE: Record<string, { tone: 'warning' | 'info' | 'success' | 'error'; label: string; icon: typeof Clock; accent: string }> = {
  queued: { tone: 'warning', label: 'En cola', icon: Clock, accent: 'border-l-amber-500' },
  running: { tone: 'info', label: 'Generando…', icon: Loader2, accent: 'border-l-sky-500' },
  success: { tone: 'success', label: 'Lista', icon: CheckCircle2, accent: 'border-l-emerald-500' },
  failed: { tone: 'error', label: 'Error', icon: AlertTriangle, accent: 'border-l-rose-500' },
};
function presentationErrorMessage(error: string | null) {
  const value = (error ?? '').toLowerCase();
  if (value.includes('timeout') || value.includes('timed out')) return 'La generación tardó más de lo esperado. Puedes crear una nueva presentación.';
  if (value.includes('imagen') || value.includes('image')) return 'No fue posible preparar una de las imágenes. Puedes crear una nueva presentación.';
  if (value.includes('openai') || value.includes('groq') || value.includes('provider')) return 'El proveedor de IA no pudo completar la generación. Intenta crear una nueva presentación más tarde.';
  return 'La presentación no pudo completarse. Puedes crear una nueva presentación o intentarlo más tarde.';
}

export function PresentacionesPage() {
  const [open, setOpen] = useState(false);
  const [previewPresentation, setPreviewPresentation] = useState<{ id: string; title: string } | null>(null);
  const { target: presentationToDelete, setTarget: setPresentationToDelete, mutation: remove } = useDeleteConfirm({
    mutationFn: deletePresentacion,
    queryKey: ['presentaciones'],
    successMessage: 'Presentación eliminada.',
  });
  const materias = useMaterias();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['presentaciones'],
    queryFn: listPresentaciones,
    refetchInterval: (query) => ((query.state.data ?? []).some((presentation) => presentation.estado === 'running' || presentation.estado === 'queued') ? 4000 : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const create = useMutation({
    mutationFn: (payload: PresentacionCreate) => createPresentacion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentaciones'] });
      toast.success('Generando presentación… puede tardar unos minutos.');
      setOpen(false);
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presentaciones"
        eyebrow="Contenido educativo"
        subtitle="Genera, revisa y exporta material de clase sin perder el control editorial."
        breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Presentaciones' }]}
        primaryAction={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Nueva presentación</Button>}
      />

      {!isLoading && data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={Clock} label="En proceso" value={data.filter((item) => item.estado === 'queued' || item.estado === 'running').length} tone="info" size="sm" />
          <StatCard icon={CheckCircle2} label="Listas" value={data.filter((item) => item.estado === 'success').length} tone="success" size="sm" />
          <StatCard icon={AlertTriangle} label="Con error" value={data.filter((item) => item.estado === 'failed').length} tone="error" size="sm" />
        </div>
      )}

      {isError ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Presentation}
          title="Sin presentaciones"
          description="Crea tu primera presentación: XCalificator genera el contenido, las imágenes y los archivos descargables."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nueva presentación</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {data.map((p, i) => {
            const st = STATE[p.estado] ?? STATE.queued;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={`flex flex-col gap-4 border-l-4 p-5 lg:flex-row lg:flex-wrap lg:items-center ${st.accent}`}>
                  <BrandFeatureIcon kind="presentaciones" className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{p.titulo}</p>
                      <Badge tone={st.tone}><st.icon className={`h-3.5 w-3.5 ${p.estado === 'running' ? 'animate-spin' : ''}`} /> {st.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{formatDate(p.created_at, { day: '2-digit', month: 'short' })}</span>
                      {(p.pptx_url || p.pdf_url) && <span>Archivos listos para descarga</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {p.estado === 'success' && (
                      <Button size="sm" variant="outline" onClick={() => setPreviewPresentation({ id: p.id, title: p.titulo })}>
                        <Eye className="h-4 w-4" /> Vista previa
                      </Button>
                    )}
                    {p.pptx_url && (
                      <PresentationFileLink id={p.id} format="pptx" />
                    )}
                    {p.pdf_url && (
                      <PresentationFileLink id={p.id} format="pdf" />
                    )}
                    <Button size="icon" variant="ghost" className="text-rose-700 dark:text-rose-300" onClick={() => setPresentationToDelete({ id: p.id, title: p.titulo })} loading={remove.isPending} aria-label={`Eliminar ${p.titulo}`} title="Eliminar presentación">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {p.estado === 'failed' && (
                    <div className="flex w-full basis-full flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">{presentationErrorMessage(p.error)}</span>
                      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Crear otra</Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva presentación" className="max-w-2xl">
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1 sm:max-h-[75vh]">
          <PresentacionForm loading={create.isPending} materias={materias.data ?? []} onSubmit={(payload) => create.mutate(payload)} />
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(presentationToDelete)}
        onClose={() => setPresentationToDelete(null)}
        onConfirm={() => remove.mutate()}
        title="Eliminar presentación"
        description={presentationToDelete ? `Eliminarás "${presentationToDelete.title}" y sus archivos asociados. Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar"
        tone="danger"
        loading={remove.isPending}
      />
      <PresentationPreviewModal presentation={previewPresentation} onClose={() => setPreviewPresentation(null)} />
    </div>
  );
}

