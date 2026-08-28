# Tareas: Perfeccionar recursos pedagógicos

## Fase 1: Preparación

- [X] T001 Registrar la evolución 026 y la matriz de formatos canónicos en specs/006-recursos-actividades/spec.md y specs/026-perfeccionar-recursos/contracts/content-contracts.md
- [X] T002 Inventariar consumidores históricos de ficha y unir_columnas en backend/app/modules/herramientas y frontend/src/modules/herramientas sin eliminar contratos

## Fase 2: Fundamentos

- [X] T003 Ampliar las estructuras compatibles de guía, lectura, taller y plan de refuerzo en backend/app/modules/herramientas/schemas.py y frontend/src/modules/herramientas/views/ContenidoView.tsx
- [X] T004 Implementar validación por formato, cantidad solicitada, soluciones y secciones obligatorias en backend/app/modules/herramientas/content_quality.py
- [X] T005 [P] Cubrir los contratos pedagógicos y compatibilidad histórica en backend/tests/unit/test_herramientas_content_quality.py

## Fase 3: Historia 1 - Catálogo sin opciones repetidas

**Objetivo**: ofrecer una única herramienta por intención sin romper materiales históricos.

**Prueba independiente**: el selector no muestra ficha ni unir columnas; materiales de ambos tipos continúan soportados.

- [X] T006 [US1] Retirar ficha del catálogo de nuevas creaciones y conservar taller como opción canónica en frontend/src/modules/herramientas/toolPickerModel.ts
- [X] T007 [US1] Mantener relacionar pares como asociación canónica y compartir el generador histórico en backend/app/modules/herramientas/service.py
- [X] T008 [P] [US1] Ajustar nombres y descripciones pedagógicas inequívocas en frontend/src/modules/herramientas/meta.ts
- [X] T009 [P] [US1] Añadir regresiones de catálogo y alias históricos en frontend/src/modules/herramientas/toolPickerModel.test.ts y backend/tests/unit/test_herramientas_render_contracts.py

## Fase 4: Historia 2 - Recursos pedagógicamente completos

**Objetivo**: generar cuatro formatos diferenciados con todas sus secciones y cantidades.

**Prueba independiente**: el mismo tema produce guía, lectura, taller y plan con contratos distintos y completos.

- [X] T010 [P] [US2] Ampliar el generador de guía con saberes previos, modelado, práctica, cierre y verificación en backend/app/modules/herramientas/generators/guia.py
- [X] T011 [P] [US2] Ampliar lectura con instrucciones, distribución por nivel, respuesta, evidencia y dificultad en backend/app/modules/herramientas/generators/lectura_comprensiva.py
- [X] T012 [P] [US2] Extraer y ampliar el generador de taller con variedad, puntaje, solución o criterio y espacio de respuesta en backend/app/modules/herramientas/generators/taller.py y backend/app/modules/herramientas/service.py
- [X] T013 [P] [US2] Ampliar el plan conservando `semanas` como campo compatible y enriqueciendo cada entrada como sesión con diagnóstico, responsables, evidencias y comprobación final en backend/app/modules/herramientas/generators/plan_refuerzo.py
- [X] T014 [US2] Añadir plantillas locales completas para los cuatro formatos prioritarios en backend/app/services/llm_router.py
- [X] T015 [US2] Integrar cantidades esperadas y contratos ampliados en backend/app/modules/herramientas/service.py
- [X] T016 [P] [US2] Añadir pruebas focalizadas de estructura y diferenciación en backend/tests/unit/test_herramientas_content_quality.py

## Fase 5: Historia 3 - Revisión, edición y exportación completas

**Objetivo**: conservar paridad de secciones entre contenido guardado, editor, vista web y PDF por audiencia.

**Prueba independiente**: cada campo nuevo puede revisarse y editarse, aparece en PDF docente y no revela soluciones en PDF estudiantil.

- [X] T017 [P] [US3] Actualizar tipos y vistas jerárquicas responsivas de los cuatro formatos en frontend/src/modules/herramientas/views/ContenidoView.tsx
- [X] T018 [P] [US3] Incorporar etiquetas y edición de campos pedagógicos anidados en frontend/src/modules/herramientas/MaterialContentEditor.tsx
- [X] T019 [US3] Mantener paridad y separación de soluciones en backend/app/modules/herramientas/pdf_render.py
- [X] T020 [P] [US3] Añadir regresiones de vista previa y compatibilidad histórica en frontend/src/modules/herramientas/views/ContenidoView.test.tsx
- [X] T021 [P] [US3] Añadir regresiones de PDF docente/estudiante en backend/tests/unit/test_herramientas_render_contracts.py y backend/tests/unit/test_herramientas_pdf_total.py

## Fase 6: Historia 4 - Recuperación sin materiales vacíos

**Objetivo**: obtener un recurso completo o un error accionable sin persistencia parcial.

**Prueba independiente**: una salida incompleta se recupera una vez o se rechaza; solo se crea un material completo.

- [X] T022 [US4] Fortalecer el reintento con detalle de secciones faltantes y cantidades esperadas en backend/app/modules/herramientas/service.py
- [X] T023 [US4] Asegurar que las plantillas de recuperación cumplen los mismos contratos en backend/app/services/llm_router.py
- [X] T024 [P] [US4] Cubrir recuperación, rechazo y ausencia de duplicados en backend/tests/unit/test_herramientas_content_quality.py

## Fase final: Validación

- [X] T025 Ejecutar únicamente las pruebas focalizadas de recursos y el build frontend descritos en specs/026-perfeccionar-recursos/quickstart.md
- [X] T026 Revisar manualmente anchos 360, 390, 768 y 1366 en creación y detalle, y comprobar que los cuatro formatos se distinguen en menos de 30 segundos; documentar cualquier límite en specs/026-perfeccionar-recursos/quickstart.md
- [X] T027 Ejecutar $speckit-converge y cerrar tareas restantes en specs/026-perfeccionar-recursos/tasks.md
- [ ] T028 Abrir un PR enlazado al issue #39 y fusionar únicamente con CI verde

## Dependencias

- Fase 2 bloquea las historias 2, 3 y 4 porque define el contrato común.
- Historia 1 es independiente de la ampliación de contenido y puede verificarse después de T003.
- Historia 2 bloquea la paridad de la historia 3.
- Historia 4 reutiliza los contratos y plantillas terminados en la historia 2.
- La validación final depende de todas las historias.

## Oportunidades paralelas

- T005 puede avanzar mientras se prepara el catálogo.
- T008 y T009 son independientes del ajuste del generador histórico T007.
- T010, T011, T012 y T013 modifican generadores separados.
- T017 y T018 pueden avanzar en paralelo con T019.
- T020 y T021 cubren plataformas diferentes.

## Estrategia de implementación

1. Consolidar primero el catálogo sin borrar compatibilidad.
2. Fortalecer contratos y generadores formato por formato.
3. Llevar los mismos campos a editor, vista y PDF.
4. Verificar recuperación y ejecutar solo las pruebas focalizadas necesarias.
