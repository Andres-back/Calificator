# Guía de validación y resultados

**Estado**: especificación, plan y checklist revisados y aprobados; implementación validada localmente con fixtures sintéticos. PR/CI y autorización de merge pendientes; producción no modificada.

## Preparación

Medición anterior al cambio (2026-09-28): fixture sintético `24`/`24`, ancho 360 px, comparación apilada = **148 px**. Una prueba focal de Playwright pasó. Umbral de aceptación posterior: **≤103.6 px**, conservando tipografía y controles.

Usar los mocks existentes de `frontend/e2e/explainable-grading.spec.ts` y fixtures sintéticos, nunca fotos/nombres de alumnos reales. La configuración de Playwright levanta o reutiliza `http://127.0.0.1:4175`; para revisión manual usar `npm run dev -- --host 127.0.0.1 --port 4175` desde `frontend/`.

## Comprobaciones focales tras implementar

Desde `frontend/`, ejecutar una sola pasada de los tests de componentes afectados y `npm run typecheck`/`npm run lint:strict`. Reutilizar los archivos actuales de GradeBreakdown, GradeComponentEditor, revisión móvil, materia y evaluaciones. Ejecutar únicamente los recorridos E2E afectados durante iteración; CI completo sigue siendo gate obligatorio del PR.

```powershell
npm run test:run -- src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx src/modules/calificaciones/components/GradeBreakdown.test.tsx src/modules/calificaciones/components/GradeComponentEditor.test.tsx src/modules/materias/MateriaEvaluaciones.test.tsx src/modules/materias/MateriaDetailPage.test.tsx src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx
npm run typecheck
npm run lint:strict
npm run test:e2e -- e2e/explainable-grading.spec.ts --workers=1
```

Las suites existentes `e2e/visual/grading-review.visual.spec.ts` y `e2e/accessibility/grading-review.a11y.spec.ts` se amplían si sus casos no cubren el resumen y los controles nuevos. No actualizar imágenes de referencia sin inspección visual. La prueba E2E incluye sus mocks; las interacciones manuales deben usar datos controlados equivalentes.

## Casos de aceptación

1. Nota sugerida con respuestas `3`, `27` y `527`: resumen antes del detalle; abrir explicación y comparar respuesta/referencia compactas. Medir altura de la comparación con el mismo fixture a 360 px antes/después; objetivo ≥30 % de reducción sin reducir tipografía ni objetivos táctiles.
2. Rúbrica guardada y otra entrega solo por preguntas: mostrar las valoraciones reales y ausencia explícita donde falten; no inventar peso, criterio ni cero.
3. Ajustar pregunta 1/1 a 0.7/1: guardar, volver al resumen, comprobar versión/suma/historial devueltos por mock. Simular conflicto y error: conservar texto, no avanzar ni confirmar por error.
4. Enlace directo y alerta/PQRS a pregunta/hoja: abrir detalle correcto y foco después del render. Plegar y reabrir no pierde selección; refetch de cola tampoco.
5. Procesando, fallida, cero confirmado y nota publicada: estados distintos, bloqueos visibles con secciones cerradas y ninguna llamada de inferencia por abrirlas.
6. Evaluación publicada y cerrada: entrar desde tarjeta sin reseleccionar materia/evaluación y regresar. Borrador sin inicio de calificación. Lector y rol personalizado sin `evaluations.read`: funciones autorizadas conservadas.
7. Referencias ocultas y estudiante: ninguna exposición nueva, ajuste ni botón docente en el componente compartido.
8. Evidencia multihoja, histórica sin desglose y texto largo: alternativas reales, contenido completo, hojas navegables y cero puntajes fabricados.
9. Recorrer las cinco resoluciones en claro/oscuro: comprobar ancho de documento, foco, scroll sobre contenido y acceso a acciones. Emulación de viewport no equivale a prueba en teléfono físico.

## Evidencia y cierre

- Registrar comandos/resultados, altura antes/después y capturas sintéticas en el área de salida existente.
- Completar trazabilidad de requisitos, inventario y baseline; Analyze antes de código y Converge al finalizar.
- Abrir PR enlazado a #158 con aprobaciones registradas; no fusionar sin CI verde ni publicar sin autorización.
- En producción, comprobar commit/contenedores, archivos nuevos y consultas de lectura. No modificar notas reales para validar esta reorganización.

## Resultados locales (2026-09-29)

- TypeScript sin errores y ESLint de `src` con cero advertencias.
- Vitest: **42/42** pruebas en los siete archivos afectados, incluido triage y regresión estudiantil.
- Playwright: **25/25** casos de `explainable-grading.spec.ts`. Incluye resumen, criterios ausentes, cero real, procesamiento, edición 1→0.7 con versión/historial, conflicto 409, recuperación de borrador, texto largo, evidencia multihoja, PQRS/error de consulta y publicación parcial. Los errores 409/503 en consola de esta suite son respuestas intencionadas de los mocks.
- Accesibilidad: **5/5** pruebas de nombres, foco, controles y ancho en `grading-review.a11y.spec.ts`. Regresión visual: **10/10** en `grading-review.visual.spec.ts`, sin actualización automática durante la pasada de verificación. Referencias actualizadas previamente e inspeccionadas en los cinco tamaños y ambos temas.
- Medición a 360 px: comparación `24`/`24` antes **148 px**, después **99 px**, reducción **33.1 %**, conservando tipografía y controles. Umbral de aceptación ≤103.6 px.
- Capturas inspeccionadas en claro/oscuro para 360×800, 390×844, 768×1024, 1366×768 y 1920×1080 en `frontend/output/playwright/`; resumen y detalle sin desbordamiento. Controles principales medidos ≥44 px y prueba de rueda/foco/edición móvil satisfactoria.
- Build de producción y auditoría del bundle satisfactorios; advertencia informativa existente de tamaño de chunk, sin nueva dependencia.
- Auditoría estática de acciones: **393 botones y 113 enlaces** con propósito verificable.
- Sin cambios de backend, IA, API, esquema, fórmula ni notas históricas; solo presentación docente opt-in y navegación contextual. No se utilizaron evidencias reales ni se ejecutaron inferencias.
- Analyze previo: sin conflictos críticos y requisitos trazados. Converge final: **0 brechas de implementación** tras revisar 16 FR, 7 SC, 18 escenarios de aceptación, 8 decisiones y 8 principios constitucionales; no se añadieron tareas de convergencia ni se modificó código durante esa evaluación.
- Gobernanza: **41/41** pruebas de `tests/spec_governance`, validador de entrega sin errores y `git diff --check` limpio. Inventario regenerado y verificado: **565 superficies**, sin cambio de responsables ni nuevas superficies funcionales.

### Límites y entrega

La emulación de navegador y la inspección de capturas **no acreditan** teclado nativo, desplazamiento táctil o ergonomía en un teléfono físico; queda pendiente comprobarlo con un docente. El CI completo del PR (frontend/E2E, backend, contenedores y gobernanza) es obligatorio antes de merge, incluso con estas pruebas focales verdes. La preparación de entrega no equivale a CI aprobado ni autoriza desplegar.

Abrir PR de `codex/075-revision-docente-compacta` hacia `main`, con `Closes #158`, etiquetas `spec-approved` y `plan-approved`. Tras CI verde, solicitar autorización de fusión; nunca push directo a `main`. La comprobación productiva posterior será de lectura, sin cambiar calificaciones reales.
