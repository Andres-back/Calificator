# Investigación 128

Solo lectura sobre main 4f15ce3 el 2026-10-25. Principal revisó contratos; fase 0 de Plan delegó dos investigaciones acotadas (CSV y relaciones/recursos). Sin producción, datos reales, IA ni implementación.

## Exportación

**Hallazgo**: GradebookExport usa buildFollowUpRows, que asigna score nulo sin decisión docente. Las pruebas requieren excluir sugeridas/procesando. Descarga y anuncia éxito aunque no tenga notas. El usuario confirmó «se descargó, pero sin notas». Es un mecanismo local compatible con el reporte, no una inspección de las notas concretas en producción.

**Decisión**: separar modelo de exportación y seguimiento. Final mínimo + provisional explícito con estados, conteos y vista previa. No rellenar con cero ni confirmar/publicar para obtener números.

**Evidencia adicional**: API usa solo_lectura=true, no genera ceros por vencimiento, sin paginación perdida; backend decide intento vigente. BOM/escape/decimal y cero ya funcionan por diseño. Riesgos: orden por prioridad, scope de matrículas activas y cancelación por identidad del objeto user.

**Pruebas**: 17/17 existentes aprobadas con datos sintéticos; componente simula descargador. E2E que lee archivo real vive en e2e/mock/exports.mock.spec.ts, solo usa publicadas=5 y no está incluido en los comandos CI vigentes. Hace falta cobertura de archivo real con estados mixtos en CI general.

## Materias

**Hallazgo**: PATCH ya existe con subjects.update y dueño/admin; no hay DELETE ni subjects.delete. Archivada hoy solo libera cupo y bloquea código; no oculta listados ni cierra nuevos trabajos/entregas.

**Decisión**: proponer retirada recuperable explicada, Archivadas/restauración, nueva actividad cerrada e histórico consultable. Transición central compatible con PATCH y bloqueo por propietario para crear/restaurar. No reabrir recepciones automáticamente.

**Motivo**: borrar físicamente arriesga cascadas de matrícula/asistencia/importación y FKs de notas, evaluaciones, recursos, DBA, RAG y feedback. Una materia no es la cuenta de sus alumnos.

## Reutilización

**Hallazgo**: no existe copia entre materias. Visuales tienen recursos privados/versiones/hash; ACL exige propietario/materia/evaluación. Lectura reside en reglas_feedback. material_origen_id es único; DBA personalizados y formato de impresión requieren remapeo.

**Decisión**: nuevo borrador, mismo docente, versión fijada e IDs/bytes propios con la misma seguridad. Preservar lectura/figuras/formato y pendientes, no actividad de alumnos. Detectar contenido legacy/actividad no reproducible y no anunciar una copia incompleta.

**Alternativas rechazadas**: mover materia_id del origen, compartir recurso_id/storage_key, copiar solo preguntas, volver a OCR/IA o trasladar material_origen_id/historial de alumnos.

## Recuperación

**Decisión refinada durante implementación**: operación persistente idempotente en ai_jobs ya existente (tipo libre, payload privado, identidad, progreso y lease); no requiere otra tabla ni migración. Preparación privada y transacción final conjunta con éxito del job. SQL rollback no borra bytes: compensación acotada y prueba de caída/pérdida/hash. Nunca limpiar recursos del origen como compensación. Límite operativo: 200 MB/500 recursos, errores explícitos sin copia parcial.

**Estado**: spec/plan/revisión aprobados el 2026-10-25; implementación y pruebas locales en curso. Sin cambios de producción. Una fuente textual heredada sin versión conserva su contrato de edición/publicación en la copia; el snapshot admitido sigue durable en el job. No se inventa un manifiesto visual ni un original ausente.
