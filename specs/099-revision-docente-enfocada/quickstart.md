# Validación 099

Estado: implementación y validación local completadas el 2026-10-14; CI remoto y autorización de fusión pendientes. Sin nombres/fotos reales en fixtures ni modificaciones de producción.

## Preparación

Aprobar plan, generar/revisar lista UX, Tasks y Analyze. Usar mocks y dependencias existentes en `frontend/`; no calificar ni modificar registros reales para probar distribución.

## Matriz focalizada

1. Pendiente: sugerencia distinta de fórmula, sin decisión docente; ambos valores claros, sin atribución falsa ni cambio numérico.
2. Confirmada/publicada/ajustada: decisión real, cero válido, ajuste global, historial y comparación de versión; no mezclar avisos originales con problemas activos.
3. Avisos: uno/múltiples/equivalentes/sin pregunta/sin alertas; detalle completo, CTA correcto y ausencia de falsa garantía de corrección.
4. Navegación: cada sección en hasta dos activaciones, enlaces de pregunta/hoja, retorno al grupo y siguiente; borradores de respuesta/feedback/ajuste/reclamo conservados y guardas respetadas.
5. Reclamos: vacío correcto, abiertos, solo resueltos, carga/error/reintento; permisos crear/resolver y alta accesible aun con lista vacía.
6. 360/390 y escritorio, claro/oscuro: nombres largos, respuesta breve/larga, evidencia ausente, editor abierto; no horizontal ni controles tapados. Chromium/WebKit; teclado físico no demostrado por emulación.
7. Sin nuevas llamadas LLM ni escrituras por navegación; cambios explícitos usan contratos actuales. Regresión de puntajes, feedback, publicación y permisos.

## Ejecución tras implementar

Desde `frontend/`: `npm run typecheck`, `npm run lint:strict`, Vitest focalizado sobre archivos reales añadidos/modificados y suites relacionadas, escenarios Playwright mock definidos en tareas, `npm run build`. CI completo antes de pedir fusión. No inventar comandos de test inexistentes ni presentar guía como evidencia ejecutada.

Producción permanece intacta; aprobación de plan no autoriza desplegar.

## Resultados ejecutados

- `npm run test:run -- src/modules/calificaciones src/hooks/useMobileFormViewport.test.tsx`: **105 pruebas, 22 archivos, verdes**. Incluye discrepancia pendiente sin atribución docente, nota/escala, navegación, reclamos vacíos/resueltos/error, borradores y viewport de escritura.
- `npx.cmd playwright test e2e/explainable-grading.spec.ts --project=chromium`: 25/29 inicialmente; cuatro fallos por textos/accesos de UI anteriores. Adaptadas las aserciones al flujo aprobado conservando controles de permisos, datos y navegación; los cuatro casos pasaron en repeticiones focalizadas (aviso general, resumen móvil, procesamiento y PQRS). No se presenta como una ejecución única de 29/29 tras cambios; CI hará la suite completa.
- `npx.cmd playwright test --config=e2e/mock --grep "088|094|abre enlaces"`: 14/15 inicialmente; caso de sugerencia esperaba aviso genérico y ahora recibe los dos valores explícitos. Actualizada expectativa y caso verde en repetición focalizada.
- `npx.cmd playwright test --config=e2e/mock --grep "099|094 estado sugerida"`: **3/3 verdes**; los dos escenarios 099 también repetidos tras corrección táctil: **2/2 verdes**.
- `npx.cmd playwright test --config=e2e/mock --browser=webkit --grep "099"`: **2/2 verdes**, 360 y 1366 px. Chromium/WebKit verifican identidad, accesos, evidencia, borrador de feedback, cero escrituras por navegación y ausencia de desbordamiento.
- `npx.cmd playwright test --config=e2e/accessibility grading-review.a11y.spec.ts --grep "light en (360|1366)px"`: **2/2 verdes**, nombres accesibles, foco, scroll y objetivos táctiles. La matriz existente 094 cubrió claro/oscuro en 360/390/768/1280/1440.
- `npm run typecheck`, `npm run lint:strict`, `npm run build`, `npm run audit:actions`, `npm run audit:build`: verdes. Build conserva advertencia de chunks grandes, no un error. Auditoría: 446 botones y 119 enlaces con propósito verificable.
- Primer Vitest en sandbox no ejecutó tests por EPERM al renombrar caché temporal; repetición fuera del sandbox resolvió el bloqueo. Un error en preparación de la nueva prueba de reclamos (hook devolvía el mock como limpieza) fue corregido; suite verde.

Capturas sintéticas locales: `output/playwright/teacher-flow/review099-360.png` y `review099-1366.png`. Inspección visual móvil realizada; evidencia no contiene estudiantes reales.

## Conservación y límites

No cambios backend, migraciones, modelos, notas, evidencias ni publicaciones; consultas y mutaciones explícitas vigentes se conservan. Pruebas de navegador interceptan la API y no consumen proveedores IA. CI completo es puerta independiente. Emulación WebKit no acredita teclado ni impresora física en iPhone/Android. La impresión 098 sigue pendiente.

## Convergencia

Revisión de 11 requisitos funcionales, seis criterios de éxito y siete decisiones del plan bajo ocho principios constitucionales. Hallazgo parcial: cuatro controles pequeños requerían altura táctil de 44 px; añadido T012, completado con clases explícitas y comprobación de botones de evidencia. Sin otras brechas de implementación detectadas. Inventario regenerado y comprobado: 573 superficies, sin altas de rutas/endpoints/tablas; gobernanza local del cambio preparado verde, tras expandir referencias abreviadas FR en tareas. CI remoto queda pendiente, sin eludir sus controles.
