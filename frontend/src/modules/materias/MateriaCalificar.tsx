import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileImage,
  ImageUp,
  Loader2,
  RotateCcw,
  ScanText,
  Smartphone,
  Trash2,
  TriangleAlert,
  UploadCloud,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Select, RichContent, Skeleton } from '@/components/ui';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { calificarFoto, listCalificaciones, confirmarNota, ajustarNota } from '@/modules/calificaciones/api';
import { useMateriaContext } from './MateriaDetailPage';
import { toApiError } from '@/lib/api';
import { confidenceLabel } from '@/lib/utils';
import type { Calificacion } from '@/types/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

type EstudianteStatus = {
  id: string;
  nombre: string;
  email: string;
  calificacion?: Calificacion;
};

export function MateriaCalificar() {
  const { materia, canManageMateria } = useMateriaContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const evaluacionIdParam = searchParams.get('evaluacion') || '';

  const [evaluacionId, setEvaluacionId] = useState(evaluacionIdParam);
  const [estudianteId, setEstudianteId] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Calificacion | null>(null);
  const [editingNota, setEditingNota] = useState(false);
  const [ajusteNota, setAjusteNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar evaluacionId con URL param
  useEffect(() => {
    if (evaluacionIdParam && evaluacionIdParam !== evaluacionId) {
      setEvaluacionId(evaluacionIdParam);
    }
  }, [evaluacionIdParam]);

  const { data: evaluaciones, isLoading: loadingEval } = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const evalSeleccionada = useMemo(
    () => evaluaciones?.find((e) => e.id === evaluacionId),
    [evaluacionId, evaluaciones],
  );
  const evaluationClosed = evalSeleccionada?.estado === 'cerrada';

  const estudiantesList = useMemo(() => {
    if ('estudiantes' in materia && Array.isArray((materia as any).estudiantes)) {
      return (materia as any).estudiantes as Array<{ id: string; nombre: string; email: string }>;
    }
    return [];
  }, [materia]);

  const calificacionesQuery = useQuery({
    queryKey: ['calificaciones', evaluacionId],
    queryFn: () => listCalificaciones(evaluacionId),
    enabled: Boolean(evaluacionId) && canManageMateria,
  });

  // Build student status list
  const estudiantesConEstado = useMemo<EstudianteStatus[]>(() => {
    if (!calificacionesQuery.data) return estudiantesList;
    return estudiantesList.map((est) => ({
      ...est,
      calificacion: calificacionesQuery.data.find((c) => c.estudiante_id === est.id),
    }));
  }, [estudiantesList, calificacionesQuery.data]);

  const pendientes = useMemo(() => estudiantesConEstado.filter((e) => !e.calificacion), [estudiantesConEstado]);
  const sugeridas = useMemo(() => estudiantesConEstado.filter((e) => e.calificacion?.estado === 'sugerida' || e.calificacion?.estado === 'pendiente'), [estudiantesConEstado]);
  const confirmadas = useMemo(() => estudiantesConEstado.filter((e) => e.calificacion?.estado === 'confirmada'), [estudiantesConEstado]);

  // Select first pending student when evaluation changes
  useEffect(() => {
    if (evaluacionId && pendientes.length > 0 && !estudianteId) {
      setEstudianteId(pendientes[0].id);
    }
    if (!estudianteId && estudiantesList.length > 0) {
      setEstudianteId(estudiantesList[0].id);
    }
  }, [evaluacionId, pendientes, estudianteId, estudiantesList]);

  // Cuando cambia el estudiante, cargar calificación existente y limpiar foto
  useEffect(() => {
    setFoto(null);
    setResultado(null);
    setEditingNota(false);
    setError(null);
    if (!estudianteId || !calificacionesQuery.data) return;
    const existing = calificacionesQuery.data.find((c) => c.estudiante_id === estudianteId);
    if (existing) setResultado(existing);
  }, [estudianteId, calificacionesQuery.data]);

  // Preview URL
  useEffect(() => {
    if (!foto) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(foto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const estudianteActual = estudiantesConEstado.find((e) => e.id === estudianteId);
  const estudianteIndex = estudiantesConEstado.findIndex((e) => e.id === estudianteId);

  const navigateStudent = useCallback((dir: -1 | 1) => {
    const next = estudianteIndex + dir;
    if (next >= 0 && next < estudiantesConEstado.length) {
      setEstudianteId(estudiantesConEstado[next].id);
    }
  }, [estudianteIndex, estudiantesConEstado]);

  const handleFile = useCallback((file: File | undefined) => {
    setResultado(null);
    setError(null);
    if (!file) { setFoto(null); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`La imagen supera el límite de ${MAX_MB} MB.`);
      return;
    }
    setFoto(file);
  }, []);

  const gradeMutation = useMutation({
    mutationFn: () => calificarFoto(evaluacionId, estudianteId, foto!),
    onSuccess: (data) => {
      setResultado(data);
      setError(null);
      calificacionesQuery.refetch();
      toast.success('Foto analizada. Revisa la sugerencia.');
    },
    onError: (e) => {
      const msg = toApiError(e).detail;
      setError(msg);
      toast.error(msg);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (nota: number) => {
      if (!resultado) throw new Error('Sin resultado');
      return confirmarNota(resultado.id, nota);
    },
    onSuccess: () => {
      calificacionesQuery.refetch();
      setEditingNota(false);
      toast.success('Nota confirmada');
      // Avanzar al siguiente pendiente
      if (pendientes.length > 1) {
        const nextIdx = pendientes.findIndex((e) => e.id === estudianteId);
        const next = pendientes[nextIdx + 1] || pendientes[0];
        if (next) setEstudianteId(next.id);
      }
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!resultado) throw new Error('Sin resultado');
      return ajustarNota(resultado.id, Number(ajusteNota));
    },
    onSuccess: () => {
      calificacionesQuery.refetch();
      setEditingNota(false);
      toast.success('Nota ajustada');
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  function getStudentStatusIcon(est: EstudianteStatus) {
    if (!est.calificacion) return <span className="text-muted/40">—</span>;
    if (est.calificacion.estado === 'confirmada') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <span className="text-amber-500 text-xs font-bold">{est.calificacion.nota_sugerida?.toFixed(1) ?? '?'}</span>;
  }

  const selectEvaluacion = (id: string) => {
    setEvaluacionId(id);
    setSearchParams({ evaluacion: id });
    setResultado(null);
    setFoto(null);
    setError(null);
  };

  const isSubmitting = gradeMutation.isPending || confirmMutation.isPending;

  return (
    <div className="space-y-5">
      {!canManageMateria ? (
        <Card className="p-5 text-center text-muted">
          <Users className="mx-auto h-8 w-8 mb-2" />
          <p>Tu docente usará esta sección para calificar tus evaluaciones escritas.</p>
        </Card>
      ) : (
        <>
          {/* Evaluation select */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full max-w-xs">
              {loadingEval ? (
                <Skeleton className="h-11" />
              ) : (
                <Select value={evaluacionId} onChange={(e) => selectEvaluacion(e.target.value)}>
                  <option value="">Selecciona una evaluación</option>
                  {evaluaciones?.map((ev) => (
                    <option key={ev.id} value={ev.id} disabled={ev.estado === 'cerrada'}>
                      {ev.nombre} {ev.estado === 'cerrada' ? '(cerrada)' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            {evaluacionId && (
              <span className="text-sm text-muted">
                {pendientes.length} pendientes · {sugeridas.length} sugeridas · {confirmadas.length} confirmadas
              </span>
            )}
          </div>

          {evaluationClosed && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              Esta evaluación está cerrada. No se pueden enviar nuevas calificaciones, pero puedes revisar las existentes.
            </div>
          )}

          {!evaluacionId ? (
            <EmptyState icon={Camera} title="Selecciona una evaluación" description="Elige una evaluación de esta materia para empezar a calificar." />
          ) : estudiantesList.length === 0 ? (
            <EmptyState icon={Users} title="Sin estudiantes" description="Esta materia no tiene estudiantes matriculados." />
          ) : (
            <>
              {/* Student grid */}
              <Card className="p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
                  <Users className="h-4 w-4" /> Estudiantes
                </div>
                <div className="flex flex-wrap gap-2">
                  {estudiantesConEstado.map((est) => (
                    <button
                      key={est.id}
                      onClick={() => { setEstudianteId(est.id); setFoto(null); setResultado(est.calificacion ?? null); setError(null); }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        est.id === estudianteId
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'border-border hover:border-brand-200 hover:bg-surface-2'
                      } ${est.calificacion?.estado === 'confirmada' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold">
                        {est.nombre.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <span className="max-w-[100px] truncate">{est.nombre.split(' ')[0]}</span>
                      <span className="ml-auto">{getStudentStatusIcon(est)}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Main grading area */}
              <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                {/* Photo upload area */}
                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{estudianteActual?.nombre ?? 'Selecciona un estudiante'}</p>
                      <p className="text-xs text-muted">{estudianteActual?.email}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => navigateStudent(-1)} disabled={estudianteIndex <= 0}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigateStudent(1)} disabled={estudianteIndex >= estudiantesConEstado.length - 1}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-dashed border-border bg-surface-2/50 overflow-hidden">
                    {!foto && !resultado?.nota_sugerida ? (
                      <div className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-600"><FileImage className="h-6 w-6" /></span>
                        <p className="mt-3 font-semibold">Evidencia del estudiante</p>
                        <p className="mt-1 max-w-md text-sm text-muted">Toma una foto clara de su respuesta escrita.</p>
                        {!evaluationClosed && (
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <Button type="button" size="sm" onClick={() => cameraInputRef.current?.click()}><Smartphone className="h-4 w-4" /> Tomar foto</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}><UploadCloud className="h-4 w-4" /> Subir</Button>
                          </div>
                        )}
                        <p className="mt-2 text-xs text-muted">JPG, PNG o WebP · {MAX_MB} MB máx</p>
                      </div>
                    ) : (
                      <div>
                        {previewUrl && <img src={previewUrl} alt="Vista previa" className="max-h-80 w-full bg-surface-2 object-contain" />}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ImageUp className="h-5 w-5 shrink-0 text-brand-500" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{foto?.name ?? 'Foto cargada'}</p>
                              {foto && <p className="text-xs text-muted">{(foto.size / 1024 / 1024).toFixed(2)} MB</p>}
                            </div>
                          </div>
                          {!evaluationClosed && (
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                                <UploadCloud className="h-4 w-4" /> Reemplazar
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setFoto(null)} disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hidden file inputs */}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={(e) => handleFile(e.target.files?.[0])} disabled={isSubmitting || evaluationClosed} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only"
                    onChange={(e) => handleFile(e.target.files?.[0])} disabled={isSubmitting || evaluationClosed} />

                  {error && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
                      <span>{error}</span>
                      {foto && !evaluationClosed && <Button size="sm" variant="outline" onClick={() => gradeMutation.mutate()} disabled={isSubmitting}><RotateCcw className="h-4 w-4" /> Reintentar</Button>}
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200" role="status">
                      <ScanText className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" />
                      <div>
                        <p className="font-semibold">Analizando evidencia</p>
                        <p className="mt-0.5 opacity-80">La IA está comparando la respuesta con los criterios. Esto toma unos segundos.</p>
                      </div>
                    </div>
                  )}

                  {foto && !resultado && !isSubmitting && !evaluationClosed && (
                    <div className="flex justify-end">
                      <Button onClick={() => gradeMutation.mutate()} loading={gradeMutation.isPending}>
                        <ScanText className="h-4 w-4" /> Analizar y sugerir nota
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Result area */}
                <Card className="p-5 space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-bold">Resultado</h2>
                    <p className="text-sm text-muted">Nota sugerida por la IA y decisión docente.</p>
                  </div>

                  {!resultado ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
                      {foto ? 'Sube la foto y haz clic en "Analizar"' : 'Sin resultado aún.'}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl bg-brand-600 p-5 text-white shadow-sm">
                        <p className="text-sm text-white/80">
                          {resultado.estado === 'confirmada' ? 'Nota confirmada' : 'Nota sugerida'}
                        </p>
                        <p className="font-display text-4xl font-extrabold">
                          {editingNota ? (
                            <span className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={evalSeleccionada?.nota_maxima ?? 5}
                                step={0.1}
                                value={ajusteNota}
                                onChange={(e) => setAjusteNota(e.target.value)}
                                className="w-24 rounded-lg bg-white/20 px-3 py-1 text-2xl text-white outline-none placeholder:text-white/50"
                                placeholder={resultado.nota_sugerida?.toFixed(1) ?? ''}
                              />
                              <Button size="sm" className="bg-white text-brand-700 hover:bg-white/90" onClick={() => adjustMutation.mutate()} loading={adjustMutation.isPending}>
                                Guardar
                              </Button>
                              <Button size="sm" variant="ghost" className="text-white/80 hover:text-white" onClick={() => setEditingNota(false)}>
                                Cancelar
                              </Button>
                            </span>
                          ) : (
                            <>
                              {Number(resultado.nota_confirmada ?? resultado.nota_sugerida ?? 0).toFixed(1)}
                              {evalSeleccionada?.nota_maxima != null && (
                                <span className="ml-2 text-lg font-semibold text-white/70">/ {Number(evalSeleccionada.nota_maxima).toFixed(1)}</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {resultado.confianza != null && (
                          <Badge tone="neutral">Confianza {confidenceLabel(resultado.confianza)}</Badge>
                        )}
                        <Badge tone={resultado.estado === 'confirmada' ? 'success' : resultado.estado === 'sugerida' ? 'warning' : 'neutral'}>
                          {resultado.estado}
                        </Badge>
                      </div>

                      {resultado.feedback && (
                        <div className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
                          <RichContent content={resultado.feedback} variant="feedback" />
                        </div>
                      )}

                      {/* Agent scores if available */}
                      {resultado.resultado_json && (resultado.resultado_json as any).nota_grader_a != null && (
                        <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                          <p className="text-xs font-semibold text-muted mb-1">Doble verificación IA:</p>
                          <div className="flex gap-3 text-xs text-muted">
                            <span>DeepSeek: <strong>{(resultado.resultado_json as any).nota_grader_a}</strong></span>
                            <span>Qwen: <strong>{(resultado.resultado_json as any).nota_grader_b}</strong></span>
                            {(resultado.resultado_json as any).discrepancia && (
                              <span className="text-amber-600 flex items-center gap-1"><TriangleAlert className="h-3 w-3" /> Discrepancia detectada</span>
                            )}
                          </div>
                        </div>
                      )}

                      {!evaluationClosed && (
                        <div className="space-y-2 pt-2">
                          {resultado.estado !== 'confirmada' ? (
                            <>
                              <Button className="w-full" onClick={() => confirmMutation.mutate(Number(resultado.nota_sugerida ?? 0))} loading={confirmMutation.isPending}>
                                <CheckCircle2 className="h-4 w-4" /> Confirmar nota {resultado.nota_sugerida?.toFixed(1)}
                              </Button>
                              <Button className="w-full" variant="outline" onClick={() => { setEditingNota(true); setAjusteNota(resultado.nota_sugerida?.toFixed(1) ?? ''); }}>
                                Ajustar nota manualmente
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                              <CheckCircle2 className="h-5 w-5 shrink-0" />
                              <span>Nota confirmada. Puedes ajustarla si es necesario.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
