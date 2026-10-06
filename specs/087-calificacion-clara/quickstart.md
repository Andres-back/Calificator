# Guía y resultados de validación

Estado: implementación validada localmente el 2026-10-06 tras aprobación del alcance, plan y revisión de requisitos. No certifica CI ni despliegue.

## Preparación

Usar fixtures sintéticas y dependencias instaladas del frontend. Los E2E mock levantan Vite en `127.0.0.1:4175` y no requieren datos de producción ni Docker. Instalar navegadores Playwright solo si faltan y con el mecanismo existente. No sustituir los controles CI por una validación local abreviada.

## Pruebas focalizadas

Desde `frontend`:

```powershell
npm run test:run -- src/modules/calificaciones/review-triage src/modules/calificaciones/gradePresentation.test.ts src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx src/modules/calificaciones/components/GradeBreakdown.test.tsx src/modules/calificaciones/components/GradeComponentEditor.test.tsx src/modules/calificaciones/components/GradeGlobalAdjustmentEditor.test.tsx
npm run typecheck
npm run lint:strict
npm run build
npm run test:mock -- grading-review.mock.spec.ts
npm run test:e2e -- explainable-grading.spec.ts
npm run test:a11y -- grading-review.a11y.spec.ts
npm run test:visual -- grading-review.visual.spec.ts
```

Inspeccionar capturas de los cinco tamaños y ambos temas antes de aceptar referencias nuevas. Alinear los selectores obsoletos de accesibilidad/visual con el contrato aprobado y subir comprobación táctil de 40 a 44 px. `playwright.config.ts` usa Chromium por defecto; para humo WebKit añadir un proyecto de prueba acotado o usar el mecanismo existente verificado en Tasks, sin ampliar CI indiscriminadamente ni afirmar que WebKit ya está cubierto. No crear evaluaciones reales.

## Casos obligatorios

1. Nota 5 con cuatro respuestas sin alertas individuales y bloqueo global por discrepancia: aviso general visible, sin código técnico principal ni mensaje general de ausencia de incertidumbre.
2. Excepciones individuales, alerta general sola y motivo desconocido: destinos pertinentes, detalle original y cero mutaciones al consultar.
3. Confirmada/publicada con alerta histórica; procesamiento sin nota; cero legítimo; escala distinta de cinco; nota antigua sin desglose; ajuste docente separado del cálculo base.
4. Abrir evidencia multihoja, puntajes, criterios y retroalimentación; editor inline; borrador protegido; conflicto 409 y recuperación sin sobrescritura.
5. Usuario lector sin permisos de ajuste/publicación; vista estudiantil compartida sin regresión ni exposición de controles docentes.
6. Scroll desde dentro de secciones, controles finales, teclado y foco; objetivos 44 px y ausencia de contenido oculto/desbordamiento.

## Cierre

Ejecutar inventario/gobernanza y Converge tras actualizar dominio 008 y documentación. CI verde obligatorio antes de PR fusionable. SC-005 se valida posteriormente con tres docentes sin datos de alumnos; registrar resultados, no afirmar que está satisfecho por pruebas automatizadas. Sin cambios o despliegue productivo solo para validar diseño.

## Resultados locales

- Suite focalizada: 45 pruebas verdes en siete archivos. Tras añadir la comprobación de procesamiento, las 16 pruebas de triage pasaron de nuevo (46 casos distintos cubiertos).
- TypeScript, lint estricto y build verdes. Vite conserva su advertencia de tamaño de chunks; no se amplía alcance a optimización global.
- E2E funcional: 22/26 verdes inicialmente; cuatro selectores/expectativas anteriores se actualizaron al contrato aprobado y los cuatro pasaron. Ajuste 1 → 0.7, historial, conflicto 409, borradores, solo lectura, estudiante y publicación parcial conservados. Consultar no muta notas.
- Mock focalizado: 2/2, excepciones históricas y navegación a pregunta/hoja con borrador protegido.
- Accesibilidad del detalle: 10/10, cinco tamaños × claro/oscuro, controles de al menos 44 px, teclado, foco y retroalimentación alcanzable sin quedar detrás de la barra. Esta comprobación se limita al panel modificado, no certifica todo el shell.
- Capturas: diez combinaciones de tamaño/tema comprobadas y revisadas visualmente; diez referencias actualizadas por cambio intencionado. Las referencias de escritorio anteriores ocultaban diferencias por la tolerancia global: las cuatro se renovaron explícitamente y se inspeccionaron antes de aceptar el cambio. Evidencia local ignorada en `frontend/output/playwright/087-*`.
- WebKit: 2/2, aviso general con editor inline y pregunta 20 con recuperación de scroll. Comando acotado: `npx playwright test e2e/explainable-grading.spec.ts --browser=webkit --grep 'aviso general|docente llega a la respuesta 20'`.
- Inventario: 573 superficies sin altas/bajas ni cambio de propietario; solo digest de fuente actualizado.
- Gobernanza: 41 pruebas verdes y `git diff --check` sin errores. Converge contrastó 9 FR, 4 SC construibles, 12 escenarios de aceptación y las cuatro decisiones de diseño con el código actual: sin hallazgos construibles; no añadió tareas. SC-005 excluido por ser validación humana posterior.

La regresión inicial de componente y estado falló antes de corregirlos. Desviación de secuencia: el E2E nuevo se escribió antes, pero su primera ejecución fue después de la integración; no se afirma una ejecución E2E roja previa. La cobertura existente de `GradeBreakdown` se reutilizó sin duplicar casos ni editar su cálculo. Los primeros ensayos paralelos perdieron el servidor Vite al finalizar otra suite; las comprobaciones finales usan un servidor persistente y salidas separadas. Sin producción, credenciales o llamadas nuevas a modelos.

SC-005 sigue pendiente de prueba humana con tres docentes. Fusión y producción requieren autorización independiente y CI verde.
