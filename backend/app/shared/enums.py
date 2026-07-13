from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    PROFESOR = "profesor"
    ESTUDIANTE = "estudiante"


class UserEstado(StrEnum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"


class MateriaEstado(StrEnum):
    ACTIVA = "activa"
    ARCHIVADA = "archivada"


class MatriculaEstado(StrEnum):
    PENDIENTE = "pendiente"
    ACTIVO = "activo"
    RETIRADO = "retirado"
    RECHAZADO = "rechazado"


class EvaluacionTipoOrigen(StrEnum):
    NATIVA = "nativa"
    EXTERNA_DIGITALIZADA = "externa_digitalizada"
    SORPRESA = "sorpresa"


class EvaluacionEstado(StrEnum):
    BORRADOR = "borrador"
    PUBLICADA = "publicada"
    EN_CALIFICACION = "en_calificacion"
    PENDIENTE_REVISION = "pendiente_revision"
    CERRADA = "cerrada"


class BlueprintNivelContexto(StrEnum):
    COMPLETO = "completo"
    RECONSTRUIDO = "reconstruido"
    MINIMO = "minimo"


class EvaluacionModalidad(StrEnum):
    ONLINE = "online"
    FISICA = "fisica"
    MIXTA = "mixta"


class EntregaTipo(StrEnum):
    ONLINE = "online"
    FOTO = "foto"
    PDF = "pdf"
    CAPTURA = "captura"
    OPCION_MULTIPLE = "opcion_multiple"
    INTERACTIVA = "interactiva"
    MIXTA = "mixta"


class EntregaEstado(StrEnum):
    PENDIENTE = "pendiente"
    EN_PROGRESO = "en_progreso"
    RECIBIDA = "recibida"
    PROCESANDO = "procesando"
    CALIFICADA = "calificada"
    REVISADA = "revisada"
    REQUIERE_REINTENTO = "requiere_reintento"


class CalificacionEstado(StrEnum):
    SUGERIDA = "sugerida"
    CONFIRMADA = "confirmada"
    AJUSTADA = "ajustada"
    REQUIERE_REVISION = "requiere_revision"
    ANULADA = "anulada"


class JobEstado(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobTipo(StrEnum):
    PRESENTACION = "presentacion"
    IMAGEN = "imagen"
    CALIFICACION_LOTE = "calificacion_lote"
    RAG_INGEST = "rag_ingest"
    REPORTE_EXPORT = "reporte_export"


class MaterialTipo(StrEnum):
    PRESENTACION = "presentacion"
    GUIA = "guia"
    TALLER = "taller"
    EXAMEN = "examen"
    RUBRICA = "rubrica"
    SOPA_LETRAS = "sopa_letras"
    CRUCIGRAMA = "crucigrama"
    CUENTO = "cuento"
    PARA_COLOREAR = "para_colorear"
    EMPAREJAR = "emparejar"
    UNIR_COLUMNAS = "unir_columnas"
    FICHA = "ficha"
    QUIZ_RAPIDO = "quiz_rapido"
    LECTURA_COMPRENSIVA = "lectura_comprensiva"
    MAPA_CONCEPTUAL = "mapa_conceptual"
    FLASHCARDS = "flashcards"
    PLAN_REFUERZO = "plan_refuerzo"
    INFORME_ESTUDIANTE = "informe_estudiante"
    INFORME_ACUDIENTE = "informe_acudiente"


class RagTipo(StrEnum):
    DBA = "dba"
    CONTENIDO_CLASE = "contenido_clase"
    GUIA = "guia"
    PRESENTACION = "presentacion"
    CRITERIO = "criterio"
    RUBRICA = "rubrica"
    EVALUACION = "evaluacion"
    RESPUESTA_ESPERADA = "respuesta_esperada"
    FEEDBACK = "feedback"
    ERROR_COMUN = "error_comun"


class PresentacionEstado(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class LLMProvider(StrEnum):
    OPEN_CODE = "open_code"
    GROQ = "groq"
    OLLAMA = "ollama"
    TEMPLATE = "template"


class ImageProvider(StrEnum):
    OPENAI = "openai"
    CLOUDFLARE = "cloudflare"
    HTML_SVG = "html_svg"
