# Guía de validación prevista

**Estado**: plan pendiente de aprobación. Los pasos siguientes no son resultados realizados.

## Preparación

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
