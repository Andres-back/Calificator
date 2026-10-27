# Plan: materias, notas exportables y evaluación reutilizable

**Rama**: `codex/128-materias-notas-reutilizacion` | **Fecha**: 2026-10-25 | **Spec**: [spec.md](./spec.md) | **Issue**: [#270](https://github.com/Andres-back/Calificator/issues/270)

**Estado**: aprobado por el usuario el 2026-10-25, incluida revisión de requisitos. Implementación autorizada; no autoriza fusión ni cambios de producción.

## Resumen

Priorizar CSV: separar exportación del seguimiento y verificar el archivo real. Después exponer edición y retirada recuperable de materias, y copia editorial privada e independiente de evaluaciones entre materias del mismo docente. «Eliminar de mis materias» explicará que archiva y permite restaurar, sin borrado físico. La elección de archivo y los modos de CSV se presentan antes de implementar.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React18/Vite; Python/FastAPI/SQLAlchemy async, PostgreSQL/Alembic y workers existentes.
**Dependencias**: servicios actuales de materias/evaluaciones/notas, almacenamiento privado y trabajo asíncrono. Sin librerías/modelos/proveedores de IA nuevos.
**Persistencia**: estado archivada, configuración y operación durable en ai_jobs existentes. Inspección durante implementación confirmó que ai_jobs ya admite tipo libre, solicitud privada, identidad, progreso, lease y resultado; reutilizarlo evita una tabla/migración redundante. Auditoría transaccional vigente. No borrar registros académicos.
**Pruebas**: Vitest, Playwright Chromium/WebKit con descarga real y API/DB aisladas con archivos y datos sintéticos. No usar alumnos reales.
**Plataforma objetivo**: iPhone/Android y escritorio, 360/390/1440, dos temas. No presentar emulación como Excel físico o prueba del dispositivo.
**Rendimiento y escala**: lecturas CSV en lotes de tres evaluaciones como hoy, cancelación lógica/UI navegable. Copia con archivos mediante trabajo observable e idempotente, sin bloquear navegación. Validar 40 alumnos/10 evaluaciones y copia multipágina con recursos; medir antes de afirmar tiempos. Cero llamadas a IA.

## Verificación de la constitución

- Roles (I): permisos y propiedad en servidor en ambos extremos; lectura de evaluación no basta para copiarla. Exportar conserva grading.read y solo_lectura. Alumnos/terceros no acceden a claves/originales.
- Integridad (II/IV): CSV no confirma/publica; archivo conserva expediente; copia omite actividad de alumnos y usa sus propios IDs/bytes. Reutilización del esquema existente comprobada, sin cascadas de borrado. PATCH heredado comparte transiciones nuevas.
- Asincronía (III): operación persistente con progreso/reintento de la misma solicitud; no presentar éxito parcial. Archivos y rollback requieren compensación propia. Leer notas no crea ceros ni reenvía IA.
- Datos/IA (VI): cero cambios de modelos/claves y cero llamadas pagadas; minimizar contenido privado en logs y nunca crear enlaces públicos para originales.
- Accesibilidad (V): conteos/vista previa, confirmaciones cancelables, controles 44 px, mensajes simples y ambos temas/anchuras sin overflow.
- Gobernanza (VII/VIII): issue #270, spec y este plan antes de código; aprobación humana registrada el 2026-10-25. Checklist/Tasks/Analyze, pruebas/Converge, PR y CI. Sin push directo a main ni despliegue manual.

Revisión posterior al diseño: sin excepción constitucional ni incógnita técnica bloqueante. Aprobación humana registrada el 2026-10-25; los diagnósticos no sustituyen las pruebas de implementación.

## Estructura del proyecto

- CSV: `frontend/src/modules/materias/GradebookExport.tsx`, nuevo modelo específico y sus pruebas; `frontend/src/lib/csvExport.ts`, accesos desde `MateriaBoletin.tsx`. No cambiar semántica de seguimiento en `gradebookModel.ts`.
- Prueba de descarga: nuevo `frontend/e2e/gradebook-export.spec.ts`, registrado en configuración real CI, y fixture API/DB sintética que compruebe política de intentos vigente.
- Materias: `frontend/src/modules/materias/{MateriasListPage,MateriaDetailPage,MateriaVistaGeneral}.tsx`, `api.ts`, controles compartidos y pruebas. `backend/app/modules/materias/{router,service,schemas}.py`, matriculación y puntos de admisión de actividades/entregas/calificación que deban impedir trabajo nuevo.
- Copia: servicio/router/schema nuevos bajo `backend/app/modules/evaluaciones/`, integrando `models.py`, `visual_service.py`, `visual_serialization.py`, `reading_service.py`, `print_settings.py`, DBA personalizados y `storage_service.py`. Operación en ai_jobs sin cambio de esquema, worker sin IA y pruebas de persistencia/ACL/rollback.
- UI común de copia en `MateriaEvaluaciones.tsx` y `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`, API y seguimiento de trabajo existente.
- Después de aprobar: actualizar dominios 003/005/007/008 y Specs090/101/113/125, índice/inventario/baseline sin debilitar controles.

## Decisiones y complejidad

### CSV y contexto

Crear modelo específico, no cambiar buildFollowUpRows. Backend ya resuelve intento vigente y anulación: no sustituir su política ordenando por updated_at. Validar scopes y mapear por IDs, ordenar alfabéticamente y preservar homónimos.

«Notas finales» conserva nombre + columna por evaluación, solo decisión docente válida, cero/decimales y ausencias vacías. Conteos/vista previa explican pendientes; cero finales ofrece revisar o cambiar de modo, sin falso éxito vacío.

«Informe provisional» explícito: decisión vigente si existe, sugerencia si no, estado por evaluación y archivo/encabezados identificados. Procesando, sin nota o fallo no se convierten en cero ni arrastran una nota anterior como actual. No modifica el boletín ni publica.

Conservar BOM/UTF-8, punto y coma, escape seguro y decimal previsto; comprobar bytes reales. No añadir XLSX ni afirmar Excel físico probado. Comparar sesión por actor estable y permisos/contexto, no referencia del objeto JavaScript; logout/cambio de cuenta sí cancela y debe informar.

### Materia y conservación

Exponer edición ya soportada. Retirada recuperable, confirmación explícita, vista Archivadas y restauración con histórico. Nunca db.delete(Materia) ni retirar matrículas/cuentas.

Centralizar transición: subjects.update + propietario/admin, bloqueo de materia/propietario, idempotencia y versión esperada para nuevos formularios. PATCH heredado usa la misma transición. Creación/restauración comparten bloqueo/cupo: seis materias, con exención administrativa vigente, sin ampliar límites ni cambios de roles ajenos.

Archivo desactiva código y recepción futura, sin alterar notas/estados académicos históricos. Nueva actividad/entrega/calificación/copia hacia esa materia exige activa en admisión; trabajos ya admitidos pueden terminar y persistir sin duplicarse. Restauración mantiene código/recepción cerrados hasta apertura explícita. No basta ocultar tarjetas o botones.

### Copia editorial independiente

Fuente accesible (incluida archivada consultable), destino activo distinto y mismo docente propietario, con gestión/creación autorizadas. Un administrador no produce intercambio entre profesores implícitamente. Avisar diferencia de área/grado, sin adaptar por IA.

Fijar versión fuente esperada o updated_at + hash legado al admitir; una vez admitida usar snapshot coherente. Rechazar conflictos iniciales y no mezclar versiones. No mutar origen ni inventar originales nunca guardados. Un origen textual legacy sin revisión visual conserva ese contrato de edición/publicación; no se le inventa un manifiesto para forzar una versión.

Nuevos IDs de evaluación/blueprint/versión/recursos/preguntas/bloques/DBA personalizados; remapear manifiesto, cobertura, avisos y configuración de impresión. Lectura está en blueprint.reglas_feedback. DBA oficiales conservan referencia si válida; personalizados requieren copia/asociación de destino. No copiar material_origen_id único global ni contexto RAG privado específico de otra materia.

Copiar bytes con SHA/tamaño y ACL de destino; compartir recurso_id rompería permisos. Originales siguen privados y revisión pendiente sigue pendiente. Conservar claves ya revisadas con procedencia válida, sin aprobar otras ni bloquearlas artificialmente por remapeo. Detectar contenido legacy/interactivo no reproducible antes del éxito, con mensaje claro, nunca omitirlo silenciosamente. Alcance inicial: evaluaciones digitalizadas y nativas estructuradas soportadas.

Operación durable en ai_jobs, ID de solicitud único y actor/fingerprint origen/versión/destino comprobados; una colisión de otro actor no se expone. Mismo key devuelve operación/copia existente; intención nueva explícita puede crear otra. Worker prepara archivos deterministas en staging privado y transacción final publica filas/asociaciones completas junto al éxito del trabajo; compensar solo archivos propios sin referencia persistida ante fallo y recuperar estados inciertos. No descargar URLs arbitrarias ni convertir originales en contenido público. Refinamiento técnico del 2026-10-25: conserva el alcance aprobado y reduce cambios de esquema; sin nuevas llamadas IA.

### Liberación

Diagnóstico local actual: 17/17 pruebas existentes de exportación/modelo/formato aprobadas, incluida exclusión de sugeridas. Eso prueba contrato anterior, no reparación. Después de aprobación: archivo real, API/DB aisladas, concurrencia/conservación, revisión visual, inventario/gobernanza, PR y CI verde. Prueba posterior en producción solo con cuenta demo y alcance autorizado, nunca presumida por CI.

## Coordinación 130 en curso

La recuperación añade una intención expresa al copy/job durable, permite solo esa copia en la misma materia y revalida procedencia/permisos. La reutilización normal conserva destino distinto y remapea documento, material y presupuestos, sin copiar estudiantes o notas. El alcance y las pruebas nuevos se registran una sola vez en [Spec130](../130-digitalizacion-secciones/spec.md), [su plan](../130-digitalizacion-secciones/plan.md) y [sus tareas](../130-digitalizacion-secciones/tasks.md), issue #274. Esta referencia no acredita cierre, CI ni activación en producción.
