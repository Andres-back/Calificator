# Tareas: biblioteca reutilizable de treinta motivos por área

**Issue**: #259 | **Rama**: `codex/123-motivos-por-area` | **Plan aprobado**: 2026-10-24.

Todas las tareas se crean pendientes. No iniciar implementación o generación mientras la revisión personalizada de requisitos siga pendiente sin autorización explícita para continuar. Los archivos nuevos indicados son entregables previstos, no existentes ya.

## Fase 1: Preparación

- [x] T001 Registrar aprobaciones, preservar cambios ajenos y comprobar la puerta de requisitos en `specs/123-motivos-por-area/plan.md` y `checklists/library.md`; reconciliar la dependencia del PR258 antes del PR propio, sin modificar su rama remota.
- [x] T002 Preparar trescientas descripciones distintas con ID/área/uso/procedencia en `specs/123-motivos-por-area/generated-prompts.json` y manifiesto de avance en `output/imagegen/spec123/`; no enviar datos reales ni claves de producción.

## Fase 2: Fundamentos

- [x] T003 [P] Escribir primero contratos unitarios de catálogo, paginación, resolución segura, hashes, alfa, ausencia/ID inválido y compatibilidad de los veinte generales en `backend/tests/unit/test_motif_library.py` y acceso permitido/denegado en `backend/tests/integration/test_motif_library_permissions.py` (FR-001, FR-005, FR-006, FR-009, FR-016).
- [x] T004 [P] Escribir primero pruebas de selección/alias, estados de carga/error/cancelación y doce miniaturas como máximo en `frontend/src/modules/motif_library/MotifPicker.test.tsx` y `motifLibrary.test.ts` (FR-004, FR-005, FR-010, FR-013).
- [x] T005 Implementar tipos, carga del catálogo curado, resolución por ID y validación de archivos sin rutas ni descargas arbitrarias en `backend/app/modules/motif_library/{schemas,service,router}.py`, con registro en `backend/app/api.py` (router central incluido por main); separar metadata docente de arte público por hash (FR-016).
- [x] T006 Implementar cliente y tipos comunes para metadatos paginados y referencias de archivos en `frontend/src/modules/motif_library/api.ts` y `types.ts`; el catálogo privado de imágenes de usuarios conserva sus filtros y rutas (FR-005, FR-013, FR-016).

## Fase 3: Historia 1 — encontrar treinta diseños por área

**Objetivo**: catálogo completo y selector progresivo por área, con generales conservados.
**Prueba independiente**: diez colecciones de treinta y una de veinte; acceso a todos sin cargar imágenes de otras áreas y fallback manual ante materia personalizada.

- [x] T007 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Ciencias Naturales y Educación Ambiental en `backend/app/assets/motif_library/naturales/`, registrando resultado y procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T008 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Ciencias Sociales en `backend/app/assets/motif_library/sociales/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T009 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Matemáticas en `backend/app/assets/motif_library/matematicas/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T010 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Lengua Castellana en `backend/app/assets/motif_library/castellana/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T011 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Inglés en `backend/app/assets/motif_library/ingles/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T012 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Tecnología e Informática en `backend/app/assets/motif_library/tecnologia/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T013 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Educación Artística en `backend/app/assets/motif_library/artistica/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T014 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Educación Física en `backend/app/assets/motif_library/fisica/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T015 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Ética y Valores en `backend/app/assets/motif_library/etica/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T016 [US1] Generar, inspeccionar y optimizar treinta composiciones distintas de Educación Religiosa, respetuosas y sin proselitismo, en `backend/app/assets/motif_library/religiosa/`, registrando procedencia en `specs/123-motivos-por-area/generated-prompts.json` (FR-001, FR-002, FR-003, FR-006, FR-007, FR-011).
- [x] T017 [US1] Completar `backend/app/assets/motif_library/catalog.json` con archivos revisados, tamaños/hash/orden estable, diez áreas y generales por hash sin modificar `frontend/public/assets/feedback-motifs/`; ampliar `backend/tests/unit/test_motif_library.py` para 320 motivos y presupuestos de archivo (FR-001, FR-003, FR-009, SC-001).
- [x] T018 [US1] Construir `frontend/src/modules/motif_library/MotifPicker.tsx` y `motifLibrary.ts` con área/alias explícitos, dos acciones principales, máximo doce por página, vista previa, controles accesibles y cancelación; cerrar las pruebas T004 (FR-004, FR-005, FR-010, SC-002, SC-004).

## Fase 4: Historia 2 — fichas temáticas completas

**Objetivo**: decorar o mezclar sin alterar destinatario, nota, devolución o reglas de entrega.
**Prueba independiente**: treinta fichas con continuaciones, A4/Carta, mezcla/fijo/ninguno/fallo, contenido completo y sin solicitudes de IA ni mutaciones.

- [x] T019 [US2] Escribir primero regresiones de generales, mezcla estable por colección y continuaciones en `frontend/src/modules/feedback_sharing/feedbackMotifs.test.ts` y pruebas de impresión en `FeedbackPrintSheet.test.tsx` (FR-008, FR-009, FR-011, FR-012).
- [x] T020 [US2] Adaptar `frontend/src/modules/feedback_sharing/feedbackMotifs.ts` conservando IDs y selección anterior; añadir selección por colección sin usar desempeño, nombre o género (FR-004, FR-008, FR-009).
- [x] T021 [US2] Integrar el selector compartido y espera/fallback de imágenes en `frontend/src/modules/feedback_sharing/FeedbackPrintSheet.tsx`; mantener 12 pt, líneas de corte y ausencia de cambios de publicación/enlaces (FR-008, FR-009, FR-011, FR-012, FR-013).
- [x] T022 [US2] Añadir fixtures de treinta fichas y validación visual/textual A4/Carta en `frontend/e2e/motif-print.spec.ts`, conservar resultados de `feedback-delivery-batch.spec.ts` y registrar PDFs/capturas sintéticos en `output/spec123/` y evidencia en `specs/123-motivos-por-area/quickstart.md` (SC-003, SC-005).

## Fase 5: Historia 3 — preguntas y recursos

**Objetivo**: reutilizar la colección desde los otros editores con guardado seguro y exportaciones coherentes.
**Prueba independiente**: elegir/cancelar/guardar/reabrir/exportar una pregunta y un recurso; confirmar conservación de calificación histórica, lectura, ilustración principal, preguntas y rúbrica.

- [x] T023 [P] [US3] Escribir primero pruebas de preparación, revisión obligatoria, cancelación y guardado versionado en `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.test.tsx` y `backend/tests/integration/test_motif_document_preservation.py` usando las rutas visuales existentes (FR-013, FR-014, FR-016, SC-006).
- [x] T024 [P] [US3] Escribir primero pruebas de PATCH decorativo, null/omitido/inválido, propiedad/rol, combinación transaccional y ausencia de reconstrucción académica en `backend/tests/integration/test_resource_motif_preservation.py`; incluir contenido genérico que intenta alterar `_presentacion` y recurso publicado/vinculado (FR-012, FR-015, FR-016).
- [x] T025 [US3] Integrar biblioteca → archivo → `uploadVisual` → propuesta revisada en `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.tsx`; conservar `recurso_id`, descripción/origen, control de versión y confirmación sin permitir URL libre (FR-013, FR-014, FR-016).
- [x] T026 [US3] Añadir contrato tipado `decoracion` y guardado solo de presentación en `backend/app/modules/herramientas/schemas.py` y `service.py`, manteniendo permisos de `router.py`, combinación atómica y protección del JSON reservado sin reconstruir rúbrica/preguntas ni sincronizar evaluaciones; cerrar T024 (FR-012, FR-015, FR-016).
- [x] T027 [US3] Integrar cabecera y envío de campos realmente modificados en `frontend/src/modules/herramientas/components/ResourceEditorPanel.tsx`, `MaterialContentEditor.tsx` y `api.ts`, con pruebas junto a esos componentes; ocultar campos reservados, conservar ilustración y aviso de publicación (FR-013, FR-015).
- [x] T028 [US3] Renderizar cabecera separada en `frontend/src/modules/herramientas/views/ContenidoView.tsx` y formatos existentes mediante `backend/app/modules/herramientas/pdf_render.py` y renderizador Word vigente si el tipo lo ofrece; resolver bytes locales, no URLs, y evitar derivados obsoletos sin regenerar contenido; probar en `backend/tests/unit/test_resource_motif_render.py` (FR-015, FR-016).
- [x] T029 [US3] Cerrar integración T023 con versión/nota histórica intacta y verificar PDF/Word disponibles para evaluación y recursos sintéticos, sin sustituir ilustración principal ni filtrar soluciones privadas, en `backend/tests/integration/test_motif_document_preservation.py` y `frontend/e2e/motif-library.spec.ts` (FR-014, FR-015, FR-016, SC-006).

## Fase final: Validación transversal y entrega

- [x] T030 Auditar responsive, teclado/foco, 44 px, cuatro anchos y ambos temas con Chromium/WebKit; medir doce miniaturas y ausencia de cargas de originales ajenos al contexto en `frontend/e2e/motif-library.spec.ts`, con resultados en `specs/123-motivos-por-area/quickstart.md` (FR-005, FR-010, SC-002, SC-004).
- [x] T031 Ejecutar TypeScript/lint/unitarias/builds frontend, backend unitario/integración aislada, E2E y contenedores aplicables; demostrar cero llamadas de generación y mutaciones académicas por decoración en `backend/tests/integration/test_resource_motif_preservation.py` y registrar evidencia real en `specs/123-motivos-por-area/quickstart.md` (FR-011, FR-012, SC-005).
- [x] T032 Actualizar `specs/system-inventory/current.json` y sus derivados mediante `scripts/build_system_inventory.py --write` cuando corresponda y ejecutar `tests/spec_governance/`; conservar documentos ajenos y registrar comandos/resultados en `specs/123-motivos-por-area/quickstart.md`.
- [x] T033 Ejecutar Converge contra `specs/123-motivos-por-area/{spec,plan,tasks}.md`, añadir/cerrar únicamente pendientes demostrables y dejar evidencia de cantidad, revisión y presupuestos de los trescientos assets, sin marcarlos completos antes de existir.
- [x] T034 Preparar commit y PR propios enlazados al issue259, con `specs/123-motivos-por-area/quickstart.md` como evidencia; comprobar dependencias y CI requerido, sin fusionar/desplegar ni afirmar cambios en producción.

## Dependencias y oportunidades paralelas

- Preparación T001–T002 → fundamentos T003–T006 → selector de Historia1 T018 → integración de Historia2 T019–T022 e Historia3 T023–T029 con catálogo local revisado. La producción de los diez lotes T007–T016 continúa de forma independiente; T017, validación final T030–T034 y entrega requieren las trescientas imágenes completas, no una muestra.
- T003/T004 pueden escribirse sin interferir. Con el contrato del selector implementado, los tests T023/T024 son independientes de completar cada lote visual. T025/T026 afectan módulos distintos; T027/T028 dependen de T026 y deben coordinar sus contratos. Esta separación permite validar conservación de datos antes de completar la producción de imágenes; no reduce cantidades ni controles de entrega.
- Los lotes de imágenes son reanudables por manifiesto y se procesarán de forma controlada, un motivo por llamada, sin reintentos ilimitados ni múltiples agentes de generación. Las oportunidades `[P]` no autorizan delegación de agentes por sí mismas.
- Dentro de cada historia: pruebas antes de código; un fallo de preservación o permisos bloquea continuar con ese flujo. Ninguna tarea comparte datos de alumnos con generadores.

## Estrategia y alcance mínimo

Primer incremento comprobable: catálogo común y selector de Historia1. No se presenta como entrega completa hasta integrar fichas y ambos editores con sus pruebas. No publicar áreas vacías ni placeholders para aparentar treinta motivos. Las historias2/3 usan el mismo catálogo: nunca trescientas imágenes adicionales por consumidor.

## Trazabilidad resumida

| Requisitos | Tareas principales |
| --- | --- |
| FR-001, FR-002, FR-003, FR-006, FR-007 | T002, T003, T007–T017 |
| FR-004, FR-005, FR-010 | T004, T006, T018, T020, T030 |
| FR-008, FR-009 | T017, T019–T022 |
| FR-011, FR-012 | T002, T007–T016, T019–T022, T024, T026, T031 |
| FR-013 | T006, T018, T021, T025, T027 |
| FR-014 | T023, T025, T029 |
| FR-015 | T024, T026–T029 |
| FR-016 | T003, T005, T023–T026, T028–T029 |
| SC-001, SC-002, SC-003, SC-004, SC-005, SC-006 | T017, T018, T022, T029, T030, T031 |

## Phase 6: Convergence

- [x] T035 Estabilizar y demostrar las regresiones existentes de publicación, copia e impresión en WebKit de escritorio en `frontend/e2e/feedback-delivery-batch.spec.ts`, manteniendo clics reales, aserciones y tiempos originales; documentar el resultado de la suite completa en `specs/123-motivos-por-area/quickstart.md` antes del PR, per FR-010, FR-012, SC-005 y T031 (partial, MEDIUM).

## Phase 7: Convergence

- [x] T036 Implementar y validar localmente la partición de las406pruebas E2E dentro del presupuesto de CI en `.github/workflows/ci.yml`; preservar los contextos requeridos general/contextual y el agregado final, sin aumentar timeouts, omitir casos ni aceptar particiones fallidas/saltadas; ampliar `tests/spec_governance/test_visual_ci_gates.py` y demostrar que las particiones cubren el conjunto completo sin duplicados. Registrar el diagnóstico y la validación en `specs/123-motivos-por-area/quickstart.md`, per Constitution VII, T031 y T034 (partial, HIGH). Reparación autorizada el2026-10-24; la ejecución remota completa sigue siendo condición obligatoria de fusión, no se sustituye por la enumeración local.
