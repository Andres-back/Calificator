# Plan: Calificaciones, visión, PQRS y boletín

**Rama**: codex/008-calificaciones | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #9

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/calificaciones y frontend/src/modules/calificaciones, materias

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.

## Incremento 102

El [plan 102](../102-camara-visor-completo/plan.md) integra captura local sin audio dentro del picker existente; identidad de contexto y cancelación invalidan resultados tardíos. Una foto aceptada pasa por addFiles/calidad y nunca envía automáticamente. Sin cambios de calificación o persistencia.

## Coordinación con 032

La evolución [032](../032-calificacion-impacto-docente/plan.md) implementa recuperación, revisión contextual y autoridad del escritor dentro de este dominio; las tablas y rutas académicas continúan siendo propiedad de 008.

## Coordinación con 129

[Plan129](../129-retroalimentacion-flujo-claro/plan.md), issue #272: composición frontend común sin modificar cálculo ni publicación. Marco de cabecera/cuerpo/pie; detalle integrado con acciones locales, sin otro pie global sobre las acciones de calificación. Contratos de 107/120/122 intactos; pruebas por identidad y permisos actuales.

## Coordinación 130 en curso

Principal, segundo evaluador y confirmador reciben contexto educativo de la revisión de entrega. Los presupuestos ya compilados no añaden una segunda ponderación; notas y decisiones históricas permanecen intactas. El alcance y las pruebas nuevos se registran una sola vez en [Spec130](../130-digitalizacion-secciones/spec.md), [su plan](../130-digitalizacion-secciones/plan.md) y [sus tareas](../130-digitalizacion-secciones/tasks.md), issue #274. Esta referencia no acredita cierre, CI ni activación en producción.

## Coordinación 131: evidencia docente revisable

Incorpora preparación opcional de evidencia docente, originales privados, misma página canónica para todos los roles, colores semánticos y acercamiento por pregunta. No modifica fórmulas, modelos, decisiones ni permisos de publicación. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.
