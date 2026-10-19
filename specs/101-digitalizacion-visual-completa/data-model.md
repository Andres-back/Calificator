# Modelo de datos propuesto — 101

Diseño incluido en el plan aprobado el 2026-10-15. Modelos y migración aditiva `202610150001` implementados y probados localmente en T005–T009; no aplicados en producción. La fijación de versiones de entregas/jobs sigue pendiente de T021–T025.

## EvaluacionRecurso

Tabla `evaluacion_recursos`:

- `id`: UUID opaco; propietario y materia obligatorios; `evaluacion_id` opcional mientras sea propuesta de un borrador aún no guardado.
- `job_id`, `request_key`: origen idempotente del procesamiento/carga/generación; unicidad en ámbito propietario y petición, no deduplicación pública entre docentes.
- `clase`: original, página, imagen, render_tabla, render_grafica o fórmula; `origen`: importado, subido o IA.
- `storage_key`: referencia privada controlada por el servidor; nunca serializada al navegador. `sha256`, MIME validado, bytes y dimensiones/páginas.
- `estado`: staged, ready, failed o retired. `ready` exige que el archivo exista y sus metadatos concuerden.
- `seguridad_contenido`: privado_original, pendiente_revision o publicable_confirmado. Un original resuelto no se vuelve público por renombrarlo.
- Procedencia: página/región o ancla OOXML, fecha, versión del extractor; metadatos de proveedor/modelo sin secretos cuando proceda.
- Un reemplazo crea otro ID/archivo. La limpieza no borra recursos referidos por una revisión o evidencia, aunque no sean los actuales.

Propuestas descartadas/huérfanas no referenciadas expiran mediante una política configurable y una limpieza idempotente; nunca se aplica esa caducidad a una importación guardada. La asociación de un recurso staged a una evaluación se valida y confirma de forma transaccional.

## EvaluacionContenidoVersion

Tabla `evaluacion_contenido_versiones`:

- `id`, `evaluacion_id`, `numero_version`, fecha y autor; unicidad evaluación+versión.
- `schema_version`, `content_hash`, `previous_version_id`, motivo y origen.
- `snapshot_json`: preguntas, respuestas esperadas, criterios, nota máxima, contexto, bloques y asociaciones. Inmutable tras crear; no es una respuesta pública.
- `coverage_json`: páginas/regiones detectadas y conservadas, fragmentos ilegibles, asociaciones pendientes y comprobaciones del docente.
- `source_resource_id` para importaciones y referencias de recursos usadas por los bloques.
- `legacy_baseline`: identifica una copia observada al activar la mejora; no afirma qué se usó al calificar en el pasado.

`Evaluacion.contenido_version_id` nullable apunta a la versión vigente. Los registros anteriores permanecen null hasta una acción explícita que use la función, sin backfill de notas.

## Bloque visual tipado

Parte del manifiesto versionado, no una tabla independiente:

- `id`, `tipo`, `orden`, `pregunta_ids`, `descripcion` y procedencia.
- Imagen/dibujo/fórmula: `recurso_id`, pie y legibilidad; no URL arbitraria ni base64 dentro del JSON de evaluación.
- Tabla: encabezados, filas, unidades y recurso visual equivalente; celdas de texto escapado, estructura rectangular, tamaños máximos configurados.
- Gráfica: tipo barras/líneas/circular, categorías o pares, series, valores finitos, etiquetas, unidades y recurso visual equivalente. Para circular, cantidades no negativas y suma positiva; no presentar porcentajes que no correspondan a los datos.
- Texto: contenido seguro sin ejecutar HTML ni instrucciones embebidas.

Pregunta mantiene `numero` y campos existentes; un `contenido_id` estable permite asociaciones que sobrevivan a cambios de numeración. Los normalizadores y conversiones del editor deben conservarlo. En evaluación legacy sin edición visual no se reescriben todas las preguntas para añadir IDs.

Un estímulo compartido es un bloque con varias asociaciones, no una pregunta adicional. Eliminar una asociación no elimina sus demás usos.

## Propuesta IA y estado del trabajo

Se reutiliza `jobs` (tipo `imagen` con subtipo de recurso en la entrada, sin cambiar la semántica de jobs existentes). Guardar IDs de propietario, materia, evaluación/borrador, pregunta estable, versión esperada, petición y configuración IA capturada. Resultado: referencia a propuesta/datos y recursos staged; no insertar automáticamente en la evaluación.

Estados visibles: en cola → creando/leyendo → propuesta lista para revisar → aceptada en borrador → guardada. Fallo/cancelación no cambia la revisión vigente. Una propuesta calculada para otra versión se presenta como desactualizada y no sobrescribe el borrador actual.

La carga manual y edición estructurada comparten la etapa de revisión; no necesitan IA para adjuntar un archivo o cambiar una celda.

## Entrega y calificación

- `Entrega.contenido_version_id`: FK nullable, fijada para nuevas entregas que usen contenido versionado. Online se fija al iniciar; foto se fija al registrar la entrega.
- Jobs padre/hijo de calificación capturan el mismo ID/hash. El worker lee esa revisión, no la revisión actual. El fingerprint de extracción incluye esquema y hash de contexto visual.
- Resultado nuevo y procedencia del desglose guardan ID/hash y recursos realmente utilizados; nunca bytes, claves ni enlaces privados en telemetría.
- Reintentos y recuperación mantienen la misma versión. Las notas anteriores no se actualizan por añadir columnas ni crear recursos.
- Registros legacy sin revisión mantienen recorrido anterior, sin mostrarles recursos recién añadidos. No se reconstruye una historia inexistente ni se decide una versión nueva sin intervención docente.

## Migración y rollback

Migración aditiva: tablas nuevas, columnas nullable, índices y FKs verificables; sin tocar notas, claves, evidencias o asociaciones existentes. Registrar modelos en metadata e inventario.

Cambios de contenido y creación de revisión ocurren bajo bloqueo de evaluación y comparación de `expected_updated_at`/versión. Los trabajos legacy activos impiden una edición que cambiaría su contexto hasta finalizar; responder conflicto claro, no cancelarlos.

Rollback operativo: deshabilitar nuevas importaciones/ediciones/generaciones, conservar lector y exportación para contenido ya guardado. No ejecutar downgrade que elimine tablas o archivos con referencias. La prueba de rollback usa registros sintéticos y confirma que se puede seguir consultando lo nuevo y lo anterior.
