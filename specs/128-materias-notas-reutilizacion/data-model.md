# Modelo propuesto 128

Diseño aprobado el 2026-10-25, refinado para reutilizar ai_jobs sin migración.

## Materia

Misma identidad/profesor/asociaciones. Activa/archivada existentes; archivo desactiva código y recepción nueva, conserva expediente y auditoría. Restauración controla cupo bajo bloqueo por propietario y no restaura aperturas automáticamente. PATCH y acciones explícitas comparten reglas.

## Exportación en memoria

Actor estable, materia, evaluaciones, modo y permisos. Fuente: matrículas activas e intentos vigentes de API autorizada. Mapeo por estudiante/evaluación ID y orden alfabético, nota disponible y estado separado en provisional. Conteos/vista previa del mismo conjunto. Sin escritura académica ni enlace público.

## Operación durable de copia (ai_jobs existente)

ID, actor, request_key, fingerprint, fuente y versión/digest legado, destino, copia final y trabajo/progreso; estados existentes queued/running/success/requires_review y error sin contenido sensible. Unicidad de request_key con actor comprobado; otra intención con mismo key es conflicto, reintento conserva resultado. Destino activo y mismo docente, permisos comprobados al admitir y antes de persistir; archivar destino durante preparación impide admitir nueva copia, pero no destruye el trabajo ya aceptado, que solo puede terminar como borrador cerrado.

Tipo libre `evaluacion_copia` sin cambio de esquema. input_json privado fija snapshot/inventario/fingerprint; resultado público solo indica evaluación destino/error/progreso, nunca clave o rutas de archivos. Compatibilidad comprobada con contrato SQL existente; no se necesita migración. Sin nombres, imágenes o respuestas en logs de operación.

## Copia y asociaciones

Nueva evaluación/blueprint y versión inicial cuando la fuente ya está versionada, siempre borrador y recepción false. Una fuente textual heredada sin versión mantiene el contrato legado funcional; el job conserva su snapshot y añadir figuras después versiona mediante el editor vigente. Nuevos IDs para preguntas/bloques/recursos/DBA personalizados, con mapa interno para asociaciones/manifiesto/avisos/cobertura/formato de impresión. DBA oficiales conservan referencia válida. No copiar contexto RAG privado específico de otra materia.

Recursos con nuevo storage_key, hash/tamaño verificados, misma clasificación de seguridad. Original privado y pendiente conservan su condición. Claves revisadas solo se conservan como tales con procedencia válida. Trazabilidad de copia privada, no reutilizar material_origen_id único.

No heredar matrículas, notas, evidencia respondida, intentos, enlaces/chat, trabajos anteriores, fechas activas ni exportaciones generadas. No inventar un original inexistente.

## Archivos y recuperación

Preparar staging privado con inventario por operación; publicar filas/asociaciones completas juntas. Compensar únicamente archivos propios del intento fallido y recuperar operación tras caída. No ofrecer copia lista si falta material, no borrar recursos fuente ni descargar URLs arbitrarias.
