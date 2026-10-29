/** Tipos compartidos del API de XCalificator. */

export type UserRole = 'admin' | 'profesor' | 'estudiante';
export type UserStatus = 'activo' | 'inactivo';
export type TeacherRequestStatus = 'pendiente' | 'aprobada' | 'rechazada';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estado: UserStatus;
  is_primary_admin?: boolean;
  custom_role_id?: string | null;
  custom_role_name?: string | null;
  role_version?: number | null;
  auth_version?: number;
  email_es_interno?: boolean;
  debe_cambiar_password?: boolean;
  permissions?: string[];
  solicitud_docente_estado?: TeacherRequestStatus | null;
  solicitud_docente_solicitada_at?: string | null;
  solicitud_docente_resuelta_at?: string | null;
  solicitud_docente_revisada_por?: string | null;
  solicitud_docente_motivo?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherRequestDecision {
  decision: 'aprobar' | 'rechazar';
  motivo?: string;
}

export interface AuthResponse {
  user: User;
}

export type MaterialTipo =
  | 'sopa_letras'
  | 'crucigrama'
  | 'unir_columnas'
  | 'emparejar'
  | 'cuento'
  | 'para_colorear'
  | 'guia'
  | 'taller'
  | 'examen'
  | 'rubrica'
  | 'plan_refuerzo'
  | 'ficha'
  | 'quiz_rapido'
  | 'lectura_comprensiva'
  | 'mapa_conceptual'
  | 'flashcards';

export interface MaterialListItem {
  id: string;
  tipo: MaterialTipo;
  titulo: string;
  materia_id: string | null;
  materia_nombre: string | null;
  evaluacion_id?: string | null;
  evaluacion_estado?: EvaluacionEstado | null;
  evaluacion_modalidad?: EvaluacionModalidad | null;
  evaluacion_recepcion_habilitada?: boolean | null;
  asignacion_tipo?: 'apoyo' | 'actividad' | null;
  publicado_estudiantes?: boolean;
  fecha_publicacion?: string | null;
  updated_at?: string | null;
  archivo_url: string | null;
  created_at: string;
}

export interface Material<T = Record<string, unknown>> {
  id: string;
  tipo: MaterialTipo;
  titulo: string;
  materia_id: string | null;
  materia_nombre: string | null;
  evaluacion_id?: string | null;
  evaluacion_estado?: EvaluacionEstado | null;
  evaluacion_modalidad?: EvaluacionModalidad | null;
  evaluacion_recepcion_habilitada?: boolean | null;
  asignacion_tipo?: 'apoyo' | 'actividad' | null;
  publicado_estudiantes?: boolean;
  fecha_publicacion?: string | null;
  updated_at?: string | null;
  contenido_json: T;
  archivo_url: string | null;
  created_at: string;
}

/* ── Estructuras de contenido de herramientas ── */
export interface PistaCrucigrama {
  numero: number;
  pista: string;
  respuesta: string;
  fila: number;
  columna: number;
  longitud: number;
}
export interface CrucigramaContenido {
  titulo: string;
  instrucciones: string;
  preguntas_horizontales: PistaCrucigrama[];
  preguntas_verticales: PistaCrucigrama[];
  crucigrama: { grid: string[][]; size: number; pistas_horizontal: PistaCrucigrama[]; pistas_vertical: PistaCrucigrama[] };
}

export interface PalabraSopa {
  palabra: string;
  fila: number;
  col: number;
  fila_fin: number;
  col_fin: number;
  direccion: string;
  invertida: boolean;
}
export interface SopaContenido {
  titulo: string;
  instrucciones: string;
  grilla: string[][];
  palabras: PalabraSopa[];
  banco_palabras: string[];
}

export interface MatchingContenido {
  titulo: string;
  instrucciones: string;
  columna_izquierda: { numero: number; texto: string }[];
  columna_derecha: { letra: string; texto: string }[];
  soluciones: { numero: number; letra: string }[];
  pares: { izquierda: string; derecha: string }[];
}

/* ── Materias ── */
export type MateriaEstado = 'activa' | 'archivada';
export interface Materia {
  id: string;
  profesor_id: string;
  nombre: string;
  area: string | null;
  grado: string | null;
  descripcion: string | null;
  codigo_matricula: string;
  codigo_activo: boolean;
  requiere_aprobacion: boolean;
  estado: MateriaEstado;
  created_at: string;
  updated_at: string;
}
export interface MateriaConEstudiantes extends Materia {
  estudiantes: User[];
}

/* ── Evaluaciones ── */
export type EvaluacionEstado = 'borrador' | 'publicada' | 'en_calificacion' | 'pendiente_revision' | 'cerrada';
export type EvaluacionModalidad = 'online' | 'fisica' | 'mixta';
export interface EvaluationVisualTable {
  encabezados: string[];
  filas: string[][];
  unidad?: string | null;
}
export interface EvaluationVisualChart {
  tipo: 'barras' | 'lineas' | 'circular';
  categorias: string[];
  series: { nombre: string; valores: number[] }[];
  unidad?: string | null;
  eje_x?: string | null;
  eje_y?: string | null;
}
export interface EvaluationVisualBlock {
  id: string;
  tipo: 'texto' | 'imagen' | 'dibujo' | 'formula' | 'tabla' | 'grafica';
  orden: number;
  pregunta_ids: string[];
  descripcion?: string;
  recurso_id?: string | null;
  pie?: string | null;
  texto?: string | null;
  tabla?: EvaluationVisualTable | null;
  grafica?: EvaluationVisualChart | null;
  legible?: boolean;
}
export interface EvaluationVisualWarning {
  elemento_id?: string | null;
  bloque_id?: string | null;
  pregunta_ids?: string[];
  pagina?: number | null;
  motivo: 'no_conservado' | 'ilegible' | 'asociacion_pendiente' | 'publicacion_pendiente' | 'limite' | 'formato_no_interpretable';
  mensaje: string;
}
export interface EvaluationVisualManifest {
  schema_version: 1;
  pregunta_ids: string[];
  recurso_ids: string[];
  original_recurso_id?: string | null;
  bloques: (EvaluationVisualBlock & {
    seguridad_contenido: 'privado_original' | 'pendiente_revision' | 'publicable_confirmado';
    procedencia?: { pagina?: number | null; region?: number[] | null; ancla_ooxml?: string | null; extractor_version?: string | null } | null;
  })[];
  cobertura: {
    detectados: string[]; conservados: string[];
    paginas_detectadas?: number[]; paginas_conservadas?: number[];
    avisos: EvaluationVisualWarning[]; estado: 'completa' | 'requiere_revision';
  };
}
export interface StudentEvaluationVisualContent {
  schema_version: 1;
  bloques: EvaluationVisualBlock[];
}
export interface EvaluationPrintSettings {
  schema_version: 1;
  distribucion: 'compacta' | 'media' | 'amplia';
  fuente_pt?: number | null;
  blanco_negro: boolean;
  meta_paginas?: number | null;
  respuestas: Record<string, { lineas?: number | null; dibujo_mm?: number | null }>;
  materiales: Record<string, { ancho_porcentaje: number; disposicion: 'apilada' | 'lateral';
    alineacion: 'inicio' | 'centro' | 'fin'; convertir_color_confirmado: boolean }>;
}
export interface EvaluationDocumentNode {
  id: string; padre_id: string | null; orden: number;
  tipo: 'seccion' | 'texto' | 'pregunta' | 'material';
  titulo?: string | null; etiqueta_original?: string | null;
  proposito?: 'instruccion' | 'lectura' | 'actividad' | 'recuadro' | null;
  texto?: string | null; pregunta_id?: string | null; bloque_id?: string | null;
  fuente_ids?: string[];
}
export interface EvaluationDocumentStructure {
  schema_version: 1;
  nodos: EvaluationDocumentNode[];
  puntuacion_secciones?: {
    modo: 'por_seccion'; presupuestos: Record<string, string>;
    pesos_base: Record<string, string>; confirmado: boolean;
    ajustes?: Record<string, string>;
  } | null;
  revision?: {
    detectados: string[]; conservados: string[];
    exclusiones?: { elemento_id: string; motivo: string; confirmado: boolean }[];
    avisos: { elemento_id?: string | null; nodo_id?: string | null; mensaje: string }[];
    estado: 'completa' | 'requiere_revision'; confirmado: boolean;
  };
}
export interface Evaluacion {
  estructura_documento?: EvaluationDocumentStructure | null;
  configuracion_impresion?: EvaluationPrintSettings | null;
  lectura?: string | null;
  claves_visuales_pendientes?: string[];
  id: string;
  materia_id: string;
  profesor_id: string;
  material_origen_id?: string | null;
  tipo_actividad?: MaterialTipo | 'evaluacion' | string | null;
  nombre: string;
  descripcion: string | null;
  tipo_origen: string;
  modalidad: EvaluacionModalidad | null;
  nota_maxima: number;
  estado: EvaluacionEstado;
  recepcion_habilitada?: boolean;
  tiempo_limite_minutos: number | null;
  politica_intento?: 'un_intento' | 'multiples_intentos' | 'mejor_puntaje' | 'ultimo_intento' | 'practica_libre' | null;
  intentos_permitidos?: number | null;
  fecha_publicacion: string | null;
  fecha_limite_entrega: string | null;
  dba_ids: string[];
  dba_personalizado_ids: string[];
  metas_profesor: string[];
  criterios: Record<string, unknown>[];
  preguntas: Record<string, unknown>[];
  respuestas_esperadas: Record<string, unknown>[];
  contenido_version_id?: string | null;
  contenido_visual?: EvaluationVisualManifest | StudentEvaluationVisualContent | null;
  blueprint?: {
    reglas_feedback?: {
      trazabilidad?: {
        generada_por_ia?: boolean;
        requiere_validacion_docente?: boolean;
        rag_estado?: 'recuperado' | 'sin_resultados' | 'no_disponible';
        advertencias?: string[];
      };
    };
  } | null;
  mi_entrega_id?: string | null;
  mi_entrega_estado?: string | null;
  mi_entrega_tipo?: string | null;
  mi_entrega_created_at?: string | null;
  intentos_realizados?: number;
  entrega_realizada?: boolean;
  mi_nota_confirmada?: number | null;
  mi_nota_maxima?: number | null;
  mi_calificacion_estado?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBARead {
  id: string;
  area: string;
  grado: string;
  codigo: string;
  descripcion: string;
  fuente?: string | null;
  activo?: boolean;
}

/* ── Presentaciones ── */
export interface Presentacion {
  id: string;
  profesor_id: string;
  materia_id: string | null;
  titulo: string;
  estado: string;
  pptx_url: string | null;
  pdf_url: string | null;
  error: string | null;
  etapa?: string | null;
  mensaje?: string | null;
  progreso?: number;
  elapsed_ms?: number;
  imagenes_completadas?: number;
  imagenes_total?: number;
  created_at: string;
  updated_at: string;
}

/* ── Imágenes generadas (biblioteca reutilizable) ── */
export interface ImagenGenerada {
  id: string;
  url: string | null;
  descripcion: string | null;
  tags: string[];
  tema: string | null;
  area: string | null;
  grado: string | null;
  tipo_uso: string;
  modulo_origen: string;
  proveedor: string;
  modelo: string;
  calidad: string;
  size: string;
  costo_estimado: string | number | null;
  prompt_original: string;
  prompt_normalizado: string | null;
  prompt_usado: string;
  restricciones: string | null;
  prompt_hash: string;
  file_hash: string | null;
  estado: 'success' | 'failed' | 'reused' | 'archived';
  reusable: boolean;
  presentation_id: string | null;
  slide_index: number | null;
  materia_id: string | null;
  error: string | null;
  created_at: string;
}

/* ── Calificaciones ── */
export interface GradeFormulaData {
  puntos_obtenidos: number | string;
  puntos_posibles: number | string;
  nota_maxima: number | string;
  nota_base: number | string;
  ajuste_global: number | string;
  nota_antes_redondeo: number | string;
  regla_redondeo: string;
  decimales: number;
  nota_final: number | string;
}

export interface GradeComponentData {
  id: string;
  clave: string;
  orden: number;
  tipo: string;
  numero: string | null;
  titulo: string;
  respuesta_estudiante: string | null;
  respuesta_referencia: string | null;
  referencia_oculta?: boolean;
  puntos_obtenidos: number | string | null;
  puntos_maximos: number | string;
  estado: string;
  explicacion: string;
  explicacion_estudiante?: string | null;
  orientacion_mejora?: string | null;
  origen: string;
  requiere_revision: boolean;
  evidencia_paginas: number[];
  fuentes?: Array<{ source_id?: string; chunk_id?: string; titulo?: string; version?: string; fragmento?: string }>;
  valoraciones?: Record<string, unknown>[];
}

export interface GradeBreakdownData {
  id: string;
  calificacion_id: string;
  version: number;
  origen: string;
  cobertura_estado: string;
  formula: GradeFormulaData;
  ajuste_global_detalle?: { valor: number | string; motivo_interno?: string; explicacion_estudiante?: string } | null;
  nota_publicada?: number | string;
  claves_liberadas?: boolean;
  requiere_revision: boolean;
  bloqueos?: string[];
  procedencia?: Record<string, unknown>;
  componentes: GradeComponentData[];
  created_at: string;
}

export interface GradeComponentChange {
  componente_id: string;
  puntos_obtenidos: number;
  estado: string;
  motivo_interno: string;
  explicacion_estudiante: string;
}

export interface GradeBreakdownUpdate {
  version_esperada: number;
  cambios_componentes: GradeComponentChange[];
  ajuste_global?: {
    valor: number;
    motivo_interno: string;
    explicacion_estudiante: string;
  } | null;
}

export interface GradeBreakdownVersion {
  id: string;
  version: number;
  origen: string;
  pipeline_run_id?: string | null;
  nota_final: number | string;
  activo: boolean;
  es_sugerencia_inicial?: boolean;
  actor_nombre: string | null;
  created_at: string;
}
export interface Calificacion {
  id: string;
  evaluacion_id: string;
  estudiante_id: string;
  materia_id: string;
  nota_sugerida: number | null;
  nota_confirmada: number | null;
  confianza: number | null;
  feedback: string | null;
  estado: string;
  revisado_por_docente: boolean;
  motivo_revision?: string | null;
  resultado_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CalificacionEstado = 'procesando' | 'sugerida' | 'confirmada' | 'ajustada' | 'requiere_revision' | 'publicada' | 'anulada';

export interface GradeFinalAdjustment {
  nota_confirmada: number;
  actualizado_en_esperado: string;
  version_desglose_esperada: number | null;
  operacion_id: string;
  observacion?: string;
}

export interface CalificacionTimelineEvent {
  tipo: string;
  nota_anterior: number | string | null;
  nota_nueva: number | string | null;
  feedback: string | null;
  actor_id: string | null;
  actor_nombre: string | null;
  timestamp: string | null;
  detalle: string | null;
}

export interface GuiaRevisionItem {
  numero: number | string;
  enunciado: string;
  tipo: string | null;
  opciones: string[];
  respuesta_correcta: string | null;
  puntaje: number | string | null;
}

export interface CalificacionDetalle extends Calificacion {
  evaluacion_nombre: string;
  materia_nombre: string;
  estudiante_nombre: string;
  estudiante_email: string;
  nota_maxima: number | null;
  entrega_tipo: string | null;
  entrega_archivo_url: string | null;
  entrega_evidencia_paginas: number;
  entrega_evidencia_tipo: string | null;
  entrega_respuesta_texto: string | null;
  entrega_created_at: string | null;
  timeline: CalificacionTimelineEvent[];
  guia_revision: GuiaRevisionItem[];
  desglose: GradeBreakdownData | null;
  desglose_heredado: boolean;
  respuestas_liberadas: boolean;
}

export interface BatchResultItem {
  calificacion_id: string;
  success: boolean;
  error: string | null;
}

export interface BatchResult {
  results: BatchResultItem[];
  total: number;
  exitosos: number;
  fallidos: number;
}

/* ── Incidencias ── */

export interface IncidenciaRead {
  componente_clave?: string | null;
  id: string;
  calificacion_id: string;
  tipo: string;
  descripcion: string;
  estado: string;
  metadata_json: Record<string, unknown>;
  componente_id?: string | null;
  desglose_version?: number | null;
  resolucion: string | null;
  resuelto_por: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidenciaCreate {
  tipo: string;
  descripcion: string;
  metadata_json?: Record<string, unknown>;
}

export type SolicitudRevisionMotivo = 'nota' | 'respuesta' | 'evidencia' | 'retroalimentacion' | 'otro';

export interface BandejaDocenteItem {
  id: string;
  tipo: 'solicitud_revision' | 'calificacion_pendiente';
  calificacion_id: string;
  evaluacion_id: string;
  evaluacion_nombre: string;
  materia_id: string;
  materia_nombre: string;
  estudiante_id: string;
  estudiante_nombre: string;
  estado: string;
  motivo: string | null;
  descripcion: string | null;
  created_at: string;
}

export interface BandejaDocenteRead {
  reclamos_abiertos: number;
  pendientes_revision: number;
  reclamos: BandejaDocenteItem[];
  pendientes: BandejaDocenteItem[];
}

export type GradeFilter = 'todas' | 'pendientes' | 'confirmadas' | 'incidencias';

export interface EntregaRead {
  id: string;
  evaluacion_id: string;
  estudiante_id: string;
  materia_id: string;
  tipo: string;
  estado: string;
  respuesta_texto?: string | null;
  archivo_url?: string | null;
  evidencia_paginas: number;
  evidencia_tipo: string | null;
  reemplazo_solicitado?: boolean;
  motivo_reemplazo?: string | null;
  created_at?: string;
}

export interface EntregaOnlineCreate {
  respuesta_texto: string;
  entrega_id?: string;
}

export interface StudentActivity {
  material_id: string;
  tipo: MaterialTipo;
  titulo: string;
  contenido: Record<string, unknown>;
  interactivo: boolean;
}

export interface BoletinItem {
  evaluacion_id: string;
  evaluacion_nombre: string;
  nota_confirmada: number | null;
  nota_maxima: number;
  feedback: string | null;
  estado: string;
  fecha?: string | null;
}

export interface MateriaResumenAcademico {
  materia_id: string;
  materia_nombre: string;
  promedio: number;
  total_notas: number;
}

export interface ResumenAcademico {
  mejor: MateriaResumenAcademico | null;
  por_mejorar: MateriaResumenAcademico | null;
  promedio_general: number | null;
  total_materias: number;
  total_notas: number;
}
export interface SalonSesionRead {
  sesion_id: string;
  evaluacion_id: string;
  estudiantes_pendientes: number;
  estado: 'activa' | 'cerrada' | string;
}

/* ── Reportes ── */
export interface ResumenProfesor {
  profesor_id: string;
  materias: { nombre: string; total_calificaciones: number; promedio: number }[];
}

/* ── Xali ── */
export interface ChatMessage {
  id: string;
  role: string;
  mensaje: string;
  created_at: string;
}

export interface XaliEvaluacionEntregada {
  evaluacion_id: string;
  materia_id: string;
  materia_nombre: string;
  evaluacion_nombre: string;
  entrega_id: string;
  estado_calificacion: string;
  nota_confirmada: number | null;
  puede_chatear: boolean;
}

export interface XaliEvaluationChatResponse {
  respuesta: string;
  contexto_usado: {
    evaluacion_entregada: boolean;
    calificacion_confirmada: boolean;
  };
}

export type XaliStudentResourceType = 'explicacion' | 'practica' | 'plan_estudio' | 'reto';

export interface XaliStudentResource {
  id: string;
  evaluacion_id: string;
  tipo: XaliStudentResourceType;
  titulo: string;
  contenido: string;
  created_at: string;
  updated_at: string;
  contexto_usado: {
    evaluacion_entregada: boolean;
    calificacion_confirmada: boolean;
  };
}

/* ── DBA personalizados por materia (Fase B) ── */
export interface DBAPersonalizado {
  id: string;
  profesor_id: string;
  materia_id: string;
  area: string;
  grado: string;
  enunciado: string;
  evidencias_aprendizaje: string | null;
  ejemplo: string | null;
  fuente: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBAUnifiedItem {
  id: string;
  fuente: 'oficial' | 'personalizado';
  area: string;
  grado: string;
  codigo: string | null;
  descripcion: string;
  evidencias_aprendizaje: string | null;
  ejemplo: string | null;
}

export interface PipelineTimings {
  queue: number;
  prepare: number;
  extraction: number;
  structure?: number;
  primary: number;
  secondary: number;
  consolidation: number;
  persistence: number;
  total: number;
}

export interface AIJobRead {
  id: string;
  tipo: string;
  estado: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  progreso: number;
  resultado_json: Record<string, unknown>;
  timings_ms: PipelineTimings;
  terminal_reason: string | null;
  fallbacks: Array<{ stage: string; reason: string; previous_candidate?: string | null }>;
  pipeline_run_id: string | null;
  deadline_ms: number | null;
  slow_after_ms: number | null;
  error: string | null;
}
export type ReviewFilter = 'todas' | 'pendientes' | 'alertas' | 'procesando' | 'publicadas';
export interface ReviewStudent {
  estudiante_id: string;
  nombre: string;
  calificacion_id: string | null;
  entrega_id: string | null;
  job_id: string | null;
  estado: string;
  nota: number | string | null;
  resumen_revision: {
    version: number | null;
    cobertura: string | null;
    bloqueos: string[];
    componentes_pendientes: number | null;
    componentes_ilegibles: number | null;
    pqrs_abiertas: number | null;
    tiene_alertas: boolean;
  };
}
export interface ReviewEvaluation {
  evaluacion_id: string;
  materia_id: string;
  total_alumnos: number;
  contadores: Record<ReviewFilter, number>;
  siguiente_cursor: string | null;
  alumnos: ReviewStudent[];
}
