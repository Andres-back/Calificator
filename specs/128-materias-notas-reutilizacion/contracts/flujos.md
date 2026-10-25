# Contratos implementados 128

Implementación local aprobada el 2026-10-25; publicación en producción no autorizada. Conserva compatibilidad.

## CSV

Entrada: materia, una/varias evaluaciones y modo. Final por defecto, provisional explícito. Lecturas con grading.read y solo_lectura, sin modificar calificaciones.

- Final: Nombre del estudiante + nombre único de cada evaluación, nota final válida (incluido 0) y ausencias vacías.
- Provisional: nombre/encabezados identificados y estado por evaluación; preferir decisión vigente y en su ausencia sugerencia identificada. Procesando/sin nota/fallo nunca se vuelve cero.
- Conteos/vista previa explican roster activo y pendientes; cero finales ofrece revisar/cambiar modo sin falso éxito.
- Fallo parcial/contexto/permiso revocado: no descargar, error recuperable. Cambio del objeto de sesión del mismo actor no equivale a logout.
- Prueba de aceptación espera download y comprueba bytes/filas/celdas del archivo real, no un mock de downloadCsv.

## Materia

Editar reutiliza PATCH /materias/{id}, subjects.update y propiedad/admin: nombre/área/grado/descripción, no identidad ni expediente.

Archivo/restauración: acciones explícitas o transición central compatible con PATCH, versión esperada para UI nueva y confirmación. Nunca DELETE físico. «Eliminar de mis materias» explica paso a «Archivadas», recuperación y conservación.

Archivo quita de activas, mantiene consulta/exportación autorizada, desactiva código/recepción y cierra nueva admisión. Trabajos admitidos antes pueden acabar. Restauración verifica cupo/bloqueo y mantiene aperturas cerradas. Repetir el mismo estado es idempotente; conflicto/cupo no produce cambios parciales.

## Copia

POST /evaluaciones/{id}/copiar (202) con materia_destino_id, nombre opcional, expected_updated_at, expected_content_version_id y request_key. GET /evaluaciones/copias/{job_id} y GET /evaluaciones/{id}/ultima-copia consultan progreso privado y recuperan la solicitud. Gestión de fuente y evaluations.create en destino, activo/distinto/mismo docente; evaluations.read no basta. No aceptar alumnos/notas/evidencias como parte del payload.

Respuesta asíncrona con operación/trabajo y consulta privada de progreso/copia final. Mismo key/fingerprint devuelve resultado existente; diferente fingerprint es conflicto. No reintentar con key nuevo automáticamente.

Resultado: borrador independiente con lectura/preguntas/clave/figuras/formato y revisión conservada. Publicación/recepción desactivadas. Recursos con IDs/bytes nuevos y ACL destino, originales/clave fuera de la proyección del alumno. Conflicto, falta/hash de archivo o tipo no reproducible impiden éxito parcial y permiten recuperar sin redigitalizar.

## UX/permisos

Acciones compartidas donde corresponden, no exportadores/diálogos duplicados. Alumnos no ven gestión/exportación privada/copia. Confirmaciones cancelables y objetivos 44 px en 360/390/1440, dos temas. Origen y copia se abren/editan/exportan independientemente, conservando soluciones privadas.
