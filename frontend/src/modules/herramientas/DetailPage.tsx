import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, FileCheck2, Trash2, Gamepad2, BookOpenCheck, PenLine, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, LoadingScreen, Badge, Card, ConfirmDialog } from '@/components/ui';
import { getMaterial, pdfUrl, deleteMaterial } from './api';
import { TOOL_BY_TIPO } from './meta';
import { CrucigramaView, SopaLetrasView, MatchingView, ContenidoView } from './views';
import type { ToolContent } from './views/ContenidoView';
import { cn } from '@/lib/cn';
import { queryClient } from '@/lib/queryClient';
import type { CrucigramaContenido, MatchingContenido, SopaContenido } from '@/types/api';

export function DetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: material, isLoading } = useQuery({ queryKey: ['material', id], queryFn: () => getMaterial(id) });

  if (isLoading) return <LoadingScreen />;
  if (!material) return <p className="text-muted">Material no encontrado.</p>;

  const meta = TOOL_BY_TIPO[material.tipo];
  const Icon = meta?.icon ?? Gamepad2;
  const content = material.contenido_json;
  const contentTitle = typeof content.titulo === 'string' ? content.titulo : material.titulo;
  const instructions = typeof content.instrucciones === 'string' ? content.instrucciones : null;

  const remove = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteMaterial(id);
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material eliminado');
      navigate('/app/herramientas');
    } catch {
      toast.error('No fue posible eliminar el material. Intenta nuevamente.');
      setIsDeleting(false);
    }
  };

  const renderBody = () => {
    switch (material.tipo) {
      case 'crucigrama': return <CrucigramaView data={content as unknown as CrucigramaContenido} />;
      case 'sopa_letras': return <SopaLetrasView data={content as unknown as SopaContenido} />;
      case 'unir_columnas':
      case 'emparejar': return <MatchingView data={content as unknown as MatchingContenido} />;
      default: return <ContenidoView tipo={material.tipo} data={content as unknown as ToolContent} />;
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/app/herramientas" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a Herramientas
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border pb-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn('grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm', meta?.gradient ?? 'from-slate-500 to-slate-700')}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <Badge tone="neutral">{meta?.label ?? material.tipo}</Badge>
              <h1 className="mt-1 font-display text-2xl font-extrabold">{contentTitle}</h1>
              {material.materia_nombre && <p className="mt-1 text-sm text-muted">{material.materia_nombre}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={pdfUrl(id, false)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4" /> PDF estudiante
              </Button>
            </a>
            <a href={pdfUrl(id, true)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                <FileCheck2 className="h-4 w-4" /> PDF respuestas
              </Button>
            </a>
            <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Eliminar" aria-label="Eliminar material">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      {meta?.interactive && (
        <Badge tone="violet" className="mt-4"><Gamepad2 className="h-3.5 w-3.5" /> Modo interactivo</Badge>
      )}
      </motion.div>

      <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-card md:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Alineación</p>
            <p className="text-xs text-muted">Revisa tema, grado y DBA antes de usarlo.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <PenLine className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Edición docente</p>
            <p className="text-xs text-muted">Ajusta instrucciones y dificultad si hace falta.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Control humano</p>
            <p className="text-xs text-muted">La IA sugiere. El docente decide.</p>
          </div>
        </div>
      </div>

      {instructions && material.tipo !== 'examen' && (
        <p className="text-sm text-muted">{instructions}</p>
      )}

      <Card className="p-5 sm:p-7">{renderBody()}</Card>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title="Eliminar material"
        description={<>Se eliminará <strong className="text-fg">{material.titulo}</strong>. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        tone="danger"
        loading={isDeleting}
      />
    </div>
  );
}
