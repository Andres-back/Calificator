import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, Trash2, Wrench, Gamepad2, Copy, Pencil, Send } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EducationalIcon, EmptyState, QueryState, Skeleton } from '@/components/ui';
import type { EducationalIconName } from '@/components/ui/EducationalIcon';
import { PageHeader } from '@/components/layout/PageHeader';
import { listMaterials, deleteMaterial, pdfUrl, duplicateMaterial } from './api';
import { TOOL_BY_TIPO, TOOL_EDUCATIONAL_ICON } from './meta';
import { queryClient } from '@/lib/queryClient';
import { routes } from '@/config/routes';
import toast from 'react-hot-toast';
import { useDeleteConfirm } from '@/lib/hooks';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

const CATEGORIES = ['Todos', 'Juego', 'Evaluación', 'Material'] as const;

export function ListPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('Todos');
  const { target: deleteTarget, setTarget: setDeleteTarget, mutation: deleteMutation } = useDeleteConfirm({
    mutationFn: deleteMaterial,
    queryKey: ['materials'],
    successMessage: 'Material eliminado.',
  });
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['materials'], queryFn: () => listMaterials() });

  const filtered = (data ?? []).filter((m) => cat === 'Todos' || TOOL_BY_TIPO[m.tipo]?.category === cat);
  const total = data?.length ?? 0;
  const interactive = (data ?? []).filter((m) => TOOL_BY_TIPO[m.tipo]?.interactive).length;
  const evaluable = (data ?? []).filter((m) => TOOL_BY_TIPO[m.tipo]?.category === 'Evaluación').length;
  const printable = total;
  const stats: Array<{ label: string; value: number; icon: EducationalIconName }> = [
    { label: 'Materiales', value: total, icon: 'resources' },
    { label: 'Interactivos', value: interactive, icon: 'interactive-games' },
    { label: 'Borradores antiguos', value: evaluable, icon: 'archived-drafts' },
    { label: 'PDF listos', value: printable, icon: 'pdf-ready' },
  ];



  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos didácticos"
        eyebrow="Recursos didácticos"
        subtitle="Crea, revisa y descarga materiales de práctica y apoyo para tu clase."
        action={<Link to="/app/herramientas/nuevo"><Button><Plus className="h-4 w-4" /> Crear material</Button></Link>}
      />

      <Card className="flex flex-col gap-4 border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/30 dark:bg-brand-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-brand-200 dark:bg-white/10 dark:ring-brand-500/30">
            <EducationalIcon name="prepare-evaluation" className="h-12 w-12" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold">Evaluaciones calificables</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Los exámenes, quices y rúbricas se crean, publican y califican en un solo lugar: dentro de la materia.
            </p>
          </div>
        </div>
        <Link to={routes.materiasPara('evaluar')} className="shrink-0">
          <Button variant="outline">Ir a Evaluaciones</Button>
        </Link>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-1 font-display text-3xl font-extrabold">{item.value}</p>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-border dark:bg-white/10">
                <EducationalIcon name={item.icon} className="h-12 w-12" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chips de filtro */}
      <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-surface-2 p-1" aria-label="Filtrar materiales">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'focus-ring min-h-9 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors',
              cat === c ? 'bg-surface text-brand-700 shadow-sm dark:text-brand-300' : 'text-muted hover:text-fg',
            )}
            aria-pressed={cat === c}
          >
            {c === 'Evaluación' ? 'Borradores antiguos' : c}
          </button>
        ))}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={!data || data.length === 0}
        loading={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40" />)}</div>}
        empty={<EmptyState icon={Wrench} title="Sin material todavía" description="Crea tu primer crucigrama, sopa de letras o guía en segundos." action={<Link to="/app/herramientas/nuevo"><Button><Plus className="h-4 w-4" /> Crear material</Button></Link>} />}
      >
        {filtered.length === 0 ? (
          <EmptyState icon={Wrench} title="No hay materiales en esta categoría" description="Cambia el filtro o crea un recurso nuevo." />
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((material) => {
                const meta = TOOL_BY_TIPO[material.tipo];
                const stateLabel = material.asignacion_tipo === "actividad"
                  ? material.publicado_estudiantes
                    ? material.evaluacion_recepcion_habilitada ? "Actividad · recibe entregas" : "Actividad · entregas cerradas"
                    : "Actividad oculta"
                  : material.asignacion_tipo === "apoyo"
                    ? material.publicado_estudiantes ? "Apoyo visible" : "Apoyo oculto"
                    : "Borrador";
                const stateTone = material.publicado_estudiantes
                  ? "success" as const
                  : material.asignacion_tipo === "actividad" ? "violet" as const : "neutral" as const;
                const assignmentLabel = material.evaluacion_id
                  ? "Abrir actividad"
                  : material.asignacion_tipo === "apoyo" ? "Administrar" : "Asignar";
                return (
                  <motion.div key={material.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <Card interactive className="group flex h-full flex-col p-5">
                      <Link to={`/app/herramientas/${material.id}`} className="flex-1">
                        <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-border dark:bg-white/10"><EducationalIcon name={TOOL_EDUCATIONAL_ICON[material.tipo]} className="h-14 w-14" /></div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{meta?.label ?? material.tipo}</Badge>
                          <Badge tone={stateTone}>{stateLabel}</Badge>


                          {meta?.interactive && <Badge tone="violet"><Gamepad2 className="h-3 w-3" /> Interactivo</Badge>}
                        </div>
                        {material.materia_nombre && <p className="mt-2 text-xs font-semibold text-brand-600">{material.materia_nombre}</p>}
                        <p className="mt-2 font-semibold line-clamp-2">{material.titulo}</p>
                        <p className="mt-1 text-xs text-muted">{formatDate(material.created_at)}</p>
                      </Link>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <Link to={`/app/herramientas/${material.id}?action=edit`} className="min-w-[7rem] flex-1">
                          <Button size="sm" variant="outline" className="w-full"><Pencil className="h-4 w-4" /> Editar</Button>
                        </Link>
                        <Link to={material.evaluacion_id && material.materia_id ? routes.materiaEvaluaciones(material.materia_id) : `/app/herramientas/${material.id}?action=assign`} className="min-w-[7rem] flex-1">
                          <Button size="sm" className="w-full"><Send className="h-4 w-4" /> {assignmentLabel}</Button>
                        </Link>
                        <a href={pdfUrl(material.id)} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost" title="Descargar PDF" aria-label={`Descargar ${material.titulo} en PDF`}><Download className="h-4 w-4" /></Button></a>
                        <Button size="icon" variant="ghost" onClick={async () => { try { const n = await duplicateMaterial(material.id); await queryClient.invalidateQueries({ queryKey: ['materials'] }); toast.success('Duplicado'); navigate(`/app/herramientas/${n.id}`); } catch { toast.error('Error al duplicar'); } }} title="Duplicar material" aria-label={`Duplicar ${material.titulo}`}><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={() => setDeleteTarget({ id: material.id, title: material.titulo })} aria-label={`Eliminar ${material.titulo}`} title="Eliminar material"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </QueryState>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar material"
        description={<>Se eliminará <strong className="text-fg">{deleteTarget?.title}</strong>. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
