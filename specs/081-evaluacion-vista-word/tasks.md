# Tareas: visualización final y Word de evaluaciones

Estado: especificación y plan aprobados; implementación y verificaciones focalizadas completas. CI y entrega productiva pendientes del PR.

## Fase 1: Preparación

- [x] T001 Registrar alcance, investigación y aprobación humana de especificación en `specs/081-evaluacion-vista-word/spec.md` e issue #169.
- [x] T002 Obtener aprobación del plan `specs/081-evaluacion-vista-word/plan.md`, revisar checklist y consistencia de artefactos antes de modificar código.

## Fase 2: Fundamentos

- [x] T003 Crear pruebas de contrato, contenido y no mutación en `backend/tests/unit/test_evaluation_exports.py` para los formatos y versiones compartidos.
- [x] T004 Centralizar adaptación imprimible y autorización reutilizable en `backend/app/modules/evaluaciones/export_service.py` y `backend/app/modules/evaluaciones/router.py`, preservando firma/comportamiento PDF.

## Fase 3: Historia 1 — Vista final (MVP)

- [x] T005 [US1] Probar y añadir preview PDF autenticado, errores/fallback y liberación de URLs en `frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx` y su prueba Vitest, con soporte en `frontend/src/modules/evaluaciones/api.ts`.
- [x] T006 [US1] Añadir «Visualizar» independiente de permiso de edición en `frontend/src/modules/materias/MateriaEvaluaciones.tsx` y `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`, con regresión en tests existentes.

## Fase 4: Historia 2 — Word editable

- [x] T007 [US2] Implementar y validar DOCX nativo íntegro con python-docx en `backend/app/modules/evaluaciones/export_service.py` y endpoint en `backend/app/modules/evaluaciones/router.py`, incluyendo errores explícitos de contenido/material no soportado.
- [x] T008 [US2] Añadir descarga Word autenticada con estado/reintento en `frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx` y `frontend/src/modules/evaluaciones/api.ts`; comprobar DOCX editables y lectura de mensajes Blob.

## Fase 5: Historia 3 — Solucionario protegido

- [x] T009 [US3] Probar e integrar selector explícito de solucionario en `frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx` y autorizar ambos formatos en `backend/app/modules/evaluaciones/router.py`; verificar estudiante/otro docente denegados y versión pública sin respuestas.

## Fase final: Validación

- [x] T010 Ejecutar e incorporar regresión móvil/escritorio en `frontend/e2e/evaluation-preview.spec.ts`, tipos/lint/build y pruebas backend/frontend focalizadas; inspeccionar documentos y conservar evidencia y limitaciones del entorno en `specs/081-evaluacion-vista-word/quickstart.md`.
- [x] T011 Actualizar índice `specs/README.md`, inventario `specs/system-inventory/current.json` y baseline `tests/spec_governance/test_spec_baseline.py`; analizar/converger, ejecutar gobernanza y dejar entrega registrada en issue #169 para PR/CI.

## Dependencias y ejecución

T001 → T002 (aprobación obligatoria) → T003 → T004 → T005 → T006.
T007 depende de T004; T008 depende de T005 y T007. T009 integra ambas versiones
tras T005/T007. T010/T011 requieren las tres historias implementadas y verificadas.
MVP: T003–T006 permiten visualizar PDF sin editar; Word añade T007–T008; solucionario T009.
Las pruebas de documentos y UI pueden correr en paralelo tras sus respectivos
fundamentos, pero las ediciones de un mismo archivo se ejecutan secuencialmente.
No delegar a agentes adicionales sin autorización. No fusionar ni desplegar con
tareas pendientes o CI rojo; cierre de issue solo con entrega realmente completada.

## Trazabilidad de requisitos

- FR-001 → T005/T006: Visualizar con permiso de lectura en ambas listas.
- FR-002 → T004/T005: PDF mostrado y descargado usan el mismo archivo.
- FR-003 → T003/T007/T008: Word nativo íntegro, editable y sin regeneración.
- FR-004 → T003/T004/T009: versión pública sin claves ni justificaciones privadas.
- FR-005 → T003/T009: selector explícito y autorización servidor/rol/propiedad.
- FR-006 → T003/T004/T010: GET de solo lectura y regresión de no mutación.
- FR-007 → T005/T008/T010: carga, errores, reintento, celular y claro/oscuro.
- FR-008 → T004/T007/T010/T011: materiales originales y flujos anteriores compatibles.
