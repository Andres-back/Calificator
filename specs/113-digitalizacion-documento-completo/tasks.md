# Tareas: Documento completo

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisar requisitos en specs/113-digitalizacion-documento-completo/checklists/requirements.md y plan.md.

## Fase 2: Fundamentos

- [x] T002 Añadir contratos sintéticos de lectura, permisos y versiones en backend/tests/unit/test_evaluation_digitalization.py y test_evaluation_visual_serialization.py.

## Fase 3: Historia 1 — lectura completa

- [x] T003 [US1] Extraer y normalizar lectura separada sin truncamiento silencioso en backend/app/modules/evaluaciones/digitalize_service.py.
- [x] T004 [US1] Persistir/editar lectura con permisos y contexto congelado en backend/app/modules/evaluaciones/{models,schemas,service,blueprint_service}.py y helper reading_service.py.
- [x] T005 [US1] Mostrar/editar lectura pública en frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx, frontend/src/modules/evaluaciones/EvaluacionesPage.tsx, resolución y frontend/src/types/api.ts; probar alumno sin claves.

## Fase 4: Historia 2 — impresión compacta

- [x] T006 [US2] Probar integridad y compactación sintéticas en backend/tests/unit/test_evaluation_exports.py y test_herramientas_pdf_total.py.
- [x] T007 [US2] Incluir lectura y distribución compacta opt-in en backend/app/modules/evaluaciones/export_service.py y backend/app/modules/herramientas/pdf_render.py, sin alterar otros recursos.
- [x] T008 [US2] Renderizar y revisar PDF/Word mixtos en output/pdf/ y registrar evidencia en specs/113-digitalizacion-documento-completo/quickstart.md.

## Fase 5: Historia 3 — varias fotos

- [x] T009 [US3] Probar selección múltiple/límites/orden/giro y un único trabajo en frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.test.tsx y backend/tests/unit/test_digitalization_queue.py.
- [x] T010 [US3] Parametrizar picker y límites de bundle en frontend/src/components/evidence/MultiPageEvidencePicker.tsx y backend/app/services/evidence_bundle_service.py, conservando defaults existentes.
- [x] T011 [US3] Integrar fotos/PDF/Word con contexto y cola privada en frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx y backend/app/modules/evaluaciones/router.py; preservar fuente y job ante broker incierto.

## Fase final: Validación

- [x] T012 Ejecutar regresiones de backend/frontend, Chromium/WebKit desde 360 px, permisos y persistencia aislada; registrar resultados reales en specs/113-digitalizacion-documento-completo/quickstart.md.
- [x] T013 Ejecutar convergencia, actualizar specs/README.md, tests/spec_governance/test_spec_baseline.py e inventario de superficies, abrir PR ligado a #233; no fusionar sin todos los controles verdes.

## Dependencias

T001 → T002 → US1 (T003–T005); T006 → T007 → T008 depende del contrato de lectura T004. T009 → T010 → T011 puede avanzar independientemente de exportación; T012/T013 requieren las tres historias. Ejemplo paralelo seguro: pruebas de exportación T006 y pruebas de selección T009 (archivos distintos). Implementación incremental: lectura primero, impresión después, selección multipágina finalmente; recuperación real de notas siempre en Spec 112 separada.

## Trazabilidad

FR-001 → T002–T005; FR-002 → T002/T004/T005/T012; FR-003 → T006–T008; FR-004 → T009–T011; FR-005 → T009/T011/T012; FR-006 → T002/T004/T012; FR-007 → T008/T012/T013.
