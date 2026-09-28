import { api } from '@/lib/api';
import type {
  LearningCriteriaList,
  LearningCriteriaSet,
  LearningCriterion,
  LearningSource,
} from '@/types/api';

export interface TeacherIntentPayload {
  que_evaluar: string;
  como_evaluar: string;
  grado: string;
  tipo_evidencia: string;
  prioridades: string[];
  restricciones: string;
}

export interface LearningCriteriaCreatePayload {
  titulo: string;
  descripcion?: string;
  intencion_docente: TeacherIntentPayload;
  criterios?: Array<Omit<LearningCriterion, 'id' | 'orden'> & { orden?: number }>;
}

export interface LearningCriteriaCapabilities {
  ui: boolean;
  write: boolean;
  generation: boolean;
}

export async function getLearningCriteriaCapabilities(): Promise<LearningCriteriaCapabilities> {
  const { data } = await api.get<LearningCriteriaCapabilities>('/criterios-aprendizaje/capacidades');
  return data;
}

export async function listLearningCriteria(materiaId: string): Promise<LearningCriteriaList> {
  const { data } = await api.get<LearningCriteriaList>(`/materias/${materiaId}/criterios-aprendizaje`);
  return data;
}

export async function getLearningCriteria(setId: string): Promise<LearningCriteriaSet> {
  const { data } = await api.get<LearningCriteriaSet>(`/criterios-aprendizaje/${setId}`);
  return data;
}

export async function createLearningCriteria(
  materiaId: string,
  payload: LearningCriteriaCreatePayload,
): Promise<LearningCriteriaSet> {
  const { data } = await api.post<LearningCriteriaSet>(
    `/materias/${materiaId}/criterios-aprendizaje`,
    payload,
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  );
  return data;
}

export async function updateLearningCriteriaVersion(
  versionId: string,
  payload: {
    revision_esperada: number;
    titulo?: string;
    descripcion?: string;
    intencion_docente?: TeacherIntentPayload;
    criterios?: Array<Omit<LearningCriterion, 'id' | 'orden'> & { orden?: number }>;
  },
): Promise<LearningCriteriaSet> {
  const { data } = await api.patch<LearningCriteriaSet>(
    `/criterios-aprendizaje/versiones/${versionId}`,
    payload,
  );
  return data;
}

export async function uploadLearningSource(
  versionId: string,
  files: File[],
  rotations: number[],
): Promise<LearningSource> {
  const form = new FormData();
  files.forEach((file) => form.append('archivo', file));
  form.append('rotaciones', JSON.stringify(rotations.length ? rotations : files.map(() => 0)));
  form.append('visible_to_student', 'false');
  const { data } = await api.post<LearningSource>(
    `/criterios-aprendizaje/versiones/${versionId}/fuentes/archivo`,
    form,
  );
  return data;
}

export async function addLearningTextSource(
  versionId: string,
  payload: { titulo: string; contenido: string },
): Promise<LearningSource> {
  const { data } = await api.post<LearningSource>(
    `/criterios-aprendizaje/versiones/${versionId}/fuentes/texto`,
    { ...payload, visible_to_student: false },
  );
  return data;
}

export async function addLearningReferenceSource(
  versionId: string,
  payload: { tipo: 'material_existente' | 'estandar_oficial'; reference_id: string; titulo: string },
): Promise<LearningSource> {
  const { data } = await api.post<LearningSource>(
    `/criterios-aprendizaje/versiones/${versionId}/fuentes/referencia`,
    { ...payload, visible_to_student: false },
  );
  return data;
}

export async function proposeLearningCriteria(versionId: string): Promise<{ job_id: string; estado: string }> {
  const { data } = await api.post<{ job_id: string; estado: string }>(
    `/criterios-aprendizaje/versiones/${versionId}/proponer`,
    { regenerar: false },
  );
  return data;
}

export async function approveLearningCriteria(
  versionId: string,
  revision: number,
  acknowledgeWarnings: boolean,
): Promise<LearningCriteriaSet> {
  const { data } = await api.post<LearningCriteriaSet>(
    `/criterios-aprendizaje/versiones/${versionId}/aprobar`,
    { revision_esperada: revision, reconocer_advertencias: acknowledgeWarnings },
  );
  return data;
}

export async function cloneLearningCriteria(setId: string): Promise<LearningCriteriaSet> {
  const { data } = await api.post<LearningCriteriaSet>(
    `/criterios-aprendizaje/${setId}/versiones`,
    {},
  );
  return data;
}

export async function archiveLearningCriteria(setId: string): Promise<LearningCriteriaSet> {
  const { data } = await api.post<LearningCriteriaSet>(
    `/criterios-aprendizaje/${setId}/archivar`,
    {},
  );
  return data;
}
