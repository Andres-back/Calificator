# Tareas: Encuesta fiable y versionada

## Fase 1: Preparación
- [x] T001 Aislar código desplegado sin cambios académicos y documentar autorización en specs/109-encuesta-envio-seguro/spec.md.

## Fase 2: Fundamentos
- [x] T002 Crear regresión de firma, transporte, versiones y métricas en encuesta-docente/tests/.
- [x] T003 Archivar ajustes/esquema y conservar documento de consentimiento 4.0 mediante contexto versionado en encuesta-docente/versions/4.0-web-breve/ y app.py.

## Fase 3: Historia 1
- [x] T004 [US1] Compartir límites y validar firma/confirmación en encuesta-docente/public/submission.js y app.py (FR-001, FR-004, FR-005, FR-007).
- [x] T005 [US1] Mostrar estados y guiar correcciones en encuesta-docente/public/app.js (FR-002, FR-005).

## Fase 4: Historia 2
- [x] T006 [US2] Conservar paquete incierto y reintentar sin duplicados en encuesta-docente/public/app.js (FR-003, FR-006).

## Fase 5: Historia 3
- [x] T007 [US3] Publicar preguntas, consentimiento y duración 5.0 en encuesta-docente/public/schema.json, settings.json y app.py (FR-009, FR-010, FR-012, FR-013).
- [x] T008 [US3] Recuentos y CSV privados separados por versión en encuesta-docente/app.py y public/admin.* (FR-011).
- [x] T009 [US3] Explicar comparabilidad y preprueba humana pendiente en encuesta-docente/METODOLOGIA.md y README.md (FR-009, FR-012).

## Fase final: Validación
- [x] T010 Ejecutar regresión WSGI/Node y permisos con datos sintéticos en encuesta-docente/tests/ (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013).
- [x] T011 Verificar recorrido móvil/escritorio y build aislado; documentar en specs/109-encuesta-envio-seguro/validation.md.
- [x] T012 Preparar inventario, gobernanza y entrega por PR/CI; documentar evidencia local y controles remotos pendientes en specs/109-encuesta-envio-seguro/validation.md. Esta tarea no afirma que CI remoto haya terminado.
- [x] T013 Preparar procedimiento de actualización condicionado a main aprobado, con salud, informe y huellas en specs/109-encuesta-envio-seguro/validation.md (FR-006, FR-008). La ejecución productiva se registra aparte, nunca se presume hecha por preparar el procedimiento.

## Dependencias

T001 → T002/T003 → T004/T005 → T006. T003 → T007 → T008/T009. Todo lo anterior → T010/T011 → T012 → T013. Las pruebas WSGI y Node pueden ejecutarse en paralelo sin compartir bases. No hay trabajo delegado. La preprueba humana no se marca como realizada con pruebas de software.

## Prioridad sobre CRUD: nombre una sola vez
- [x] T014 [US1] Eliminar la repetición manual del nombre de firma en encuesta-docente/public/app.js, derivar el nombre de identidad en submission.js y cubrir envío/corrección en tests/submission.test.mjs y navegador local (FR-014).

T014 precede la continuación de CRUD, por indicación explícita del usuario. Release del hotfix 5.0.1; 5.1.0 queda reservada para CRUD todavía no terminado y documentado en admin-crud-draft.md. Instrumento LR-CR-01 sigue siendo 5.0; no cambian preguntas. El bloqueo Pillow de CI no se elude.

## Desbloqueo de seguridad autorizado
- [x] T015 Actualizar Pillow a 13.0.0 en backend/requirements.txt, revisar compatibilidad y ejecutar regresiones sintéticas locales de imágenes/evidencia/digitalización/exportaciones (FR-015); registrar resultados y preparar nueva ejecución de CI sin omitir controles. No implica que CI remoto ni Linux hayan terminado: su resultado se registra aparte en validation.md.

## Cierre independiente de animaciones (autorizado en chat)
- [x] T016 Reproducir mediante regresión de Modal con fotogramas detenidos y corregir cierre/foco/scroll/diálogo subyacente sin modificar guardado ni pruebas de CI; ejecutar validaciones locales y documentarlas (FR-016). Resultado remoto y entrega siguen condicionados a CI verde, no se presumen por esta comprobación local.

## Navegación autenticada estable
- [x] T017 Añadir regresión de módulo inicial retrasado, corregir sincronización del helper en frontend/e2e/evaluation-ai-wizard.spec.ts y verificar matriz móvil, gobernanza e inventario sin relajar controles (FR-017). La fusión y resultado de CI se registran aparte; no se presumen por terminar el código.
- [x] T018 Sincronizar la aserción de foto visible en frontend/src/components/evidence/CameraCapture.test.tsx, conservando controles de captura/aceptación/parada y verificar sus regresiones e inventario antes del CI final (FR-018).
