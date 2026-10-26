# Plan: Evaluaciones

**Rama**: codex/005-evaluaciones | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #6

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/evaluaciones y frontend/src/modules/evaluaciones, materias

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.

## Incremento 102

El [plan 102](../102-camara-visor-completo/plan.md) conserva Blob/API/PDF.js y permisos, con lector de todas las páginas, un scroll y dibujo serial de hasta tres canvases residentes. Opciones agrupa PDF/Word y documento completo en otra pestaña; no cambia otros modales ni persistencia.

## Incremento 096

El [plan 096](../096-evaluacion-dos-pantallas/plan.md) reutiliza GenerationWizard, editores y API actuales, con dos etapas y selector compartido de métodos. El formulario manual existente se comparte entre acceso general y materia; no se duplica su validación ni transporte. Sin migraciones ni cambios backend; guardado diferencial y expected_updated_at conservados.

## Incremento 097

El [plan 097](../097-escritura-docente-movil/plan.md) añade un hook de presentación opt-in para foco y VisualViewport, listeners acotados y limpieza. Modal conserva defaults fuera del alcance; los formularios IA/manual mantienen controles montados y un scroll principal. Sin dependencias, cambios de API ni generación por foco/resize/Listo. Chromium/WebKit cubren alturas reducidas; la prueba física de iPhone/Android queda expresamente diferenciada.

## Coordinación 130 en curso

Documento editorial opcional JSONB, versiones textuales, revisión, editor y presupuestos compilados a máximos canónicos. El dominio005 mantiene la propiedad; la activación nueva queda cerrada por defecto. El alcance y las pruebas nuevos se registran una sola vez en [Spec130](../130-digitalizacion-secciones/spec.md), [su plan](../130-digitalizacion-secciones/plan.md) y [sus tareas](../130-digitalizacion-secciones/tasks.md), issue #274. Esta referencia no acredita cierre, CI ni activación en producción.
