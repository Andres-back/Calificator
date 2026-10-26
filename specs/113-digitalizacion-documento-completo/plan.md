# Plan: Digitalización del documento completo

**Rama**: `codex/113-digitalizacion-documento-completo` | **Fecha**: 2026-10-21 | **Spec**: [spec.md](./spec.md) | **Issue**: #233

## Resumen

Conservar lectura pública opcional en blueprint y snapshots, separada de preguntas y solucionario privado. Editarla con permisos y bloqueo optimista. Exportar lectura y preguntas con opciones compactas solo para evaluaciones. Reutilizar selector multipágina existente y consolidar en servidor para un único trabajo asíncrono. Plan completo aprobado por el usuario y ocho requisitos revisados. La recuperación urgente es Spec 112 / PR #234.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12 en contenedores, TypeScript/React existente.
**Dependencias**: FastAPI, SQLAlchemy, Pydantic, Celery, Pillow 13, PyMuPDF, python-docx y renderizador PDF existente; ninguna nueva.
**Persistencia**: `EvaluacionBlueprint.reglas_feedback.lectura` y snapshots existentes; campo público controlado. Sin migración ni backfill.
**Pruebas**: pytest, Vitest, Chromium/WebKit, render visual PDF/Word sintéticos y CI completo.
**Plataforma objetivo**: celular desde 360 px, iPhone/Android y escritorio.
**Rendimiento y escala**: diez fotos/20 MB antes de normalizar; consolidación backend, una digitalización asíncrona; sin PDF en el teléfono ni llamadas de generación de imágenes.

## Verificación de la constitución

- Separación de roles: autorizar materia antes de leer archivos; campo de lectura allowlisted, nunca reglas/solucionario para alumnos; pruebas de rechazo.
- Integridad y trazabilidad: snapshots conservan lectura. No recalcular notas ni reescribir evaluaciones antiguas. Rechazar edición incompatible de registros legacy con entregas, mediante 409 comprensible.
- Asincronía e idempotencia: cola durable existente; una selección produce un archivo consolidado y un job; conservar fuente ante fallo de broker.
- Datos y secretos: muestras sintéticas, fuente privada, sin claves ni datos de alumnos en Git.
- Accesibilidad: selector reutilizable; lectura de una columna en móvil. Columnas solo en impresión compacta cuando sean legibles.
- Gobernanza y pruebas: aprobación registrada; Tasks/Analyze/Implement/Converge y PR/CI verdes antes de desplegar desde main.

## Estructura del proyecto

- `backend/app/modules/evaluaciones/`: extracción, servicio, schemas, lectura, blueprint, exportación y router.
- `backend/app/services/evidence_bundle_service.py`: límites opcionales, defaults de calificación intactos.
- `backend/app/modules/herramientas/pdf_render.py`: impresión compacta opt-in.
- `frontend/src/modules/evaluaciones/components/`: DigitalizarEvaluacionModal, EvaluationPreviewModal y GenerationWizard; `frontend/src/components/evidence/MultiPageEvidencePicker.tsx`.
- `frontend/src/modules/evaluaciones/`: editor/resolución; `frontend/src/types/api.ts`; pruebas backend/frontend/E2E.

## Decisiones y complejidad

Blueprint evita otra tabla y ya integra versiones. Lectura se filtra expresamente y se separa de respuestas manuscritas. Consolidado de fotos normalizado, sin prometer identidad binaria de originales. No activar globalmente banderas visuales ni IA de imágenes. Impresión compacta acotada para no rediseñar otros recursos. Investigación previa de lectura/impresión y multipágina completada y consolidada en research.md; no quedan decisiones técnicas abiertas.

## Coordinación 130 en curso

La lectura intercalada vive en nodos documentales, sin duplicarse como lectura general legacy. La misma extracción multipágina conserva actividades e instrucciones por identidad de origen; no añade llamadas IA ni reescribe evaluaciones antiguas. El alcance y las pruebas nuevos se registran una sola vez en [Spec130](../130-digitalizacion-secciones/spec.md), [su plan](../130-digitalizacion-secciones/plan.md) y [sus tareas](../130-digitalizacion-secciones/tasks.md), issue #274. Esta referencia no acredita cierre, CI ni activación en producción.
