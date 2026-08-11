import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { DBARead, EntregaOnlineCreate, EntregaRead, Evaluacion, EvaluacionModalidad, IncidenciaRead, SolicitudRevisionMotivo, StudentActivity } from '@/types/api';

export interface EvaluacionCreate {
  materia_id: string;
  nombre: string;
  descripcion?: string;
  tipo_origen?: string;
  modalidad?: EvaluacionModalidad;
  nota_maxima?: number;
  dba_ids?: string[];
  dba_personalizado_ids?: string[];
  metas_profesor?: string[];
  criterios?: Record<string, unknown>[];
  preguntas?: Record<string, unknown>[];
  respuestas_esperadas?: Record<string, unknown>[];
}

export interface EvaluacionGenerarRequest {
  materia_id: string;
  nombre: string;
  tema: string;
  descripcion?: string;
  modalidad: EvaluacionModalidad;
  nota_maxima: number;
  cantidad_preguntas: number;
  tipos_pregunta: Array<'opcion_multiple' | 'abierta' | 'verdadero_falso' | 'completar'>;
  dba_ids: string[];
  dba_personalizado_ids: string[];
  usar_rubrica: boolean;
  metas_profesor: string[];
  criterios_docente: string[];
  instrucciones_adicionales?: string;
  material_referencia?: string;
  politica_intento?: 'un_intento' | 'multiples_intentos' | 'mejor_puntaje' | 'ultimo_intento' | 'practica_libre' | null;
  intentos_permitidos?: number;
  tiempo_limite_minutos?: number;
}

export type EvaluacionUpdate = Partial<Omit<EvaluacionCreate, 'materia_id' | 'tipo_origen'>>;

export interface ListDBAParams {
  area?: string;
  grado?: string;
}

export async function listEvaluaciones(materiaId: string): Promise<Evaluacion[]> {
  const { data } = await api.get<Evaluacion[]>(`/materias/${materiaId}/evaluaciones`);
  return data;
}
export async function getEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.get<Evaluacion>(`/evaluaciones/${id}`);
  return data;
}
export async function createEvaluacion(payload: EvaluacionCreate): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>('/evaluaciones', payload);
  return data;
}
export async function generarBorradorEvaluacion(payload: EvaluacionGenerarRequest): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>('/evaluaciones/generar-borrador', payload);
  return data;
}
export interface ReferenciaExtraida {
  texto: string;
  nombre_archivo: string;
  mime: string;
  caracteres: number;
  advertencias: string[];
}
export async function extraerReferenciaEvaluacion(materiaId: string, file: File): Promise<ReferenciaExtraida> {
  const formData = new FormData();
  formData.append('materia_id', materiaId);
  formData.append('file', file);
  const { data } = await api.post<ReferenciaExtraida>('/evaluaciones/referencia/extraer', formData);
  return data;
}
export async function updateEvaluacion(id: string, payload: EvaluacionUpdate): Promise<Evaluacion> {
  const { data } = await api.patch<Evaluacion>(`/evaluaciones/${id}`, payload);
  return data;
}
export async function publicarEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`/evaluaciones/${id}/publicar`);
  return data;
}
export async function cerrarEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`/evaluaciones/${id}/cerrar`);
  return data;
}
export async function activarRecepcionEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`/evaluaciones/${id}/activar-recepcion`);
  return data;
}
export async function pausarRecepcionEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`/evaluaciones/${id}/pausar-recepcion`);
  return data;
}
export async function deleteEvaluacion(id: string): Promise<void> {
  await api.delete(`/evaluaciones/${id}`);
}
export async function crearEntregaOnline(evaluacionId: string, payload: EntregaOnlineCreate): Promise<EntregaRead> {
  const { data } = await api.post<EntregaRead>(`/evaluaciones/${evaluacionId}/entregas`, payload);
  return data;
}
export async function getMiEntrega(evaluacionId: string): Promise<EntregaRead | null> {
  try {
    const { data } = await api.get<EntregaRead>(`/evaluaciones/${evaluacionId}/mi-entrega`);
    return data;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 404) return null;
    throw error;
  }
}
export async function getActividadEstudiante(evaluacionId: string): Promise<StudentActivity | null> {
  const { data } = await api.get<StudentActivity | null>(`/evaluaciones/${evaluacionId}/actividad`);
  return data;
}
export function evaluationPdfUrl(evaluacionId: string, descargar = false): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  return base + '/evaluaciones/' + evaluacionId + '/pdf' + (descargar ? '?descargar=true' : '');
}
export async function getMiSolicitudRevision(evaluacionId: string): Promise<IncidenciaRead | null> {
  const { data } = await api.get<IncidenciaRead | null>(`/evaluaciones/${evaluacionId}/mi-solicitud-revision`);
  return data;
}
export async function solicitarRevisionEvaluacion(
  evaluacionId: string,
  payload: { motivo: SolicitudRevisionMotivo; descripcion: string },
): Promise<IncidenciaRead> {
  const { data } = await api.post<IncidenciaRead>(`/evaluaciones/${evaluacionId}/solicitud-revision`, payload);
  return data;
}
export async function crearEntregaArchivo(
  evaluacionId: string,
  evidence: File | File[],
  rotations: number[] = [],
): Promise<EntregaRead> {
  const formData = new FormData();
  const files = Array.isArray(evidence) ? evidence : [evidence];
  files.forEach((file) => formData.append('archivo', file));
  formData.append('rotaciones', JSON.stringify(
    rotations.length ? rotations : files.map(() => 0),
  ));
  const { data } = await api.post<EntregaRead>(`/evaluaciones/${evaluacionId}/entregas/archivo`, formData);
  return data;
}
export async function listDBA(params?: ListDBAParams): Promise<DBARead[]> {
  const { data } = await api.get<DBARead[]>('/dba', { params });
  return data;
}

export function useEvaluacion(id: string) {
  return useQuery({
    queryKey: ['evaluacion', id],
    queryFn: () => getEvaluacion(id),
    enabled: Boolean(id),
  });
}
