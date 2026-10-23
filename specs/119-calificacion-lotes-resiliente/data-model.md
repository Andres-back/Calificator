# Datos y estados

## Política de ejecución

Objeto aditivo `execution_policy` en la configuración capturada de nuevos trabajos de calificación: versión, máximo de 60 segundos por llamada y dos intentos por etapa lógica. No contiene modelos ni credenciales. El centro administrativo muestra la misma política. Trabajos antiguos sin el objeto utilizan la política de compatibilidad documentada, sin cambiar sus rutas.

## Progreso privado de revisión

Clave `_grading_review_v1` en ai_jobs.resultado_json, con schema_version, fingerprint, extracción compatible y stages. La huella incluye entrega, bytes/texto originales, blueprint/versiones, rutas y política. No se reutiliza si cambia algún insumo. Cada etapa/partición identifica rol, contador de intentos, último código seguro y resultado validado opcional. Las respuestas y feedback son privados como el resultado existente; no se exponen en telemetría.

Transiciones: ausente → intento reservado → resultado válido o error; error transitorio con contador uno → segundo intento; segundo error o error permanente → pendiente de revisión. Tras reinicio, un intento reservado sin resultado cuenta como consumido. Un resultado válido no vuelve a inferirse. Guardar requiere job running y claim vigente; la pérdida de propiedad aborta la ejecución.

## Completitud

Resultado aditivo `verification_status`: complete cuando ambos roles válidos terminan; pending cuando falta algún rol; pending_stages enumera roles, no identidades. No equivale a aprobación/publicación docente. Los trabajos con propuesta parcial terminan requires_review, conservando los estados de nota existentes. El historial conserva códigos seguros, intentos y recuperación; no inventa un segundo evaluador.

## Compatibilidad

Sin migraciones, cambios en notas anteriores ni mutación de evidencia. Checkpoints heredados continúan admitidos con su validación actual. El finish_job existente combina JSON y conserva claves de progreso. Lotes con varias entregas usan huellas distintas por entrega para no mezclar resultados; se conserva el avance de cada una. Los bloqueos y guards docentes vigentes siguen siendo obligatorios.
