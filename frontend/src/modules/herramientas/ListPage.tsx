import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, Wrench, Gamepad2, ClipboardCheck, FileDown, Layers3 } from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState, QueryState, ConfirmDialog } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { listMaterials, deleteMaterial, pdfUrl } from './api';
import { TOOLS, TOOL_BY_TIPO } from './meta';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/cn';

const CATEGORIES = ['Todos', 'Juego', 'Evaluación', 'Material'] as const;

export function ListPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('Todos');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['materials'], queryFn: () => listMaterials() });

  const filtered = (data ?? []).filter((m) => cat === 'Todos' || TOOL_BY_TIPO[m.tipo]?.category === cat);
  const total = data?.length ?? 0;
  const interactive = (data ?? []).filter((m) => TOOL_BY_TIPO[m.tipo]?.interactive).length;
  const evaluable = (data ?? []).filter((m) => TOOL_BY_TIPO[m.tipo]?.category === 'Evaluación').length;
  const printable = total;
  const stats = [
    { label: 'Materiales', value: total, icon: Layers3, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
    { label: 'Interactivos', value: interactive, icon: Gamepad2, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
    { label: 'Evaluables', value: evaluable, icon: ClipboardCheck, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
    { label: 'PDF listos', value: printable, icon: FileDown, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  ];

  const remove = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteMaterial(deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material eliminado');
      setDeleteTarget(null);
    } catch {
      toast.error('No fue posible eliminar el material. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Herramientas"
        eyebrow="Recursos didácticos"
        subtitle="Crea, revisa y descarga actividades listas para adaptar a tu clase."
        action={<Link to="/app/herramientas/nuevo"><Button><Plus className="h-4 w-4" /> Crear material</Button></Link>}
      />

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
              <div className={cn('grid h-10 w-10 place-items-center rounded-lg', item.tone)}>
                <item.icon className="h-5 w-5" />
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
            {c}
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
        empty={<EmptyState icon={Wrench} title="Sin material todavía" description="Crea tu primer crucigrama, sopa de letras, examen o guía en segundos." action={<Link to="/app/herramientas/nuevo"><Button><Plus className="h-4 w-4" /> Crear material</Button></Link>} />}
      >
        {filtered.length === 0 ? (
          <EmptyState icon={Wrench} title="No hay materiales en esta categoría" description="Cambia el filtro o crea un recurso nuevo." />
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((material) => {
                const meta = TOOL_BY_TIPO[material.tipo];
                const Icon = meta?.icon ?? Wrench;
                return (
                  <motion.div key={material.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <Card interactive className="group flex h-full flex-col p-5">
                      <Link to={`/app/herramientas/${material.id}`} className="flex-1">
                        <div className={cn('mb-3 grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm', meta?.gradient ?? 'from-slate-400 to-slate-600')}><Icon className="h-5 w-5" /></div>
                        <div className="flex items-center gap-2"><Badge tone="neutral">{meta?.label ?? material.tipo}</Badge>{meta?.interactive && <Badge tone="violet"><Gamepad2 className="h-3 w-3" /> Interactivo</Badge>}</div>
                        {material.materia_nombre && <p className="mt-2 text-xs font-semibold text-brand-600">{material.materia_nombre}</p>}
                        <p className="mt-2 font-semibold line-clamp-2">{material.titulo}</p>
                        <p className="mt-1 text-xs text-muted">{new Date(material.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </Link>
                      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                        <a href={pdfUrl(material.id)} target="_blank" rel="noreferrer" className="flex-1"><Button size="sm" variant="outline" className="w-full"><Download className="h-4 w-4" /> PDF</Button></a>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setDeleteTarget({ id: material.id, title: material.titulo })} aria-label={`Eliminar ${material.titulo}`} title="Eliminar material"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </QueryState>
      {/* Sugerencias de creación */}
      {!isLoading && (
        <section className="border-t border-border pt-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">¿Qué quieres crear?</h2>
            <p className="text-sm text-muted">Elige un formato y XCalificator preparará la estructura inicial.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TOOLS.map((t) => (
              <Link key={t.tipo} to={`/app/herramientas/nuevo?tipo=${t.tipo}`}>
                <Card interactive className="h-full p-3 text-center">
                  <div className={cn('mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br text-white', t.gradient)}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold">{t.label}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        title="Eliminar material"
        description={<>Se eliminará <strong className="text-fg">{deleteTarget?.title}</strong>. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        tone="danger"
        loading={isDeleting}
      />
    </div>
  );
}
