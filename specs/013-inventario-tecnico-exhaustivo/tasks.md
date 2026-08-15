# Tareas: Inventario técnico exhaustivo

## Fase 1: Preparación

- [X] T001 Crear la estructura scripts/system_inventory y specs/system-inventory descrita en specs/013-inventario-tecnico-exhaustivo/plan.md (FR-001, FR-014)
- [X] T002 Definir ownership, excepciones y overrides en specs/system-inventory/ownership.json, specs/system-inventory/exceptions.json y specs/system-inventory/permission-overrides.json (FR-007, FR-010, FR-016)
- [X] T003 [P] Crear fixtures sintéticos seguros en tests/spec_governance/fixtures/system_inventory para Python y TypeScript (FR-012)
- [X] T004 [P] Añadir helpers de pruebas del inventario en tests/spec_governance/conftest.py (FR-008, FR-013)

## Fase 2: Fundamentos

- [X] T005 Implementar el modelo canónico y claves estables en scripts/system_inventory/model.py (FR-001–FR-008)
- [X] T006 [P] Implementar carga y validación de ownership, excepciones y overrides de permiso en scripts/system_inventory/config.py (FR-007, FR-010, FR-012, FR-016)
- [X] T007 [P] Implementar lectura limitada de fuentes y source_digest determinista en scripts/system_inventory/sources.py (FR-012, FR-013)
- [X] T008 Crear pruebas del modelo, configuración, overrides y límites de lectura en tests/spec_governance/test_system_inventory_foundation.py (FR-007, FR-010, FR-012, FR-013, FR-016)

## Fase 3: Historia 1 - Encontrar propietario y cobertura

**Objetivo**: extraer todas las superficies y presentar propietario, permisos, estados y pruebas.

**Prueba independiente**: cualquier superficie de los fixtures obtiene clave canónica, propietario único y cobertura explícita.

- [X] T009 [P] [US1] Crear pruebas de extracción de endpoints y permisos backend en tests/spec_governance/test_system_inventory_backend.py (FR-001, FR-002, FR-016)
- [X] T010 [P] [US1] Crear pruebas de rutas, guardas y llamadas frontend en tests/spec_governance/test_system_inventory_frontend.py (FR-003, FR-004, FR-016)
- [X] T011 [P] [US1] Crear pruebas de tablas, estados, relaciones y jobs en tests/spec_governance/test_system_inventory_data_jobs.py (FR-005, FR-006)
- [X] T012 [US1] Implementar extractor AST de routers backend en scripts/system_inventory/backend.py (FR-001, FR-002, FR-016)
- [X] T013 [P] [US1] Implementar extractor acotado del árbol de rutas y clientes frontend en scripts/system_inventory/frontend.py (FR-003, FR-004, FR-016)
- [X] T014 [P] [US1] Implementar extractores de modelos, enums, migraciones y Celery en scripts/system_inventory/data_jobs.py (FR-005, FR-006)
- [X] T015 [US1] Implementar asignación de propiedad y evidencia de pruebas en scripts/system_inventory/ownership.py (FR-007, FR-008)
- [X] T016 [US1] Implementar render atómico JSON y Markdown por dominio en scripts/system_inventory/render.py (FR-014, FR-015)
- [X] T017 [US1] Implementar modo --write sin salidas parciales en scripts/build_system_inventory.py y generar specs/system-inventory/current.json (FR-001–FR-008, FR-014, FR-015)

## Fase 4: Historia 2 - Detectar deriva

**Objetivo**: impedir que superficies estructurales cambien sin actualizar inventario y propiedad.

**Prueba independiente**: una superficie agregada, eliminada o modificada en un fixture hace fallar --check con mensaje accionable.

- [X] T018 [P] [US2] Crear pruebas de deriva, diagnóstico y escritura atómica en tests/spec_governance/test_system_inventory_drift.py (FR-009, FR-015)
- [X] T019 [P] [US2] Crear pruebas de determinismo y comparación entre plataformas en tests/spec_governance/test_system_inventory_determinism.py (FR-013)
- [X] T020 [US2] Implementar comparación estructural y diagnósticos en scripts/system_inventory/validate.py (FR-009, FR-013)
- [X] T021 [US2] Implementar modo --check sin escrituras en scripts/build_system_inventory.py (FR-009, FR-013)
- [X] T022 [US2] Integrar --check y sus pruebas en .github/workflows/spec-governance.yml (FR-009, FR-013)

## Fase 5: Historia 3 - Registrar inconsistencias sin alterar producción

**Objetivo**: convertir ambigüedades y posibles superficies muertas en hallazgos auditables.

**Prueba independiente**: un permiso discordante o excepción inválida queda visible y bloquea según severidad sin modificar código de aplicación.

- [X] T023 [P] [US3] Crear pruebas de excepciones y hallazgos en tests/spec_governance/test_system_inventory_findings.py (FR-010, FR-011)
- [X] T024 [US3] Implementar validación de excepciones y hallazgos en scripts/system_inventory/findings.py (FR-010, FR-011)
- [X] T025 [US3] Generar las once vistas de dominio desde specs/002-arquitectura-roles-seguridad/inventory.md hasta specs/012-ia-jobs-produccion/inventory.md (FR-014)
- [X] T026 [US3] Registrar como issues separados los hallazgos críticos o altos detectados y enlazarlos desde specs/system-inventory/current.json (FR-011)
- [X] T027 [US3] Enlazar cada inventario de dominio desde su spec.md y actualizar specs/README.md (FR-014)

## Fase final: Validación y gobernanza

- [X] T028 Actualizar tests/spec_governance/test_spec_baseline.py para incluir 013 sin convertirla en dominio propietario (FR-014)
- [X] T029 Ejecutar dos generaciones consecutivas y documentar cero deriva en specs/013-inventario-tecnico-exhaustivo/quickstart.md (FR-013)
- [X] T030 Ejecutar python -m pytest tests/spec_governance -q y git diff --check (FR-008–FR-014)
- [X] T031 Ejecutar suites backend, frontend y builds aplicables y registrar evidencia en el PR (FR-011, FR-012)
- [X] T032 Ejecutar speckit-converge y cerrar únicamente tareas realmente completadas (FR-001–FR-014)

## Dependencias

- T001–T008 bloquean todas las historias.
- Historia 1 bloquea Historia 2 porque --check compara la salida canónica.
- Historia 1 bloquea Historia 3 porque hallazgos y excepciones referencian superficies extraídas.
- T022 depende de T018–T021.
- T025–T027 dependen de T015–T017 y T024.
- La fase final depende de las tres historias.

## Paralelismo

- T003 y T004 pueden ejecutarse en paralelo.
- T006 y T007 pueden ejecutarse en paralelo después de T005.
- T009, T010 y T011 pueden escribirse en paralelo.
- T013 y T014 pueden implementarse en paralelo después de T012/T005.
- T018 y T019 pueden escribirse en paralelo.
- T023 puede prepararse mientras se completa la validación de deriva.

## Estrategia incremental

1. MVP: Fundamentos + Historia 1 para producir un inventario navegable.
2. Añadir Historia 2 para convertirlo en gate automático.
3. Añadir Historia 3 para gestionar deuda e inconsistencias.
4. Validar en CI y documentar evidencia antes del merge.
## Fase 6: Convergencia

- [X] T033 [US1] Resolver vista, guarda y roles de cada ruta desde el árbol real de frontend en scripts/system_inventory/frontend.py y sus pruebas per FR-003 (partial)
- [X] T034 [US1] Vincular cada llamada frontend con el endpoint backend canónico que consume y probar contratos coincidentes o ausentes per FR-004 (partial)
- [X] T035 [US1] Inventariar identidad, índices, estados de enums y distinguir tablas activas de históricas de migración en scripts/system_inventory/data_jobs.py per FR-005 (partial)
- [X] T036 [US1] Inventariar disparadores beat, estados terminales, reintentos y evidencia de idempotencia de jobs en scripts/system_inventory/data_jobs.py per FR-006 (partial)
- [X] T037 [US3] Detectar routers, pantallas o tablas aparentemente no alcanzables y registrarlos como candidatos auditables sin eliminarlos per FR-011 (partial)
