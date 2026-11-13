import { api } from '@/lib/api';
import type { TieDecision, ReviewEvaluation, ReviewFilter, BandejaDocenteRead, BatchResult, BoletinItem, Calificacion, CalificacionDetalle, EntregaRead, GradeBreakdownData, GradeBreakdownUpdate, GradeFinalAdjustment, GradeBreakdownVersion, IncidenciaRead, ResumenAcademico, SalonSesionRead } from '@/types/api';

export async function getBandejaDocente(): Promise<BandejaDocenteRead> {
  const { data } = await api.get<BandejaDocenteRead>('/calificaciones/bandeja-docente');
  return data;
}

export async function listCalificaciones(evaluacionId: string, options?: { readOnly?: boolean }): Promise<Calificacion[]> {
  const { data } = await api.get<Calificacion[]>(`/evaluaciones/${evaluacionId}/calificaciones`, options?.readOnly ? { params: { solo_lectura: true } } : undefined);
  return data;
}

export async function getEvaluationReview(evaluationId: string, params: { filtro?: ReviewFilter; q?: string; cursor?: string; limit?: number; estudiante_id?: string } = {}, signal?: AbortSignal): Promise<ReviewEvaluation> {
  const { data } = await api.get<ReviewEvaluation>(`/evaluaciones/${evaluationId}/revision`, { params, signal });
  return data;
}

export async function establecerNotaManual(
  evaluacionId: string,
  payload: {
    estudiante_id: string;
    nota_confirmada: number;
    motivo: string;
    feedback?: string;
    redondeo_empate?: TieDecision;
  },
): Promise<Calificacion> {
  const { data } = await api.post<Calificacion>(
    `/evaluaciones/${evaluacionId}/calificaciones/manual`,
    payload,
  );
  return data;
}

export async function confirmarNota(id: string, nota: number, decision?: TieDecision): Promise<Calificacion> {
  const { data } = await api.patch<Calificacion>(`/calificaciones/${id}/confirmar`, { nota_confirmada: nota, ...(decision ? { redondeo_empate: decision } : {}) });
  return data;
}
export async function ajustarNota(id: string, nota: number, feedback?: string, options?: Partial<Omit<GradeFinalAdjustment, 'nota_confirmada'>>): Promise<Calificacion> {
  const { data } = await api.patch<Calificacion>(`/calificaciones/${id}/ajustar`, { nota_confirmada: nota, feedback, ...options });
  return data;
}
export async function marcarRevisionManual(id: string, motivo: string): Promise<Calificacion> {
  const { data } = await api.patch<Calificacion>(`/calificaciones/${id}/revision-manual`, { motivo });
  return data;
}
export interface EvidenceScanCapability {
  corner_assistance_enabled?: boolean;
  schema_version: 1; enabled: boolean; algorithm: string;
  max_pages: number; max_file_bytes: number; max_total_bytes: number; max_scan_pixels: number;
}

export async function getEvidenceScanCapability(evaluationId: string, studentId: string, signal?: AbortSignal): Promise<EvidenceScanCapability> {
  const { data } = await api.get<EvidenceScanCapability>('/calificaciones/capacidades-evidencia', {
    params: { evaluacion_id: evaluationId, estudiante_id: studentId }, signal,
  });
  return data;
}

export async function calificarFoto(
  evaluacionId: string,
  estudianteId: string,
  evidence: File | File[],
  rotations: number[] = [],
  scan?: { requestId: string; submission: import('@/components/evidence/scanSubmission').ScanSubmission },
): Promise<Calificacion> {
  const formData = new FormData();
  formData.append('evaluacion_id', evaluacionId);
  formData.append('estudiante_id', estudianteId);
  const files = Array.isArray(evidence) ? evidence : [evidence];
  files.forEach((file) => formData.append('foto', file));
  if (scan) {
    formData.append('solicitud_id', scan.requestId);
    formData.append('escaneo', JSON.stringify(scan.submission));
  } else {
    formData.append('rotaciones', JSON.stringify(rotations.length ? rotations : files.map(() => 0)));
  }
  const { data } = await api.post<Calificacion>('/calificaciones/foto', formData);
  return data;
}
export async function solicitarReemplazoEvidencia(calificacionId: string, motivo: string): Promise<EntregaRead> {
  const { data } = await api.post<EntregaRead>(`/calificaciones/${calificacionId}/solicitar-reemplazo`, { motivo });
  return data;
}

export async function reintentarCalificacionFoto(calificacionId: string): Promise<Calificacion> {
  const { data } = await api.post<Calificacion>(`/calificaciones/${calificacionId}/reintentar-foto`);
  return data;
}

export interface GradingRevision {
  id: string; created_at: string; actor_nombre: string; accion: string;
  motivo: string | null; estado_anterior: string | null; nota_anterior: string | number | null;
  feedback_anterior: string | null; evidencia_url: string | null;
  originales_paginas?: number;
}

export async function listGradingRevisions(id: string): Promise<GradingRevision[]> {
  const { data } = await api.get<GradingRevision[]>(`/calificaciones/${id}/revisiones`);
  return data;
}

export interface RegradingContext {
  estado: 'sin_cambios' | 'puntajes_actualizados' | 'contenido_modificado' | 'version_no_disponible';
  version_entrega_id: string | null;
  version_objetivo_id: string | null;
  fingerprint: string | null;
  requiere_confirmacion: boolean;
  cambios: { numero: string; puntaje_anterior: string; puntaje_actual: string }[];
  mensaje: string;
}

export async function getRegradingContext(id: string): Promise<RegradingContext> {
  const { data } = await api.get<RegradingContext>(`/calificaciones/${id}/recalificacion-contexto`);
  return data;
}

export interface EditableEvidencePage {
  referencia: string; numero: number; preview_url: string; fuente_url?: string | null;
  rotacion: import('@/components/evidence/scanGeometry').ScanRotation;
  receta?: import('@/components/evidence/scanTypes').EvidenceScanRecipe | null;
}

export interface EvidenceEditContext {
  version_esperada: string; fingerprint: string; paginas: EditableEvidencePage[];
  limites: { max_pages: number; max_file_bytes: number; max_total_bytes: number };
}

export interface EvidenceEditManifest {
  fingerprint: string;
  paginas: ({ referencia: string; rotacion?: number; receta?: EditableEvidencePage['receta'] }
    | { archivo_indice: number; rotacion: number; receta?: EditableEvidencePage['receta'] })[];
}

export async function getEvidenceEditContext(id: string, signal?: AbortSignal): Promise<EvidenceEditContext> {
  const { data } = await api.get<EvidenceEditContext>(`/calificaciones/${encodeURIComponent(id)}/evidencia/edicion`, { signal });
  return data;
}

export async function readEvidenceEditSource(id: string, url: string, signal: AbortSignal): Promise<Blob> {
  const prefix = `/calificaciones/${encodeURIComponent(id)}/evidencia/edicion/`;
  const path = url.startsWith('/api/') ? url.slice(4) : url;
  if (!path.startsWith(prefix) || !/^[a-zA-Z0-9_-]+\?fingerprint=[a-f0-9]{64}$/.test(path.slice(prefix.length))) throw new Error('La fuente de esta hoja no está disponible.');
  const { data } = await api.get<Blob>(path, { signal, responseType: 'blob' });
  return data;
}

export async function reprocessGrade(id: string, payload: {
  requestId: string; version: string; confirmed: boolean; reason: string;
  files?: File[]; rotations?: number[]; evidenceEdit?: EvidenceEditManifest;
  scan?: import('@/components/evidence/scanSubmission').ScanSubmission;
  useCurrentScores?: boolean; targetScoreVersion?: string; scoreContextFingerprint?: string;
}): Promise<Calificacion> {
  const body = new FormData();
  body.append('solicitud_id', payload.requestId);
  body.append('version_esperada', payload.version);
  body.append('confirmar_reapertura', String(payload.confirmed));
  if (payload.useCurrentScores !== undefined) body.append('usar_puntajes_actuales', String(payload.useCurrentScores));
  if (payload.targetScoreVersion) body.append('version_puntajes_objetivo', payload.targetScoreVersion);
  if (payload.scoreContextFingerprint) body.append('contexto_puntajes_fingerprint', payload.scoreContextFingerprint);
  if (payload.reason.trim()) body.append('motivo', payload.reason.trim());
  payload.files?.forEach((file) => body.append('foto', file));
  if (payload.evidenceEdit) body.append('edicion_evidencia', JSON.stringify(payload.evidenceEdit));
  else if (payload.scan) body.append('escaneo', JSON.stringify(payload.scan));
  else if (payload.files?.length) body.append('rotaciones', JSON.stringify(payload.rotations ?? payload.files.map(() => 0)));
  const { data } = await api.post<Calificacion>(`/calificaciones/${id}/recalificar`, body);
  return data;
}
export async function iniciarSalon(evaluacionId: string): Promise<SalonSesionRead> {
  const { data } = await api.post<SalonSesionRead>('/calificaciones/modo-salon/iniciar', null, {
    params: { evaluacion_id: evaluacionId },
  });
  return data;
}
export async function getSalonSesion(sesionId: string): Promise<SalonSesionRead> {
  const { data } = await api.get<SalonSesionRead>(`/calificaciones/modo-salon/${sesionId}`);
  return data;
}

export async function salonFoto(sesionId: string, estudianteId: string, file: File): Promise<Calificacion> {
  const formData = new FormData();
  formData.append('estudiante_id', estudianteId);
  formData.append('foto', file);
  const { data } = await api.post<Calificacion>(`/calificaciones/modo-salon/${sesionId}/foto`, formData);
  return data;
}

export interface LoteCalificacionRead {
  job_id: string;
  estado: 'queued';
  entrega_ids: string[];
  total: number;
  summary_url: string;
}

export async function calificarLoteAsincrono(
  evaluacionId: string,
  items: { estudianteId: string; file: File }[],
): Promise<LoteCalificacionRead> {
  const formData = new FormData();
  formData.append('evaluacion_id', evaluacionId);
  formData.append('estudiantes', JSON.stringify(items.map((item) => item.estudianteId)));
  items.forEach((item) => formData.append('files', item.file));
  const { data } = await api.post<LoteCalificacionRead>('/calificaciones/lote/asincrono', formData);
  return data;
}
export async function cerrarSalon(sesionId: string): Promise<void> {
  await api.delete(`/calificaciones/modo-salon/${sesionId}`);
}
export async function getBoletin(estudianteId: string, materiaId: string): Promise<BoletinItem[]> {
  const { data } = await api.get<BoletinItem[]>(`/estudiantes/${estudianteId}/boletin`, {
    params: { materia_id: materiaId },
  });
  return data;
}
export async function getResumenAcademico(estudianteId: string): Promise<ResumenAcademico> {
  const { data } = await api.get<ResumenAcademico>(`/estudiantes/${estudianteId}/resumen-academico`);
  return data;
}


/* ── Detalle ── */

export async function getCalificacionDetalle(calificacionId: string): Promise<CalificacionDetalle> {
  const { data } = await api.get<CalificacionDetalle>(`/calificaciones/${calificacionId}/detalle`);
  return data;
}


/* ── Batch ── */

export async function confirmarNotaBatch(items: { calificacion_id: string; nota_confirmada: number }[]): Promise<BatchResult> {
  const { data } = await api.post<BatchResult>('/calificaciones/lote/confirmar', { items });
  return data;
}

export async function ajustarNotaBatch(items: { calificacion_id: string; nota_confirmada: number; feedback?: string }[]): Promise<BatchResult> {
  const { data } = await api.post<BatchResult>('/calificaciones/lote/ajustar', { items });
  return data;
}


/** Vuelve a calificar varias entregas sin revisar. El backend omite las que el docente ya decidió. */
export async function recalificarLote(calificacionIds: string[]): Promise<BatchResult> {
  const { data } = await api.post<BatchResult>('/calificaciones/lote/recalificar', { calificacion_ids: calificacionIds });
  return data;
}

export interface AnswerLocationResult {
  ubicadas: number;
  pendientes: number;
  intentos: number;
  intentos_maximos: number;
}

/** Pide a la IA la zona de cada respuesta en la foto. No cambia la nota ni los puntajes. */
export async function ubicarRespuestas(calificacionId: string): Promise<AnswerLocationResult> {
  // La lectura de la hoja tarda más que una petición normal.
  const { data } = await api.post<AnswerLocationResult>(`/calificaciones/${calificacionId}/ubicar-respuestas`, undefined, { timeout: 65_000 });
  return data;
}

export interface ExplanationDraftInput {
  componente_id: string;
  estado: 'correcta' | 'parcial' | 'incorrecta' | 'sin_respuesta';
  puntos_obtenidos: number;
}

export async function redactarExplicacion(calificacionId: string, input: ExplanationDraftInput): Promise<string> {
  // Spec 181: la IA solo redacta; nada se guarda hasta que el docente guarda el ajuste.
  const { data } = await api.post<{ explicacion: string }>(`/calificaciones/${calificacionId}/redactar-explicacion`, input, { timeout: 40_000 });
  return data.explicacion;
}

/* ── Publicar ── */

export async function publicarNota(calificacionId: string): Promise<Calificacion> {
  const { data } = await api.patch<Calificacion>(`/calificaciones/${calificacionId}/publicar`);
  return data;
}

export async function publicarNotaBatch(calificacionIds: string[]): Promise<BatchResult> {
  const { data } = await api.post<BatchResult>('/calificaciones/lote/publicar', calificacionIds);
  return data;
}


/* ── Incidencias ── */

export async function listarIncidencias(calificacionId: string): Promise<IncidenciaRead[]> {
  const { data } = await api.get<IncidenciaRead[]>(`/calificaciones/${calificacionId}/incidencias`);
  return data;
}

export async function crearIncidencia(calificacionId: string, payload: { tipo: string; descripcion: string }): Promise<IncidenciaRead> {
  const { data } = await api.post<IncidenciaRead>(`/calificaciones/${calificacionId}/incidencias`, payload);
  return data;
}

export async function resolverIncidencia(incidenciaId: string, resolucion: string): Promise<IncidenciaRead> {
  const { data } = await api.patch<IncidenciaRead>(`/incidencias/${incidenciaId}/resolver`, { resolucion });
  return data;
}
export async function getGradeBreakdown(calificacionId: string): Promise<GradeBreakdownData> {
  const { data } = await api.get<GradeBreakdownData>(`/calificaciones/${calificacionId}/desglose`);
  return data;
}

export async function updateGradeBreakdown(calificacionId: string, payload: GradeBreakdownUpdate): Promise<GradeBreakdownData> {
  const { data } = await api.put<GradeBreakdownData>(`/calificaciones/${calificacionId}/desglose`, payload);
  return data;
}

export async function getGradeBreakdownHistory(calificacionId: string): Promise<GradeBreakdownVersion[]> {
  const { data } = await api.get<GradeBreakdownVersion[]>(`/calificaciones/${calificacionId}/desglose/historial`);
  return data;
}

export async function setAnswersReleased(evaluacionId: string, liberadas: boolean): Promise<{ evaluacion_id: string; liberadas: boolean }> {
  const { data } = await api.patch(`/evaluaciones/${evaluacionId}/respuestas-liberadas`, { liberadas });
  return data;
}
