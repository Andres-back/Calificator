# Validación focalizada

Estado: alcance y plan aprobados, listas revisadas con autorización. Implementación probada localmente el 2026-10-11; CI remoto pendiente. Sin fusión ni despliegue.

## Preparación

Usar dependencias y configuración existentes del worktree. Solo fixtures sintéticos; nunca fotos reales, contraseñas o escrituras académicas de producción. Verificar disponibilidad del navegador y contenedores únicamente si las pruebas seleccionadas los requieren.

## Regresiones de frontend

En `frontend/`:

```powershell
npm run test:run -- src/modules/calificaciones/review-triage/buildReviewTriage.test.ts src/modules/calificaciones/review-triage/ReviewTriagePanel.test.tsx src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx src/modules/calificaciones/gradePresentation.test.ts src/modules/calificaciones/components/GradeBreakdown.test.tsx src/modules/calificaciones/components/GradeComponentEditor.test.tsx
npm run typecheck
npm run lint
npm run build
npx playwright test --config=e2e/mock --grep='094|prioriza excepciones|088 contexto|abre enlaces a pregunta' --workers=1
npx playwright test --config=e2e/mock --browser=webkit --grep='094.*360px' --workers=1
```

Filtrar E2E de la revisión cuando la suite incluya otros flujos; documentar filtro y casos efectivamente ejecutados. Cubrir conocido/desconocido, pendiente/confirmado/publicado/en proceso, cálculo/ajuste y solo lectura; ningún código crudo visible.

## Integridad de backend

Ejecutar en Python 3.11 las regresiones existentes `test_calificacion_breakdown.py`, `test_breakdown_teacher_adjustment.py`, `test_breakdown_authorization.py`, `test_breakdown_compatibility.py` y `test_breakdown_visibility.py`. Mantener comandos/fixtures actuales; no añadir servicios para una prueba que no los necesita. Resultado esperado: suma/escala, ajustes y permisos intactos, pendientes sin cero definitivo. Si aparece fallo fuera del alcance, registrar y solicitar decisión antes de ampliarlo.

## Navegador y comprobación visual

1. Grupo ficticio de 30 alumnos, nombres largos, respuestas cortas/largas, criterios y evidencia de dos hojas. Matriz 360/390/768/1280/1440 px, claro y oscuro.
2. Buscar un nombre, abrir nota, desplegar evidencia, cambiar hoja, abrir respuesta/puntaje, volver a lista y cambiar estudiante. Comprobar identidad y contexto en cada paso.
3. Ver estados y desplegar historial: mensajes pasados/consulta en decidido, advertencia accionable en pendiente, proceso sin decisión inventada. Desplegar todos los detalles y confirmar ausencia de códigos.
4. Llegar al final con scroll sobre cada panel; comprobar que barra de acciones, teclado y cabeceras no tapan controles. Filtros sin arrastre horizontal, objetivos táctiles ≥44 px, foco visible.
5. Guardar un ajuste sintético y verificar nota/historial; intentar salir con cambios sin guardar. Mantener alertas, permisos, error y recuperación.
6. Capturas sintéticas ignoradas por Git, inspeccionadas manualmente en Chromium y WebKit para móvil. Registrar resultados reales antes de Converge/PR; no atribuir CI verde sin consultarlo.

## Resultados ejecutados

- Frontend focalizado: **47 pruebas aprobadas en 6 archivos**. Incluye motivos desconocidos, historial neutral, proceso pendiente, suma/escala, ajuste explícito y componentes de edición. La ejecución previa a implementar detectó 13 fallos esperados de copia y códigos visibles.
- Typecheck y lint: **aprobados**. Build: **aprobado**, con avisos no bloqueantes de tamaño de chunks y tiempo de plugins; no se añadieron dependencias ni assets.
- Chromium: **19 recorridos aprobados**, en tres ejecuciones focalizadas (12 + 3 + 4). Diez cubren 360/390/768/1280/1440 px en claro/oscuro; los demás comprueban historial, contexto, avisos activos, procesamiento sin cero, protección de cambios sin guardar y guardado de 1 a 0.7 con historial sin publicación. Los tres recorridos antiguos de `frontend/e2e/explainable-grading.spec.ts` se adaptaron al nuevo lenguaje sin retirar sus comprobaciones de integridad.
- WebKit: **2 recorridos aprobados**, 360 px claro/oscuro. Es una prueba del motor del navegador, no una certificación de dispositivos físicos iPhone/Android ni del teclado nativo.
- Revisión visual manual: capturas de celular 360 claro/oscuro, 390 claro y escritorio 1280 oscuro, guardadas en `output/playwright/teacher-flow/` e ignoradas por Git. Nombres largos legibles, historial cerrado inicialmente, sin scroll horizontal; el control final permanece sobre la barra móvil. Consultar y navegar no generó escrituras académicas.
- Backend: **14 pruebas aprobadas**, Python 3.11 en la imagen local existente `xcalificator-spec093-backend-test:latest`, con código actual montado en `/app`, `--network none` y sin base de producción. Archivos ejecutados: los cinco enumerados arriba. Cálculo, ajuste docente, autorización, compatibilidad y visibilidad conservados.
- El primer intento de Vitest sin elevación falló por permisos de archivos temporales (EPERM); la repetición autorizada pasó. No se trató como fallo del producto. El intérprete Python nativo de Windows no estaba disponible; se reutilizó Docker sin instalar herramientas.

Estos resultados validan presentación, cálculo y barreras existentes; no demuestran que la interpretación de cualquier respuesta por IA sea siempre correcta. No se recalificó ni modificó ningún registro real.

## Convergencia y gobernanza

Converge revisó 10 requisitos funcionales, 5 criterios de éxito verificables, 12 escenarios de aceptación, 6 decisiones del plan y los 8 principios de la constitución. Sin brechas funcionales, trabajo adicional no solicitado ni cambios de datos. No se añadieron tareas de convergencia.

El inventario conserva 573 superficies y el propietario 008; solo se regeneró su huella de fuentes. Se registró 094 en el índice obligatorio de especificaciones sin quitar controles. La primera ejecución de gobernanza detectó la ausencia de ese registro (40/41 pasaron); la siguiente detectó referencias abreviadas de requisitos en tareas. Se corrigieron el registro y las referencias explícitas, no las aserciones.

Entrega por rama `codex/094-revision-docente-simple`, PR con `Closes #198`, etiquetas `spec-approved` y `plan-approved`. La aprobación de implementación no autoriza fusión ni despliegue; CI remoto debe consultarse y una decisión posterior del usuario será necesaria para fusionar.

PR abierto: [#199](https://github.com/Andres-back/Calificator/pull/199). Snapshot inicial: Spec governance aprobado; backend, frontend/E2E y contenedores en ejecución. Tras la actualización de regresiones se requiere CI del nuevo HEAD; no se atribuye el resultado previo a commits posteriores. Baseline local corregido: 8/8; validación del PR local e inventario de 573 superficies aprobados.
