# Tareas: Criterios de aprendizaje desde material docente

## Fase 1: Preparación

- [X] T001 Registrar la fase 042, el issue #19 y sus superficies previstas en `specs/README.md` y `specs/system-inventory/ownership.json`
- [X] T002 Añadir las banderas `CRITERIA_WRITE`, `CRITERIA_GENERATION`, `CRITERIA_UI`, `CRITERIA_GRADING_CONTEXT` y `CRITERIA_GRADING_AUTHORITY` desactivadas por defecto en `backend/app/core/config.py` y `backend/.env.example`
- [X] T003 [P] Definir tipos frontend compatibles y campos opcionales para conjuntos, versiones, fuentes, aplicaciones y criterios de desglose en `frontend/src/types/api.ts`
- [X] T004 [P] Crear el paquete del dominio con inicializadores vacíos en `backend/app/modules/criterios_aprendizaje/__init__.py` y `backend/app/modules/criterios_aprendizaje/router.py`

## Fase 2: Fundamentos

- [ ] T005 Escribir pruebas PostgreSQL de migración y backfill idempotente que preserven DBA, evaluación publicada/cerrada, blueprint, nota, desglose y PQRS en `backend/tests/integration/test_learning_criteria_migration.py`
- [X] T006 [P] Escribir pruebas de modelos para estados, versión aprobada inmutable, pesos Decimal y relaciones restrictivas en `backend/tests/unit/test_learning_criteria_models.py`
- [X] T007 [P] Escribir matriz de autorización 401/403/404/dueño/admin y aislamiento de fuentes privadas en `backend/tests/unit/test_learning_criteria_authorization.py`
- [X] T008 Crear modelos de conjuntos, versiones, criterios, niveles/fuentes, aplicaciones y relación con componentes en `backend/app/modules/criterios_aprendizaje/models.py`
- [X] T009 Crear migración aditiva, restricciones, índices y backfill idempotente con hash canónico en `backend/alembic/versions/202609130001_learning_criteria.py`
- [X] T010 Registrar los modelos sin reemplazar entidades DBA y exponer el router canónico en `backend/app/db/base.py` y `backend/app/api.py`
- [X] T011 Implementar políticas de ámbito por materia/propietario, permisos de lectura/gestión y serialización privada en `backend/app/modules/criterios_aprendizaje/authorization.py`
- [X] T012 Implementar snapshots canónicos, hashing, clonación de versión y adaptador legado `criterios`/`dba_ids` en `backend/app/modules/criterios_aprendizaje/compatibility.py`
- [X] T013 Añadir eventos auditables de creación, aprobación, sustitución, aplicación y archivado sin contenido sensible en `backend/app/modules/criterios_aprendizaje/audit.py`
- [ ] T014 Ejecutar las pruebas fundacionales y corregir únicamente regresiones de esta fase en `backend/tests/integration/test_learning_criteria_migration.py` y `backend/tests/unit/test_learning_criteria_*.py`

## Fase 3: Historia 1 — Construir criterios desde lo enseñado (P1)

**Objetivo**: crear un borrador manual o asistido desde fotos, PDF, documento, texto, material existente o estándar oficial, sin exigir IA ni DBA.

**Prueba independiente**: un profesor crea criterios manuales sin fuente y otro borrador con dos fotos ordenadas; un profesor ajeno y un estudiante no pueden leer sus referencias.

- [X] T015 [P] [US1] Escribir pruebas de contratos CRUD manual, fuentes y errores atómicos según FR-001–FR-005 y FR-018–FR-020 en `backend/tests/unit/test_learning_criteria_api.py`
- [X] T016 [P] [US1] Escribir pruebas de carga multihoja, PDF/DOCX/texto, orden, rotación, deduplicación, límites y limpieza transaccional en `backend/tests/unit/test_learning_source_service.py`
- [X] T017 [P] [US1] Escribir pruebas de propuesta idempotente, contexto insuficiente, fallo recuperable y proveedor intercambiable en `backend/tests/unit/test_learning_criteria_generation.py`
- [X] T018 [US1] Implementar esquemas de entrada/salida, errores estructurados e intención docente en `backend/app/modules/criterios_aprendizaje/schemas.py`
- [X] T019 [US1] Implementar CRUD de conjunto y borrador manual con paginación y archivado lógico en `backend/app/modules/criterios_aprendizaje/service.py`
- [X] T020 [US1] Generalizar preparación multihoja sin semántica estudiantil y persistir archivos docentes privados en `backend/app/services/document_bundle_service.py` y `backend/app/modules/criterios_aprendizaje/source_service.py`
- [X] T021 [US1] Implementar fuentes de texto, material existente y estándar oficial sin copiar contenido innecesario en `backend/app/modules/criterios_aprendizaje/source_service.py`
- [X] T022 [US1] Implementar extracción y propuesta estructurada con procedencia por fuente/página y alertas de cobertura en `backend/app/modules/criterios_aprendizaje/generation_service.py`
- [X] T023 [US1] Crear tarea Celery recuperable e idempotente que conserve borrador y archivos ante fallo en `backend/app/workers/tasks_learning_criteria.py` y registrarla en `backend/app/workers/worker.py`
- [X] T024 [US1] Implementar endpoints de conjuntos, fuentes y propuesta asíncrona descritos en `backend/app/modules/criterios_aprendizaje/router.py`
- [X] T025 [US1] Añadir cliente React Query para conjuntos, fuentes, propuesta y jobs en `frontend/src/modules/materias/criterios/api.ts` y `frontend/src/config/queryKeys.ts`
- [X] T026 [US1] Extraer el núcleo reutilizable de cámara/orden/rotación del selector multihoja y crear `LearningSourcePicker` sin compartir evidencia estudiantil en `frontend/src/components/evidence/MultiPageEvidencePicker.tsx` y `frontend/src/modules/materias/criterios/LearningSourcePicker.tsx`
- [X] T027 [US1] Crear los pasos “Material de referencia” e “Intención docente” con alternativa manual/sin material en `frontend/src/modules/materias/criterios/LearningCriteriaWizard.tsx`
- [ ] T028 [US1] Validar Historia 1 con pruebas backend/frontend focales y documentar tiempos de aceptación del job en `specs/042-criterios-aprendizaje/quickstart.md`

## Fase 4: Historia 2 — Revisar criterios y rúbrica antes de usarlos (P1)

**Objetivo**: editar criterios, evidencia, niveles, pesos y orden; aprobar una versión válida y crear otra sin mutar la anterior.

**Prueba independiente**: v1 aprobada queda de solo lectura; editar crea v2; pesos inválidos y cobertura bloqueante impiden aprobación.

- [X] T029 [P] [US2] Escribir pruebas backend de validación, aprobación, bloqueo, clonación y concurrencia optimista en `backend/tests/unit/test_learning_criteria_versions.py`
- [X] T030 [P] [US2] Escribir pruebas de editor para agregar, duplicar, ordenar, eliminar, editar niveles/evidencia y validar 100 % en `frontend/src/modules/materias/criterios/LearningCriteriaEditor.test.tsx`
- [X] T031 [US2] Implementar actualización transaccional, `etag`/versión esperada, aprobación y clonación inmutable en `backend/app/modules/criterios_aprendizaje/service.py`
- [X] T032 [US2] Implementar endpoints de editar, aprobar y crear versión con conflictos 409 y bloqueos 422 en `backend/app/modules/criterios_aprendizaje/router.py`
- [X] T033 [US2] Reutilizar y ampliar el editor de rúbrica con evidencia esperada, duplicación, procedencia y cobertura en `frontend/src/modules/materias/criterios/LearningCriteriaEditor.tsx`
- [X] T034 [US2] Implementar resumen, barra de pesos, advertencias y aprobación explícita “La IA propone; tú decides” en `frontend/src/modules/materias/criterios/LearningCriteriaWizard.tsx`
- [X] T035 [US2] Implementar lista con búsqueda/filtros, estados, versiones, fuentes, usos y acciones reales en `frontend/src/modules/materias/criterios/LearningCriteriaPage.tsx`
- [X] T036 [US2] Validar Historia 2 con pruebas focales y demostrar que v1 no cambia al crear/editar v2 en `backend/tests/unit/test_learning_criteria_versions.py`

## Fase 5: Historia 3 — Aplicar criterios a evaluaciones y recursos (P1)

**Objetivo**: aplicar únicamente una versión aprobada, conservar snapshot exacto y mantener los contratos heredados.

**Prueba independiente**: una evaluación y un recurso reciben v1; crear v2 no modifica sus snapshots ni una nota ya existente.

- [X] T037 [P] [US3] Escribir pruebas de aplicación a evaluación/blueprint, compatibilidad sin campo nuevo y prohibición entre materias en `backend/tests/unit/test_learning_criteria_evaluation_application.py`
- [X] T038 [P] [US3] Escribir pruebas de aplicación a material de apoyo/recurso evaluativo y visibilidad explícita de fuentes en `backend/tests/unit/test_learning_criteria_resource_application.py`
- [ ] T039 [P] [US3] Escribir pruebas frontend de selector aprobado, generación libre, histórico DBA y recurso tipo rúbrica sin opción redundante en `frontend/src/modules/evaluaciones/components/LearningCriteriaSelector.test.tsx` y `frontend/src/modules/herramientas/forms/LearningCriteriaSelector.test.tsx`
- [X] T040 [US3] Implementar aplicación y snapshot inmutables con dual-write compatible en `backend/app/modules/criterios_aprendizaje/application_service.py`
- [X] T041 [US3] Añadir el campo opcional de versión y congelar la aplicación en evaluación/blueprint sin reescribir históricos en `backend/app/modules/evaluaciones/schemas.py` y `backend/app/modules/evaluaciones/service.py`
- [X] T042 [US3] Integrar aplicaciones en recursos de apoyo/evaluativos y conversión a evaluación en `backend/app/modules/herramientas/schemas.py`, `backend/app/modules/herramientas/service.py` y `backend/app/modules/herramientas/evaluation_adapter.py`
- [X] T043 [US3] Crear selector reutilizable de versiones aprobadas y compatibilidad visual con DBA históricos en `frontend/src/modules/evaluaciones/components/LearningCriteriaSelector.tsx`
- [X] T044 [US3] Integrar el selector y reordenar fuente→intención→criterios→preguntas→confirmación en `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` y `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`
- [ ] T045 [US3] Sustituir la selección paralela DBA/rúbrica en recursos, conservar adaptador legado y eliminar redundancia del recurso rúbrica en `frontend/src/modules/herramientas/forms/base.tsx` y `frontend/src/modules/herramientas/forms/tools.tsx`
- [ ] T046 [US3] Mostrar título/versión aplicada y traducir DBA histórico como “Estándar oficial” en `frontend/src/modules/herramientas/DetailPage.tsx` y `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`
- [ ] T047 [US3] Validar Historia 3 y comparar snapshots/fórmula legacy versus nueva con autoridad nueva desactivada en `backend/tests/unit/test_learning_criteria_evaluation_application.py`

## Fase 6: Historia 4 — Comprender cada puntaje (P1)

**Objetivo**: relacionar cada valoración con criterios versionados sin crear una segunda fórmula y conservar ajustes auditables.

**Prueba independiente**: evidencia con varios criterios produce una sola suma; cada componente explica máximo/otorgado/motivo y una fuente insuficiente fuerza revisión manual.

- [X] T048 [P] [US4] Escribir pruebas de mapeo criterio→componente, no duplicación, redondeo, revisión manual y regresión legacy en `backend/tests/unit/test_learning_criteria_breakdown.py`
- [X] T049 [P] [US4] Escribir pruebas UI de criterio/versión/procedencia, campos opcionales históricos y ajuste docente en `frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx`
- [X] T050 [US4] Extender el scaffold/persistencia del desglose para mapear criterios por clave estable sin cambiar la fórmula vigente en `backend/app/modules/calificaciones/breakdown_policy.py` y `backend/app/modules/calificaciones/breakdown_service.py`
- [X] T051 [US4] Incorporar la aplicación aprobada al contexto solo bajo `CRITERIA_GRADING_CONTEXT` y mantener `CRITERIA_GRADING_AUTHORITY=false` en `backend/app/modules/calificaciones/orchestrator.py`
- [X] T052 [US4] Persistir relación criterio-componente, procedencia y ajuste manual auditado en `backend/app/modules/calificaciones/breakdown_service.py`
- [X] T053 [US4] Exponer criterio, versión y procedencia de forma segura a profesor/estudiante en `backend/app/modules/calificaciones/schemas.py` y `backend/app/modules/calificaciones/router.py`
- [X] T054 [US4] Mostrar “Criterio aplicado”, puntos, explicación y fuente pertinente sin duplicar información en `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [X] T055 [US4] Migrar analítica de agrupación por nombre a conjunto/versión/clave con fallback histórico en `backend/app/modules/analytics/service.py`
- [ ] T056 [US4] Validar Historia 4 con nota, publicación, ajuste, historial y PQRS sin cambio de resultados anteriores en `backend/tests/unit/test_learning_criteria_breakdown.py`

## Fase 7: Historia 5 — Lenguaje claro y experiencia responsiva (P2)

**Objetivo**: convertir la pestaña DBA en la experiencia canónica, mantener enlaces heredados y medir trabajo docente real.

**Prueba independiente**: profesor completa el flujo en 360 px y escritorio; estudiante no ve administración ni fuentes; `/dba` conserva contexto y redirige.

- [X] T057 [P] [US5] Escribir pruebas de rutas, pestaña, alias `/dba`, permisos y vocabulario consistente en `frontend/src/modules/materias/LearningCriteriaNavigation.test.tsx`
- [ ] T058 [P] [US5] Escribir E2E para creación manual/asistida, claro/oscuro, 360/390/768/escritorio y privacidad estudiantil en `frontend/e2e/learning-criteria.spec.ts`
- [X] T059 [US5] Añadir ruta canónica `/criterios`, alias `/dba` y helper preservando query/hash en `frontend/src/router.tsx` y `frontend/src/config/routes.ts`
- [X] T060 [US5] Renombrar la pestaña a “Criterios de aprendizaje”, restringir administración al profesor y conservar lectura publicada para estudiante en `frontend/src/modules/materias/MateriaDetailPage.tsx`
- [X] T061 [US5] Reemplazar la vista DBA por la página canónica y mostrar “Estándares oficiales” como sección opcional en `frontend/src/modules/materias/criterios/LearningCriteriaPage.tsx` y `frontend/src/modules/materias/MateriaDbaPage.tsx`
- [X] T062 [US5] Aplicar el patrón fullscreen móvil, un solo scroll, objetivos táctiles y estados accesibles en `frontend/src/modules/materias/criterios/LearningCriteriaWizard.tsx`
- [ ] T063 [US5] Instrumentar sesión de preparación/revisión y pausar tiempo activo durante espera IA en `frontend/src/modules/materias/criterios/useLearningCriteriaWorkSession.ts` y `backend/app/modules/analytics/service.py`
- [ ] T064 [US5] Validar Historia 5 y registrar resultados de comprensión, responsividad y medición separada en `specs/042-criterios-aprendizaje/quickstart.md`

## Fase final: Convergencia, seguridad y despliegue progresivo

- [ ] T065 Ejecutar backfill dos veces y documentar paridad de UUID, snapshots, notas, desglose y PQRS en `specs/042-criterios-aprendizaje/quickstart.md`
- [ ] T066 [P] Añadir pruebas directas a las cinco superficies DBA sin cobertura y sus adaptadores de compatibilidad en `backend/tests/unit/test_dba_compatibility.py`
- [X] T067 [P] Validar que logs, errores, analytics y jobs no contienen texto de fuentes, imágenes, claves o URLs privadas en `backend/tests/unit/test_learning_criteria_privacy.py`
- [ ] T068 Ejecutar pytest/Ruff, TypeScript/ESLint/Vitest/build y Playwright focal, corregir regresiones atribuibles a 042 y registrar resultados en `specs/042-criterios-aprendizaje/quickstart.md`
- [ ] T069 Actualizar inventario, ejecutar dos comprobaciones deterministas y mapear todas las superficies nuevas a 042 en `specs/system-inventory/inventory.json` y `specs/system-inventory/summary.md`
- [X] T070 Ejecutar `$speckit-converge`, incorporar cualquier tarea faltante y completar `specs/042-criterios-aprendizaje/tasks.md`
- [ ] T071 Abrir PR enlazado a #19 y documentar en `specs/042-criterios-aprendizaje/quickstart.md` la secuencia canary que mantiene autoridad de calificación desactivada hasta paridad demostrada

## Dependencias

### Corrección transversal aprobada: navegación fluida (2026-09-16)

- [x] T072 Añadir regresiones de bloqueos superpuestos, desmontaje con diálogo abierto, StrictMode y cambio de viewport en las pruebas existentes de hook, Modal y AppShell.
- [x] T073 Centralizar bloqueo/restauración en `useBodyScrollLock`, reutilizarlo en `Modal` y `AppShell`, liberar el menú al navegar o pasar a escritorio y eliminar el scroll anidado de `RevisionGuide`.
- [x] T074 Ejecutar pruebas focales, TypeScript y lint de los archivos afectados; reproducir y verificar el caso real aislado en Playwright y registrar resultados en `quickstart.md`, sin modificar datos de producción.

### Simplificación guiada aprobada (2026-09-27)

- [x] T075 [P] [US5] Añadir pruebas del inicio en tres opciones, ayuda repetible y regreso a versiones existentes en `frontend/src/modules/materias/criterios/LearningCriteriaWizard.test.tsx` y `frontend/src/modules/materias/criterios/LearningCriteriaPage.test.tsx`
- [x] T076 [US5] Implementar «Definir qué voy a evaluar» y el inicio material/manual/reutilizar en `frontend/src/modules/materias/criterios/LearningCriteriaPage.tsx` y `frontend/src/modules/materias/criterios/LearningCriteriaWizard.tsx`
- [x] T077 [US2] Simplificar las tarjetas, plegar configuración avanzada y añadir distribución automática exacta en `frontend/src/modules/materias/criterios/LearningCriteriaEditor.tsx`
- [x] T078 [P] [US3] Mostrar una previsualización comprensible de la versión seleccionada y su futura relación con preguntas en `frontend/src/modules/evaluaciones/components/LearningCriteriaSelector.tsx`
- [x] T079 [P] [US4] Sincronizar estado pedagógico y puntaje parcial en el editor por respuesta, con regresión para 0.7/1, en `frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx` y `frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx`
- [x] T080 [US5] Integrar el recorrido de primera visita reutilizable y el botón «Ver guía» en `frontend/src/modules/materias/criterios/LearningCriteriaPage.tsx`
- [x] T081 [US5] Ejecutar pruebas focales, TypeScript, lint y Playwright móvil del recorrido guiado y registrar el resultado en `specs/042-criterios-aprendizaje/quickstart.md`

- Fase 1 → Fase 2: banderas, tipos y módulo deben existir antes del dominio.
- Fase 2 bloquea todas las historias: migración, permisos, snapshots y adaptador son la base segura.
- US1 → US2: se requiere borrador/fuentes antes de editar, proponer y aprobar.
- US2 → US3: solo una versión aprobada puede aplicarse.
- US3 → US4: el desglose necesita una aplicación/snapshot exactos.
- US1 y US2 permiten avanzar partes visuales de US5; la ruta definitiva se habilita después de permisos y compatibilidad.
- La fase final requiere US1–US5 completas y todas las banderas reversibles.

## Oportunidades paralelas

- T003 y T004 pueden ejecutarse mientras se prepara inventario T001/T002.
- T006 y T007 preparan pruebas independientes antes de T008–T013.
- En US1, T015–T017 son pruebas paralelas antes de servicios; T025 puede avanzar tras estabilizar esquemas.
- En US3, aplicaciones de evaluación, recurso y UI tienen pruebas paralelas T037–T039.
- En US4 y US5, backend y frontend de prueba pueden prepararse en paralelo sin editar los mismos archivos.

## Estrategia de entrega

El MVP seguro comprende Fases 1–4: dominio aditivo, creación manual/asistida y aprobación versionada, todavía sin autoridad sobre calificaciones. Después se habilita aplicación a evaluación/recurso en modo comparación, transparencia en el desglose y finalmente navegación/medición. Ninguna fase elimina datos o rutas DBA; su retiro requerirá otro issue con evidencia de cero consumidores.

## Fase 8: Convergencia (2026-09-27)

- [ ] T082 [P] Sustituir la comprobación textual por una prueba PostgreSQL que ejecute dos veces migración/backfill y demuestre preservación de DBA, evaluaciones, blueprints, notas, desglose y PQRS; documentar paridad de UUID y snapshots para FR-012, FR-017 y FR-023 en `backend/tests/integration/test_learning_criteria_migration.py` y `specs/042-criterios-aprendizaje/quickstart.md`
- [ ] T083 [P] Completar pruebas de dominio, autorización, privacidad, fuentes y versiones inmutables para FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-018, FR-019 y FR-020 en `backend/tests/unit/test_learning_criteria_versions.py`, `backend/tests/unit/test_learning_criteria_privacy.py`, `backend/tests/unit/test_learning_source_service.py` y `backend/tests/unit/test_dba_compatibility.py`
- [X] T084 Completar búsqueda/filtros, estados y acciones reales del listado; conservar la entrada de tres opciones, tarjetas simplificadas, pesos automáticos y recorrido repetible para FR-001, FR-021, FR-022, FR-025, FR-026, FR-027 y FR-031 en `frontend/src/modules/materias/criterios/LearningCriteriaPage.tsx`, `frontend/src/modules/materias/criterios/LearningCriteriaEditor.tsx` y sus pruebas
- [ ] T085 Completar la aplicación de versiones aprobadas a evaluaciones y recursos, incluyendo material no evaluativo y snapshot exacto, para FR-010 y FR-011 en `backend/app/modules/criterios_aprendizaje/application_service.py` y sus pruebas de evaluación/recurso
- [X] T086 Implementar propuesta editable pregunta→criterio y vista previa previa a guardar con intención, cobertura, puntaje y advertencias para FR-028 y FR-029 en `frontend/src/modules/evaluaciones/components/LearningCriteriaSelector.tsx`, `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` y contratos backend asociados
- [X] T087 Completar transparencia y resumen pedagógico sin segunda fórmula para FR-013, FR-014, FR-015, FR-016, FR-030 y FR-032; validar nota, ajuste, historial y PQRS en `backend/tests/unit/test_learning_criteria_breakdown.py`, `frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx` y `frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx`
- [ ] T088 Instrumentar el tiempo activo de preparación/revisión separado de la espera IA para FR-024, sin registrar contenido docente o estudiantil, en `frontend/src/modules/materias/criterios/useLearningCriteriaWorkSession.ts`, `frontend/src/lib/analytics.ts`, `backend/app/modules/analytics/service.py` y pruebas asociadas
- [ ] T089 Ejecutar la matriz E2E manual/asistida, claro/oscuro, 360/390/768/escritorio, privacidad estudiantil, alias `/dba` y canary con `CRITERIA_GRADING_AUTHORITY=false`; registrar resultados y cerrar solo tareas respaldadas por evidencia en `frontend/e2e/learning-criteria.spec.ts`, `specs/042-criterios-aprendizaje/quickstart.md` y `specs/042-criterios-aprendizaje/tasks.md`
