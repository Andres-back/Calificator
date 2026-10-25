# Tareas: edición e impresión de evaluaciones claras

Issue262. Alcance/plan y revisión8/8 aprobados el2026-10-24. Las marcas indican trabajo implementado y comprobado, no intención. Sin autorización de despliegue ni llamadas pagadas en esta entrega.

## Fase 1: preparación

- [x] T001 Registrar aprobación/revisión y verificar separación de cambios ajenos en `specs/125-edicion-impresion-evaluaciones/` y `specs/README.md`.
- [x] T002 Verificar dependencias/ignores y ejecutar análisis de cobertura spec/plan/tasks antes de implementar en `specs/125-edicion-impresion-evaluaciones/quickstart.md`.

## Fase 2: fundamentos

- [x] T003 Añadir pruebas del cálculo de escala y ancla en `frontend/src/modules/evaluaciones/components/pdfViewport.test.ts` antes de modificar el visor (FR-001, FR-004).
- [x] T004 Añadir regresiones de navegación, borrador y cancelación en `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` (FR-003, FR-012, FR-015).

## Fase 3: historia1 — lectura útil

Prueba independiente: mismo documento sintético, escritorio y celular, modos de escala y lectura continua sin escrituras.

- [x] T005 [US1] Implementar escalas página/ancho/100%, límites y ancla en `frontend/src/modules/evaluaciones/components/pdfViewport.ts` y `EvaluationPdfViewer.tsx` conservando cola/presupuesto (FR-001, FR-004, FR-014).
- [x] T006 [US1] Añadir revisión ampliable del material en `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.tsx`, conservando confirmación y borrador (FR-002, FR-004, FR-012).
- [x] T007 [US1] Cubrir cambio de escala, errores y material grande en `frontend/e2e/evaluation-preview.spec.ts` o suites propietarias equivalentes localizadas antes de editar (SC-001, SC-007).

## Fase 4: historia2 — edición enfocada

Prueba independiente: veinte preguntas, ir directamente a cualquiera, cambiar/volver sin perder borrador y guardar/cancelar explícitamente.

- [x] T008 [US2] Extraer selector lateral/móvil y anterior/siguiente en `frontend/src/modules/evaluaciones/components/QuestionNavigator.tsx`, con identidad estable y foco (FR-003, FR-004).
- [x] T009 [US2] Integrar pregunta única y controles progresivos en `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx`, reducir textos redundantes sin quitar lectura/rúbrica/solución (FR-003, FR-004, FR-012).
- [x] T010 [US2] Proteger cierre sucio y navegación de borrador en `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` y pruebas propietarias; mantener errores/409 sin perder edición (FR-003, FR-015, SC-002).

## Fase 5: historia3 — composición imprimible

Prueba independiente: evaluación mixta, letra/espacios/columnas, meta posible/imposible, persistencia y exportación histórica.

- [ ] T011 [US3] Añadir pruebas del contrato y resolución en `backend/tests/unit/test_evaluation_print_settings.py` (FR-005–FR-008).
- [ ] T012 [US3] Definir contrato tipado y migración nullable en `backend/app/modules/evaluaciones/print_settings.py`, `schemas.py`, `models.py` y `backend/alembic/versions/` (FR-005, FR-008).
- [ ] T013 [US3] Probar guardado, concurrencia y versiones legacy en `backend/tests/integration/test_evaluation_print_settings.py`, incluida recalificación con dobles (FR-008, FR-012, FR-013, FR-015).
- [ ] T014 [US3] Implementar guardado limitado/versionado y snapshot explícito en `backend/app/modules/evaluaciones/service.py` y `visual_service.py`, sin recrear manifiestos ni invalidar claves (FR-008, FR-012, FR-015).
- [ ] T015 [US3] Implementar resolución de espacios/columnas e impresión monocroma conservadora en `backend/app/modules/evaluaciones/print_layout.py` y sus pruebas (FR-005, FR-006, FR-011).
- [ ] T016 [US3] Aplicar resolución a PDF/Word en `backend/app/modules/evaluaciones/export_service.py` y `backend/app/modules/herramientas/pdf_render.py`, preservando salida legacy (FR-005, FR-006, FR-008).
- [ ] T017 [US3] Añadir preparación privada idempotente de borrador con máximo cuatro renders, conteo PDF real, cancelación/expiración y validación de base en `backend/app/modules/evaluaciones/print_preparation.py`, `router.py` y registro de trabajos existente (FR-007, FR-013, FR-014, FR-015).
- [ ] T018 [US3] Cubrir permisos, caché aislada, errores y meta imposible en `backend/tests/integration/test_evaluation_print_preparation.py` (FR-007, FR-012–FR-015, SC-004, SC-007).
- [ ] T019 [US3] Integrar tipos/cliente/hook de configuración y preparación en `frontend/src/modules/evaluaciones/` reutilizando API/trabajos actuales, sin guardado implícito (FR-008, FR-014, FR-015).
- [ ] T020 [US3] Crear panel de ajustes en `frontend/src/modules/evaluaciones/components/EvaluationPrintSettings.tsx` y entradas en visor/editor, previsualización y guardado explícito (FR-005–FR-008, SC-004).
- [ ] T021 [US3] Verificar migración PostgreSQL, versiones anteriores, PDF/Word renderizados y fixture mixta, documentando evidencia en `specs/125-edicion-impresion-evaluaciones/quickstart.md` (SC-003–SC-005, SC-007).

## Fase 6: historia4 — materiales útiles

Prueba independiente: biblioteca sin gasto, tabla/gráfico determinista, propuesta de figura aislada y alternativa ante transparencia no disponible.

- [x] T022 [US4] Comprobar documentación oficial/capacidades reales de transparencia antes de adaptar API y registrar conclusión en `specs/125-edicion-impresion-evaluaciones/research.md`, sin llamadas pagadas (FR-010).
- [x] T023 [US4] Añadir tests de propósito, figura aislada, alpha y ruta sin capacidad en `backend/tests/unit/test_evaluation_visual_generation.py` (FR-009–FR-011, FR-014).
- [x] T024 [US4] Implementar propósito/estilo y validación honesta en `backend/app/modules/evaluaciones/visual_generation.py`, contrato visual y adaptador de imágenes existente, sin modelos hardcodeados ni reintentos ocultos (FR-010–FR-012, FR-014).
- [x] T025 [US4] Mostrar biblioteca/tabla/gráfico/figura y controles de propósito en borrador generado y edición mediante `QuestionVisualEditor.tsx`/`GenerationWizard.tsx`, conservando revisión de asociaciones (FR-009, FR-010, SC-006).
- [ ] T026 [US4] Cubrir biblioteca, capacidad ausente y conservación del material con pruebas sintéticas en suites visuales frontend/backend existentes y `specs/125-edicion-impresion-evaluaciones/quickstart.md` (FR-009–FR-014, SC-006, SC-007).

## Fase final: validación

- [ ] T027 Ejecutar typecheck/lint/Vitest/pytest y regresiones de generación, lectura, digitalización, motivos, visuales y calificación; registrar comandos/resultados en `specs/125-edicion-impresion-evaluaciones/quickstart.md`.
- [ ] T028 Verificar visualmente móvil/computador, claro/oscuro, Chromium/WebKit y exportaciones sin llamadas reales en `output/playwright/` y `output/pdf/`; registrar límites de prueba en `specs/125-edicion-impresion-evaluaciones/quickstart.md` (SC-001–SC-007).
- [ ] T029 Ejecutar Converge, gobernanza, auditorías y builds aplicables; actualizar `specs/125-edicion-impresion-evaluaciones/tasks.md`, `quickstart.md` y `specs/README.md` sin certificar CI pendiente.
- [ ] T030 Preparar PR enlazado a262 con todos los cambios revisados y CI requerido en verde antes de entrega; no fusionar ni desplegar sin autorización y registrar enlace en `specs/125-edicion-impresion-evaluaciones/quickstart.md`.

## Dependencias y ejecución

T001→T002→pruebas T003/T004. US1 T005→T006→T007; US2 T008→T009→T010; ambas independientes de la migración. US3 T011→T012→T013→T014→T015→T016→T017→T018→T019→T020→T021. US4 T022→T023→T024→T025→T026; vista de material comparte archivo con T006, por eso se ejecuta después. T027–T030 requieren historias terminadas.

Oportunidades de ejecución simultánea sin agentes: prueba de cálculoT003 y contratoT011 están en archivos distintos; US1 y fundamentos backend de US3 pueden comprobarse separadamente; lectura de documentaciónT022 no requiere despliegue. No modificar un archivo compartido simultáneamente.

MVP verificable: US1 visor/material ampliable. Se entrega primero localmente; no declarar completa la función125 hasta cerrar las cuatro historias. Los treinta ítems siguen el formato ID/ruta/historia y mantienen pendientes los trabajos no implementados.
