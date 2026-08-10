import { useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  BookMarked,
  Pencil,
  Trash2,
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button, Card, Skeleton, EmptyState, Modal, Field, Textarea, ConfirmDialog } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { getMateria } from './api';
import {
  listDbaPersonalizados,
  createDbaPersonalizado,
  updateDbaPersonalizado,
  deleteDbaPersonalizado,
  uploadDocumentForDBA,
  type DBASuggestionItem,
} from './dbaApi';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useDeleteConfirm } from '@/lib/hooks';
import type { DBAPersonalizado } from '@/types/api';

const EMPTY = { enunciado: '', evidencias_aprendizaje: '', ejemplo: '' };

/* ─── Componente de upload de documento ─── */

function DocumentUploader({
  materiaId,
  onDone,
}: {
  materiaId: string;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    info: { nombre: string; parrafos: number; chars: number };
    sugerencias: DBASuggestionItem[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSelect = (f: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(f.type) && !f.name.endsWith('.pdf') && !f.name.endsWith('.docx')) {
      toast.error('Solo se aceptan archivos PDF o Word (.docx)');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('El archivo no debe superar 20 MB');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadDocumentForDBA(materiaId, file);
      setResult({
        info: {
          nombre: res.nombre_archivo,
          parrafos: res.paginas_parrafos,
          chars: res.caracteres_extraidos,
        },
        sugerencias: res.sugerencias,
      });
      if (res.sugerencias.length === 0) {
        toast('No se generaron sugerencias de DBA. Revisa que el documento tenga contenido curricular.');
      } else {
        toast.success(`Se generaron ${res.sugerencias.length} sugerencia(s) de DBA`);
      }
    } catch (err) {
      toast.error(toApiError(err).detail);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateSuggestion = async (sug: DBASuggestionItem) => {
    try {
      await createDbaPersonalizado(materiaId, {
        enunciado: sug.enunciado,
        evidencias_aprendizaje: sug.evidencias_aprendizaje ?? undefined,
        ejemplo: sug.ejemplo ?? undefined,
      });
      toast.success('DBA creado desde sugerencia');
      queryClient.invalidateQueries({ queryKey: ['dba-personalizados', materiaId] });
      onDone();
    } catch (err) {
      toast.error(toApiError(err).detail);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <FileText className="h-8 w-8 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{result.info.nombre}</p>
            <p className="text-xs text-muted">
              {result.info.parrafos} párrafos &middot; {result.info.chars.toLocaleString()} caracteres extraídos
            </p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>

        {result.sugerencias.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin sugerencias"
            description="El documento no contenía suficiente contenido curricular para generar DBA."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted">
              {result.sugerencias.length} DBA sugerido(s) del documento — revisa antes de crear:
            </p>
            {result.sugerencias.map((sug, idx) => (
              <Card key={idx} className="p-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">Enunciado</p>
                    <p className="mt-0.5 text-sm font-medium">{sug.enunciado}</p>
                  </div>
                  {sug.evidencias_aprendizaje && (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide">Evidencias</p>
                      <p className="mt-0.5 text-sm text-muted">{sug.evidencias_aprendizaje}</p>
                    </div>
                  )}
                  {sug.ejemplo && (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide">Ejemplo</p>
                      <p className="mt-0.5 text-sm text-muted">{sug.ejemplo}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handleCreateSuggestion(sug)}>
                    <Plus className="h-4 w-4" /> Crear DBA
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button variant="outline" onClick={() => { setResult(null); setFile(null); setUploading(false); }}>
          Subir otro documento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-2/50 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/30 dark:hover:border-brand-400 dark:hover:bg-brand-500/10"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
        tabIndex={0}
        role="button"
        aria-label="Subir archivo PDF o Word"
      >
        <Upload className="mb-3 h-10 w-10 text-muted" />
        <p className="text-sm font-semibold">Sube un PDF o Word (.docx)</p>
        <p className="mt-1 text-xs text-muted">
          El sistema extraerá el texto y generará sugerencias de DBA automáticamente
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleSelect(f);
          }}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-brand-500" />
            <span className="truncate text-sm font-medium">{file.name}</span>
            <span className="shrink-0 text-xs text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Quitar</Button>
            <Button size="sm" onClick={handleUpload} loading={uploading} disabled={uploading}>
              {uploading ? 'Procesando…' : 'Subir y generar DBA'}
            </Button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Extrayendo texto y generando sugerencias…
        </div>
      )}
    </div>
  );
}

/* ─── Gestor de DBA existente ─── */

function DbaContent({ materiaId }: { materiaId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DBAPersonalizado | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [showUploader, setShowUploader] = useState(false);
  const { target: confirmDeleteTarget, setTarget: setConfirmDeleteTarget, mutation: remove } = useDeleteConfirm({
    mutationFn: deleteDbaPersonalizado,
    queryKey: ['dba-personalizados', materiaId],
    successMessage: 'DBA desactivado.',
  });

  const { data: materia } = useQuery({ queryKey: ['materia', materiaId], queryFn: () => getMateria(materiaId) });
  const { data, isLoading, isError } = useQuery({ queryKey: ['dba-personalizados', materiaId], queryFn: () => listDbaPersonalizados(materiaId) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dba-personalizados', materiaId] });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d: DBAPersonalizado) => {
    setEditing(d);
    setForm({ enunciado: d.enunciado, evidencias_aprendizaje: d.evidencias_aprendizaje ?? '', ejemplo: d.ejemplo ?? '' });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        enunciado: form.enunciado.trim(),
        evidencias_aprendizaje: form.evidencias_aprendizaje.trim() || undefined,
        ejemplo: form.ejemplo.trim() || undefined,
      };
      return editing ? updateDbaPersonalizado(editing.id, payload) : createDbaPersonalizado(materiaId, payload);
    },
    onSuccess: () => { invalidate(); toast.success(editing ? 'DBA actualizado' : 'DBA creado'); setOpen(false); },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const valid = form.enunciado.trim().length >= 10;

  if (isLoading) {
    return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageHeader
            title="DBA personalizados"
            eyebrow="Derechos Básicos de Aprendizaje"
            subtitle={materia ? `Gestiona los DBA para ${materia.nombre}.` : 'Crea y gestiona DBA personalizados.'}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4" /> {showUploader ? 'Cerrar subida' : 'Subir PDF o Word'}
          </Button>
          <Button onClick={openCreate} disabled={save.isPending}>
            <Plus className="h-4 w-4" /> Nuevo DBA
          </Button>
        </div>
      </div>

      {/* Uploader expandible */}
      {showUploader && (
        <Card className="p-5">
          <DocumentUploader
            materiaId={materiaId}
            onDone={() => setShowUploader(false)}
          />
        </Card>
      )}

      {/* Error */}
      {isError ? (
        <Card className="flex items-start gap-3 border-rose-200 p-5 dark:border-rose-500/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-500" />
          <div>
            <p className="font-semibold">No se pudieron cargar los DBA</p>
            <p className="mt-1 text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Sin DBA personalizados"
          description="Crea tu primer DBA manualmente o sube un documento PDF/Word para generarlos automáticamente."
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo DBA</Button>
              <Button variant="secondary" onClick={() => setShowUploader(true)}>
                <Upload className="h-4 w-4" /> Subir documento
              </Button>
            </div>
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4">
            {data.map((dba, i) => (
              <motion.div key={dba.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{dba.enunciado}</p>
                      {dba.evidencias_aprendizaje && <p className="mt-2 text-sm text-muted"><b>Evidencias:</b> {dba.evidencias_aprendizaje}</p>}
                      {dba.ejemplo && <p className="mt-1 text-sm text-muted"><b>Ejemplo:</b> {dba.ejemplo}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(dba)} aria-label={`Editar DBA ${dba.enunciado}`} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteTarget({ id: dba.id, title: dba.enunciado })} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label={`Eliminar DBA ${dba.enunciado}`} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Modal crear/editar */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar DBA' : 'Nuevo DBA'}>
        <div className="space-y-4">
          <Field label="Enunciado" required hint="Describe el derecho básico de aprendizaje. Mínimo 10 caracteres.">
            <Textarea
              value={form.enunciado}
              onChange={(event) => setForm((prev) => ({ ...prev, enunciado: event.currentTarget.value }))}
              placeholder="Ej: Comprende la relación entre los seres vivos y su entorno."
              rows={3}
              aria-invalid={Boolean(form.enunciado && !valid)}
            />
          </Field>
          <Field label="Evidencias de aprendizaje" hint="Opcional. Indicadores observables de que el estudiante alcanzó el DBA.">
            <Textarea
              value={form.evidencias_aprendizaje}
              onChange={(event) => setForm((prev) => ({ ...prev, evidencias_aprendizaje: event.currentTarget.value }))}
              placeholder="Ej: Identifica factores bióticos y abióticos en un ecosistema local."
              rows={2}
            />
          </Field>
          <Field label="Ejemplo" hint="Opcional. Situación o caso concreto que ilustra el DBA.">
            <Textarea
              value={form.ejemplo}
              onChange={(event) => setForm((prev) => ({ ...prev, ejemplo: event.currentTarget.value }))}
              placeholder="Ej: Al visitar un humedal, el estudiante clasifica los organismos que observa."
              rows={2}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!valid || save.isPending} loading={save.isPending}>
              {editing ? 'Actualizar' : 'Crear DBA'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteTarget)}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
        title="Desactivar DBA"
        description="El DBA se desactivará y ya no estará disponible para nuevas evaluaciones. Las evaluaciones existentes no se ven afectadas."
        confirmLabel="Desactivar"
        tone="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

export function MateriaDbaPage() {
  const { id = '' } = useParams();
  const user = useAuth((state) => state.user);
  const materiaId = id;

  if (user?.rol === 'estudiante') {
    return <Navigate to={`/app/materias/${materiaId}`} replace />;
  }

  return <DbaContent materiaId={materiaId} />;
}
