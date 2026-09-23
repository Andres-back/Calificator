# Datos y compatibilidad

- `EvaluacionBlueprint.reglas_feedback`: JSONB existente; solo lectura al construir prompt.
- `AgentContext.blueprint`: diccionario existente; reglas ausentes/nulas/incompatibles se tratan de forma compatible.
- `AgentResult`: sin cambios; explicación y orientación por componente conservadas.
- `FeedbackQualityPayload`: tipo feedback_quality, instrument_version, cinco enteros 1–5 y blinded booleano; no añadir claves al esquema estricto.
- Justificaciones e incidencias del instrumento permanecen en la ficha/protocolo o registros existentes.
- Sin tablas, transiciones, migraciones o habilitación de estudio nuevas.
- No reetiquetar registros históricos con la versión del borrador.
