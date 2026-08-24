# Tareas: Recursos y calificación fluida

## Fase 1: Preparación

- [X] T001 Actualizar la trazabilidad del módulo y del issue #24 en specs/README.md y specs/018-recursos-calificacion-fluida/
- [X] T002 Registrar fixtures sanitizados de recurso borrador, foto legible, foto ambigua y calificación de veinte componentes en backend/tests/fixtures/ y frontend/src/test/
- [X] T003 [P] Añadir utilidades de tiempo controlado y proveedores simulados en backend/tests/fixtures/ai_pipeline.py
- [X] T004 [P] Inventariar y preservar pruebas vigentes de recursos y calificación en backend/tests/unit/test_tools.py, backend/tests/unit/test_grading_orchestrator.py y frontend/src/modules/calificaciones/

## Fase 2: Fundamentos

- [X] T005 Añadir campos aditivos de visibilidad, recepción y timings a backend/app/modules/herramientas/schemas.py, backend/app/modules/jobs/schemas.py y frontend/src/types/api.ts
- [X] T006 Definir presupuestos configurables y límites por etapa en backend/app/core/config.py y backend/.env.example
- [X] T007 Normalizar etapas e intentos únicos de telemetría en backend/app/modules/analytics/usage_logger.py y backend/app/modules/calificaciones/agents.py
- [X] T008 [P] Crear pruebas de contrato y privacidad de telemetría en backend/tests/unit/test_ai_usage_pipeline.py
- [X] T009 [P] Crear pruebas de autorización profesor/estudiante para recursos asociados, ocultos y evaluativos en backend/tests/integration/test_resource_assignment_access.py
- [X] T010 Verificar patrones de exclusión de secretos y artefactos en .gitignore, .dockerignore, backend/.dockerignore y frontend/eslint.config.js

## Fase 3: Historia 1 - Asignar un recurso sin perder su contexto

**Meta**: El recurso aparece en la materia seleccionada desde que se genera y luego se administra como borrador, apoyo o actividad sin duplicarse.

**Prueba independiente**: Generar con materia, comprobar mismo id en biblioteca/materia, publicar/ocultar apoyo, convertir una vez y controlar visibilidad/recepción de la actividad.

- [X] T011 [US1] Ampliar list_materials_for_materia para incluir borradores, apoyos y actividades según rol en backend/app/modules/herramientas/service.py
- [X] T012 [US1] Exponer recepción y estado vinculado sin copiar datos en backend/app/modules/herramientas/service.py y backend/app/modules/herramientas/schemas.py
- [X] T013 [US1] Añadir visibilidad genérica idempotente y autorización a backend/app/modules/herramientas/router.py y backend/app/modules/herramientas/service.py
- [X] T014 [US1] Sincronizar publicación/ocultamiento del material vinculado y guardas estudiantiles en backend/app/modules/evaluaciones/service.py y backend/app/modules/evaluaciones/router.py
- [X] T015 [US1] Cubrir asociación inmediata, listado por rol, no duplicación y estados independientes en backend/tests/unit/test_tools.py y backend/tests/integration/test_resource_assignment_access.py
- [X] T016 [P] [US1] Ampliar llamadas y tipos de ciclo de vida en frontend/src/modules/herramientas/api.ts y frontend/src/types/api.ts
- [X] T017 [US1] Mostrar decisión de borrador/apoyo/actividad después de generar en frontend/src/modules/herramientas/GeneratePage.tsx y frontend/src/modules/herramientas/DetailPage.tsx
- [X] T018 [US1] Mostrar borradores y actividades con acciones coherentes en frontend/src/modules/materias/MateriaRecursos.tsx y frontend/src/modules/herramientas/ListPage.tsx
- [X] T019 [US1] Añadir pruebas de generación, asignación, visibilidad y controles enlazados en frontend/e2e/resources-creation.spec.ts, frontend/src/modules/herramientas/ListPage.test.tsx y frontend/src/modules/materias/MateriaRecursos.test.tsx

## Fase 4: Historia 2 - Calificar y digitalizar en un tiempo útil

**Meta**: Una imagen típica se procesa en segundo plano con una lectura visual, valoración verificable, telemetría segura y sin descartar respuestas por duración.

**Prueba independiente**: Simular éxito, timeout secundario, 5xx y respuesta tardía; comprobar una entidad, resultado terminal y equivalencia de nota.

- [X] T020 [US2] Añadir protección de transporte, telemetría y un intento por candidato al cliente en backend/app/modules/calificaciones/agents.py
- [X] T021 [US2] Separar extracción visual normalizada de evaluadores textuales paralelos en backend/app/modules/calificaciones/orchestrator.py
- [X] T022 [US2] Conservar contraste independiente, revisión por fallo real y consolidación determinística en backend/app/modules/calificaciones/orchestrator.py y backend/app/modules/calificaciones/breakdown_policy.py
- [X] T023 [US2] Optimizar digitalización para OCR único, estructuración textual y reparación dirigida en backend/app/modules/evaluaciones/digitalize_service.py
- [X] T024 [US2] Registrar timings_ms, fallbacks y terminal_reason sin contenido en backend/app/modules/jobs/service.py y backend/app/workers/tasks_digitalization.py
- [X] T025 [US2] Aplicar límites recuperables a trabajos de calificación en backend/app/workers/tasks_grading.py y backend/app/workers/worker.py
- [X] T026 [P] [US2] Mostrar etapas y duración segura en frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx y frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx
- [X] T027 [US2] Probar transporte, respuesta tardía, fallback, idempotencia y privacidad en backend/tests/unit/test_grading_orchestrator.py, backend/tests/unit/test_evaluation_digitalization.py y backend/tests/unit/test_ai_usage_pipeline.py
- [X] T028 [US2] Ejecutar regresión de componentes y nota con fixtures sanitizados en backend/tests/integration/test_explainable_grading_pipeline.py
- [X] T029 [US2] Documentar medición antes/después y consulta agregada segura en specs/018-recursos-calificacion-fluida/validation.md

## Fase 5: Historia 3 - Ajustar cada respuesta donde se revisa

**Meta**: El editor se abre dentro de la tarjeta, previsualiza nota y guarda con versión e historial sin perder posición.

**Prueba independiente**: Editar componente 10 de 20, guardar, provocar 409 y cambiar de componente con datos sin guardar.

- [X] T030 [P] [US3] Añadir previsualización determinística y estado sucio a frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx
- [X] T031 [US3] Renderizar GradeComponentEditor dentro del componente activo en frontend/src/modules/calificaciones/components/GradeBreakdown.tsx
- [X] T032 [US3] Retirar el editor inferior y preservar componente/scroll al invalidar consultas en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx
- [X] T033 [US3] Manejar guardar, descartar, permanecer y conflicto 409 sin sobrescritura en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx
- [X] T034 [US3] Cubrir edición contextual, previsualización, historial, dirty guard y conflicto en frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx, GradeBreakdown.test.tsx y frontend/e2e/explainable-grading.spec.ts

## Fase 6: Historia 4 - Revisar notas con desplazamiento confiable

**Meta**: Lista y detalle tienen un solo scroller alcanzable en móvil, tableta y escritorio, incluido iPhone con teclado.

**Prueba independiente**: Alcanzar primer/último estudiante y último componente, editar, volver y conservar filtros/posición en cinco tamaños.

- [X] T035 [P] [US4] Crear helper con cleanup para bloqueo del body y restauración de scroll en frontend/src/hooks/useBodyScrollLock.ts
- [X] T036 [US4] Reestructurar lista/detalle con un propietario de overflow por panel en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx
- [X] T037 [US4] Aplicar altura dinámica, safe-area, overscroll y acciones accesibles al panel/editor en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y frontend/src/styles/globals.css
- [X] T038 [P] [US4] Probar cleanup, restauración de filtros y teclado virtual en frontend/e2e/explainable-grading.spec.ts y frontend/src/hooks/useBodyScrollLock.test.ts
- [X] T039 [US4] Crear recorridos Playwright Chromium/WebKit en 360×800, 390×844, 768×1024 y escritorio en frontend/e2e/explainable-grading.spec.ts
- [X] T040 [US4] Añadir regresión visual y accesibilidad claro/oscuro en frontend/e2e/visual/grading-review.visual.spec.ts y frontend/e2e/accessibility/grading-review.a11y.spec.ts

## Fase final: Validación y documentación viva

- [X] T041 Actualizar especificaciones propietarias 006, 008, 012 y 016 e inventarios en specs/006-recursos-actividades/, specs/008-calificaciones/, specs/012-ia-jobs-produccion/ y specs/016-calificacion-explicable/
- [X] T042 Ejecutar pytest dirigido y completo dentro del contenedor backend y corregir regresiones
- [X] T043 Ejecutar npm run lint, npm run typecheck, npm run test:run y npm run build en frontend/
- [X] T044 Ejecutar Playwright funcional, WebKit, accesibilidad y visual para recursos y revisión responsive en frontend/
- [X] T045 Validar Docker Compose, health, ausencia de secretos y contrato OpenAPI en docker-compose.yml y specs/018-recursos-calificacion-fluida/contracts/
- [X] T046 Ejecutar speckit-converge, cerrar tareas restantes y actualizar specs/018-recursos-calificacion-fluida/validation.md

## Dependencias

- Fase 1 precede a Fundamentos.
- T005–T010 bloquean las historias.
- Historia 1 puede completarse independientemente de rendimiento, editor y scroll.
- Historia 2 depende de T006–T008; no depende de Historia 1.
- Historia 3 depende de contratos de desglose existentes y puede avanzar tras Fundamentos.
- Historia 4 debe integrar el resultado de Historia 3 para validar el editor definitivo.
- Validación final depende de las cuatro historias.

## Oportunidades paralelas

- T003 y T004.
- T008 y T009.
- T016 puede avanzar mientras se completan T011–T015.
- T026 puede avanzar después de definir el contrato de T024.
- T030 puede avanzar en paralelo con backend de Historia 2.
- T035 y T038 pueden avanzar antes de la reestructuración final.
- Pruebas backend/frontend de T042–T044 pueden ejecutarse en paralelo cuando el código esté estable.

## Estrategia

1. Entregar primero Historia 1 como incremento funcional visible.
2. Activar Historia 2 detrás de configuración conservadora y comparar contra fixtures antes de reemplazar el pipeline vigente.
3. Integrar edición contextual y después resolver scroll sobre el árbol definitivo.
4. No fusionar si calidad de nota, autorización, idempotencia o WebKit regresan.


## Fase 7: Convergencia

- [X] T047 Impedir que asignar como apoyo o convertir en actividad cambie silenciosamente la materia original; bloquear el selector cuando exista materia, rechazar clientes divergentes con 409 y cubrir UI/backend per FR-002, FR-004 y caso límite de cambio de materia (partial, HIGH)
- [X] T048 [US2] Mantener `qwen3.7-plus` como extractor principal, sustituir el segundo grader Pro obligatorio por verificación Flash compacta, invocar Pro solo como árbitro ante discrepancia/baja confianza/fallo, limitar salida por etapa y cubrir camino rápido/arbitraje/telemetría en backend/app/modules/calificaciones/, backend/app/core/config.py, backend/.env.example y backend/tests/unit/
- [X] T049 [US2] No cancelar inferencias aceptadas por duración: esperar lectura de OpenCode, conservar conexión/escritura/pool protegidos, mantener jobs asíncronos recuperables, optimizar payload visual y probar respuesta posterior al antiguo deadline en backend/frontend/specs.
- [X] T050 [US4] Evitar eventos React anulados en DBA y actividades interactivas, auditar las siete pestañas de una materia y añadir regresión de escritura/navegación en frontend/src/modules/materias/MateriaDbaPage.tsx, frontend/src/modules/evaluaciones/StudentActivityPlayer.tsx, frontend/scripts/audit-actions.mjs y frontend/e2e/p2-responsive.spec.ts (FR-028, FR-032).
- [X] T051 [US4] Permitir que la rueda usada sobre el panel derecho de calificaciones desplace el contenido en escritorio, sin romper el scroller único del overlay móvil, y cubrirlo en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y frontend/e2e/explainable-grading.spec.ts (FR-028, FR-031, SC-011).
- [X] T052 [US4] Ampliar y simplificar la edición de preguntas: modal ancho, una sola columna, Xali plegable sin reducir el editor, un solo scroll y campos principales responsivos en frontend/src/modules/evaluaciones/components/GenerationWizard.tsx y GenerationWizard.test.tsx (FR-028, FR-031).
- [X] T053 [US4] Convertir la rúbrica generada en un borrador editable con criterios, descriptores, pesos totalizados, orden y persistencia dentro del wizard en generationWizardModel.ts, GenerationWizard.tsx y sus pruebas (FR-032, FR-036, SC-016).

## Trazabilidad de requisitos

- Recursos y permisos, T011–T019 y T047: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010.
- Pipeline y observabilidad, T020–T029 y T048–T049: FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-032, FR-033, FR-034, FR-035.
- Edición contextual, T030–T034: FR-021, FR-022, FR-023, FR-024, FR-025, FR-026.
- Scroll y experiencia responsive, T035–T040 y T050–T052: FR-027, FR-028, FR-029, FR-030, FR-031, FR-032.
- Rúbrica editable, T053: FR-032, FR-036 y SC-016.
