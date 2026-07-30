import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Download, FileCheck2, Trash2, Gamepad2, Printer, Share2, Sparkles, Copy, ClipboardList, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, LoadingScreen, Badge, Card, ConfirmDialog, Select, Input, Field, Modal } from '@/components/ui';
import { getMaterial, pdfUrl, deleteMaterial, updateMaterial, editMaterial, duplicateMaterial, convertToEvaluacion } from './api';
import { TOOL_BY_TIPO } from './meta';
import { CrucigramaView, SopaLetrasView, MatchingView, ContenidoView } from './views';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import type { ToolContent } from './views/ContenidoView';
import { cn } from '@/lib/cn';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { CrucigramaContenido, MatchingContenido, SopaContenido } from '@/types/api';
import type { MaterialTipo } from '@/types/api';

export function DetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [convertMateria, setConvertMateria] = useState('');
  const [convertNombre, setConvertNombre] = useState('');
  const [convertNota, setConvertNota] = useState(5);
  const [converting, setConverting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { data: materias = [] } = useMaterias();
  const { data: material, isLoading } = useQuery({ queryKey: ['material', id], queryFn: () => getMaterial(id) });
  const meta = material ? TOOL_BY_TIPO[material.tipo] : undefined;
  const Icon = meta?.icon ?? Gamepad2;
  const content = material?.contenido_json ?? {};
  const contentTitle = ((typeof content.titulo === 'string' ? content.titulo : material?.titulo) ?? '');
  const instructions = typeof content.instrucciones === 'string' ? content.instrucciones : null;
  const aiTrace = (
    content._xcalificator
    && typeof content._xcalificator === 'object'
    && !Array.isArray(content._xcalificator)
  ) ? content._xcalificator as Record<string, unknown> : null;
  const alignedDba = Array.isArray(aiTrace?.dba_seleccionados) ? aiTrace.dba_seleccionados.length : 0;

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

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: contentTitle,
          text: `Revisa este material: ${contentTitle}`,
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Enlace copiado al portapapeles');
      } else {
        toast.error('No se pudo compartir el material.');
      }
    } catch {
      // user cancelled
    }
  };

  const handleAssignMateria = async (materiaId: string) => {
    setAssigning(true);
    try {
      await updateMaterial(id, { materia_id: materiaId || undefined });
      await queryClient.invalidateQueries({ queryKey: ['material', id] });
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success(materiaId ? 'Material asignado a la materia' : 'Materia desasignada');
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setAssigning(false);
    }
  };

  const startEditing = useCallback(() => {
    setEditTitle(contentTitle);
    setEditContent(JSON.stringify(content, null, 2));
    setEditing(true);
  }, [contentTitle, content]);

  const saveEdits = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(editContent);
      } catch {
        toast.error('El contenido no es JSON válido. Revisa la sintaxis.');
        setSaving(false);
        return;
      }
      await editMaterial(id, { titulo: editTitle, contenido_json: parsed });
      await queryClient.invalidateQueries({ queryKey: ['material', id] });
      setEditing(false);
      toast.success('Material actualizado');
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const newMaterial = await duplicateMaterial(id);
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material duplicado');
      navigate(`/app/herramientas/${newMaterial.id}`);
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setDuplicating(false);
    }
  };

  const handleConvert = async () => {
    if (converting) return;
    setConverting(true);
    try {
      const result = await convertToEvaluacion(id, {
        materia_id: convertMateria || undefined,
        nombre: convertNombre || undefined,
        nota_maxima: convertNota,
      });
      await queryClient.invalidateQueries({ queryKey: ['evaluaciones'] });
      setShowConvert(false);
      toast.success(`Evaluación creada: ${result.nombre} (${result.total_preguntas} preguntas)`);
      navigate(`/app/evaluaciones`);
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setConverting(false);
    }
  };

  const canConvert = material?.tipo === 'examen' || material?.tipo === 'quiz_rapido' || material?.tipo === 'rubrica';
  if (isLoading) return <LoadingScreen />;
  if (!material) return <p className="text-muted">Material no encontrado.</p>;

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
      {/* Print header — visible solo al imprimir */}
      <div className="print-header hidden print:block">
        <h1>{contentTitle}</h1>
        <p className="meta">{meta?.label ?? material.tipo}{material.materia_nombre ? ` · ${material.materia_nombre}` : ''}</p>
        <div className="student-info">
          <span>Nombre: <span className="line">_______________________</span></span>
          <span>Grado: <span className="line">___________</span></span>
        </div>
      </div>

      {/* Breadcrumb — oculto al imprimir */}
      <nav className="flex items-center gap-1.5 text-xs text-muted print:hidden" aria-label="Breadcrumb">
        <Link to="/app/herramientas" className="hover:text-fg">Herramientas</Link>
        <span aria-hidden>/</span>
        <span className="text-fg">{meta?.label ?? material.tipo}</span>
      </nav>

      <Link to="/app/herramientas" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg print:hidden">
        <ArrowLeft className="h-4 w-4" /> Volver a Herramientas
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-6 sm:p-8 print:hidden',
          meta?.gradient ? 'from-surface to-surface-2' : 'from-surface to-surface-2',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn('grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md', meta?.gradient ?? 'from-slate-500 to-slate-700')}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{meta?.label ?? material.tipo}</Badge>
                {meta?.interactive && (
                  <Badge tone="violet"><Gamepad2 className="h-3 w-3" /> Interactivo</Badge>
                )}
                {meta?.category && <Badge tone="neutral">{meta.category}</Badge>}
              </div>
              <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{contentTitle}</h1>
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
            <Button size="icon" variant="ghost" onClick={handlePrint} title="Imprimir" aria-label="Imprimir material">
              <Printer className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleShare} title="Compartir" aria-label="Compartir material">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={startEditing} title="Editar contenido">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button size="sm" variant="outline" onClick={handleDuplicate} loading={duplicating} loadingLabel="Duplicando…" title="Duplicar material">
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
            {canConvert && (
              <Button size="sm" variant="outline" onClick={() => setShowConvert(true)} title="Convertir a evaluación">
                <ClipboardList className="h-4 w-4" /> Usar como evaluación
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Eliminar" aria-label="Eliminar material">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {material.materia_id && (
          <p className="mt-3 text-xs text-muted">
            Asignado a: <span className="font-semibold text-brand-600">{materias.find((m) => m.id === material.materia_id)?.nombre ?? '—'}</span>
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 print:hidden">
          <span className="text-xs text-muted">Materia:</span>
          <Select
            value={material?.materia_id ?? ''}
            onChange={(e) => handleAssignMateria(e.target.value)}
            disabled={assigning}
            className="max-w-xs"
          >
            <option value="">Sin asignar</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}{m.grado ? ` - ${m.grado}` : ''}</option>
            ))}
          </Select>
        </div>
      </motion.div>

      {aiTrace && (
        <div className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100 print:hidden">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Borrador IA alineado con {alignedDba} DBA{alignedDba === 1 ? '' : 's'}</p>
            <p className="mt-0.5 text-xs opacity-80">La IA propone. Revisa el contenido y valida que sea apropiado para tu grupo antes de imprimir, descargar o compartir.</p>
          </div>
        </div>
      )}

      {instructions && material.tipo !== 'examen' && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 print:hidden">
          <p className="font-semibold">Instrucciones</p>
          <p className="mt-0.5">{instructions}</p>
        </div>
      )}

      <Card className="p-5 sm:p-7 print:!p-0 print:!shadow-none print:!border-0 print:!bg-transparent">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Editando contenido</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveEdits} loading={saving} loadingLabel="Guardando…">Guardar cambios</Button>
              </div>
            </div>
            <Field label="Título">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </Field>
            <Field label="Contenido (JSON)">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="focus-ring min-h-[400px] w-full rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs"
                spellCheck={false}
              />
            </Field>
            <p className="text-xs text-muted">
              Edita el contenido JSON directamente. Los cambios se guardan al pulsar "Guardar cambios".
            </p>
          </div>
        ) : (
          renderBody()
        )}
      </Card>
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
      {showConvert && (
        <Modal open onClose={() => setShowConvert(false)} ariaLabel="Convertir a evaluación">
          <div className="space-y-5 p-6">
            <h2 className="font-display text-xl font-extrabold">Convertir a evaluación</h2>
            <p className="text-sm text-muted">
              Se creará una evaluación en estado <strong>borrador</strong> con las preguntas de este material.
            </p>
            <Field label="Nombre de la evaluación">
              <Input value={convertNombre} onChange={(e) => setConvertNombre(e.target.value)} placeholder={contentTitle} />
            </Field>
            <Field label="Materia">
              <Select value={convertMateria} onChange={(e) => setConvertMateria(e.target.value)}>
                <option value="">Sin asignar</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}{m.grado ? ` - ${m.grado}` : ''}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nota máxima">
              <Input type="number" min={1} max={100} step={0.5} value={convertNota} onChange={(e) => setConvertNota(Number(e.target.value))} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowConvert(false)}>Cancelar</Button>
              <Button onClick={handleConvert} loading={converting} loadingLabel="Creando…">
                <ClipboardList className="h-4 w-4" /> Crear evaluación
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
