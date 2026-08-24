# Plan: Recursos y calificación fluida

**Rama**: codex/018-recursos-calificacion-fluida | **Fecha**: 2026-08-22 | **Spec**: [spec.md](./spec.md) | **Issue**: #24

## Resumen

Completar el ciclo usando las entidades existentes: la materia seleccionada se guarda al generar y hace que el borrador aparezca inmediatamente en la vista docente de esa materia; el material conserva su identidad, la asignación de apoyo usa su visibilidad y la asignación evaluativa se vincula a una única Evaluación mediante material_origen_id. La interfaz ofrecerá la decisión de tipo inmediatamente después de generar y mostrará los mismos estados y acciones en biblioteca y materia.

Reducir la latencia evitando tres análisis visuales completos de la misma evidencia. Una sola etapa visual con `qwen3.7-plus` como principal estructurará la evidencia. Un evaluador Flash producirá el desglose completo y un verificador Flash compacto comprobará puntajes y fórmula; el modelo Pro se reservará para arbitrar discrepancias, confianza baja, ambigüedad o fallo del verificador. Cada etapa tendrá salida acotada e intentos finitos ante fallos reales, pero la lectura de una inferencia aceptada se conservará hasta respuesta. Los umbrales temporales serán observacionales y una respuesta inválida terminará en revisión docente, nunca en publicación automática. Digitalización separará visión de estructuración textual, preferirá resolución determinística de claves y reparará únicamente faltantes.

Mover GradeComponentEditor dentro de la tarjeta seleccionada con previsualización de fórmula, guardado versionado y protección de cambios sin guardar. La vista de revisión tendrá un solo contenedor desplazable por panel, altura dinámica móvil, áreas seguras y restauración garantizada del bloqueo del cuerpo.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11; TypeScript 5.6; React 18.3; Node 22.
**Dependencias**: FastAPI 0.139, SQLAlchemy 2.0, Celery 5.4, Redis 5.2, httpx 0.28, Pydantic 2.10; React Router 7, TanStack Query 5, Tailwind 3, Vitest 4 y Playwright 1.61.
**Persistencia**: PostgreSQL; reutiliza materiales_generados, evaluaciones, ai_jobs, ai_usage_events y el desglose versionado. No se prevé migración: los estados nuevos de presentación se derivan de columnas existentes y los tiempos se guardan en resultado_json/ledger.
**Pruebas**: pytest unitario/integración, Vitest/Testing Library, Playwright funcional, visual y accesibilidad; comparación de regresión con fixtures de calificación explicable.
**Plataforma objetivo**: Docker Compose en VPS Linux; navegadores Chromium/Brave, WebKit/iPhone y Android; 360–1920 px, claro y oscuro.
**Rendimiento y escala**: aceptación HTTP menor a 2 s; se miden p50/p90 de payload, cola y proveedor sin cancelar inferencias aceptadas. Conexión, escritura y pool tienen protección finita; la lectura espera la respuesta. Varios trabajos independientes continúan en cola Celery sin bloquear la UI.

## Verificación de la constitución

- Separación de roles: cumple. Los endpoints de asignación, visibilidad y recepción siguen protegidos por autor/administrador; listados y lectura estudiantil exigen matrícula y visibilidad.
- Integridad y trazabilidad: cumple. Se conserva una sola Evaluación por material, una nota vigente por entrega, versiones de desglose y revisión humana ante cobertura o contraste incompletos.
- Asincronía e idempotencia: cumple. Digitalización y calificación permanecen en ai_jobs/Celery, usan identificador de ejecución y terminan en éxito, revisión o error sin duplicar entidades.
- Datos y secretos: cumple. No se crean tablas paralelas; telemetría registra identificadores técnicos, tiempos y códigos, nunca evidencia, respuestas, prompts privados o credenciales.
- Accesibilidad: cumple. El diseño exige un propietario de scroll, 100dvh/áreas seguras, objetivos táctiles, foco, teclado virtual y pruebas WebKit/móvil.
- Gobernanza y pruebas: cumple. Issue #24, spec aprobada, plan pendiente de aprobación, tareas trazables, regresión de nota, CI completo y PR obligatorio.

Verificación posterior al diseño: no aparecen excepciones. La visibilidad usa columnas existentes y los cambios de contrato son aditivos. La optimización no elimina el contraste: cambia la representación compartida y aplica revisión docente cuando el presupuesto impide concluirlo.

## Estructura del proyecto

- backend/app/modules/herramientas/router.py, schemas.py, service.py y evaluation_adapter.py: asignación, visibilidad y listado por materia.
- backend/app/modules/evaluaciones/router.py, service.py y digitalize_service.py: sincronización del material vinculado, guardas estudiantiles y digitalización.
- backend/app/modules/calificaciones/agents.py, orchestrator.py y photo_service.py: presupuesto, etapas, fallbacks y consolidación.
- backend/app/modules/jobs/service.py y schemas.py: tiempos terminales del trabajo.
- backend/app/modules/analytics/usage_logger.py: un evento por intento externo y etapa canónica.
- backend/app/core/config.py y backend/app/workers/tasks_digitalization.py/tasks_calificaciones.py: umbrales observacionales, transporte protegido y espera recuperable.
- frontend/src/modules/herramientas/GeneratePage.tsx, DetailPage.tsx, api.ts y componentes nuevos de asignación.
- frontend/src/modules/materias/MateriaRecursos.tsx: recursos de apoyo y actividades con estado/acciones.
- frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y components/GradeBreakdown.tsx, GradeComponentEditor.tsx: edición local y scroll.
- frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx y monitores de calificación: progreso y tiempos.
- frontend/src/types/api.ts: campos aditivos de actividad, recepción y telemetría.
- backend/tests, frontend/src/**/*.test.tsx y frontend/e2e: permisos, idempotencia, rendimiento simulado, scroll móvil y regresión visual.

## Decisiones y complejidad

1. Una sola fuente de verdad para actividad: Material conserva contenido, materia, tipo y visibilidad y aparece para el profesor desde que se genera; Evaluación conserva recepción, fechas y nota cuando se convierte. Se rechaza crear entregas o calificaciones propias de Recursos.
2. Visibilidad y recepción son independientes. publicado_estudiantes controla acceso al material/actividad vinculada; recepcion_habilitada controla nuevas entregas. Publicar una evaluación vinculada habilita visibilidad; ocultarla no borra ni cierra automáticamente entregas.
3. No hay migración inicial. La restricción única de evaluaciones.material_origen_id y las columnas de materiales_generados ya cubren el dominio. Solo se amplían consultas, esquemas y resultado_json.
4. Una sola lectura visual. El resultado normalizado —texto, respuestas, páginas, cobertura y alertas— alimenta validación determinística y dos evaluadores textuales en paralelo. Una reverificación visual dirigida solo ocurre por ambigüedad y dentro del presupuesto.
5. Fallback únicamente ante fallo verificable. Una inferencia aceptada mantiene lectura abierta hasta respuesta; no se cambia de modelo por duración. Conexión fallida, 5xx o respuesta inválida habilitan contingencia e idempotencia, sin duplicar notas.
6. El contraste conserva independencia mediante prompts/modelos configurables y componentes comparables. Si no concluye, el principal no se publica: queda requiere_revision con el faltante visible.
7. Digitalización usa visión solo para transcribir imágenes; estructuración y clave usan texto rápido, solucionadores determinísticos y reparación dirigida. Se rechaza reenviar la imagen completa para cada subpaso.
8. La edición se renderiza dentro del componente activo. Se rechaza portal al final, modal largo o múltiples editores simultáneos porque pierden contexto y agravan el scroll.
9. En móvil el detalle fijo contiene un único scroller con altura dinámica y safe-area. El cuerpo se bloquea mediante un helper con cleanup por cierre, desmontaje y navegación.
