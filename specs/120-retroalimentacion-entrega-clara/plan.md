# Plan: devolución docente clara y compartible

**Rama**: `codex/120-retroalimentacion-entrega-clara` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Issue**: #255

## Resumen

Corregir la inconsistencia entre nota publicada y devolución bloqueada, sin rebajar la revisión académica: permitir seleccionar estudiantes y autorizar explícitamente un resumen docente cuando no hay desglose publicable. Mantener la vía ya válida para devoluciones coherentes y reutilizar impresión/enlaces/Xali. Ordenar el mensaje mediante una presentación conservadora común, sin modificar textos guardados automáticamente.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 del contenedor, TypeScript/React 18 del proyecto.
**Dependencias**: FastAPI, SQLAlchemy async, PostgreSQL, Pydantic, React, Vitest y Playwright existentes; sin nuevas dependencias ni llamadas a IA.
**Persistencia**: nueva tabla aditiva de revisiones de devolución; publicación/acceso existentes conservados. No backfill ni reescritura de calificaciones.
**Pruebas**: unitarias de proyección/política/contexto y presentación, integración PostgreSQL de autorización/concurrencia/inmutabilidad, permisos de rutas, E2E de selección/revisión/impresión/enlace.
**Plataforma objetivo**: navegador y PWA en celular/escritorio, Chromium y WebKit emulados, ambos temas. No certificar hardware físico.
**Rendimiento y escala**: matriz de 30 estudiantes con mensajes de hasta 6.000 caracteres; no reconsultar cada estudiante al teclear; paginación existente de 100 resultados. Sin inferencias por selección/revisión/impresión; tres acciones principales adicionales para un mensaje ya válido. Medir consultas por lote y evitar un nuevo recorrido individual adicional innecesario.

## Verificación de la constitución

- Separación de roles: autorización de materia/evaluación y permiso `grading.publish` antes de aprobar/emitir; público limitado al snapshot autorizado. Sin aprobar por parámetros de estudiante enviados por el visitante.
- Integridad y trazabilidad: nota oficial permanece igual; resumen no divulga desglose pendiente. Aprobaciones nuevas inmutables, vinculadas a huella de fuente, autor y fecha. Los avisos antiguos no se borran.
- Asincronía e idempotencia: autorización breve sin inferencia; bloqueo por nota, request_id único y versión/huella esperada. Se conserva la cola/cupo de Xali y emisión idempotente.
- Datos y secretos: migración aditiva y reversible sin backfill; fixtures sintéticas y secretos fuera de Git. La devolución editable se guarda solo por acción explícita, nunca al consultar.
- Accesibilidad: 360/390/768/1440 px, teclado, controles ≥44 px, editor de altura útil y lista con detalles progresivos; lectura e impresión sin truncar.
- Proveedores intercambiables: no se añade ninguna selección de modelos ni lógica ligada a nombres comerciales.
- Gobernanza y pruebas: Spec120 aprobada, issue #255 hotfix; revisión del checklist pendiente. Plan sin pausa adicional por proceso abreviado. Tasks/Analyze/Implement/Converge y CI siguen obligatorios.
- Main protegida: trabajo en rama; PR con CI verde antes de solicitar fusión. No despliegue manual autorizado.

Resultado previo y posterior al diseño: no hay excepción constitucional ni aclaración funcional abierta. La autorización de resumen es explícita y distinta de relajar la publicación automática de un desglose incompleto.

## Estructura del proyecto

- `backend/app/modules/feedback_sharing/`: modelos, preparación de fuente, autorización de resumen, proyección, rutas e invalidación.
- `backend/alembic/versions/`: revisión aditiva posterior a `202610230001`.
- `backend/tests/unit/test_feedback_*` y `backend/tests/integration/test_feedback_sharing_*`: regresión, permisos, contexto y datos.
- `frontend/src/modules/feedback_sharing/`: selector/revisión guiada, presentación compartida, paginación/impresión y vista pública.
- `frontend/e2e/`: fixtures de devoluciones bloqueadas/publicadas y regresión móvil/escritorio.
- `specs/107-retroalimentacion-familiar/spec.md`: precisión de FR-003/004/006/018 y criterios afectados, referenciada a Spec120.
- `specs/120-retroalimentacion-entrega-clara/`, inventario y registro de gobernanza: contrato, pruebas y trazabilidad.

## Decisiones y complejidad

1. Separar selección de elegibilidad: pendientes con nota seleccionables, entrega bloqueada hasta revisión; acción «Entregar solo los listos» explícita para lotes mixtos.
2. Nueva revisión privada de devolución, no bandera genérica de ignorar alertas en la nota. Solo se usa si coincide la huella completa de la fuente vigente.
3. En resumen, excluir preguntas/puntajes/referencias no validados desde la proyección; Xali recibe únicamente esa proyección. Nunca depender de una instrucción al modelo para ocultar información que ya recibió.
4. Mantener retrocompatibilidad: devoluciones actualmente coherentes siguen elegibles sin revisión extra; enlaces existentes válidos conservan su huella y acceso, sin migración obligatoria.
5. Agrupación conservadora del texto y salida plana equivalente para impresión; mensajes no clasificables quedan generales. No inferir aciertos a partir de una nota ni editar feedback con regex destructivas.
6. La publicación de configuración de generación (versión 14) es una operación autorizada separada de este cambio; no incluir modelos ni operaciones del servidor en este PR.
