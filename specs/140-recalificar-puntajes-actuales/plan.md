# Implementation Plan: Recalificar con puntajes actuales

**Branch**: `codex/140-recalificar-puntajes-actuales` | **Date**: 2026-11-02
**Spec**: [spec.md](spec.md) | **Issue**: #299

## Summary

Ampliar el diálogo individual existente con consulta de contexto sin inferencias.
Comparar revisión fijada y actual mediante `academic_fingerprint` y máximos
canónicos. Si únicamente cambian puntos, exigir confirmación y referencia exacta
antes de adoptar esa revisión para el nuevo trabajo. No cambiar el lector ni el
worker para usar siempre la última revisión. Se conserva el contexto de Spec101;
se amplía explícitamente la decisión 6 de Spec137 solo para reapertura individual.

## Technical Context

**Language/Version**: Python 3.11+, TypeScript/React 18, Node 22.
**Primary Dependencies**: FastAPI, SQLAlchemy async, PostgreSQL, React Query.
**Storage**: Tablas y JSON históricos existentes; sin migración ni dependencia nueva.
**Testing**: pytest, PostgreSQL aislado, Vitest y Playwright Chromium/WebKit.
**Target Platform**: Linux y navegador móvil/escritorio.
**Project Type**: Web app frontend/backend con trabajos Celery.
**Performance Goals**: Detección mediante consultas locales; cero llamadas IA adicionales.
**Constraints**: Sin cambios de modelos, datos académicos reales, despliegue ni fusión automática.
**Scale/Scope**: Una entrega por operación, hasta 100 preguntas y pruebas mixtas de 24 entregas.

## Constitution Check

I: permisos de propietario y `grading.grade` en GET/POST. II: snapshot anterior
antes del nuevo pin; no publicación automática. III: recibo primero e idempotencia
de trabajos existentes. IV: sin cambio de esquema. V: 384/1440 px, ambos temas,
objetivos táctiles 44 px y consulta recuperable. VI: sin proveedor nuevo ni IA.
VII: aprobación explícita del usuario, issue #299, spec/plan/tasks, regresión y CI.
VIII: rama aislada y PR; no push a main. Puertas previas y posteriores al diseño: PASS.

## Project Structure

```text
specs/140-recalificar-puntajes-actuales/
  spec.md plan.md research.md data-model.md quickstart.md tasks.md
  checklists/requirements.md contracts/reprocessing.md
backend/app/modules/calificaciones/
  reprocessing_context.py revision_router.py revision_service.py schemas.py
backend/tests/
  unit/test_reprocessing_context.py
  integration/test_regrading_score_context.py
frontend/src/modules/calificaciones/
  api.ts components/GradeReprocessing.tsx
frontend/e2e/regrading-score-context.spec.ts
```

**Structure Decision**: Helper acotado, contrato aditivo y diálogo actual. La
consulta y aceptación son comunes a recalificar y reemplazar evidencia.

## Decisiones y orden transaccional

1. GET autorizado, sin escrituras, claves, imágenes ni locks duraderos.
2. POST mantiene grade → delivery → evaluation; reconsulta evaluación/blueprint
   con `FOR SHARE` después del recibo idempotente, compatible con edición de reparto.
3. La huella de operación incorpora campos enviados solo cuando existen para
   preservar repeticiones antiguas. El recibo se consulta antes del preflight.
4. La huella de contexto incluye nota/entrega y referencias inmutables observadas;
   no incluye estado de recepción mutable ajeno al reparto. Se comprueba otra vez
   bajo locks. Falta de aceptación o referencia obsoleta: 409 antes de archivos/jobs.
5. Snapshot anterior primero; metadatos `recalificacion_puntajes` con ambas
   referencias; cambiar pin solo al destino confirmado; cola captura id/hash y
   confirma en la transacción existente. Un rollback restaura ambos.
6. Contenido o escala diferentes no permiten adoptar versión actual; se informa
   que el reenvío conserva la original. Ausencia de versión comprobable mantiene
   el bloqueo existente. No se debilita `grading_job_reference` ni sus pruebas.
7. UI: carga/error recuperable, comparación solo de preguntas modificadas,
   checkbox adicional para puntos, sin eliminar confirmación de reapertura;
   recargar propuesta ante conflicto conserva motivo/fotos y borra aceptación.
8. Se quita la ambigüedad «Usaremos la evidencia guardada» como única explicación:
   el mismo diálogo identifica el reparto. No se añade otro menú ni pantalla.

## Validación y reversión

Regresión sintética primero; frontend unit/type/lint/build, backend unit e
integración real aislada, móvil/escritorio y CI completo. No hay prueba IA de pago
ni uso adicional de datos reales. Revertir el commit mantiene JSON históricos y
las referencias ya aceptadas legibles por el código anterior; no borrar revisiones.

## Complexity Tracking

Sin violaciones constitucionales ni nueva infraestructura persistente.

## Reducción y validación visual

Se reutiliza el diálogo, eliminando la ambigüedad de su explicación de evidencia.
No se duplica compartir ni recalificar en otro menú. Se mantiene visible el aviso
de cambio académico, versión no disponible y reapertura de nota publicada.
Maqueta sintética 384 px antes de implementar; después capturas 384/1440 px en
claro/oscuro y error/reconsulta, conservando fotos, motivo, permisos y scroll.
