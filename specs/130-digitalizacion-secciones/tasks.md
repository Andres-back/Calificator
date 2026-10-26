# Tareas: digitalización por secciones y puntajes opcionales

**Issue**: [#274](https://github.com/Andres-back/Calificator/issues/274) | **Plan**: [plan.md](./plan.md)
**Aprobación**: el usuario aprobó el diseño ampliado mediante «aprobe» después de incorporar el reparto opcional. Incluye revisión asistida de requisitos y continuación si está completa. Sin autorización de fusión/despliegue o modificación de datos históricos.

## Fase 1: Preparación

- [X] T001 Registrar aprobación, revisar requisitos y analizar trazabilidad en `specs/130-digitalizacion-secciones/{spec,plan,tasks}.md` y `checklists/documento-y-puntajes.md`; comprobar ignores, rama y entorno local sin datos reales. (FR-009/012/014/016)

## Fase 2: Fundamentos

- [X] T002 Crear fixtures sintéticos de seis secciones/dos subsecciones/dieciséis preguntas y pruebas RED de contrato, cobertura y proyección en `backend/tests/unit/test_document_structure.py`. (FR-001/002/003/004/015; SC-001/002/003)
- [X] T003 Implementar contrato cerrado, jerarquía, límites, referencias, recorrido y contexto público en `backend/app/modules/evaluaciones/document_schemas.py` y `document_structure.py`. (FR-001/002/003/004/012/014/015)
- [X] T004 Añadir campo nullable y migración sin backfill en `backend/app/modules/evaluaciones/models.py`, `schemas.py` y `backend/alembic/versions/`; verificar contratos legacy con `backend/tests/unit/test_document_structure.py`. (FR-006/009/014/016)
- [X] T005 Probar y generalizar versiones textuales, atomicidad, concurrencia y proyección pública en `backend/app/modules/evaluaciones/{visual_service,service}.py` y `backend/tests/integration/test_document_persistence.py`, sin fabricar manifiestos visuales ni cambiar snapshots antiguos. (FR-006/009/012/015/016; SC-004)

## Fase 3: Historia 1 — Digitalizar el documento completo

**Objetivo/prueba independiente**: extracción sintética multipágina conserva todos los contenidos, rechaza omisiones conocidas y produce un único borrador revisable con dieciséis preguntas.

- [X] T006 [US1] Añadir pruebas RED de encabezados, instrucciones, numeración reiniciada, lecturas/debate y rescate plano en `backend/tests/unit/test_evaluation_digitalization.py` y `test_document_digitalization.py`. (FR-001/002/003/004/014/015)
- [X] T007 [US1] Integrar inventario, prompt y normalización con identidades de origen en `backend/app/modules/evaluaciones/{digitalize_service,visual_import_service,visual_normalization}.py`; no perder texto reconocido ni efectuar llamadas extra. (FR-001/002/003/004/014/015)
- [X] T008 [US1] Conservar inventario/propuesta en checkpoints de `backend/app/workers/tasks_digitalization.py`, persistir documento validado y comprobar reintentos en `backend/tests/unit/test_visual_digitalization_worker.py` y `test_document_digitalization.py`. (FR-004/006/011/016; SC-001/003/006)

## Fase 4: Historia 2 — Editar, resolver, imprimir y calificar

**Objetivo/prueba independiente**: el mismo documento se conserva al editar/reabrir, consultar como estudiante, exportar y construir contexto de los tres evaluadores.

- [X] T009 [P] [US2] Crear pruebas RED de conservación/edición/serialización y borradores en `frontend/src/modules/evaluaciones/components/documentModel.test.ts` y pruebas de `EvaluationDocumentOutline`/`EvaluationDocumentContent`. (FR-003/005/006/007/013)
- [X] T010 [US2] Integrar tipos, modelo de documento, navegación/editor contextual y payload atómico en `frontend/src/types/api.ts`, `frontend/src/modules/evaluaciones/api.ts`, `components/generationWizardModel.ts`, `components/GenerationWizard.tsx` y componentes documentales; proteger cambios sin guardar y preguntas referidas. (FR-003/005/006/013)
- [X] T011 [US2] Presentar secuencia documental pública y respuestas por identidad en `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx` y en `backend/app/modules/calificaciones/submission_content_service.py`; probar permisos/versiones en sus pruebas vigentes. (FR-007/009/012/015)
- [X] T012 [US2] Extender `backend/app/modules/evaluaciones/{export_service,print_preparation,document_print}.py` y el renderizador real `backend/app/modules/herramientas/pdf_render.py` con recorrido común; pruebas de integridad y render en `backend/tests/unit/test_document_exports.py`, PDF/Word y modos compacta/media/amplia sin duplicar lectura. OOXML, PDF y las diez páginas de Word revisados; conversor local aislado autorizado expresamente. (FR-006/007/013; SC-001/005)
- [X] T013 [US2] Alimentar contexto educativo de versión a principal/segundo/confirmador y Xali mediante `blueprint_service.py`, `grading_visual_context.py`, `backend/app/modules/calificaciones/agents.py` y consumidores Xali/feedback; probar listas blancas, fingerprints legacy y publicaciones nuevas en `backend/tests/unit/test_document_grading_context.py`. (FR-008/009/012/014/015; SC-004)

## Fase 5: Historia 3 — Recuperar sin alterar el historial

**Objetivo/prueba independiente**: consulta autorizada de texto conservado y una copia revisada idempotente en la misma materia; fuente, entregas, notas y enlaces permanecen intactos.

- [X] T014 [P] [US3] Crear pruebas RED de fuente autorizada, transcripción sin archivo, conflictos y recuperación en copia en `backend/tests/integration/test_document_recovery.py`. (FR-009/010/011/012/015/016; SC-004/006)
- [X] T015 [US3] Implementar lectura documental privada y recuperación explícita con copy/job existente en `backend/app/modules/evaluaciones/{document_recovery,copy_service,copy_schemas,copy_router}.py`, conservando guard de destino distinto para copias normales y remapeando nodos/presupuestos/recursos. (FR-006/009/010/011/012/016)
- [X] T016 [US3] Integrar propuesta revisable, fuente disponible/faltantes, confirmación y seguimiento de copia en `frontend/src/modules/evaluaciones/EvaluationCopyDialog.tsx` y componentes de recuperación con pruebas; no publicar ni cambiar puntuación de origen automáticamente. (FR-009/010/011/013/016)
- [X] T017 [US3] Verificar versiones y conservación de registros/archivos con fallos parciales, sesión/permiso revocado y reintento en `backend/tests/integration/test_document_recovery.py` y regresiones de copia128. (FR-009/010/011/012/016; SC-004/006)

## Fase 6: Historia 4 — Puntajes opcionales por sección

**Objetivo/prueba independiente**:2+2+1 sobre5 se compila a máximos canónicos exactos; opción apagada no modifica puntos, y no hay doble ponderación o efecto retroactivo.

- [X] T018 [US4] Escribir pruebas RED de Decimal, pesos base, redondeo, grupos no solapados, cobertura, cambio repetido y valores no representables en `backend/tests/unit/test_section_scoring.py`. (FR-017/018/019/020; SC-007/008)
- [X] T019 [US4] Implementar validación/compilación y confirmación versionada en `backend/app/modules/evaluaciones/document_structure.py` y `service.py`, conservando una sola autoridad de máximos por pregunta; probar persistencia y copia en `test_document_persistence.py`. (FR-017/018/019/020)
- [X] T020 [US4] Añadir propuesta de reparto, total pendiente, edición interna y confirmación/retorno a bases en componentes documentales de `frontend/src/modules/evaluaciones/components/` y `documentModel.test.ts`; movimientos/escala/cantidad requieren nueva confirmación. (FR-005/013/017/018/019/020)
- [X] T021 [US4] Verificar presupuestos al reabrir, copiar, imprimir y generar prompts simulados en `test_section_scoring.py`, `test_document_exports.py`, `test_document_grading_context.py` y pruebas frontend, sin afectar revisiones anteriores. (FR-006/007/008/009/020; SC-007/008)

## Fase 7: Validación y entrega

- [X] T022 Ejecutar E2E de documentos, edición, recuperación y puntajes desde360/390/768/1440 px, ambos temas, texto ampliado y viewport reducido en `frontend/e2e/evaluation-document-structure.spec.ts`; registrar Chromium/WebKit efectivos en `frontend/playwright.config.ts` y comprobar particiones del CI. 28 recorridos aprobados, incluidos capítulos con subsecciones, y capturas revisadas; no equivalen a prueba física de iPhone/Android. (FR-005/006/007/010/013/017/018/020; SC-005/007/008)
- [X] T023 Validar migración aditiva, rollback operativo y regresiones unitarias/integración/build/contendedores aplicables en base aislada; registrar comandos, totales y limitaciones en `specs/130-digitalizacion-secciones/quickstart.md`, sin credenciales ni IA real. Backend1532, integración22, frontend1020, navegador28, PDF/Word y builds locales aprobados. (FR-009/011/012/014/015/016; SC-001–008)
- [X] T024 Actualizar contratos/spec/plan/tasks responsables005/007/008/101/113/125/128 y consumidores009/107/126, índice `specs/README.md`, baseline e inventario verificables del repositorio; mantener propiedad única. Trazabilidad130 en curso, sin afirmar entrega o activación; inventario663 superficies sin deriva. (FR-006/007/008/012/016)
- [X] T025 Ejecutar Converge, completar únicamente tareas realmente verificadas y preparar PR enlazado a274 con CI; registrar pendientes reales y no fusionar/desplegar sin autorización en `specs/130-digitalizacion-secciones/{tasks,quickstart}.md`. Paquete de PR preparado con pruebas y activación cerrada; CI remoto se ejecuta al publicarlo y sigue siendo requisito previo a cualquier fusión, no un resultado local supuesto. (FR-001–020; SC-001–008)

## Dependencias

T001 → T002 → T003 → T004 → T005 bloquean todas las historias. US1:T006→T007→T008. US2 depende de US1 para edición/digitalización de extremo a extremo; T009→T010→T011→T012→T013. US3:T014→T015→T016→T017; US4:T018→T019→T020→T021, ambas sobre fundamentos/US1/US2. Validación T022–T025 cierra las cuatro historias.

## Paralelismo posible

T009 y T014 son pruebas de archivos distintos y podrían prepararse cuando sus fundamentos estén listos. Se ejecutará secuencialmente salvo autorización de delegación; el marcador[P] no crea agentes por sí mismo. No editar `service.py`, `copy_service.py` o el modelo del editor simultáneamente desde tareas distintas.

## Estrategia de implementación

Primer incremento verificable: contrato/migración y US1, con consumidores existentes conservados y escritura protegida; no se presenta como entrega completa. Después editor/consumidores, recuperación y reparto opt-in. Pruebas antes de código en cada bloque, sin eliminar controles ni tocar configuraciones IA para acelerar el cierre. El alcance completo incluye las cuatro historias.

## Trazabilidad explícita para gobernanza

FR-001 → T002/T006/T007; FR-002 → T002/T006/T007; FR-003 → T003/T009/T010; FR-004 → T003/T008; FR-005 → T010/T020; FR-006 → T005/T010/T012/T015; FR-007 → T011/T012; FR-008 → T013/T021; FR-009 → T005/T011/T017; FR-010 → T014/T015/T016; FR-011 → T008/T017; FR-012 → T005/T013/T017; FR-013 → T009/T010/T022; FR-014 → T003/T007/T013; FR-015 → T003/T011/T013; FR-016 → T004/T005/T023; FR-017 → T018/T019/T020; FR-018 → T018/T019/T020; FR-019 → T018/T019; FR-020 → T019/T020/T021.

## Phase 8: Convergence

- [X] T026 HIGH — Renderizar los tres DOCX sintéticos (compacta/media/amplia) generados por `backend/scripts/qa_document_structure.py`, inspeccionar todas sus páginas y corregir cualquier defecto en `backend/app/modules/evaluaciones/export_service.py`; registrar el motor y resultados en `quickstart.md` para cerrar T012. Resuelto con contenedor local autorizado: LibreOffice25.2.3.2, tres documentos y diez páginas revisadas, sin datos reales ni red durante la conversión. Según FR-007, SC-001/005, US2/AC3 y plan: una fuente para impresión (partial; F1).
- [X] T027 MEDIUM — Completar T023/T025 después de T026: actualizar resultados reales de `quickstart.md`, repetir gobernanza/inventario y Converge, completar solo tareas verificadas y preparar el PR con CI enlazado a #274, sin fusión/despliegue ni excepción al control de tareas completas. Cierre local verificado; la ejecución remota de CI no equivale a permiso de fusionar. Según plan: entrega segura y T023/T025 (partial; F2).
