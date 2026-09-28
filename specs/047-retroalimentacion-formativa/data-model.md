# Datos y compatibilidad

- `EvaluacionBlueprint.reglas_feedback`: JSONB existente; solo lectura al construir prompt.
- `AgentContext.blueprint`: diccionario existente; reglas ausentes/nulas/incompatibles se tratan de forma compatible.
- `AgentResult`: sin cambios; explicación y orientación por componente conservadas.
- `Calificacion.resultado_json.feedback_quality_guard`: metadato JSON opcional para ejecuciones nuevas con `version`, `status`, `reasons`, `original_feedback` y `visible_feedback`; no requiere columna ni migración.
- `Calificacion.feedback`: conserva la decisión humana; solo una propuesta automática nueva e incoherente puede sustituirse por un borrador provisional antes de confirmar o publicar.
- `FeedbackQualityPayload`: tipo feedback_quality, instrument_version, cinco enteros 1–5 y blinded booleano; no añadir claves al esquema estricto.
- Justificaciones e incidencias del instrumento permanecen en la ficha/protocolo o registros existentes.
- Sin tablas, migraciones o habilitación de estudio nuevas; se reutiliza el estado existente `requiere_revision`.
- No reetiquetar registros históricos con la versión del borrador.
