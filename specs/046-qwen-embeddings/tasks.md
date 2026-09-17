# Tareas: Qwen Embedding institucional

**Issue**: #92

## Fase 1: Preparación

- [x] T001 Registrar la especificación 046 y su propiedad en el índice y gobierno Spec Kit. (FR-009, FR-012)
- [x] T002 [P] Añadir pruebas del cliente, saneamiento y validación dimensional. (FR-005, FR-010)
- [x] T003 [P] Añadir pruebas de persistencia y búsqueda del mismo espacio semántico. (FR-003, FR-004)

## Fase 2: Fundamentos

- [x] T004 Implementar el cliente privado de embeddings Ollama. (FR-001, FR-002, FR-010)
- [x] T005 Implementar resultado tipado, resolución Qwen/OpenAI y validación de 1024 dimensiones. (FR-001, FR-003, FR-005, FR-008)
- [x] T006 Crear la migración reversible y registrar el catálogo institucional. (FR-004, FR-005, FR-009, FR-011)

## Fase 3: Recuperación semántica

- [x] T007 Persistir vector y metadatos coherentes durante la ingesta. (FR-003, FR-004, FR-005)
- [x] T008 Consultar exclusivamente proveedor, modelo, dimensión y versión compatibles. (FR-003, FR-005)
- [x] T009 Integrar la carga curricular con el contrato común de embeddings. (FR-003, FR-006)

## Fase 4: Degradación segura

- [x] T010 Cubrir caída, dimensión inválida y fallo vectorial sin fabricar contexto ni bloquear calificación. (FR-007, FR-010)

## Fase 5: Administración y reindexación

- [x] T011 Registrar proveedor, modelo y ruta efectivos en el panel administrativo. (FR-008, FR-009)
- [x] T012 Añadir reindexación recuperable que conserva fuentes y textos. (FR-006, FR-011)
- [x] T013 Añadir servicio limitado y carga reproducible del modelo en Docker. (FR-002, FR-012)

## Fase 6: Verificación

- [x] T014 Ejecutar pruebas focalizadas, Ruff, migración upgrade/downgrade, Compose e inventario. (FR-005, FR-007, FR-011, FR-012)
- [x] T015 Ejecutar Analyze/Converge, abrir PR enlazado a #92 y esperar CI verde. (FR-009, FR-012)
- [x] T016 Desplegar desde `main`, cargar Qwen en el VPS y medir una consulta caliente sin datos sensibles. (FR-001, FR-002, FR-012)

## Dependencias

- T004-T006 dependen de T002-T003.
- T007-T010 dependen de T004-T006.
- T011-T013 dependen del contrato efectivo de T005-T006.
- T014-T016 dependen de todas las tareas anteriores.

## Estrategia

El MVP es T001-T010: Qwen genera y recupera contexto compatible, mientras una caída mantiene la calificación. La administración, reindexación y despliegue completan la operación sostenible.
